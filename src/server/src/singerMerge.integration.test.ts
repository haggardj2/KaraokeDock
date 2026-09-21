import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import * as oidc from 'openid-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, createUser, getUserById, query, setSetting, updateUser, validateSessionInfo, withTransaction, type User } from './db.js';
import { mergeSingers, mergeSingersWithClient, getSingerMergeCandidates } from './singerMerge.js';
import { linkAccountLogin } from './accountLinks.js';
import { withQueueTransaction } from './rotation/queueTransaction.js';
import { resolveSocialIdentity } from './socialIdentity.js';
import { ensureAuthenticatedSinger, renameAuthenticatedSinger, resolveQueueRequester, getRequestIdentity } from './authenticatedSinger.js';
import { resolveGuestSinger } from './guestSinger.js';
import { applyImportedSingerProfile, getUserSingerPresentation, setSingerProfileFocus } from './singerProfile.js';
import { exchangeSocialProviderCode, socialAuthorizationUrl } from './socialAuth.js';
import { defaultSocialConfig, SOCIAL_CONFIG_KEY } from './socialAuthConfig.js';
import { getQueueState } from './queueState.js';

const { enabled, schema } = vi.hoisted(() => {
  const value = process.env.SINGER_MERGE_TEST_DATABASE_URL;
  const schema = `singer_merge_test_${process.pid}`;
  if (value) {
    const url = new URL(value);
    if (url.pathname !== '/singer_merge_test') throw new Error('Merge tests require a dedicated singer_merge_test database');
    url.searchParams.set('options', `-csearch_path=${schema},public`);
    process.env.DATABASE_URL = url.toString();
  }
  return { enabled: Boolean(value), schema };
});

vi.mock('./socialAuth.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('./socialAuth.js')>(),
  socialAuthorizationUrl: vi.fn(), exchangeSocialProviderCode: vi.fn(),
}));
vi.mock('openid-client', async (importOriginal) => ({
  ...await importOriginal<typeof import('openid-client')>(),
  discovery: vi.fn(), authorizationCodeGrant: vi.fn(), buildAuthorizationUrl: vi.fn(),
}));

