// Node's security releases backport the fix without changing the Brotli version.
const backportedFix = require('node:zlib').constants.BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH === -17;
const version = process.versions.brotli;
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || '');
const [major, minor, patch] = match ? match.slice(1).map(Number) : [];
const patched = major > 1 || (major === 1 && (
  minor > 2 ||
  (minor === 2 && patch >= 1) ||
  (minor === 1 && patch >= 1) ||
  (minor === 0 && patch >= 10)
));

if (!patched && !backportedFix) {
  throw new Error(
    `CVE-2026-111497: refusing to start with Node.js ${process.versions.node} ` +
    `and unpatched or unknown Brotli ${version || '(missing)'}. ` +
    'Use Node.js 22.23.4+, 24.22.1+, or 26.12.1+ in the corresponding release line. ' +
    'Station requires an Electron release bundling patched Brotli; updating system Node.js is not sufficient.',
  );
}
