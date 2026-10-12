import { readFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { preflight, requireGate, PreflightError } from './lib/client-preflight.mjs';

export function readInstallInput(root = process.cwd()) {
  const configPath = process.env.CLIENT_INSTALL_CONFIG;
  requireGate(configPath && isAbsolute(configPath), 'EXTERNAL_CONFIG_REQUIRED');
  const rel = relative(resolve(root), resolve(configPath));
  requireGate(rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel), 'CONFIG_MUST_BE_OUTSIDE_REPOSITORY');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  return { config, env: { ...process.env } };
}

export async function runPreflight(root = process.cwd(), stageOverride) {
  const { config, env } = readInstallInput(root);
  const stage = stageOverride ?? process.argv[2];
  const result = await preflight({ root, config, stage, env, confirmRef: env.CLIENT_CONFIRM_PROJECT_REF });
  return { config, result };
}

export function reportFailure(error) {
  console.error(`BLOCKED: ${error instanceof PreflightError ? error.message : 'PREFLIGHT_INPUT_OR_TOOL_ERROR'}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) reportFailure(new PreflightError('USE_PREFLIGHT_empty_migrated_OR_e2e'));
  else runPreflight().then(({ result }) => console.log(JSON.stringify(result))).catch(reportFailure);
}
