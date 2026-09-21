import express from 'express';
import type { Server } from 'node:http';
import { createHash } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, getSetting, getUserById, withTransaction, query } from '../db.js';
import { ensureAuthenticatedSinger } from '../authenticatedSinger.js';
import { resolveSocialIdentity } from '../socialIdentity.js';
import { exchangeSocialProviderCode, SocialAuthStore, socialAuthorizationUrl, SOCIAL_EXCHANGE_TTL_MS, SOCIAL_STATE_TTL_MS } from '../socialAuth.js';
import { defaultSocialConfig, SOCIAL_CONFIG_KEY, type SocialConfig } from '../socialAuthConfig.js';
import { createSocialAuthRouter } from './socialAuth.js';

vi.mock('../db.js', () => ({ createSession: vi.fn(), getSetting: vi.fn(), getUserById: vi.fn(), withTransaction: vi.fn(), query: vi.fn() }));
vi.mock('../authenticatedSinger.js', () => ({ ensureAuthenticatedSinger: vi.fn() }));
vi.mock('../socialIdentity.js', () => ({ resolveSocialIdentity: vi.fn() }));
vi.mock('../socialAuth.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../socialAuth.js')>(),
  socialAuthorizationUrl: vi.fn(), exchangeSocialProviderCode: vi.fn(),
}));

const verifier = 'v'.repeat(43);
const codeChallenge = createHash('sha256').update(verifier).digest('base64url');
const user = {
  id: 12, singer_id: '42', username: 'social_google_random', display_name: 'Singer',
  picture: 'https://images.example/profile', is_active: true, role: 'user',
  social_provider: 'google', social_subject: 'subject', oidc_subject: null,
};
let config: SocialConfig | null;
let baseUrl: string;
let server: Server;
let now = 0;
const store = new SocialAuthStore(() => now);
const onLogin = vi.fn();

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  const adminGuard: express.RequestHandler = (req, res, next) => {
    if (req.headers['x-session-token'] !== 'admin-token') {
      res.status(403).json({ error: 'Admin role required' });
    } else next();
  };
  app.use('/api', createSocialAuthRouter(adminGuard, onLogin, store));
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STATION_MODE', 'false');
  vi.stubEnv('WEB_APP_URL', '');
  store.clear();
  now = 0;
  config = defaultSocialConfig();
  config.enabled = true;
  config.frontendUrl = 'https://web.example';
  for (const provider of ['google', 'facebook'] as const) {
    config[provider] = { enabled: true, clientId: `${provider}-client`, clientSecret: `${provider}-secret`, redirectUri: `https://api.example/api/auth/social/${provider}/callback` };
  }
  vi.mocked(getSetting).mockImplementation(async (key) => key === SOCIAL_CONFIG_KEY ? config : null);
  vi.mocked(getUserById).mockResolvedValue(user as any);
  vi.mocked(query).mockResolvedValue({ rows: [] } as any);
  vi.mocked(createSession).mockResolvedValue('private-session-token');
  vi.mocked(resolveSocialIdentity).mockResolvedValue(user as any);
  vi.mocked(ensureAuthenticatedSinger).mockResolvedValue({ id: 42n } as any);
  vi.mocked(socialAuthorizationUrl).mockImplementation(async (_config, provider, state) =>
    `https://${provider}.example/authorize?state=${state}`);
  vi.mocked(exchangeSocialProviderCode).mockResolvedValue({ subject: 'subject', name: 'Singer', picture: user.picture });
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({
    query: async (sql: string, params: unknown[]) => {
      if (sql.startsWith('SELECT value')) return { rows: config ? [{ value: config }] : [] };
      if (sql.startsWith('INSERT INTO settings')) config = JSON.parse(params[1] as string);
      return { rows: [] };
    },
  } as any));
});
afterEach(() => vi.unstubAllEnvs());

