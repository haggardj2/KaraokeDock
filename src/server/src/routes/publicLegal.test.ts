import express from 'express';
import type { Server } from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetting } from '../db.js';
import { defaultSocialConfig } from '../socialAuthConfig.js';
import { publicLegalRouter } from './publicLegal.js';

vi.mock('../db.js', () => ({ getSetting: vi.fn(), withTransaction: vi.fn() }));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(publicLegalRouter);
  app.get('/{*path}', (_req, res) => res.status(404).send('Not a legal page'));
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('WEB_APP_URL', '');
  vi.stubEnv('STATION_MODE', 'false');
  vi.mocked(getSetting).mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe('public legal pages', () => {
  it.each([['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service']])(
    'serves complete, accessible HTML at %s without an account, OAuth setup, or JavaScript', async (path, title) => {
      const response = await fetch(`${baseUrl}${path}`);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
      expect(html).toContain(`<!doctype html>`);
      expect(html).toContain('<html lang="en">');
      expect(html).toContain(`<h1>${title}</h1>`);
      expect(html).toContain('datetime="2026-09-14"');
      expect(html).toContain('aria-label="Public pages"');
      expect(html).toContain('href="/privacy#data-deletion"');
      expect(html).toContain('href="/favicon.ico"');
      expect(html).toContain('sizes="32x32" href="/favicon-32x32.png"');
      expect(html).toContain('href="/apple-touch-icon.png"');
      expect(response.headers.get('content-security-policy')).toContain("img-src 'self'");
      expect(html).not.toContain('<script');
      expect(html).not.toContain('id="root"');
    },
  );

  it('publishes configured operator details and a request-page link, without exposing provider settings or secrets', async () => {
    const config = defaultSocialConfig();
    config.operatorName = 'Example & Friends';
    config.contactEmail = 'privacy@example.com';
    config.frontendUrl = 'https://requests.example.com';
    config.google = { enabled: true, clientId: 'private-client-id', clientSecret: 'private-secret', redirectUri: 'https://api.example.com/callback' };
    vi.mocked(getSetting).mockResolvedValue(config);
    for (const path of ['/privacy', '/terms']) {
      const response = await fetch(`${baseUrl}${path}`);
      const html = await response.text();
      expect(html).toContain('Example &amp; Friends');
      expect(html).toContain('href="mailto:privacy%40example.com"');
      expect(html).toContain('privacy@example.com');
      expect(html).toContain('href="https://requests.example.com/"');
      expect(html).toContain('href="https://requests.example.com/favicon.ico"');
      expect(response.headers.get('content-security-policy')).toContain("img-src 'self' https://requests.example.com;");
      expect(html).not.toContain('private-client-id');
      expect(html).not.toContain('private-secret');
      expect(html).not.toContain('https://api.example.com/callback');
    }
  });

  it('escapes operator-supplied markup instead of interpreting it as HTML', async () => {
    vi.mocked(getSetting).mockResolvedValue({
      ...defaultSocialConfig(), operatorName: '<script>alert("test")</script>',
    });
    const html = await (await fetch(`${baseUrl}/privacy`)).text();
    expect(html).toContain('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('explains collection, public visibility, retention, provider revocation, and manual data deletion', async () => {
    const html = await (await fetch(`${baseUrl}/privacy`)).text();
    for (const text of [
      'openid profile', 'public_profile', 'do not request your email address',
      'Some singer and history views are publicly accessible', 'local browser storage',
      'no fixed automatic deletion period', 'Google account connections', 'Facebook Apps and Websites',
      'id="data-deletion"', 'Do not send passwords', 'not by an automatic Facebook deletion callback',
      'the karaoke host or venue',
    ]) expect(html).toContain(text);
  });

  it('keeps pages available in Station mode and supports direct trailing-slash and HEAD requests', async () => {
    vi.stubEnv('STATION_MODE', 'true');
    expect((await fetch(`${baseUrl}/privacy/`)).status).toBe(200);
    const head = await fetch(`${baseUrl}/terms`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-type')).toContain('text/html');
    expect(await head.text()).toBe('');
  });

  it('discloses explicit same-person account linking and its authorization implications', async () => {
    const html = await (await fetch(`${baseUrl}/privacy`)).text();
    expect(html).toContain('An administrator can explicitly link a social login to a password or OIDC account in User Manager after confirming they belong to the same person.');
    expect(html).toContain('The linked login can access the combined profile, queue, and history');
    expect(html).toContain("receives the kept account's permissions, including administrator access when explicitly authorized");
    expect(html).toContain('not automatically merged based on matching names or sign-in providers');
    expect(html).toContain('merged profiles retain a consistent picture source');
  });

  it('surfaces storage failures instead of publishing an incorrect operator or success-shaped fallback', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSetting).mockRejectedValue(new Error('sensitive database details'));
    const response = await fetch(`${baseUrl}/privacy`);
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('temporarily unavailable');
    expect(JSON.stringify(log.mock.calls)).not.toContain('sensitive database details');
    log.mockRestore();
  });
});
