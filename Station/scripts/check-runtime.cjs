const { execFileSync } = require('node:child_process');
const path = require('node:path');

execFileSync(require('electron'), [
  '--require',
  path.resolve(__dirname, '../../src/server/scripts/check-runtime.cjs'),
  '-e',
  '',
], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: 'inherit',
});
