import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { digest, requireGate, validateConfig, preflight, ORIGINAL_REF, EXISTING_DEMO_REF } from '../../scripts/lib/client-preflight.mjs';
import { installClient, executeMigrations } from '../../scripts/lib/client-install.mjs';

function fixture() {
  const ref = 'abcdefghijklmnopqrst';
  const state = { migrated: false, users: 0, role: 'customer' };
  const writes = []; const checks = [];
  const input = { config: { projectRef: ref, emailTestRecipient: 'qa@example.invalid' }, env: {
    CLIENT_CONFIRM_PROJECT_REF: ref, CLIENT_BOOTSTRAP_ADMIN_EMAIL: 'qa@example.invalid', CLIENT_BOOTSTRAP_ADMIN_PASSWORD: 'test-only-password-not-used-remotely' } };
  const sql = [{ file: '20260101000000_initial.sql', sha256: digest('select 1;'), sql: 'select 1;' }];
  const hash = digest(JSON.stringify(sql.map(({ file, sha256 }) => ({ file, sha256 }))));
  const options = {
    load: () => structuredClone(input), payload: () => structuredClone(sql),
    gate: async ({ stage, config }) => {
      checks.push(stage);
      requireGate(stage === (state.migrated ? 'migrated' : 'empty'), 'HISTORY_MISMATCH');
      return { status: 'PASS', identity: { ref: config.projectRef, branchId: 'test-branch' }, manifestDigest: hash,
        historyDigest: state.migrated ? 'complete' : 'empty', snapshot: { users: state.users, objects: 0, relations: state.migrated ? 36 : 0 } };
    },
    migrate: async (target, payload, dryRun) => {
      assert.equal(target.config.projectRef, ref); assert.deepEqual(payload, sql);
      if (!dryRun) { writes.push('migrations'); state.migrated = true; }
    },
    create: async (target, marker) => {
      assert.equal(target.config.projectRef, ref); assert.ok(marker);
      writes.push('create'); state.users = 1; return '11111111-1111-4111-8111-111111111111';
    },
    inspect: async (_input, _id, _marker, role) => assert.equal(state.role, role),
    unused: async () => {},
    promote: async () => { writes.push('promote'); state.role = 'admin'; },
  };
  return { input, state, writes, checks, options, sql };
}
test('official all flow gates migrations, checks post-state, bootstraps, verifies final state', async () => {
  const f = fixture(); assert.equal((await installClient('all', f.options)).status, 'PASS');
  assert.deepEqual(f.writes, ['migrations', 'create', 'promote']);
  assert.deepEqual(f.checks, ['empty', 'empty', 'migrated', 'migrated', 'migrated', 'migrated', 'migrated', 'migrated']);
});
test('preflight thrown FAIL means zero writer calls', async () => {
  const f = fixture(); f.options.gate = async () => { requireGate(false, 'PREFLIGHT_FAIL'); };
  await assert.rejects(installClient('all', f.options), /PREFLIGHT_FAIL/); assert.deepEqual(f.writes, []);
});
test('preflight returned FAIL cannot authorize executor', async () => {
  const f = fixture(); f.options.gate = async () => ({ status: 'FAIL' });
  await assert.rejects(installClient('all', f.options), /INSTALL_TARGET_MISMATCH/); assert.deepEqual(f.writes, []);
});
test('migration payload mismatch means zero writer calls', async () => {
  const f = fixture(); f.options.payload = () => [{ file: 'different', sha256: 'different' }];
  await assert.rejects(installClient('migrate', f.options), /EXECUTOR_MIGRATION_MISMATCH/); assert.deepEqual(f.writes, []);
});
test('remote migration history changes between dry-run and apply: zero writes', async () => {
  const f = fixture(); const original = f.options.gate;
  f.options.gate = async args => { const result = await original(args); if (f.checks.length === 2) result.historyDigest = 'unexpected'; return result; };
  await assert.rejects(installClient('migrate', f.options), /INSTALL_STATE_CHANGED/); assert.deepEqual(f.writes, []);
});
test('remote target changes between validation and execution: zero writes', async () => {
  const f = fixture(); const original = f.options.gate;
  f.options.gate = async args => { const result = await original(args); if (f.checks.length === 2) result.identity.ref = 'other'; return result; };
  await assert.rejects(installClient('all', f.options), /INSTALL_TARGET_MISMATCH/); assert.deepEqual(f.writes, []);
});
test('local target changes during async gate: zero writes', async () => {
  const f = fixture(); const original = f.options.gate;
  f.options.gate = async args => { const result = await original(args); f.input.config.projectRef = 'other'; return result; };
  await assert.rejects(installClient('all', f.options), /INSTALL_INPUT_CHANGED/); assert.deepEqual(f.writes, []);
});
test('bootstrap before migrations is rejected before writer', async () => {
  const f = fixture(); await assert.rejects(installClient('bootstrap', f.options), /HISTORY_MISMATCH/); assert.deepEqual(f.writes, []);
});
test('post-migration mismatch prevents bootstrap', async () => {
  const f = fixture(); f.options.migrate = async (_input, _sql, dryRun) => { if (!dryRun) f.writes.push('migrations'); };
  await assert.rejects(installClient('all', f.options), /HISTORY_MISMATCH/); assert.deepEqual(f.writes, ['migrations']);
});
test('migration error stops entire flow without retry or cleanup', async () => {
  const f = fixture(); f.options.migrate = async (_input, _sql, dryRun) => { if (!dryRun) { f.writes.push('migrations'); throw new Error('execution failed'); } };
  await assert.rejects(installClient('all', f.options), /execution failed/); assert.deepEqual(f.writes, ['migrations']);
});
test('bootstrap create error prevents promotion', async () => {
  const f = fixture(); f.state.migrated = true;
  f.options.create = async () => { f.writes.push('create'); throw new Error('create failed'); };
  await assert.rejects(installClient('bootstrap', f.options), /create failed/); assert.deepEqual(f.writes, ['create']);
});
test('target change before promotion prevents role write', async () => {
  const f = fixture(); f.state.migrated = true;
  f.options.inspect = async () => { f.input.config.projectRef = 'other'; };
  await assert.rejects(installClient('bootstrap', f.options), /INSTALL_INPUT_CHANGED/); assert.deepEqual(f.writes, ['create']);
});
test('existing users refuse account takeover', async () => {
  const f = fixture(); f.state.migrated = true; f.state.users = 1;
  await assert.rejects(installClient('bootstrap', f.options), /BOOTSTRAP_REQUIRES_UNUSED_INSTALLATION/); assert.deepEqual(f.writes, []);
});
test('missing dedicated bootstrap credentials stop before migrations', async () => {
  const f = fixture(); delete f.input.env.CLIENT_BOOTSTRAP_ADMIN_PASSWORD;
  await assert.rejects(installClient('all', f.options), /BOOTSTRAP_DEDICATED_TEST_CREDENTIALS_REQUIRED/); assert.deepEqual(f.writes, []);
});
test('real CLI adapter pins target, copies only reviewed migrations and skips vault/seed/roles', () => {
  const f = fixture(); let workdir;
  executeMigrations(f.input, f.sql, false, (file, args, options) => {
    assert.equal(file, 'supabase'); assert.equal(options.shell, false);
    assert.equal(args[args.indexOf('--project-ref') + 1], f.input.config.projectRef);
    assert.ok(args.includes('--skip-vault')); assert.ok(!args.includes('--include-seed') && !args.includes('--include-roles'));
    workdir = args[args.indexOf('--workdir') + 1];
    assert.equal(readFileSync(`${workdir}/supabase/migrations/${f.sql[0].file}`, 'utf8'), 'select 1;');
    assert.equal(options.env.SUPABASE_SERVICE_ROLE_KEY, undefined);
    return { status: 0 };
  });
  assert.equal(existsSync(workdir), false);
});
test('CLI adapter stops on executor error without leaking its output', () => {
  const f = fixture();
  assert.throws(() => executeMigrations(f.input, f.sql, false, () => ({ status: 1, stderr: 'sensitive text' })), /MIGRATION_EXECUTION_FAILED_NO_AUTOMATIC_RETRY/);
});
test('official CLI requires explicit apply and blocks bad config without cloud calls', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['client:install'], 'node scripts/install-client.mjs');
  for (const args of [[], ['all'], ['all', '--apply']]) {
    const result = spawnSync(process.execPath, ['scripts/install-client.mjs', ...args], { encoding: 'utf8', env: { ...process.env, CLIENT_INSTALL_CONFIG: '' } });
    assert.equal(result.status, 1); assert.match(result.stderr, /BLOCKED/);
  }
});

