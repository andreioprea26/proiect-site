import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { digest, preflight, validateConfig, validateHistory, verifyManifest, containsSecret, ORIGINAL_REF } from '../../scripts/lib/client-preflight.mjs';
import { seedDemo } from '../../scripts/seed-demo.mjs';

const ref = 'abcdefghijklmnopqrst';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'client-preflight-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'supabase/migrations'), { recursive: true });
  const sql = 'select 1;\n';
  const migrations = [{ file: '20260101000000_initial.sql', sha256: digest(sql) }];
  writeFileSync(join(root, 'supabase/migrations', migrations[0].file), sql);
  writeFileSync(join(root, 'supabase/migration-manifest.json'), JSON.stringify({ version: 1, normalization: 'utf8-lf', migrations }));
  const config = { version: 1, environment: 'preview', production: false, projectRef: ref,
    approvedNonProductionRef: ref, productionRefs: [], projectName: 'New client test', organizationId: 'org-test',
    repository: 'https://github.com/example/client-test.git', appUrl: 'https://client-test.vercel.app',
    emailTestRecipient: 'qa@example.invalid', allowDemoSeed: false, e2e: { required: true, projectRef: ref } };
  const env = { SUPABASE_ACCESS_TOKEN: 'fixture-token', NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service',
    STRIPE_SECRET_KEY: ['sk', 'test', 'fixture'].join('_'), RESEND_API_KEY: 're_fixture',
    EMAIL_DELIVERY_MODE: 'redirect', EMAIL_TEST_RECIPIENT: config.emailTestRecipient,
    RESEND_FROM_EMAIL: 'Demo <test@example.invalid>', RESEND_REPLY_TO_EMAIL: 'qa@example.invalid' };
  const git = args => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git(['init']); git(['remote', 'add', 'origin', config.repository]);
  const commit = () => { git(['add', '.']); git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture']); };
  commit();
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    let data;
    if (url.endsWith('/projects')) data = [{ id: ref, name: config.projectName, organization_id: config.organizationId, status: 'ACTIVE_HEALTHY' }];
    else if (url.includes('/api-keys?')) data = [{ name: 'anon', api_key: 'fixture-public' }, { name: 'service_role', api_key: 'fixture-service' }];
    else if (url.endsWith('/database/query/read-only')) data = [{ history_exists: false, relations: 0, users: 0, objects: 0 }];
    else throw new Error('Unexpected endpoint');
    return { ok: true, json: async () => data };
  };
  return { root, config, env, stage: 'empty', confirmRef: ref, fetcher, calls, migrations, git, commit };
}

test('valid empty client passes with only read-only remote calls', async t => {
  const f = fixture(t);
  assert.equal((await preflight(f)).status, 'PASS');
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every(c => c.options.method === 'GET' || c.url.endsWith('/query/read-only')));
});

for (const [title, mutate, code] of [
  ['missing env', f => delete f.env.RESEND_API_KEY, 'ENV_MISSING_RESEND_API_KEY'],
  ['original project', f => f.config.projectRef = ORIGINAL_REF, 'PROJECT_REF_FORBIDDEN'],
  ['Production', f => f.config.environment = 'production', 'PRODUCTION_FORBIDDEN'],
  ['Production flag', f => f.config.production = true, 'PRODUCTION_FORBIDDEN'],
  ['known Production ref', f => f.config.productionRefs = [ref], 'PRODUCTION_TARGET_FORBIDDEN'],
  ['no confirmation', f => f.confirmRef = '', 'TARGET_CONFIRMATION_REQUIRED'],
  ['Stripe Live', f => f.env.STRIPE_SECRET_KEY = ['sk', 'live', 'fixture'].join('_'), 'STRIPE_TEST_REQUIRED'],
  ['unsafe email mode', f => f.env.EMAIL_DELIVERY_MODE = 'production', 'EMAIL_REDIRECT_REQUIRED'],
  ['wrong email recipient', f => f.env.EMAIL_TEST_RECIPIENT = 'other@example.invalid', 'EMAIL_REDIRECT_REQUIRED'],
  ['wrong URL', f => f.env.NEXT_PUBLIC_SUPABASE_URL = 'https://other.supabase.co', 'SUPABASE_URL_MISMATCH'],
  ['missing E2E plan', f => delete f.config.e2e, 'E2E_PLAN_REQUIRED'],
  ['missing seed decision', f => delete f.config.allowDemoSeed, 'SEED_APPROVAL_REQUIRED'],
]) test(`${title} blocks before any network`, async t => {
  const f = fixture(t); mutate(f);
  await assert.rejects(preflight(f), new RegExp(code)); assert.equal(f.calls.length, 0);
});

