import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { containsSecret } from './lib/client-preflight.mjs';
// Snapshot scan, not a promise of exhaustive history/entropy coverage.
try {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\0').filter(Boolean);
  const hits = files.filter(file => containsSecret(readFileSync(file, 'utf8'))).length;
  console.log(`Secret scan: ${hits ? 'FAIL' : 'PASS'}; files=${files.length}; matches=${hits}`);
  process.exitCode = hits ? 1 : 0;
} catch {
  console.error('Secret scan: BLOCKED; unable to inspect snapshot');
  process.exitCode = 1;
}
