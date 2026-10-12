import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { digest, preflight, validateConfig, validateHistory, verifyManifest, containsSecret, ORIGINAL_REF, EXISTING_DEMO_REF } from '../../scripts/lib/client-preflight.mjs';
import { seedDemo } from '../../scripts/seed-demo.mjs';
import { issueTargetApproval, approvalChallenge } from '../../scripts/lib/target-approval.mjs';
import { installClient } from '../../scripts/lib/client-install.mjs';

const ref = 'abcdefghijklmnopqrst';
function standalone(t) {
  const f = fixture(t);
  delete f.config.previewBranch;
  const dir = mkdtempSync(join(tmpdir(), 'owner-approval-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  f.env.CLIENT_TARGET_APPROVAL = join(dir, 'approval.json');
  f.env.CLIENT_TARGET_APPROVAL_KEY = 'ab'.repeat(32);
  f.identity = { ref, id: ref, name: f.config.projectName, organizationId: f.config.organizationId,
    createdAt: '2026-10-12T00:00:00Z', classification: 'standalone-owner-attested' };
  f.approve = () => writeFileSync(f.env.CLIENT_TARGET_APPROVAL,
    JSON.stringify(issueTargetApproval(f.config, f.env, f.identity, approvalChallenge(f.identity))));
  f.approve();
  const previous = f.fetcher;
  f.fetcher = async (url, options) => url.endsWith('/projects')
    ? { ok: true, json: async () => [{ id: f.identity.id, name: f.identity.name,
      organization_id: f.identity.organizationId, created_at: f.identity.createdAt, status: 'ACTIVE_HEALTHY' }] }
    : previous(url, options);
  return f;
}

test('standalone remotely verified and explicitly approved passes without branches API', async t => {
  const f = standalone(t);
  assert.equal((await preflight(f)).status, 'PASS');
  assert.ok(f.calls.every(c => !c.url.endsWith('/branches')));
});
for (const [name, mutate, error] of [
  ['missing approval', f => delete f.env.CLIENT_TARGET_APPROVAL, /EXTERNAL_TARGET_APPROVAL_REQUIRED/],
  ['changed remote identity', f => f.identity.createdAt = '2026-10-11T00:00:00Z', /APPROVED_IDENTITY/],
  ['changed organization', f => f.identity.organizationId = 'other', /REMOTE_PROJECT_IDENTITY/],
  ['foreign credential', f => f.env.SUPABASE_SERVICE_ROLE_KEY = 'other', /REMOTE_KEY_BINDING/],
  ['Production', f => f.config.production = true, /PRODUCTION_FORBIDDEN/],
  ['known Production', f => f.config.productionRefs = [ref], /PRODUCTION_TARGET_FORBIDDEN/],
  ['Development', f => f.config.projectRef = ORIGINAL_REF, /PROJECT_REF_FORBIDDEN/],
  ['Demo', f => f.config.projectRef = EXISTING_DEMO_REF, /PROJECT_REF_FORBIDDEN/],
  ['wrong trust key', f => f.env.CLIENT_TARGET_APPROVAL_KEY = 'cd'.repeat(32), /APPROVAL_SIGNATURE/],
  ['changed local approval config', f => f.config.allowDemoSeed = true, /APPROVED_IDENTITY_OR_CONFIG/],
]) test(`standalone ${name} fails`, async t => {
  const f = standalone(t); mutate(f); await assert.rejects(preflight(f), error);
});
test('enrollment requires exact explicit owner challenge', t => {
  const f = standalone(t);
  assert.throws(() => issueTargetApproval(f.config, f.env, f.identity, 'yes'), /EXPLICIT_OWNER/);
});
test('enrollment CLI refuses noninteractive approval and bypass flags', () => {
  for (const args of [[], ['--yes']]) {
    const result = spawnSync(process.execPath, ['scripts/authorize-client-target.mjs', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /INTERACTIVE_OWNER_ENROLLMENT_REQUIRED/);
  }
});
test('expired enrollment fails closed', async t => {
  const f = standalone(t);
  writeFileSync(f.env.CLIENT_TARGET_APPROVAL, JSON.stringify(issueTargetApproval(f.config, f.env, f.identity,
    approvalChallenge(f.identity), Date.now() - 86400001)));
  await assert.rejects(preflight(f), /APPROVAL_EXPIRED/);
});
for (const scenario of ['valid', 'manifest mismatch', 'target drift', 'bootstrap early', 'approval revoked']) {
  test(`standalone real preflight through runner: ${scenario}`, async t => {
    const f = standalone(t); let migrated = false; let users = 0; const writes = [];
    Object.assign(f.env, { CLIENT_CONFIRM_PROJECT_REF: ref, CLIENT_BOOTSTRAP_ADMIN_EMAIL: f.config.emailTestRecipient,
      CLIENT_BOOTSTRAP_ADMIN_PASSWORD: 'fixture-password-only' });
    const original = f.fetcher;
    const fetcher = async (url, options) => {
      if (!url.endsWith('/query/read-only')) return original(url, options);
      const data = JSON.parse(options.body).query.startsWith('select version')
        ? [{ version: '20260101000000', name: 'initial' }]
        : [{ history_exists: migrated, relations: migrated ? 36 : 0, users, objects: 0 }];
      return { ok: true, json: async () => data };
    };
    const options = { root: f.root, load: () => ({ config: f.config, env: f.env }),
      gate: args => preflight({ ...args, fetcher }),
      migrate: async (_input, _sql, dryRun) => {
        if (dryRun) {
          if (scenario === 'target drift') f.identity.createdAt = '2026-10-11T00:00:00Z';
          if (scenario === 'approval revoked') rmSync(f.env.CLIENT_TARGET_APPROVAL);
        } else { writes.push('migrate'); migrated = true; }
      }, unused: async () => {}, inspect: async () => {},
      create: async () => { writes.push('create'); users = 1; return '11111111-1111-4111-8111-111111111111'; },
      promote: async () => { writes.push('promote'); } };
    if (scenario === 'manifest mismatch') {
      writeFileSync(join(f.root, 'supabase/migrations', f.migrations[0].file), 'select 2;'); f.commit();
    }
    if (scenario === 'valid') {
      assert.equal((await installClient('all', options)).status, 'PASS');
      assert.deepEqual(writes, ['migrate', 'create', 'promote']);
    } else {
      await assert.rejects(installClient(scenario === 'bootstrap early' ? 'bootstrap' : 'all', options));
      assert.deepEqual(writes, []);
    }
  });
}
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
    previewBranch: { parentProjectRef: 'zyxwvutsrqponmlkjihg', id: '11111111-1111-4111-8111-111111111111' },
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
    if (url.endsWith('/projects')) data = [{ id: config.previewBranch.parentProjectRef, organization_id: config.organizationId, status: 'ACTIVE_HEALTHY' }];
    else if (url.endsWith('/branches')) data = [{ id: config.previewBranch.id, project_ref: ref, parent_project_ref: config.previewBranch.parentProjectRef, name: config.projectName, is_default: false, with_data: false, preview_project_status: 'ACTIVE_HEALTHY' }];
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
  assert.equal(f.calls.length, 4);
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

for (const stage of ['empty', 'migrated', 'e2e']) {
  test(`existing demo is forbidden in ${stage}, even with matching history/approval`, async t => {
    const f = fixture(t);
    f.stage = stage; f.confirmRef = EXISTING_DEMO_REF;
    Object.assign(f.config, { projectRef: EXISTING_DEMO_REF, approvedNonProductionRef: EXISTING_DEMO_REF });
    f.config.e2e.projectRef = EXISTING_DEMO_REF;
    f.env.NEXT_PUBLIC_SUPABASE_URL = `https://${EXISTING_DEMO_REF}.supabase.co`;
    const matching = [{ version: '20260101000000', name: 'initial' }];
    assert.doesNotThrow(() => validateHistory(matching, f.migrations, 'migrated', { relations: 36, users: 0, objects: 0 }));
    await assert.rejects(preflight(f), /PROJECT_REF_FORBIDDEN/);
    assert.equal(f.calls.length, 0);
  });
}
for (const mutation of [b => b.is_default = true, b => b.with_data = true,
  b => b.project_ref = 'zzzzzzzzzzzzzzzzzzzz', b => b.preview_project_status = 'INACTIVE',
  b => b.parent_project_ref = ORIGINAL_REF]) {
  test('remote classification mismatch rejects operator-declared Preview', async t => {
    const f = fixture(t); const original = f.fetcher;
    f.fetcher = async (url, options) => {
      const result = await original(url, options);
      if (!url.endsWith('/branches')) return result;
      const rows = await result.json(); mutation(rows[0]);
      return { ok: true, json: async () => rows };
    };
    await assert.rejects(preflight(f), /REMOTE_PREVIEW_CLASSIFICATION_REQUIRED/);
  });
}