for (const artifact of ['.env.local', '.vercel/project.json', '.supabase/config', 'supabase/.temp/project-ref', '.next/cache', 'node_modules/copied', 'nested/.env.production', '.aws/credentials']) {
  test(`copied ignored artifact ${artifact} blocks`, async t => {
    const f = fixture(t);
    writeFileSync(join(f.root, '.gitignore'), artifact + '\n'); f.commit();
    const path = join(f.root, artifact); mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, 'fixture');
    await assert.rejects(preflight(f), /COPIED_LOCAL_ARTIFACT/); assert.equal(f.calls.length, 0);
  });
}
test('manifest edited migration, missing and extra migrations all block', t => {
  const f = fixture(t); const file = join(f.root, 'supabase/migrations', f.migrations[0].file);
  writeFileSync(file, 'select 2;'); assert.throws(() => verifyManifest(f.root), /HASH_MISMATCH/);
  rmSync(file); assert.throws(() => verifyManifest(f.root), /COUNT_MISMATCH/);
  writeFileSync(file, 'select 1;\n'); writeFileSync(join(f.root, 'supabase/migrations/extra.sql'), 'select 1;');
  assert.throws(() => verifyManifest(f.root), /COUNT_MISMATCH/);
});
test('manifest tolerates Windows line endings only', t => {
  const f = fixture(t); writeFileSync(join(f.root, 'supabase/migrations', f.migrations[0].file), 'select 1;\r\n');
  assert.equal(verifyManifest(f.root).length, 1);
});
test('original or additional remote blocks', async t => {
  const f = fixture(t); f.git(['remote', 'add', 'upstream', 'https://github.com/andreioprea26/proiect-site.git']);
  await assert.rejects(preflight(f), /REPOSITORY_REMOTE_MISMATCH/);
});
test('network errors are redacted and cannot pass', async t => {
  const f = fixture(t); f.fetcher = async () => { throw new Error('sensitive response'); };
  await assert.rejects(preflight(f), e => e.message === 'REMOTE_REQUEST_FAILED');
});
test('foreign Supabase key blocks', async t => {
  const f = fixture(t); f.env.SUPABASE_SERVICE_ROLE_KEY = 'wrong-key';
  await assert.rejects(preflight(f), /REMOTE_KEY_BINDING_MISMATCH/);
});
test('missing or paused project blocks', async t => {
  const f = fixture(t); f.fetcher = async () => ({ ok: true, json: async () => [] });
  await assert.rejects(preflight(f), /REMOTE_PROJECT_IDENTITY_MISMATCH/);
});
test('exact migrated history passes, partial/extra/renamed histories fail', t => {
  const f = fixture(t); const snapshot = { relations: 36, users: 0, objects: 0 };
  const entries = [{ version: '20260101000000', name: 'initial' }];
  assert.doesNotThrow(() => validateHistory(entries, f.migrations, 'migrated', snapshot));
  for (const bad of [[], [...entries, ...entries], [{ version: '20260101000000', name: 'other' }]])
    assert.throws(() => validateHistory(bad, f.migrations, 'migrated', snapshot), /HISTORY/);
  assert.throws(() => validateHistory([], f.migrations, 'empty', snapshot), /DATABASE_NOT_EMPTY/);
  assert.throws(() => validateHistory([], f.migrations, 'empty', { relations: 0, users: 1, objects: 0 }), /DATABASE_NOT_EMPTY/);
});
test('E2E stage fails clearly without credentials; complete config passes', t => {
  const f = fixture(t);
  Object.assign(f.env, { APP_URL: f.config.appUrl, STRIPE_WEBHOOK_SECRET: 'whsec_fixture' });
  assert.throws(() => validateConfig(f.config, f.env, 'e2e', ref), /E2E_CONFIG_MISSING/);
  Object.assign(f.env, { E2E_ADMIN_EMAIL: 'a@example.invalid', E2E_ADMIN_PASSWORD: 'fixture', E2E_TEST_EMAIL: 'b@example.invalid', E2E_TEST_PASSWORD: 'fixture', E2E_APPROVED_PROJECT_REF: ref });
  assert.doesNotThrow(() => validateConfig(f.config, f.env, 'e2e', ref));
});
test('secret scanner detects generated secrets without printing them', () => {
  assert.equal(containsSecret(['sk', 'live', 'x'.repeat(30)].join('_')), true);
  assert.equal(containsSecret('const value = process.env.STRIPE_SECRET_KEY'), false);
});
test('CLI input failure is redacted and exits nonzero', () => {
  const result = spawnSync(process.execPath, ['scripts/preflight.mjs', 'empty'], { encoding: 'utf8', env: { ...process.env, CLIENT_INSTALL_CONFIG: '' } });
  assert.equal(result.status, 1); assert.match(result.stderr, /EXTERNAL_CONFIG_REQUIRED/);
});
test('release manifest matches all versioned migrations', () => {
  assert.equal(verifyManifest(process.cwd()).length, 29);
});
test('seed entrypoint always gates writes and has no default apply', () => {
  const source = readFileSync(new URL('../../scripts/seed-demo.mjs', import.meta.url), 'utf8');
  assert.ok(source.indexOf('await gate') < source.indexOf('await request'));
  assert.match(source, /config.allowDemoSeed === true/);
  const result = spawnSync(process.execPath, ['scripts/seed-demo.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 1); assert.match(result.stderr, /USE_SEED/);
});

test('failed preflight and missing seed approval cannot invoke writer', async () => {
  let writes = 0;
  const request = async () => { writes++; };
  await assert.rejects(seedDemo(['catalog', '--apply'], { gate: async () => { throw new Error('BLOCKED'); }, request }), /BLOCKED/);
  await assert.rejects(seedDemo(['catalog', '--apply'], { gate: async () => ({ config: { allowDemoSeed: false } }), request }), /DEMO_SEED_NOT_APPROVED/);
  assert.equal(writes, 0);
});
test('seed binds reviewed fictional payload to approved ref and explicit mode', async () => {
  const calls = [];
  const gate = async (_root, stage) => { assert.equal(stage, 'migrated'); return { config: { allowDemoSeed: true, projectRef: ref } }; };
  const request = async (url, _token, body) => calls.push({ url, body });
  await seedDemo(['catalog', '--dry-run'], { gate, request });
  await seedDemo(['shipping', '--apply'], { gate, request });
  assert.equal(calls.length, 2);
  assert.ok(calls.every(c => c.url.includes(ref) && c.body.query.includes(ref) && !c.body.query.includes('bfmihaxfleztajzyamio')));
  assert.match(calls[0].body.query, /rollback;$/);
  assert.match(calls[1].body.query, /commit;$/);
});
test('HTTP rejection and malformed provider results fail closed', async t => {
  const f = fixture(t);
  f.fetcher = async () => ({ ok: false, json: async () => ({ secret: 'never print' }) });
  await assert.rejects(preflight(f), /REMOTE_REQUEST_FAILED/);
  f.fetcher = async () => ({ ok: true, json: async () => { throw new Error('private response'); } });
  await assert.rejects(preflight(f), e => e.message === 'REMOTE_REQUEST_FAILED');
});
