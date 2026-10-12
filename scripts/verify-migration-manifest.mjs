import { verifyManifest } from './lib/client-preflight.mjs';
import { reportFailure } from './preflight.mjs';
try { console.log(`Migration manifest PASS: ${verifyManifest(process.cwd()).length} files`); }
catch (error) { reportFailure(error); }
