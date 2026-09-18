import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';

const ref = 'bfmihaxfleztajzyamio';
const isolated = parseEnv(readFileSync('.env.e2e-demo.local', 'utf8'));
if (isolated.E2E_APPROVED_PROJECT_REF !== ref || isolated.NEXT_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co`) {
  throw new Error('Demo environment target mismatch');
}
for (const key of ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  const claims = JSON.parse(Buffer.from(isolated[key].split('.')[1], 'base64url').toString());
  if (claims.ref !== ref) throw new Error('Demo key binding mismatch');
}
for (const key of ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_TEST_EMAIL', 'E2E_TEST_PASSWORD']) {
  if (!isolated[key]) throw new Error(`Missing isolated config: ${key}`);
}
if (isolated.STRIPE_SECRET_KEY !== 'sk_test_playwright_placeholder' || isolated.RESEND_API_KEY !== '') {
  throw new Error('E2E requires disabled external payment/email providers');
}
const args = process.argv.slice(2);
if (!args.length || args.some(arg => !/^(--full|--list|[a-z0-9-]+\.spec\.tsx?)$/.test(arg))) {
  throw new Error('Use --full, --list, or explicit spec filenames');
}
const env = { ...process.env, ...isolated, E2E_DEMO: '1', PLAYWRIGHT_REUSE_EXISTING_SERVER: '' };
function run(file, parameters) {
  const result = spawnSync(process.execPath, [file, ...parameters], { env, stdio: 'inherit' });
  if (result.error) throw new Error('Could not start test subprocess');
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!args.includes('--list')) run('node_modules/next/dist/bin/next', ['build']);
run('node_modules/@playwright/test/cli.js', ['test', '--project=chromium', '--reporter=line,./tests/e2e/demo-no-skips-reporter.ts', ...args.filter(a => a !== '--full')]);
