// Explicit operator action for the approved demo only; never loads ambient .env.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ref = 'bfmihaxfleztajzyamio';
const url = `https://${ref}.supabase.co`;
const output = resolve('.env.e2e-demo.local');
const marker = 'handmade-demo-e2e-10b2d';
const accounts = [
  { email: 'e2e-admin-10b2d@example.invalid', role: 'admin' },
  { email: 'e2e-customer-10b2d@example.invalid', role: 'customer' },
];
const cli = (args) => execFileSync('supabase', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const fail = (message) => { throw new Error(message); };
const jwtRef = (key) => {
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).ref; }
  catch { return null; }
};

async function main() {
  if (process.argv.slice(2).join(' ') !== `--project-ref=${ref} --provision`) fail('Explicit approved demo ref and --provision required.');
  if (existsSync(output)) fail('Demo env already exists; refuse overwrite or credential rotation.');
  const keys = JSON.parse(cli(['projects', 'api-keys', '--project-ref', ref, '--output', 'json']));
  const anon = keys.find(k => k.name === 'anon')?.api_key;
  const service = keys.find(k => k.name === 'service_role')?.api_key;
  if (!anon || !service || jwtRef(anon) !== ref || jwtRef(service) !== ref) fail('Demo key project binding failed.');
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const admin = createClient(url, service, options);
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existing.error || existing.data.users.length >= 1000) fail('Cannot safely check existing users.');
  if (existing.data.users.some(u => accounts.some(a => a.email === u.email))) fail('Fixture email already exists; refuse account takeover or password reset.');
  for (const account of accounts) account.password = randomBytes(32).toString('base64url');
  // Save generated credentials before remote creation, so partial failures remain recoverable.
  // Ignored by Git; do not log, publish or use this file against another project.
  const env = {
    E2E_APPROVED_PROJECT_REF: ref,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    E2E_ADMIN_EMAIL: accounts[0].email,
    E2E_ADMIN_PASSWORD: accounts[0].password,
    E2E_TEST_EMAIL: accounts[1].email,
    E2E_TEST_PASSWORD: accounts[1].password,
    APP_URL: 'http://127.0.0.1:3100',
    STRIPE_SECRET_KEY: 'sk_test_playwright_placeholder',
    STRIPE_WEBHOOK_SECRET: 'whsec_playwright_placeholder',
    RESEND_API_KEY: '', RESEND_FROM_EMAIL: '', RESEND_REPLY_TO_EMAIL: '',
    EMAIL_DELIVERY_MODE: 'redirect', EMAIL_TEST_RECIPIENT: '',
  };
  writeFileSync(output, Object.entries(env).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join('\n')+'\n', { flag: 'wx', mode: 0o600 });
  for (const account of accounts) {
    const result = await admin.auth.admin.createUser({ email: account.email, password: account.password,
      email_confirm: true, app_metadata: { fixture: marker } });
    if (result.error || !result.data.user) fail(`Could not create ${account.role} fixture; local credentials retained for recovery.`);
    account.id = result.data.user.id;
    if (!/^[0-9a-f-]{36}$/.test(account.id)) fail('Unexpected fixture UUID.');
  }
  // SQL changes only the app role of the exact new marked fixture; no grants/RLS changes.
  cli(['db', 'query', '--linked', '--project-ref', ref,
    `begin; do $$ begin
      assert exists(select 1 from auth.users where id='${accounts[0].id}' and email='${accounts[0].email}' and raw_app_meta_data->>'fixture'='${marker}');
      update public.user_roles set role='admin' where user_id='${accounts[0].id}' and role='customer';
      assert found, 'Expected new customer role before promotion';
    end $$; commit;`]);
  for (const account of accounts) {
    const client = createClient(url, anon, options);
    const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (login.error || login.data.user?.id !== account.id) fail(`Fixture login failed: ${account.role}`);
    const roles = await client.from('user_roles').select('role').eq('user_id', account.id);
    if (roles.error || !roles.data?.some(r => r.role === account.role)) fail(`Fixture role check failed: ${account.role}`);
    await client.auth.signOut({ scope: 'local' });
    console.log(`${account.role} fixture: created, login PASS, own-role PASS`);
  }
  if (!readFileSync(output, 'utf8').includes(ref)) fail('Local env verification failed.');
  console.log('Demo-only local env saved. Original .env.local unchanged. No table grants modified.');
}

main().catch(error => {
  // Never emit provider/CLI errors: they may contain request headers or secrets.
  console.error(error?.status !== undefined ? 'Supabase CLI operation failed; sensitive output suppressed.' : error.message);
  process.exitCode = 1;
});
