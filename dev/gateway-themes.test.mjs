import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GATEWAY_THEMES_PATH, renderGatewayThemesCss } from './sync-gateway-themes.mjs';

test('Gateway themes.css matches the shared Station themes', () => {
  assert.equal(
    readFileSync(GATEWAY_THEMES_PATH, 'utf8'),
    renderGatewayThemesCss(),
    'Run `node dev/sync-gateway-themes.mjs` after changing src/web/src/theme.ts',
  );
});
