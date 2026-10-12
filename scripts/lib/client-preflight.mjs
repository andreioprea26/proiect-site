// Dependency-free, read-only gate. No dotenv, CLI link state, writes or cached PASS.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join } from 'node:path';

export const ORIGINAL_REF = 'bdyocajhhylvasfhmnal';
export const EXISTING_DEMO_REF = 'bfmihaxfleztajzyamio';
const forbiddenRefs = [ORIGINAL_REF, EXISTING_DEMO_REF];
export class PreflightError extends Error {}
export function requireGate(ok, code) { if (!ok) throw new PreflightError(code); }
const required = ['SUPABASE_ACCESS_TOKEN', 'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'EMAIL_DELIVERY_MODE', 'EMAIL_TEST_RECIPIENT',
  'RESEND_FROM_EMAIL', 'RESEND_REPLY_TO_EMAIL'];
const mail = value => typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const refPattern = /^[a-z]{20}$/;
export const digest = text => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

export function validateConfig(c, env, stage, confirmRef) {
  requireGate(c?.version === 1 && ['empty', 'migrated', 'e2e'].includes(stage), 'CONFIG_OR_STAGE_INVALID');
  requireGate(['test', 'preview'].includes(c.environment) && c.production === false, 'PRODUCTION_FORBIDDEN');
  requireGate(refPattern.test(c.projectRef) && !forbiddenRefs.includes(c.projectRef), 'PROJECT_REF_FORBIDDEN');
  requireGate(confirmRef === c.projectRef && c.approvedNonProductionRef === c.projectRef, 'TARGET_CONFIRMATION_REQUIRED');
  requireGate(Array.isArray(c.productionRefs) && c.productionRefs.every(r => refPattern.test(r)) && !c.productionRefs.includes(c.projectRef), 'PRODUCTION_TARGET_FORBIDDEN');
  requireGate(refPattern.test(c.previewBranch?.parentProjectRef) && !forbiddenRefs.includes(c.previewBranch.parentProjectRef)
    && c.previewBranch.parentProjectRef !== c.projectRef && /^[0-9a-f-]{36}$/.test(c.previewBranch.id ?? ''), 'REMOTE_PREVIEW_CLASSIFICATION_REQUIRED');
  requireGate(typeof c.projectName === 'string' && c.projectName.trim() && typeof c.organizationId === 'string' && c.organizationId.trim(), 'PROJECT_IDENTITY_REQUIRED');
  requireGate(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+\.git$/.test(c.repository ?? '') && c.repository !== 'https://github.com/andreioprea26/proiect-site.git', 'CLIENT_REPOSITORY_REQUIRED');
  requireGate(c.e2e?.required === true && c.e2e.projectRef === c.projectRef, 'E2E_PLAN_REQUIRED');
  requireGate(typeof c.allowDemoSeed === 'boolean', 'SEED_APPROVAL_REQUIRED');
  for (const name of required) requireGate(typeof env[name] === 'string' && env[name].trim().length > 0, `ENV_MISSING_${name}`);
  requireGate(env.NEXT_PUBLIC_SUPABASE_URL === `https://${c.projectRef}.supabase.co`, 'SUPABASE_URL_MISMATCH');
  requireGate(/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY), 'STRIPE_TEST_REQUIRED');
  requireGate(env.EMAIL_DELIVERY_MODE === 'redirect' && mail(c.emailTestRecipient) && env.EMAIL_TEST_RECIPIENT === c.emailTestRecipient, 'EMAIL_REDIRECT_REQUIRED');
  requireGate(mail(env.RESEND_REPLY_TO_EMAIL) && /^[^\r\n]+$/.test(env.RESEND_FROM_EMAIL) && /^re_[A-Za-z0-9_]+$/.test(env.RESEND_API_KEY), 'EMAIL_CONFIG_INVALID');
  requireGate(typeof c.appUrl === 'string' && /^https:\/\/[a-z0-9.-]+(?::\d+)?$/.test(c.appUrl), 'APP_URL_APPROVAL_REQUIRED');
  if (env.APP_URL || stage === 'e2e') requireGate(env.APP_URL === c.appUrl, 'APP_URL_MISMATCH');
  if (env.STRIPE_WEBHOOK_SECRET || stage === 'e2e') requireGate(/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET ?? ''), 'WEBHOOK_CONFIG_REQUIRED');
  if (stage === 'e2e') {
    for (const name of ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_TEST_EMAIL', 'E2E_TEST_PASSWORD']) {
      requireGate(typeof env[name] === 'string' && env[name].trim().length > 0, `E2E_CONFIG_MISSING_${name}`);
    }
    requireGate(env.E2E_APPROVED_PROJECT_REF === c.projectRef, 'E2E_TARGET_MISMATCH');
  }
}

