import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { preflight, verifyManifest, digest, requireGate, requestJson } from './client-preflight.mjs';
import { readInstallInput } from '../preflight.mjs';

const fingerprint = value => digest(JSON.stringify(value));
const literal = value => `'${value.replaceAll("'", "''")}'`;

export function migrationPayload(root) {
  return verifyManifest(root).map(entry => ({ ...entry, sql: readFileSync(join(root, 'supabase/migrations', entry.file), 'utf8') }));
}

// Never executes from a linked workspace. Only the verified release SQL is copied.
// No seed, roles, config vault secrets, arbitrary command, DB URL or repair flags.
export function executeMigrations(input, payload, dryRun, execute = spawnSync) {
  const directory = mkdtempSync(join(tmpdir(), 'client-migrations-'));
  try {
    mkdirSync(join(directory, 'supabase/migrations'), { recursive: true });
    writeFileSync(join(directory, 'supabase/config.toml'), 'project_id = "client-install"\n');
    for (const entry of payload) {
      requireGate(/^\d{14}_[a-z0-9_]+\.sql$/.test(entry.file) && digest(entry.sql) === entry.sha256, 'EXECUTOR_MIGRATION_MISMATCH');
      writeFileSync(join(directory, 'supabase/migrations', entry.file), entry.sql);
    }
    const env = {};
    for (const name of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA']) {
      if (input.env[name]) env[name] = input.env[name];
    }
    env.SUPABASE_ACCESS_TOKEN = input.env.SUPABASE_ACCESS_TOKEN;
    const args = ['db', 'push', '--linked', '--project-ref', input.config.projectRef,
      '--workdir', directory, '--skip-vault', '--yes', ...(dryRun ? ['--dry-run'] : [])];
    const result = execute('supabase', args, { env, shell: false, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
    requireGate(!result.error && result.status === 0, 'MIGRATION_EXECUTION_FAILED_NO_AUTOMATIC_RETRY');
  } finally {
    // Exact private directory returned by mkdtemp, never a user-supplied path.
    rmSync(directory, { recursive: true, force: true });
  }
}

async function createAdmin(input, marker) {
  try {
    const response = await fetch(`https://${input.config.projectRef}.supabase.co/auth/v1/admin/users`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { apikey: input.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${input.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.env.CLIENT_BOOTSTRAP_ADMIN_EMAIL, password: input.env.CLIENT_BOOTSTRAP_ADMIN_PASSWORD,
        email_confirm: true, app_metadata: { client_install: marker } }),
    });
    requireGate(response.ok, 'BOOTSTRAP_CREATE_FAILED_NO_AUTOMATIC_RETRY');
    const user = await response.json();
    requireGate(/^[0-9a-f-]{36}$/.test(user.id ?? '') && user.email === input.env.CLIENT_BOOTSTRAP_ADMIN_EMAIL, 'BOOTSTRAP_USER_RESPONSE_INVALID');
    return user.id;
  } catch { requireGate(false, 'BOOTSTRAP_CREATE_FAILED_NO_AUTOMATIC_RETRY'); }
}

function userCondition(input, id, marker) {
  return `u.id=${literal(id)}::uuid and u.email=${literal(input.env.CLIENT_BOOTSTRAP_ADMIN_EMAIL)} and u.email_confirmed_at is not null and u.raw_app_meta_data->>'client_install'=${literal(marker)}`;
}

async function inspectAdmin(input, id, marker, role) {
  const condition = userCondition(input, id, marker);
  const rows = await requestJson(`https://api.supabase.com/v1/projects/${input.config.projectRef}/database/query/read-only`, input.env.SUPABASE_ACCESS_TOKEN,
    { query: `select (select count(*)=1 from auth.users) and exists(select 1 from auth.users u join public.profiles p on p.id=u.id join public.user_roles r on r.user_id=u.id where ${condition} and r.role=${literal(role)}) and (select count(*)=1 from public.user_roles) and not exists(select 1 from public.orders) as valid` });
  requireGate(Array.isArray(rows) && rows.length === 1 && rows[0].valid === true, 'BOOTSTRAP_PROOF_FAILED');
}

async function inspectUnused(input) {
  const rows = await requestJson(`https://api.supabase.com/v1/projects/${input.config.projectRef}/database/query/read-only`, input.env.SUPABASE_ACCESS_TOKEN,
    { query: 'select not exists(select 1 from auth.users) and not exists(select 1 from public.user_roles) and not exists(select 1 from public.orders) as valid' });
  requireGate(Array.isArray(rows) && rows.length === 1 && rows[0].valid === true, 'BOOTSTRAP_REQUIRES_UNUSED_INSTALLATION');
}

async function promoteAdmin(input, id, marker) {
  requireGate(/^[0-9a-f-]{36}$/.test(id), 'BOOTSTRAP_ID_INVALID');
  const condition = userCondition(input, id, marker);
  const query = `begin;
select pg_advisory_xact_lock(102018, 2);
lock table auth.users, public.profiles, public.user_roles, public.orders in share row exclusive mode;
do $bootstrap$ begin
if (select count(*) from auth.users) <> 1 or (select count(*) from public.user_roles) <> 1 or exists(select 1 from public.orders)
or not exists(select 1 from auth.users u join public.profiles p on p.id=u.id join public.user_roles r on r.user_id=u.id where ${condition} and r.role='customer') then
raise exception 'Bootstrap state changed'; end if;
update public.user_roles set role='admin' where user_id=${literal(id)}::uuid and role='customer';
if not found then raise exception 'Bootstrap promotion failed'; end if;
end $bootstrap$; commit;`;
  await requestJson(`https://api.supabase.com/v1/projects/${input.config.projectRef}/database/query`, input.env.SUPABASE_ACCESS_TOKEN, { query });
}

// All writes are reachable only through this orchestration. DI is for offline tests,
// not CLI flags; the official command never accepts injected executors or a PASS file.
export async function installClient(command, { root = process.cwd(), load = readInstallInput,
  gate = preflight, payload = migrationPayload, migrate = executeMigrations,
  create = createAdmin, inspect = inspectAdmin, unused = inspectUnused, promote = promoteAdmin } = {}) {
  requireGate(['all', 'migrate', 'bootstrap'].includes(command), 'INSTALL_COMMAND_INVALID');
  const initial = load(root);
  const pinned = structuredClone(initial);
  const inputHash = fingerprint(initial);
  let identityHash;
  let manifestHash;
  let migratedHistory;
  const sameInput = () => requireGate(fingerprint(load(root)) === inputHash, 'INSTALL_INPUT_CHANGED');
  async function check(stage) {
    sameInput();
    const result = await gate({ root, config: structuredClone(pinned.config), env: { ...pinned.env }, stage,
      confirmRef: pinned.env.CLIENT_CONFIRM_PROJECT_REF });
    requireGate(result.status === 'PASS' && result.identity?.ref === pinned.config.projectRef, 'INSTALL_TARGET_MISMATCH');
    const identity = fingerprint(result.identity);
    if (identityHash) requireGate(identityHash === identity && manifestHash === result.manifestDigest, 'INSTALL_TARGET_OR_RELEASE_CHANGED');
    else { identityHash = identity; manifestHash = result.manifestDigest; }
    if (stage === 'migrated') {
      if (migratedHistory) requireGate(migratedHistory === result.historyDigest, 'INSTALL_HISTORY_CHANGED');
      else migratedHistory = result.historyDigest;
    }
    sameInput(); // catches edits during the asynchronous online checks
    return result;
  }
  function assertSameState(a, b) {
    requireGate(fingerprint(a.snapshot) === fingerprint(b.snapshot) && a.historyDigest === b.historyDigest, 'INSTALL_STATE_CHANGED');
  }
  if (command !== 'migrate') {
    requireGate(pinned.env.CLIENT_BOOTSTRAP_ADMIN_EMAIL === pinned.config.emailTestRecipient
      && typeof pinned.env.CLIENT_BOOTSTRAP_ADMIN_PASSWORD === 'string' && pinned.env.CLIENT_BOOTSTRAP_ADMIN_PASSWORD.length >= 16, 'BOOTSTRAP_DEDICATED_TEST_CREDENTIALS_REQUIRED');
  }
  if (command !== 'bootstrap') {
    const first = await check('empty');
    const sql = payload(root);
    requireGate(fingerprint(sql.map(({ file, sha256 }) => ({ file, sha256 }))) === manifestHash, 'EXECUTOR_MIGRATION_MISMATCH');
    await migrate(pinned, sql, true);
    const immediatelyBeforeWrite = await check('empty');
    assertSameState(first, immediatelyBeforeWrite);
    await migrate(pinned, sql, false);
    await check('migrated'); // mismatch/partial execution stops before bootstrap
  }
  if (command !== 'migrate') {
    const first = await check('migrated');
    requireGate(first.snapshot.users === 0 && first.snapshot.objects === 0, 'BOOTSTRAP_REQUIRES_UNUSED_INSTALLATION');
    await unused(pinned);
    const marker = randomUUID();
    assertSameState(first, await check('migrated'));
    const id = await create(pinned, marker);
    requireGate(/^[0-9a-f-]{36}$/.test(id ?? ''), 'BOOTSTRAP_ID_INVALID');
    const afterCreate = await check('migrated');
    requireGate(afterCreate.snapshot.users === 1 && afterCreate.snapshot.objects === 0
      && afterCreate.snapshot.relations === first.snapshot.relations, 'BOOTSTRAP_STATE_CHANGED');
    await inspect(pinned, id, marker, 'customer');
    assertSameState(afterCreate, await check('migrated'));
    await promote(pinned, id, marker);
    await check('migrated');
    await inspect(pinned, id, marker, 'admin');
  }
  return { status: 'PASS', operation: command, target: pinned.config.projectRef };
}
