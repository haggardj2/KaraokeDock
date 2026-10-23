import express from 'express';
import type { Server } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWebAppRouter } from './webApp';

describe('registered web pages', () => {
  let directory: string;
  let server: Server;
  let origin: string;
  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'karaokedock-routes-'));
    await writeFile(path.join(directory, 'index.html'), '<html><head><script>window.__ENV__={old:true}</script></head><body><div id="root"></div></body></html>');
    await writeFile(path.join(directory, 'host-sw.js'), '/* service worker */');
    const app = express();
    for (const route of ['/api/settings/public', '/api/auth/oidc/callback', '/privacy', '/terms', '/media/example', '/health']) {
      app.get(route, (_req, res) => res.send('existing route'));
    }
    app.use(createWebAppRouter(directory, '<script>window.__ENV__={API_BASE:window.location.origin}</script>'));
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    server?.closeAllConnections();
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it.each(['/', '/player', '/host', '/admin', '/request', '/player/', '/request?social=complete'])('serves the app at %s', async route => {
    const response = await fetch(origin + route);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="root"');
    expect(body).toContain('API_BASE:window.location.origin');
    expect(body).not.toContain('old:true');
  });

  it.each(['/cast-diagnostics', '/cast-receiver', '/unknown', '/host/extra', '/Host', '/player//', '/index.html', '/%69ndex.html', '/missing.js', '/api/missing'])('returns an actual 404 without the app shell at %s', async route => {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(origin + route, { method });
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain('id="root"');
    }
  });

  it('preserves legacy request links and login query parameters via redirect', async () => {
    const response = await fetch(`${origin}/requests/?social=complete`, { redirect: 'manual' });
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('/request?social=complete');
  });

  it.each(['/api/settings/public', '/api/auth/oidc/callback', '/privacy', '/terms', '/media/example', '/health', '/host-sw.js'])('preserves existing services and assets at %s', async route => {
    const response = await fetch(origin + route);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('id="root"');
  });

  it('does not serve the app for POST requests', async () => {
    expect((await fetch(`${origin}/player`, { method: 'POST' })).status).toBe(404);
  });
});