export function verifyManifest(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'supabase/migration-manifest.json'), 'utf8'));
  requireGate(manifest.version === 1 && manifest.normalization === 'utf8-lf' && Array.isArray(manifest.migrations) && manifest.migrations.length > 0, 'MANIFEST_INVALID');
  const actual = readdirSync(join(root, 'supabase/migrations')).filter(n => n !== '.gitkeep').sort();
  requireGate(actual.length === manifest.migrations.length, 'MANIFEST_COUNT_MISMATCH');
  const versions = new Set();
  manifest.migrations.forEach((entry, i) => {
    requireGate(/^\d{14}_[a-z0-9_]+\.sql$/.test(entry.file) && actual[i] === entry.file, 'MANIFEST_FILE_MISMATCH');
    requireGate(!versions.has(entry.file.slice(0, 14)), 'MANIFEST_DUPLICATE_VERSION');
    versions.add(entry.file.slice(0, 14));
    const path = join(root, 'supabase/migrations', entry.file);
    requireGate(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), 'MANIFEST_FILE_INVALID');
    requireGate(digest(readFileSync(path, 'utf8')) === entry.sha256, 'MANIFEST_HASH_MISMATCH');
  });
  return manifest.migrations;
}

export function forbiddenArtifact(path) {
  const parts = path.replaceAll('\\', '/').toLowerCase().split('/');
  return parts.some(p => ['.vercel', '.supabase', '.next', 'node_modules', '.aws', '.ssh', '.azure', '.terraform', '.npmrc', '.pypirc', 'credentials.json', 'terraform.tfstate', 'test-results', 'playwright-report', 'coverage', '.cache'].includes(p)
    || (p.startsWith('.env') && p !== '.env.example') || /\.(pem|p12|pfx|key|dump|backup|log)$/.test(p))
    || parts.join('/').includes('supabase/.temp');
}

export function containsSecret(text) {
  return /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}|whsec_[A-Za-z0-9]{20,}|re_[A-Za-z0-9]{24,}|sbp_[A-Za-z0-9]{20,}|sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text);
}

export function inspectRepository(root, repository) {
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  requireGate(resolve(git(['rev-parse', '--show-toplevel'])) === resolve(root), 'REPOSITORY_ROOT_MISMATCH');
  requireGate(git(['remote']) === 'origin' && git(['remote', 'get-url', '--all', 'origin']) === repository && git(['remote', 'get-url', '--push', '--all', 'origin']) === repository, 'REPOSITORY_REMOTE_MISMATCH');
  requireGate(!git(['status', '--porcelain', '--untracked-files=all']), 'REPOSITORY_NOT_CLEAN');
  function walk(dir, relative = '') {
    for (const name of readdirSync(dir)) {
      if (!relative && name === '.git') continue;
      const path = relative ? `${relative}/${name}` : name;
      requireGate(!forbiddenArtifact(path), 'COPIED_LOCAL_ARTIFACT');
      const stat = lstatSync(join(dir, name));
      requireGate(!stat.isSymbolicLink(), 'REPOSITORY_SYMLINK_FORBIDDEN');
      if (stat.isDirectory()) walk(join(dir, name), path);
      else {
        requireGate(stat.isFile() && stat.size < 20 * 1024 * 1024, 'REPOSITORY_FILE_UNINSPECTABLE');
        requireGate(!containsSecret(readFileSync(join(dir, name), 'utf8')), 'REPOSITORY_SECRET_PATTERN');
      }
    }
  }
  walk(root);
}

