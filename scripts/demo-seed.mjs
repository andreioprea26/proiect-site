// Explicitly scoped operator tool. Never loads .env or uses a linked project.
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const ref = 'bfmihaxfleztajzyamio';
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== `--project-ref=${ref}` || !['--dry-run', '--apply'].includes(args[1])) {
  throw new Error('Use --project-ref=bfmihaxfleztajzyamio and exactly --dry-run or --apply. Demo only.');
}
const sql = readFileSync(new URL('../supabase/seeds/handmade-demo.sql', import.meta.url), 'utf8');
const directory = mkdtempSync(join(tmpdir(), 'handmade-seed-'));
try {
  const file = join(directory, 'seed.sql');
  writeFileSync(file, `begin;\nselect set_config('demo_seed.authorized_ref','${ref}',true);\n${sql}\n${args[1] === '--apply' ? 'commit' : 'rollback'};\n`);
  const result = spawnSync('supabase', ['db', 'query', '--linked', '--project-ref', ref, '--file', file], { encoding: 'utf8', shell: false });
  if (result.error) throw new Error('Could not start Supabase CLI.');
  if (result.status !== 0) { process.stderr.write(result.stderr || result.stdout); process.exitCode = 1; }
  else console.log(args[1] === '--apply' ? 'Demo seed transaction committed (existing complete seed is unchanged).' : 'Demo seed dry-run PASS; transaction rolled back.');
} finally { rmSync(directory, { recursive: true, force: true }); }
