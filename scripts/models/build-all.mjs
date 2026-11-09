// Regenerates every model: runs each scripts/models/*.mjs (except this file) in its own process.
// npm run models
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const scripts = readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'build-all.mjs');
let failed = 0;
for (const file of scripts) {
  const r = spawnSync(process.execPath, [join(dir, file)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
if (!scripts.length) console.log('No model scripts yet.');
process.exitCode = failed ? 1 : 0;
