import { writeFileSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { readInstallInput, reportFailure } from './preflight.mjs';
import { validateConfig, inspectRepository, verifyManifest, inspectRemote, validateHistory, requireGate } from './lib/client-preflight.mjs';
import { approvalChallenge, issueTargetApproval } from './lib/target-approval.mjs';

// Only local approval output. Every remote request is GET or database/query/read-only.
async function main() {
  const stage = process.argv[2] ?? 'empty';
  requireGate(process.argv.length <= 3 && ['empty', 'migrated'].includes(stage) && process.stdin.isTTY && process.stdout.isTTY, 'INTERACTIVE_OWNER_ENROLLMENT_REQUIRED');
  const root = process.cwd();
  const { config, env } = readInstallInput(root);
  requireGate(!config.previewBranch, 'STANDALONE_ENROLLMENT_ONLY');
  validateConfig(config, env, stage, env.CLIENT_CONFIRM_PROJECT_REF);
  inspectRepository(root, config.repository);
  const migrations = verifyManifest(root);
  const remote = await inspectRemote(config, env);
  validateHistory(remote.history, migrations, stage, remote.snapshot);
  const output = env.CLIENT_TARGET_APPROVAL;
  requireGate(output && isAbsolute(output), 'EXTERNAL_TARGET_APPROVAL_REQUIRED');
  const rel = relative(realpathSync(root), realpathSync(dirname(output)));
  requireGate(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel), 'APPROVAL_MUST_BE_OUTSIDE_REPOSITORY');
  console.log('Verified remote identity:', JSON.stringify(remote.identity));
  console.log('Owner must check the client inventory: this is a NEW dedicated Test/Preview project, never Production. Decline if uncertain. Approval expires in 24 hours.');
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try { answer = await prompt.question(`Type exactly: ${approvalChallenge(remote.identity)}\n> `); } finally { prompt.close(); }
  const again = await inspectRemote(config, env);
  requireGate(JSON.stringify(again) === JSON.stringify(remote), 'TARGET_CHANGED_DURING_ENROLLMENT');
  writeFileSync(resolve(output), JSON.stringify(issueTargetApproval(config, env, remote.identity, answer)), { flag: 'wx', mode: 0o600 });
  console.log('Target approval created outside repository. No remote writes.');
}
main().catch(reportFailure);
