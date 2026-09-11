import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let source = await readFile(require.resolve('croppie/croppie.js'), 'utf8');

// Croppie 2.6.5 forces anonymous CORS, even for its non-canvas image preview.
// Keep the pinned package intact and let our local copy honor enableCrossOrigin.
for (const [before, after] of [
  ['function loadImage(src, doExif)', 'function loadImage(src, doExif, enableCrossOrigin)'],
  ['if (src.match(/^https?:\\/\\/|^\\/\\//))', 'if (enableCrossOrigin !== false && src.match(/^https?:\\/\\/|^\\/\\//))'],
  ['loadImage(url, hasExif).then', 'loadImage(url, hasExif, self.options.enableCrossOrigin).then'],
]) {
  if (source.split(before).length !== 2) throw new Error('Croppie source changed; review the local CORS compatibility patch.');
  source = source.replace(before, after);
}

const output = new URL('../dist/vendor/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('croppie.js', output), source);