describe.runIf(enabled)('shared canonical singer merge against PostgreSQL and HTTP', () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;
  let trackId: number;
  const crop = { x: 10, y: 20, width: 70, height: 60 };
  const migrations = ['init.sql', '018_singer_public_uuid.sql', '020_singer_profiles.sql',
    '021_singer_identity_and_crop.sql', '022_queue_manual_order.sql', '023_singer_social_login.sql',
    '024_shared_singer_identity.sql', '026_account_login_links.sql'];

  // Seed historical singer-only merges. The public merge API now forbids these operations.
  const legacyMerge = (target: unknown, source: unknown) =>
    withQueueTransaction((client) => mergeSingersWithClient(client, BigInt(String(target)), BigInt(String(source)), true));

  async function migrate() {
    for (const file of migrations) await query(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  beforeAll(async () => {
    await query(`CREATE SCHEMA ${schema}`);
    await migrate();
    const timers = vi.spyOn(globalThis, 'setInterval').mockReturnValue({ unref() {} } as any);
    const { apiRouter } = await import('./routes/api.js');
    timers.mockRestore();
    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing HTTP address');
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  }, 30_000);
  afterAll(async () => {
    server?.closeAllConnections();
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  });
  beforeEach(async () => {
    await query('TRUNCATE users, singers, queue, rotations, tracks, artists RESTART IDENTITY CASCADE');
    await query('DELETE FROM settings');
    const admin = await createUser({ username: 'operator', role: 'admin' });
    adminToken = await createSession(30, admin.id, 'admin');
    trackId = (await query("INSERT INTO tracks (title, kind, path) VALUES ('Repeated performance', 'mp4', 'test.mp4') RETURNING id")).rows[0].id;
    const config = defaultSocialConfig();
    config.enabled = true;
    config.frontendUrl = 'https://web.example';
    for (const provider of ['google', 'facebook'] as const) config[provider] = {
      enabled: true, clientId: provider, clientSecret: 'test-secret',
      redirectUri: `https://api.example/api/auth/social/${provider}/callback`,
    };
    await setSetting(SOCIAL_CONFIG_KEY, config);
    vi.mocked(socialAuthorizationUrl).mockImplementation(async (_config, provider, state) => `https://${provider}.example/?state=${state}`);
  });

  async function request(path: string, body?: unknown, method = 'POST', token: string | null = adminToken) {
    return fetch(`${baseUrl}${path}`, {
      method, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session-token': token } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify(body),
    });
  }
  async function guest(name: string, id?: string) {
    return (await query(
      `INSERT INTO singers (id, public_uuid, display_name, normalized_name, status)
       VALUES (COALESCE($1::bigint, nextval('singers_id_seq')), $2, $3, LOWER($3), 'active') RETURNING *`,
      [id ?? null, randomUUID(), name],
    )).rows[0];
  }
  async function oidcUser() {
    const user = await createUser({
      username: 'host@example.com', role: 'admin', oidc_subject: 'host-subject', oidc_issuer: 'https://id.example',
      display_name: 'Host Name', picture: 'https://images.example/host',
    });
    await ensureAuthenticatedSinger(user);
    return (await getUserById(user.id))!;
  }
  async function socialUser(provider: 'google' | 'facebook') {
    const user = await resolveSocialIdentity(provider, {
      subject: `${provider}-subject`, name: `${provider} Name`, picture: `https://images.example/${provider}`,
    });
    await ensureAuthenticatedSinger(user);
    return user;
  }
  async function queued(singerId: string, status = 'done') {
    return (await query(
      `INSERT INTO queue (track_id, singer_id, requested_by, status, position, finished_at)
       VALUES ($1, $2, 'Old request name', $3::track_status, (SELECT COALESCE(MAX(position), 0) + 1 FROM queue),
         CASE WHEN $3::track_status = 'done' THEN NOW() ELSE NULL END) RETURNING *`,
      [trackId, singerId, status],
    )).rows[0];
  }
  async function socialLogin(provider: 'google' | 'facebook') {
    const verifier = 'v'.repeat(43);
    vi.mocked(exchangeSocialProviderCode).mockResolvedValue({
      subject: `${provider}-subject`, name: 'Changed provider name', picture: `https://images.example/${provider}`,
    });
    const start = await request(`/auth/social/${provider}/start`, {
      codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
    }, 'POST', null);
    expect(start.status).toBe(200);
    const state = new URL((await start.json() as any).authorizationUrl).searchParams.get('state');
    const callback = await request(`/auth/social/${provider}/callback?state=${state}&code=test-code`, undefined, 'GET', null);
    const code = new URL(callback.headers.get('location')!).searchParams.get('social_code');
    expect(code).toBeTruthy();
    const exchange = await request('/auth/social/exchange', { code, codeVerifier: verifier }, 'POST', null);
    expect(exchange.status).toBe(200);
    return await exchange.json() as { sessionToken: string; role: string; displayName: string; picture: string };
  }
  async function oidcLogin() {
    for (const [key, value] of Object.entries({
      enabled: true, issuer: 'https://id.example', client_id: 'client', client_secret: 'secret',
      redirect_uri: 'https://api.example/api/auth/oidc/callback', frontend_url: 'https://web.example',
    })) await setSetting(`oidc.${key}`, value);
    vi.mocked(oidc.discovery).mockResolvedValue({ serverMetadata: () => ({}) } as any);
    vi.mocked(oidc.buildAuthorizationUrl).mockImplementation((_config, parameters) => {
      const url = new URL('https://id.example/authorize');
      url.search = new URLSearchParams(parameters).toString();
      return url;
    });
    vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({
      access_token: 'not-persisted', claims: () => ({
        sub: 'host-subject', email: 'host@example.com', name: 'Provider changed host name', picture: 'https://images.example/host',
      }),
    } as any);
    const start = await request('/auth/oidc/login', undefined, 'GET', null);
    const state = new URL(start.headers.get('location')!).searchParams.get('state');
    const callback = await request(`/auth/oidc/callback?state=${state}&code=test-code`, undefined, 'GET', null);
    const code = new URL(callback.headers.get('location')!).searchParams.get('oidc_code');
    expect(code).toBeTruthy();
    const exchange = await request('/auth/oidc/exchange', { code }, 'POST', null);
    expect(exchange.status).toBe(200);
    return await exchange.json() as { sessionToken: string; role: string; displayName: string; picture: string };
  }

  it('links distinct singers through admin-only account routes and lists only canonical local/OIDC users', async () => {
    const host = await oidcUser();
    const google = await socialUser('google');
    await guest('Guest without account');
    const sourceSession = await createSession(30, google.id, 'user');
    await queued(host.singer_id!);
    await queued(google.singer_id!);
    for (const token of [null, sourceSession]) {
      expect((await request(`/admin/users/${host.id}/link-candidates`, undefined, 'GET', token)).status).toBe(403);
      expect((await request(`/admin/users/${host.id}/link`, { sourceUserId: google.id }, 'POST', token)).status).toBe(403);
    }
    const before = await (await request('/admin/users', undefined, 'GET')).json() as any[];
    expect(before.map((user) => user.id)).toEqual([host.id]);
    expect(before[0]).toMatchObject({ singer_id: host.singer_id, display_name: 'Host Name', picture: host.picture, linkedLogins: [] });
    const candidates = await (await request(`/admin/users/${host.id}/link-candidates?q=google`, undefined, 'GET')).json();
    expect(candidates).toMatchObject({ users: [{ id: google.id, provider: 'google', role: 'user', isActive: true }], hasMore: false });
    expect(JSON.stringify(candidates)).not.toMatch(/subject|password|secret|token/);
    const response = await request(`/admin/users/${host.id}/link`, { sourceUserId: google.id });
    expect(await response.json()).toEqual({
      ok: true, userId: host.id, sourceUserId: google.id, singerId: host.singer_id,
      username: host.username, role: 'admin', alreadyLinked: false,
    });
    const social = await socialLogin('google');
    const oidcResult = await oidcLogin();
    for (const signedIn of [social, oidcResult]) {
      expect(signedIn).toMatchObject({ role: 'admin', displayName: 'Host Name', picture: host.picture });
      expect(await validateSessionInfo(signedIn.sessionToken)).toMatchObject({ valid: true, userId: host.id, role: 'admin' });
      expect((await request('/admin/users', undefined, 'GET', signedIn.sessionToken)).status).toBe(200);
    }
    expect(await validateSessionInfo(sourceSession)).toMatchObject({ valid: false });
    expect((await query('SELECT DISTINCT singer_id FROM queue')).rows).toEqual([{ singer_id: host.singer_id }]);
    expect((await query('SELECT total_songs_sung FROM singers WHERE id = $1', [host.singer_id])).rows[0].total_songs_sung).toBe(2);
    const after = await (await request('/admin/users', undefined, 'GET')).json() as any[];
    expect(after.map((user) => user.id)).toEqual([host.id]);
    expect(after[0].linkedLogins).toEqual([{ id: google.id, username: google.username, provider: 'google', isActive: true }]);
    expect((await (await request(`/admin/users/${host.id}/link-candidates`, undefined, 'GET')).json() as any).users).toEqual([]);
    await migrate();
    expect((await getUserById(google.id))!.canonical_user_id).toBe(host.id);
    expect((await socialLogin('google')).role).toBe('admin');
  });

  it('allows a local administrator to sign in with either password or linked social credentials without adopting the social avatar', async () => {
    const local = await createUser({ username: 'local-admin', password: 'local-password', role: 'admin', display_name: 'Local Singer' });
    const facebook = await socialUser('facebook');
    await linkAccountLogin(local.id, facebook.id);
    const social = await socialLogin('facebook');
    expect(social).toMatchObject({ role: 'admin', displayName: 'Local Singer', picture: null });
    const password = await request('/auth/login', { username: local.username, password: 'local-password' }, 'POST', null);
    const passwordResult = await password.json() as any;
    expect(passwordResult).toMatchObject({ role: 'admin', username: local.username, displayName: 'Local Singer', picture: null });
    expect(await validateSessionInfo(social.sessionToken)).toMatchObject({ userId: local.id, role: 'admin' });
    expect((await getUserById(facebook.id))!.picture).toBe(facebook.picture);
    expect((await request('/auth/logout', {}, 'POST', social.sessionToken)).status).toBe(200);
    expect(await validateSessionInfo(social.sessionToken)).toMatchObject({ valid: false });
    expect(await validateSessionInfo(passwordResult.sessionToken)).toMatchObject({ valid: true });
  });

  it('revalidates both credential and account status and revokes sessions on deactivation or role changes', async () => {
    const host = await oidcUser();
    const google = await socialUser('google');
    await linkAccountLogin(host.id, google.id);
    const social = await socialLogin('google');
    const oidcResult = await oidcLogin();
    await query('UPDATE users SET is_active = FALSE WHERE id = $1', [google.id]);
    expect(await validateSessionInfo(social.sessionToken)).toMatchObject({ valid: false });
    expect(await validateSessionInfo(oidcResult.sessionToken)).toMatchObject({ valid: true });
    await query('UPDATE users SET is_active = TRUE WHERE id = $1', [google.id]);
    await updateUser(google.id, { is_active: false });
    expect(await validateSessionInfo(social.sessionToken)).toMatchObject({ valid: false });
    expect(await validateSessionInfo(oidcResult.sessionToken)).toMatchObject({ valid: true });
    await expect(resolveSocialIdentity('google', { subject: 'google-subject', name: 'Changed', picture: null })).rejects.toMatchObject({ status: 403 });
    await updateUser(google.id, { is_active: true });
    expect(await validateSessionInfo(social.sessionToken)).toMatchObject({ valid: false });
    const nextSocial = await socialLogin('google');
    await updateUser(host.id, { role: 'user' });
    expect(await validateSessionInfo(nextSocial.sessionToken)).toMatchObject({ valid: false });
    expect(await validateSessionInfo(oidcResult.sessionToken)).toMatchObject({ valid: false });
    const demoted = await socialLogin('google');
    expect(demoted.role).toBe('user');
    await query('UPDATE users SET is_active = FALSE WHERE id = $1', [host.id]);
    expect(await validateSessionInfo(demoted.sessionToken)).toMatchObject({ valid: false });
    const validation = await request('/auth/validate', undefined, 'GET', demoted.sessionToken);
    expect(await validation.json()).toMatchObject({ valid: false, role: 'user' });
    await expect(query('DELETE FROM users WHERE id = $1', [host.id])).rejects.toMatchObject({ code: '23503' });
  });

  it('does not trust source sessions, stored social admin roles, or credentials belonging to another canonical user', async () => {
    const host = await oidcUser();
    const google = await socialUser('google');
    const facebook = await socialUser('facebook');
    await query("UPDATE users SET role = 'admin' WHERE id = $1", [google.id]);
    const elevatedSource = await createSession(30, google.id, 'admin');
    expect(await validateSessionInfo(elevatedSource)).toMatchObject({ valid: true, role: 'user', userId: google.id });
    await linkAccountLogin(host.id, google.id);
    const staleSource = await createSession(30, google.id, 'admin');
    expect(await validateSessionInfo(staleSource)).toMatchObject({ valid: false });
    const mismatched = await createSession(30, host.id, 'admin', facebook.id);
    expect(await validateSessionInfo(mismatched)).toMatchObject({ valid: false });
    const valid = await createSession(30, host.id, 'admin', google.id);
    expect(await validateSessionInfo(valid)).toMatchObject({ valid: true, role: 'admin', userId: host.id });
    await query("UPDATE users SET role = 'user' WHERE id = $1", [host.id]);
    expect(await validateSessionInfo(valid)).toMatchObject({ valid: true, role: 'user', userId: host.id });
  });

  it('serializes competing account-link requests and never transfers an already linked credential', async () => {
    const first = await oidcUser();
    const second = await createUser({ username: 'second-admin', password: 'second-password', role: 'admin' });
    const google = await socialUser('google');
    const outcomes = await Promise.allSettled([
      linkAccountLogin(first.id, google.id), linkAccountLogin(second.id, google.id),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    const linked = (await getUserById(google.id))!;
    expect([first.id, second.id]).toContain(linked.canonical_user_id);
    const other = linked.canonical_user_id === first.id ? second : first;
    await expect(linkAccountLogin(other.id, google.id)).rejects.toMatchObject({ status: 409 });
    expect((await getUserById(google.id))!.canonical_user_id).toBe(linked.canonical_user_id);
  });

  it('rolls back singer consolidation and session revocation if the credential link cannot be persisted', async () => {
    const host = await oidcUser();
    const google = await socialUser('google');
    await queued(google.singer_id!);
    const token = await createSession(30, google.id, 'user');
    await query(`CREATE FUNCTION reject_account_link() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'forced account link failure'; END $$;
      CREATE TRIGGER reject_account_link BEFORE UPDATE OF canonical_user_id ON users
        FOR EACH ROW EXECUTE FUNCTION reject_account_link()`);
    try {
      await expect(linkAccountLogin(host.id, google.id)).rejects.toThrow('forced account link failure');
      expect((await getUserById(google.id))!).toMatchObject({ singer_id: google.singer_id, canonical_user_id: null, role: 'user' });
      expect((await query('SELECT singer_id FROM queue')).rows).toEqual([{ singer_id: google.singer_id }]);
      expect(await validateSessionInfo(token)).toMatchObject({ valid: true, userId: google.id, role: 'user' });
    } finally {
      await query('DROP TRIGGER reject_account_link ON users; DROP FUNCTION reject_account_link()');
    }
  });

  it.each([
    ['google', true], ['google', false], ['facebook', true], ['facebook', false],
  ] as const)('links historical %s/OIDC shared singers with social singer target=%s only after explicit Admin confirmation', async (provider, socialTarget) => {
    const host = await oidcUser();
    const social = await socialUser(provider);
    const target = socialTarget ? social : host;
    const source = socialTarget ? host : social;
    const hostSession = await createSession(30, host.id, 'admin');
    const socialSession = await createSession(30, social.id, 'user');
    const before = (await query('SELECT * FROM singers WHERE id = $1', [target.singer_id])).rows[0];
    await setSingerProfileFocus(BigInt(target.singer_id!), 35, 65, crop);
    await queued(source.singer_id!);
    await queued(target.singer_id!);
    const response = await request(`/singers/${target.singer_id}/merge`, { sourceId: source.singer_id });
    expect(response.status).toBe(409);
    expect(await legacyMerge(target.singer_id, source.singer_id))
      .toEqual({ ok: true, singerId: target.singer_id, displayName: target.display_name, linkedAccountCount: 2 });
    for (const token of [hostSession, socialSession]) {
      const valid = await request('/auth/validate', undefined, 'GET', token);
      expect(await valid.json()).toMatchObject({ valid: true, displayName: target.display_name, picture: target.picture });
    }
    expect((await getRequestIdentity(hostSession)).isAdmin).toBe(true);
    expect((await getRequestIdentity(socialSession)).isAdmin).toBe(false);
    const socialResult = await socialLogin(provider);
    const hostResult = await oidcLogin();
    expect(socialResult).toMatchObject({ role: 'user', displayName: target.display_name, picture: target.picture });
    expect(hostResult).toMatchObject({ role: 'admin', displayName: target.display_name, picture: target.picture });
    expect(await validateSessionInfo(socialResult.sessionToken)).toMatchObject({ userId: social.id, role: 'user' });
    const canonical = (await query('SELECT * FROM singers WHERE id = $1', [target.singer_id])).rows[0];
    expect(canonical).toMatchObject({ public_uuid: before.public_uuid, display_name: before.display_name,
      status: before.status, identity_merged: true, profile_image_user_id: target.id,
      profile_image_url: target.picture, profile_image_crop: crop, total_songs_sung: 2 });
    expect((await query('SELECT DISTINCT singer_id FROM queue')).rows).toEqual([{ singer_id: target.singer_id }]);
    expect((await getUserById(host.id))!.role).toBe('admin');
    expect((await getUserById(social.id))!.role).toBe('user');
    await expect(resolveGuestSinger(target.display_name, canonical.public_uuid)).rejects.toMatchObject({ status: 403 });
    const renamed = await request(`/singers/${target.singer_id}/rename`, { displayName: 'Shared Canonical Name' }, 'PATCH');
    expect(renamed.status).toBe(200);
    for (const login of [host, social]) {
      expect((await getUserById(login.id))!.display_name).toBe('Shared Canonical Name');
      expect(await getUserSingerPresentation((await getUserById(login.id))!)).toMatchObject({ displayName: 'Shared Canonical Name', picture: target.picture });
    }
    const candidates = await request(`/admin/users/${host.id}/link-candidates?q=${provider}`, undefined, 'GET');
    expect(await candidates.json()).toMatchObject({ users: [{ id: social.id, singerId: target.singer_id, provider }], hasMore: false });
    const linked = await request(`/admin/users/${host.id}/link`, { sourceUserId: social.id });
    expect(await linked.json()).toMatchObject({ ok: true, userId: host.id, sourceUserId: social.id, role: 'admin', alreadyLinked: false });
    expect(await validateSessionInfo(socialSession)).toMatchObject({ valid: false });
    expect(await validateSessionInfo(hostSession)).toMatchObject({ valid: true, userId: host.id, role: 'admin' });
    const linkedSocial = await socialLogin(provider);
    expect(linkedSocial).toMatchObject({ role: 'admin', displayName: 'Shared Canonical Name', picture: target.picture });
    expect(await validateSessionInfo(linkedSocial.sessionToken)).toMatchObject({ valid: true, userId: host.id, role: 'admin' });
    expect((await getUserById(social.id))!).toMatchObject({ role: 'user', canonical_user_id: host.id, social_subject: `${provider}-subject` });
    expect((await request(`/admin/users/${host.id}/link`, { sourceUserId: social.id })).status).toBe(200);
    expect(await validateSessionInfo(linkedSocial.sessionToken)).toMatchObject({ valid: true });
  });

  it('retains a guest target upload across social login, imports and explicit canonical rename', async () => {
    const target = await guest('Guest Target');
    await query(`UPDATE singers SET profile_image_source = 'upload', profile_image_mime = 'image/gif',
      profile_image_data = $2, profile_image_crop = $3, profile_image_updated_at = NOW() WHERE id = $1`,
    [target.id, Buffer.from('GIF89a'), crop]);
    const social = await socialUser('google');
    await legacyMerge(target.id, social.singer_id);
    const result = await socialLogin('google');
    expect(result.displayName).toBe('Guest Target');
    expect(result.picture).toContain(`/api/singers/${target.id}/profile-image`);
    await applyImportedSingerProfile(BigInt(target.id), { imageSource: 'oidc', imageUrl: 'https://images.example/wrong' }, { allowOidcUrl: true });
    await renameAuthenticatedSinger((await getUserById(social.id))!, 'Canonical Rename');
    expect(await getUserSingerPresentation((await getUserById(social.id))!)).toMatchObject({ displayName: 'Canonical Rename', picture: result.picture });
    const row = (await query('SELECT * FROM singers WHERE id = $1', [target.id])).rows[0];
    expect(row.profile_image_data).toEqual(Buffer.from('GIF89a'));
    expect(row.profile_image_crop).toEqual(crop);
    expect(row.profile_image_user_id).toBeNull();
    await query('UPDATE singers SET profile_image_admin_override = TRUE WHERE id = $1', [target.id]);
    const token = await createSession(30, social.id, 'user');
    const protectedProfile = await request('/singers/self/profile', undefined, 'GET', token);
    expect(await protectedProfile.json()).toMatchObject({ canUpload: false });
    expect((await request('/singers/self/profile/focus', { crop }, 'PATCH', token)).status).toBe(403);
    expect((await request('/singers/self/profile/image', {}, 'DELETE', token)).status).toBe(403);
  });

  it('preserves a historical selected image owner without implicitly linking its credentials', async () => {
    const target = await guest('Empty Target');
    const google = await socialUser('google');
    await query("UPDATE users SET picture = 'https://images.example/pending-update' WHERE id = $1", [google.id]);
    await query(`UPDATE singers SET identity_merged = TRUE, profile_image_user_id = $2,
      profile_image_source = 'oidc', profile_image_url = $3 WHERE id = $1`, [target.id, google.id, google.picture]);
    await legacyMerge(target.id, google.singer_id);
    const facebook = await socialUser('facebook');
    await legacyMerge(target.id, facebook.singer_id);
    await resolveSocialIdentity('google', { subject: 'google-subject', name: 'Wrong rename', picture: 'https://images.example/new-google' });
    await ensureAuthenticatedSinger((await getUserById(google.id))!);
    await ensureAuthenticatedSinger((await getUserById(facebook.id))!);
    expect(await getUserSingerPresentation((await getUserById(facebook.id))!))
      .toEqual({ displayName: 'Empty Target', picture: 'https://images.example/new-google' });
    const hostRefresh = await resolveQueueRequester(adminToken, { singerId: target.id });
    expect(hostRefresh!.display_name).toBe('Empty Target');
    expect((await query('SELECT profile_image_user_id FROM singers WHERE id = $1', [target.id])).rows[0].profile_image_user_id).toBe(google.id);
  });

  it('merges two guests, freezes ownerless adopted pictures and honors a cleared target admin override', async () => {
    const target = await guest('Guest Target');
    const source = await guest('Guest Source');
    await query("UPDATE singers SET profile_image_source = 'oidc', profile_image_url = 'https://images.example/imported', profile_image_crop = $2 WHERE id = $1", [source.id, crop]);
    expect(await mergeSingers(target.id, source.id)).toMatchObject({ linkedAccountCount: 0 });
    let row = (await query('SELECT * FROM singers WHERE id = $1', [target.id])).rows[0];
    expect(row).toMatchObject({ profile_image_user_id: null, profile_image_url: 'https://images.example/imported', profile_image_crop: crop });
    const social = await socialUser('google');
    await legacyMerge(target.id, social.singer_id);
    await ensureAuthenticatedSinger((await getUserById(social.id))!);
    row = (await query('SELECT * FROM singers WHERE id = $1', [target.id])).rows[0];
    expect(row.profile_image_url).toBe('https://images.example/imported');
    const cleared = await guest('Cleared Target');
    await query('UPDATE singers SET profile_image_admin_override = TRUE WHERE id = $1', [cleared.id]);
    await legacyMerge(cleared.id, target.id);
    expect((await query('SELECT profile_image_source FROM singers WHERE id = $1', [cleared.id])).rows[0].profile_image_source).toBeNull();
  });

  it('preserves duplicate performances, memberships, turns, participants, playback and grouped queue ordering', async () => {
    const target = await guest('Target');
    const source = await guest('Source');
    const other = await guest('Other');
    const rotation = (await query("INSERT INTO rotations (name, config) VALUES ('Show', '{\"type\":\"strict_round_robin\"}') RETURNING id")).rows[0].id;
    await query('INSERT INTO rotation_singers (rotation_id,singer_id,position) VALUES ($1,$2,0),($1,$3,1),($1,$4,2)', [rotation, target.id, source.id, other.id]);
    const song = (await query("INSERT INTO song_requests (singer_id, title, participant_singer_ids) VALUES ($1,'Duet',$2) RETURNING id",
      [source.id, [source.id, target.id, source.id, other.id]])).rows[0].id;
    const turn = (await query("INSERT INTO rotation_turns (rotation_id,singer_id,song_request_id,status) VALUES ($1,$2,$3,'active') RETURNING id",
      [rotation, source.id, song])).rows[0].id;
    await query('UPDATE rotations SET current_turn_id = $2 WHERE id = $1', [rotation, turn]);
    await query('INSERT INTO manual_overrides (rotation_id,singer_id,song_request_id) VALUES ($1,$2,$3)', [rotation, source.id, song]);
    const playing = await queued(source.id, 'playing');
    await setSetting('player.playback', { queueId: Number(playing.id), paused: false, positionSec: 12, updatedAt: new Date().toISOString() });
    await queued(source.id);
    await queued(target.id);
    await queued(source.id, 'queued');
    await queued(other.id, 'queued');
    await queued(target.id, 'queued');
    await mergeSingers(target.id, source.id);
    expect((await query('SELECT COUNT(*)::int AS count FROM queue')).rows[0].count).toBe(6);
    expect((await query("SELECT COUNT(*)::int AS count FROM queue WHERE status = 'done' AND singer_id = $1", [target.id])).rows[0].count).toBe(2);
    expect((await query('SELECT singer_id FROM rotation_singers ORDER BY position')).rows.map((row) => row.singer_id)).toEqual([target.id, other.id]);
    expect((await query('SELECT singer_id FROM rotation_turns WHERE id = $1', [turn])).rows[0].singer_id).toBe(target.id);
    expect((await query('SELECT singer_id FROM manual_overrides')).rows[0].singer_id).toBe(target.id);
    expect((await query('SELECT participant_singer_ids FROM song_requests WHERE id = $1', [song])).rows[0].participant_singer_ids).toEqual([target.id, other.id]);
    expect((await query('SELECT current_turn_id FROM rotations WHERE id = $1', [rotation])).rows[0].current_turn_id).toBe(turn);
    expect((await query("SELECT value FROM settings WHERE key = 'player.playback'")).rows[0].value.queueId).toBe(Number(playing.id));
    const state = await getQueueState();
    expect(state.queueOrder.filter((singer) => singer.singerId === target.id)).toHaveLength(1);
    expect(state.queueOrder.some((singer) => singer.singerId === source.id)).toBe(false);
    expect(state.queueOrder.find((singer) => singer.singerId === target.id)!.completedSongsCount).toBe(2);
  });

  it('keeps source/target inactive flags, credentials and local sessions independent', async () => {
    const target = await oidcUser();
    const local = await createUser({ username: 'local-account', password: 'existing-password', display_name: 'Local Singer' });
    await ensureAuthenticatedSinger(local);
    const localBefore = (await getUserById(local.id))!;
    const session = await createSession(30, local.id, 'user');
    await query('UPDATE users SET is_active = FALSE WHERE id = $1', [target.id]);
    await legacyMerge(target.singer_id, localBefore.singer_id);
    expect((await getUserById(target.id))!.is_active).toBe(false);
    expect((await getUserById(local.id))!.password_hash).toBe(localBefore.password_hash);
    expect(await validateSessionInfo(session)).toMatchObject({ valid: true, userId: local.id, role: 'user' });
    const login = await request('/auth/login', { username: 'local-account', password: 'existing-password' }, 'POST', null);
    expect(await login.json()).toMatchObject({ role: 'user', displayName: target.display_name, picture: target.picture });
  });

  it('serializes concurrent merge/login/rename and rejects stale repeated merges without losing data', async () => {
    const target = await guest('Canonical');
    const social = await socialUser('google');
    await queued(social.singer_id!);
    const merge = legacyMerge(target.id, social.singer_id);
    const [result, signedIn] = await Promise.all([merge, ensureAuthenticatedSinger(social)]);
    expect(result.singerId).toBe(target.id);
    expect(signedIn.id.toString()).toBe(target.id);
    await Promise.all([
      renameAuthenticatedSinger((await getUserById(social.id))!, 'Renamed Canonical'),
      resolveSocialIdentity('google', { subject: 'google-subject', name: 'Provider Name', picture: null }),
    ]);
    expect(await getUserSingerPresentation((await getUserById(social.id))!)).toMatchObject({ displayName: 'Renamed Canonical' });
    await expect(mergeSingers(target.id, social.singer_id)).rejects.toMatchObject({ status: 404 });
    expect((await query('SELECT singer_id FROM queue')).rows).toEqual([{ singer_id: target.id }]);
  });

  it('includes a concurrently committed enqueue and rejects stale source inserts instead of orphaning them', async () => {
    const target = await guest('Target');
    const source = await guest('Source');
    let inserted!: () => void;
    let release!: () => void;
    const insertedSignal = new Promise<void>((resolve) => { inserted = resolve; });
    const releaseSignal = new Promise<void>((resolve) => { release = resolve; });
    const enqueue = withTransaction(async (client) => {
      await client.query('INSERT INTO queue (track_id, singer_id, position) VALUES ($1, $2, 0)', [trackId, source.id]);
      inserted();
      await releaseSignal;
    });
    await insertedSignal;
    const merged = mergeSingers(target.id, source.id);
    release();
    await Promise.all([enqueue, merged]);
    await expect(queued(source.id)).rejects.toMatchObject({ code: '23503' });
    expect((await query('SELECT singer_id FROM queue')).rows).toEqual([{ singer_id: target.id }]);
  });

  it('never automatically links a new local/OIDC account by the canonical merged name', async () => {
    const target = await guest('Protected Canonical');
    const source = await guest('Other Guest');
    await mergeSingers(target.id, source.id);
    const unlinked = await createUser({ username: 'new-account', display_name: 'Protected Canonical', oidc_subject: 'unrelated-subject' });
    await expect(ensureAuthenticatedSinger(unlinked)).rejects.toMatchObject({ status: 409 });
    expect((await getUserById(unlinked.id))!.singer_id).toBeNull();
    expect((await query('SELECT id FROM singers')).rowCount).toBe(1);
  });

  it('rolls back every remap and profile change when a later account mapping write fails', async () => {
    const target = await guest('Target');
    const source = await socialUser('google');
    await queued(source.singer_id!);
    await query(`CREATE FUNCTION reject_merge_mapping() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'forced merge failure'; END $$;
      CREATE TRIGGER reject_merge_mapping BEFORE UPDATE OF singer_id ON users
        FOR EACH ROW EXECUTE FUNCTION reject_merge_mapping()`);
    try {
      await expect(legacyMerge(target.id, source.singer_id)).rejects.toThrow('forced merge failure');
      expect((await getUserById(source.id))!.singer_id).toBe(source.singer_id);
      expect((await query('SELECT singer_id FROM queue')).rows[0].singer_id).toBe(source.singer_id);
      expect((await query('SELECT identity_merged, profile_image_source FROM singers WHERE id = $1', [target.id])).rows[0])
        .toEqual({ identity_merged: false, profile_image_source: null });
      expect((await query('SELECT id FROM singers')).rowCount).toBe(2);
    } finally {
      await query('DROP TRIGGER reject_merge_mapping ON users; DROP FUNCTION reject_merge_mapping()');
    }
  });

  it('survives complete startup migration reruns without reintroducing unique account links or avatar/name takeover', async () => {
    const host = await oidcUser();
    const google = await socialUser('google');
    await legacyMerge(google.singer_id, host.singer_id);
    await query("INSERT INTO queue (track_id, requested_by, position) VALUES ($1, 'google Name', 0)", [trackId]);
    await migrate();
    const row = (await query('SELECT * FROM singers WHERE id = $1', [google.singer_id])).rows[0];
    expect(row).toMatchObject({ identity_merged: true, profile_image_user_id: google.id, profile_image_url: google.picture });
    expect((await query('SELECT singer_id FROM queue')).rows[0].singer_id).toBeNull();
    expect((await query("SELECT indisunique FROM pg_index WHERE indexrelid = 'idx_users_singer_id'::regclass")).rows[0].indisunique).toBe(false);
    expect((await query('SELECT COUNT(*)::int AS count FROM users WHERE singer_id = $1', [google.singer_id])).rows[0].count).toBe(2);
  });

  it('searches archived/no-queue guests with literal wildcard handling but excludes all account singers', async () => {
    const target = await guest('Target');
    await query(`INSERT INTO singers (public_uuid, display_name, normalized_name, status)
      SELECT gen_random_uuid()::text, 'Archived ' || n, 'archived ' || n, 'inactive' FROM generate_series(1,55) n`);
    const all = await getSingerMergeCandidates(target.id, '');
    expect(all.singers).toHaveLength(50);
    expect(all.hasMore).toBe(true);
    expect(all.singers.every((singer) => singer.historyCount === 0 && singer.singerId !== target.id)).toBe(true);
    const literal = await guest('100%_Singer');
    const filtered = await getSingerMergeCandidates(target.id, '%_');
    expect(filtered.singers.map((singer) => singer.singerId)).toEqual([literal.id]);
    expect(filtered.singers[0].accountLogins).toEqual([]);
    await query("INSERT INTO users (username,singer_id,is_active) VALUES ('archived-login', $1, FALSE)", [literal.id]);
    const login = await getSingerMergeCandidates(target.id, 'archived-login');
    expect(login.singers).toEqual([]);
    await expect(getSingerMergeCandidates(literal.id, '')).rejects.toMatchObject({ status: 409 });
    expect(JSON.stringify(login)).not.toMatch(/password|subject|secret|token/);
    expect((await request(`/singers/${target.id}/merge-candidates`, undefined, 'GET', null)).status).toBe(403);
  });

  it('handles full bigint IDs, missing singers and safe numeric compatibility without rounding or partial writes', async () => {
    const target = await guest('Large Target', '9007199254740993');
    const source = await guest('Large Source', '9007199254740994');
    expect(await mergeSingers(target.id, source.id)).toMatchObject({ singerId: target.id });
    for (const invalid of [0, -1, 1.5, Number(target.id), '1e3', '9223372036854775808']) {
      expect((await request(`/singers/${target.id}/merge`, { sourceId: invalid })).status).toBe(400);
    }
    expect((await request(`/singers/${target.id}/merge`, { sourceId: target.id })).status).toBe(400);
    expect((await request('/singers/99999/merge-candidates', undefined, 'GET')).status).toBe(404);
    const small = await guest('Small');
    expect(await mergeSingers(target.id, Number(small.id))).toMatchObject({ singerId: target.id });
  });
});