for (const target of ['production', 'unapproved', ORIGINAL_REF, EXISTING_DEMO_REF]) {
  test(`runner refuses ${target} through the central validator with zero writes`, async () => {
    const f = fixture();
    Object.assign(f.input.config, { version: 1, environment: target === 'production' ? 'production' : 'preview', production: false,
      projectRef: [ORIGINAL_REF, EXISTING_DEMO_REF].includes(target) ? target : 'abcdefghijklmnopqrst', approvedNonProductionRef: 'unapproved' });
    f.options.gate = async ({ config, env, stage, confirmRef }) => validateConfig(config, env, stage, confirmRef);
    await assert.rejects(installClient('all', f.options), /PRODUCTION_FORBIDDEN|PROJECT_REF_FORBIDDEN|TARGET_CONFIRMATION_REQUIRED/);
    assert.deepEqual(f.writes, []);
  });
}
test('guest orders without users stop bootstrap before create', async () => {
  const f = fixture(); f.state.migrated = true;
  f.options.unused = async () => { requireGate(false, 'BOOTSTRAP_REQUIRES_UNUSED_INSTALLATION'); };
  await assert.rejects(installClient('bootstrap', f.options), /BOOTSTRAP_REQUIRES_UNUSED_INSTALLATION/);
  assert.deepEqual(f.writes, []);
});