async function request(path: string, body?: unknown, method = 'POST', token?: string) {
  return fetch(`${baseUrl}${path}`, {
    method, redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session-token': token } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
}
async function start(provider = 'google') {
  const response = await request(`/auth/social/${provider}/start`, { codeChallenge });
  expect(response.status).toBe(200);
  const data = await response.json() as { authorizationUrl: string };
  return new URL(data.authorizationUrl).searchParams.get('state')!;
}
async function callback(state: string, provider = 'google') {
  return request(`/auth/social/${provider}/callback?state=${state}&code=provider-code`, undefined, 'GET');
}
async function exchangeCode() {
  const response = await callback(await start());
  expect(response.status).toBe(302);
  const location = new URL(response.headers.get('location')!);
  expect(location.origin).toBe('https://web.example');
  expect(location.pathname).toBe('/');
  return location.searchParams.get('social_code')!;
}

describe('social configuration routes', () => {
  it('returns disabled defaults and no credentials publicly', async () => {
    config = null;
    const response = await request('/auth/social/config', undefined, 'GET');
    expect(await response.json()).toEqual({ enabled: false, providers: { google: false, facebook: false } });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('advertises only fully configured globally enabled providers', async () => {
    config!.facebook.clientSecret = '';
    expect(await (await request('/auth/social/config', undefined, 'GET')).json())
      .toEqual({ enabled: true, providers: { google: true, facebook: false } });
    config!.enabled = false;
    expect(await (await request('/auth/social/config', undefined, 'GET')).json())
      .toEqual({ enabled: false, providers: { google: false, facebook: false } });
  });
  it.each([undefined, 'user-token'])('restricts settings reads and writes to administrators: %s', async (token) => {
    expect((await request('/admin/settings/social', undefined, 'GET', token)).status).toBe(403);
    expect((await request('/admin/settings/social', config, 'PUT', token)).status).toBe(403);
    expect(withTransaction).not.toHaveBeenCalled();
  });
  it('masks stored secrets, retains omitted secrets, and explicitly clears empty ones', async () => {
    const response = await request('/admin/settings/social', undefined, 'GET', 'admin-token');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const read = await response.json() as SocialConfig;
    expect(read.google.clientSecret).toBe('***');
    const saved = await request('/admin/settings/social', {
      ...read, google: { ...read.google, clientSecret: undefined }, facebook: { ...read.facebook, clientSecret: '' },
    }, 'PUT', 'admin-token');
    expect(saved.status).toBe(200);
    expect((await saved.json() as SocialConfig).google.clientSecret).toBe('***');
    expect(config!.google.clientSecret).toBe('google-secret');
    expect(config!.facebook.clientSecret).toBe('');
  });
  it('validates URLs/types and refuses station configuration', async () => {
    expect((await request('/admin/settings/social', { ...config, frontendUrl: 'http://untrusted.example' }, 'PUT', 'admin-token')).status).toBe(400);
    vi.stubEnv('STATION_MODE', 'true');
    expect(await (await request('/auth/social/config', undefined, 'GET')).json())
      .toEqual({ enabled: false, providers: { google: false, facebook: false } });
    expect(await (await request('/admin/settings/social', undefined, 'GET', 'admin-token')).json()).toMatchObject({ stationMode: true, enabled: false });
    expect((await request('/admin/settings/social', config, 'PUT', 'admin-token')).status).toBe(403);
  });
  it('saves public operator contacts through the admin-only settings endpoint', async () => {
    const updated = { ...config, operatorName: 'Example Venue', contactEmail: 'privacy@example.com' };
    expect((await request('/admin/settings/social', updated, 'PUT', 'user-token')).status).toBe(403);
    expect(config!.operatorName).toBe('');
    const response = await request('/admin/settings/social', updated, 'PUT', 'admin-token');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      operatorName: 'Example Venue', contactEmail: 'privacy@example.com', google: { clientSecret: '***' },
    });
  });
});

describe('browser-bound social login routes', () => {
  it('accepts browser starts from the configured frontend even when the API uses a separate origin', async () => {
    const response = await fetch(`${baseUrl}/auth/social/google/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://web.example' },
      body: JSON.stringify({ codeChallenge }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ authorizationUrl: expect.stringContaining('google.example') });
  });

  it.each(['https://other.example', 'https://web.example:8443', 'http://web.example', 'null'])(
    'rejects a mismatched browser origin %s before starting OAuth and explains the configured public URL', async (origin) => {
      const response = await fetch(`${baseUrl}/auth/social/google/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ codeChallenge }),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Social sign-in is configured for https://web.example. Open that public URL to sign in, or ask an administrator to correct the frontend URL.',
      });
      expect(socialAuthorizationUrl).not.toHaveBeenCalled();
    },
  );

  it('completes the same browser-bound exchange for a Facebook identity', async () => {
    const facebookUser = { ...user, social_provider: 'facebook' };
    vi.mocked(resolveSocialIdentity).mockResolvedValue(facebookUser as any);
    vi.mocked(getUserById).mockResolvedValue(facebookUser as any);
    const response = await callback(await start('facebook'), 'facebook');
    const code = new URL(response.headers.get('location')!).searchParams.get('social_code');
    expect(code).toBeTruthy();
    expect((await request('/auth/social/exchange', { code, codeVerifier: verifier })).status).toBe(200);
    expect(resolveSocialIdentity).toHaveBeenCalledWith('facebook', expect.objectContaining({ subject: 'subject' }));
  });

  it('returns a normal user session only after browser proof, never tokens in redirects', async () => {
    const code = await exchangeCode();
    expect(createSession).not.toHaveBeenCalled();
    const response = await request('/auth/social/exchange', { code, codeVerifier: verifier });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      ok: true, sessionToken: 'private-session-token', role: 'user',
      username: user.username, displayName: user.display_name, picture: user.picture,
    });
    expect(createSession).toHaveBeenCalledWith(30, 12, 'user', 12);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });
  it('rejects wrong proofs without issuing a session and prevents concurrent exchange/replay', async () => {
    const code = await exchangeCode();
    expect((await request('/auth/social/exchange', { code, codeVerifier: 'w'.repeat(43) })).status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
    const responses = await Promise.all([
      request('/auth/social/exchange', { code, codeVerifier: verifier }),
      request('/auth/social/exchange', { code, codeVerifier: verifier }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect((await request('/auth/social/exchange', { code, codeVerifier: verifier })).status).toBe(400);
  });
  it('consumes callback states before asynchronous work so duplicate callbacks cannot provision twice', async () => {
    const state = await start();
    const responses = await Promise.all([callback(state), callback(state)]);
    const locations = responses.map((r) => r.headers.get('location')!);
    expect(locations.filter((url) => url.includes('social_code='))).toHaveLength(1);
    expect(locations.filter((url) => url.includes('social_error='))).toHaveLength(1);
    expect(resolveSocialIdentity).toHaveBeenCalledTimes(1);
    expect(exchangeSocialProviderCode).toHaveBeenCalledTimes(1);
  });
  it('rejects expired callback states and expired exchanges at the TTL boundary', async () => {
    const state = await start();
    now += SOCIAL_STATE_TTL_MS;
    expect((await callback(state)).headers.get('location')).toContain('social_error=');
    expect(exchangeSocialProviderCode).not.toHaveBeenCalled();
    const code = await exchangeCode();
    now += SOCIAL_EXCHANGE_TTL_MS;
    expect((await request('/auth/social/exchange', { code, codeVerifier: verifier })).status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });
  it.each(['global', 'provider', 'credentials', 'station'])('gates start and callback when %s is disabled', async (gate) => {
    const state = await start();
    if (gate === 'global') config!.enabled = false;
    if (gate === 'provider') config!.google.enabled = false;
    if (gate === 'credentials') config!.google.clientSecret = '';
    if (gate === 'station') vi.stubEnv('STATION_MODE', 'true');
    expect((await request('/auth/social/google/start', { codeChallenge })).status).toBe(403);
    expect((await callback(state)).headers.get('location')).toContain('social_error=');
    expect(exchangeSocialProviderCode).not.toHaveBeenCalled();
    expect(resolveSocialIdentity).not.toHaveBeenCalled();
  });
  it.each(['provider', 'global', 'account', 'missing-account', 'changed-config'])('gates exchange after %s changes', async (gate) => {
    const code = await exchangeCode();
    if (gate === 'provider') config!.google.enabled = false;
    if (gate === 'global') config!.enabled = false;
    if (gate === 'account') vi.mocked(getUserById).mockResolvedValue({ ...user, is_active: false } as any);
    if (gate === 'missing-account') vi.mocked(getUserById).mockResolvedValue(null);
    if (gate === 'changed-config') config!.google.clientSecret = 'rotated-secret';
    expect((await request('/auth/social/exchange', { code, codeVerifier: verifier })).status).toBe(403);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('never elevates a social session even when the local account was promoted', async () => {
    const code = await exchangeCode();
    vi.mocked(getUserById).mockResolvedValue({ ...user, role: 'admin' } as any);
    expect((await request('/auth/social/exchange', { code, codeVerifier: verifier })).status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(30, 12, 'user', 12);
  });
  it('uses an explicitly linked canonical account role, username and presentation', async () => {
    const canonical = { ...user, id: 7, username: 'admin@example.com', role: 'admin', oidc_subject: 'oidc-id',
      social_provider: null, social_subject: null, display_name: 'Canonical Name', picture: 'https://images.example/canonical' };
    const linked = { ...user, canonical_user_id: 7 };
    vi.mocked(resolveSocialIdentity).mockResolvedValue(linked as any);
    vi.mocked(getUserById).mockImplementation(async (id) => (id === 7 ? canonical : linked) as any);
    const code = await exchangeCode();
    const response = await request('/auth/social/exchange', { code, codeVerifier: verifier });
    expect(await response.json()).toMatchObject({
      role: 'admin', username: 'admin@example.com', displayName: 'Canonical Name', picture: canonical.picture,
    });
    expect(createSession).toHaveBeenCalledWith(30, 7, 'admin', 12);
    expect(ensureAuthenticatedSinger).toHaveBeenCalledWith(canonical);
  });
  it.each(['disabled', 'missing', 'linked-target'])('rejects a %s canonical target at exchange time', async (state) => {
    const code = await exchangeCode();
    const canonical = { ...user, id: 7, oidc_subject: 'oidc-id', social_provider: null, social_subject: null,
      is_active: state !== 'disabled', canonical_user_id: state === 'linked-target' ? 99 : null };
    vi.mocked(getUserById).mockImplementation(async (id) =>
      (id === 12 ? { ...user, canonical_user_id: 7 } : state === 'missing' ? null : canonical) as any);
    expect((await request('/auth/social/exchange', { code, codeVerifier: verifier })).status).toBe(403);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('clears in-flight exchanges when an administrator saves settings', async () => {
    const code = await exchangeCode();
    expect((await request('/admin/settings/social', config, 'PUT', 'admin-token')).status).toBe(200);
    expect((await request('/auth/social/exchange', { code, codeVerifier: verifier })).status).toBe(400);
  });
  it('returns fixed safe error redirects without leaking provider details or changing the return origin', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(exchangeSocialProviderCode).mockRejectedValueOnce(new Error('access_token=secret code=private-code'));
    const state = await start();
    const response = await request(`/auth/social/google/callback?state=${state}&code=private-code&returnTo=https://evil.example`, undefined, 'GET');
    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://web.example');
    expect(location.searchParams.get('social_error')).toBe('Social sign-in failed. Please try again.');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-code');
    log.mockRestore();
  });
  it('rejects malformed challenges/providers before network calls and handles cross-provider state confusion', async () => {
    expect((await request('/auth/social/google/start', { codeChallenge: 'invalid' })).status).toBe(400);
    expect((await request('/auth/social/other/start', { codeChallenge })).status).toBe(404);
    const state = await start();
    expect((await callback(state, 'facebook')).headers.get('location')).toContain('social_error=');
    expect((await callback(state)).headers.get('location')).toContain('social_code=');
    expect(exchangeSocialProviderCode).toHaveBeenCalledTimes(1);
  });
});
