// Optional client seed; never imports application code or copies original config.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runPreflight, reportFailure } from './preflight.mjs';
import { requireGate, requestJson } from './lib/client-preflight.mjs';

export async function seedDemo(args, { gate = runPreflight, request = requestJson } = {}) {
  requireGate(args.length === 2 && ['catalog', 'shipping'].includes(args[0]) && ['--dry-run', '--apply'].includes(args[1]), 'USE_SEED_catalog_OR_shipping_AND_EXPLICIT_MODE');
  const { config } = await gate(process.cwd(), 'migrated');
  requireGate(config.allowDemoSeed === true, 'DEMO_SEED_NOT_APPROVED');
  const file = args[0] === 'catalog' ? 'handmade-demo.sql' : 'handmade-demo-shipping.sql';
  // Reviewed fictional payload is identical. Only the SQL guard ref is rebound
  // after live target verification; no user-controlled SQL fragments are accepted.
  const sql = readFileSync(join(process.cwd(), 'supabase/seeds', file), 'utf8')
    .replaceAll('bfmihaxfleztajzyamio', config.projectRef);
  const query = `begin; select set_config('demo_seed.authorized_ref','${config.projectRef}',true);\n${sql}\n${args[1] === '--apply' ? 'commit' : 'rollback'};`;
  await request(`https://api.supabase.com/v1/projects/${config.projectRef}/database/query`, process.env.SUPABASE_ACCESS_TOKEN, { query });
  return args[1] === '--apply' ? 'Demo seed PASS: transaction committed' : 'Demo seed PASS: rolled back';
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seedDemo(process.argv.slice(2)).then(message => console.log(message)).catch(reportFailure);
}