test('runner integrates the real preflight/repository/manifest with simulated remote state', async t => {
  const f = fixture();
  const root = mkdtempSync(join(tmpdir(), 'client-install-integration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'supabase/migrations'), { recursive: true });
  writeFileSync(join(root, 'supabase/migrations', f.sql[0].file), f.sql[0].sql);
  writeFileSync(join(root, 'supabase/migration-manifest.json'), JSON.stringify({ version: 1, normalization: 'utf8-lf', migrations: f.sql.map(({ file, sha256 }) => ({ file, sha256 })) }));
  Object.assign(f.input.config, { version: 1, environment: 'preview', production: false, approvedNonProductionRef: f.input.config.projectRef,
    productionRefs: [], projectName: 'new-client-preview', organizationId: 'new-org', repository: 'https://github.com/example/new-client.git',
    previewBranch: { parentProjectRef: 'zyxwvutsrqponmlkjihg', id: '11111111-1111-4111-8111-111111111111' },
    appUrl: 'https://new-client.example.invalid', allowDemoSeed: false, e2e: { required: true, projectRef: f.input.config.projectRef } });
  Object.assign(f.input.env, { SUPABASE_ACCESS_TOKEN: 'fixture', NEXT_PUBLIC_SUPABASE_URL: `https://${f.input.config.projectRef}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', STRIPE_SECRET_KEY: ['sk', 'test', 'fixture'].join('_'),
    RESEND_API_KEY: 're_fixture', EMAIL_DELIVERY_MODE: 'redirect', EMAIL_TEST_RECIPIENT: 'qa@example.invalid', RESEND_FROM_EMAIL: 'qa@example.invalid', RESEND_REPLY_TO_EMAIL: 'qa@example.invalid' });
  const git = args => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git(['init']); git(['remote', 'add', 'origin', f.input.config.repository]); git(['add', '.']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture']);
  let reads = 0;
  const fetcher = async (url, options) => {
    reads++;
    assert.ok(options.method === 'GET' || url.endsWith('/query/read-only'));
    const c = f.input.config;
    let data;
    if (url.endsWith('/projects')) data = [{ id: c.previewBranch.parentProjectRef, organization_id: c.organizationId, status: 'ACTIVE_HEALTHY' }];
    else if (url.endsWith('/branches')) data = [{ id: c.previewBranch.id, project_ref: c.projectRef, parent_project_ref: c.previewBranch.parentProjectRef, name: c.projectName, is_default: false, with_data: false, preview_project_status: 'ACTIVE_HEALTHY' }];
    else if (url.includes('/api-keys?')) data = [{ name: 'anon', api_key: 'fixture-public' }, { name: 'service_role', api_key: 'fixture-service' }];
    else if (JSON.parse(options.body).query.startsWith('select version')) data = [{ version: '20260101000000', name: 'initial' }];
    else data = [{ history_exists: f.state.migrated, relations: f.state.migrated ? 36 : 0, users: f.state.users, objects: 0 }];
    return { ok: true, json: async () => data };
  };
  f.options.root = root;
  f.options.gate = args => preflight({ ...args, fetcher });
  assert.equal((await installClient('all', f.options)).status, 'PASS');
  assert.deepEqual(f.writes, ['migrations', 'create', 'promote']);
  assert.ok(reads >= 32);
});
