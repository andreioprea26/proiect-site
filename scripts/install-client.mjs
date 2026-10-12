import { installClient } from './lib/client-install.mjs';
import { requireGate } from './lib/client-preflight.mjs';
import { reportFailure } from './preflight.mjs';

try {
  requireGate(process.argv.length === 4 && process.argv[3] === '--apply', 'USE_INSTALL_all_migrate_OR_bootstrap_WITH_EXPLICIT_APPLY');
  console.log(JSON.stringify(await installClient(process.argv[2])));
} catch (error) { reportFailure(error); }