export function validateHistory(entries, migrations, stage, snapshot) {
  requireGate(Array.isArray(entries), 'HISTORY_UNREADABLE');
  requireGate(snapshot && ['relations', 'users', 'objects'].every(k => Number.isSafeInteger(snapshot[k]) && snapshot[k] >= 0), 'DATABASE_SNAPSHOT_INVALID');
  if (stage === 'empty') {
    requireGate(entries.length === 0 && ['relations', 'users', 'objects'].every(k => Number(snapshot[k]) === 0), 'DATABASE_NOT_EMPTY');
  } else {
    requireGate(entries.length === migrations.length, 'HISTORY_COUNT_MISMATCH');
    entries.forEach((entry, i) => requireGate(entry.version === migrations[i].file.slice(0, 14) && entry.name === migrations[i].file.slice(15, -4), 'HISTORY_MISMATCH'));
  }
}

export async function requestJson(url, token, body, fetcher = fetch) {
  try {
    const response = await fetcher(url, { method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
    requireGate(response.ok, 'REMOTE_REQUEST_FAILED');
    return await response.json();
  } catch { throw new PreflightError('REMOTE_REQUEST_FAILED'); }
}

export async function inspectRemote(c, env, fetcher = fetch) {
  const base = `https://api.supabase.com/v1/projects/${c.projectRef}`;
  const api = (url, body) => requestJson(url, env.SUPABASE_ACCESS_TOKEN, body, fetcher);
  const projects = await api('https://api.supabase.com/v1/projects');
  const project = Array.isArray(projects) && projects.find(p => (p.ref ?? p.id) === c.previewBranch.parentProjectRef);
  requireGate(project && project.organization_id === c.organizationId && project.status === 'ACTIVE_HEALTHY', 'REMOTE_PROJECT_IDENTITY_MISMATCH');
  const branches = await api(`https://api.supabase.com/v1/projects/${c.previewBranch.parentProjectRef}/branches`);
  const matches = Array.isArray(branches) ? branches.filter(b => b.project_ref === c.projectRef) : [];
  requireGate(matches.length === 1, 'REMOTE_PREVIEW_CLASSIFICATION_REQUIRED');
  const branch = matches[0];
  requireGate(branch.id === c.previewBranch.id && branch.parent_project_ref === c.previewBranch.parentProjectRef
    && branch.name === c.projectName && branch.is_default === false && branch.with_data === false
    && branch.preview_project_status === 'ACTIVE_HEALTHY', 'REMOTE_PREVIEW_CLASSIFICATION_REQUIRED');
  const identity = { ref: branch.project_ref, branchId: branch.id, parentRef: branch.parent_project_ref,
    name: branch.name, organizationId: project.organization_id, classification: 'non-default-preview-without-data' };
  const keys = await api(`${base}/api-keys?reveal=true`);
  requireGate(Array.isArray(keys), 'REMOTE_KEYS_UNREADABLE');
  for (const [name, role] of [['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'anon'], ['SUPABASE_SERVICE_ROLE_KEY', 'service_role']]) {
    requireGate(keys.some(k => k.api_key === env[name] && (k.name === role || k.type === (role === 'anon' ? 'publishable' : 'secret'))), 'REMOTE_KEY_BINDING_MISMATCH');
  }
  const query = sql => api(`${base}/database/query/read-only`, { query: sql });
  const rows = await query("select pg_catalog.to_regclass('supabase_migrations.schema_migrations') is not null as history_exists, (select count(*)::int from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','f','S')) as relations, (select count(*)::int from auth.users) as users, (select count(*)::int from storage.objects) as objects");
  requireGate(Array.isArray(rows) && rows.length === 1 && typeof rows[0].history_exists === 'boolean', 'DATABASE_SNAPSHOT_INVALID');
  const history = rows[0].history_exists ? await query('select version, name from supabase_migrations.schema_migrations order by version') : [];
  return { history, snapshot: rows[0], identity };
}

export async function preflight({ root, config, env, stage, confirmRef, fetcher = fetch }) {
  validateConfig(config, env, stage, confirmRef);
  inspectRepository(root, config.repository);
  const migrations = verifyManifest(root);
  const { history, snapshot, identity } = await inspectRemote(config, env, fetcher);
  validateHistory(history, migrations, stage, snapshot);
  return { status: 'PASS', stage, migrationCount: migrations.length, remoteMigrationCount: history.length,
    identity, snapshot, manifestDigest: digest(JSON.stringify(migrations)), historyDigest: digest(JSON.stringify(history)) };
}
