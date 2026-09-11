import express from 'express';
import type { Server } from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetting, setSetting, getUserById, query, validateSessionInfo, withTransaction } from '../db.js';
import { ensureAuthenticatedSinger } from '../authenticatedSinger.js';
import { ensureSingerInActiveRotation, findOrCreateSinger } from '../queueIdentity.js';

vi.mock('../db.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../db.js')>(),
  query: vi.fn(), getUserById: vi.fn(), validateSessionInfo: vi.fn(), withTransaction: vi.fn(),
  ensureHelpfulIndexes: vi.fn().mockResolvedValue(undefined),
  getSetting: vi.fn().mockResolvedValue(null), setSetting: vi.fn(), cleanupExpiredSessions: vi.fn(),
  upsertArtist: vi.fn().mockResolvedValue(1), upsertExternalTrack: vi.fn().mockResolvedValue({ id: 101 }),
}));
vi.mock('../authenticatedSinger.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../authenticatedSinger.js')>(), ensureAuthenticatedSinger: vi.fn(),
}));
vi.mock('../queueIdentity.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../queueIdentity.js')>(),
  findOrCreateSinger: vi.fn(), ensureSingerInActiveRotation: vi.fn(),
}));
vi.mock('../karaoke-nerds', () => ({
  searchKaraokeNerds: vi.fn(), getYouTubeDuration: vi.fn().mockResolvedValue(null),
}));

const host = { id: 7n, public_uuid: 'host-uuid', display_name: 'Host', normalized_name: 'host', status: 'active' };
const target = { id: 9n, public_uuid: 'target-uuid', display_name: 'Selected Singer', normalized_name: 'selected singer', status: 'active' };
const user = { id: 1, role: 'admin', is_active: true, display_name: 'Host', username: 'host', oidc_subject: 'subject' };
const crop = { x: 10, y: 20, width: 70, height: 60 };
let storedCrop: typeof crop | null;
let baseUrl: string;
let server: Server;
const queryMock = vi.mocked(query);

beforeAll(async () => {
  // Importing the router normally installs process-wide maintenance timers.
  const intervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue({ unref() {} } as any);
  const { apiRouter } = await import('./api.js');
  intervalSpy.mockRestore();
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (err) => err ? reject(err) : resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  baseUrl = `http://127.0.0.1:${address.port}/api`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
});

beforeEach(() => {
  vi.clearAllMocks();
  storedCrop = null;
  vi.mocked(validateSessionInfo).mockResolvedValue({ valid: true, userId: 1, role: 'admin' });
  vi.mocked(getUserById).mockResolvedValue(user as any);
  vi.mocked(ensureAuthenticatedSinger).mockResolvedValue(host);
  vi.mocked(findOrCreateSinger).mockResolvedValue(target);
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ query: queryMock } as any));
  queryMock.mockImplementation(async (sql, params) => {
    if (sql === 'SELECT * FROM singers WHERE id = $1') {
      return { rows: params?.[0] === '9' ? [target] : [] } as any;
    }
    if (sql.startsWith('SELECT source FROM tracks')) return { rows: [{ source: 'local' }] } as any;
    if (sql.includes('COALESCE(MAX(position)')) return { rows: [{ p: 1 }] } as any;
    if (sql.includes('INSERT INTO queue')) return {
      rows: [{ id: 42, track_id: params?.[0], requested_by: params?.[1], singer_id: String(params?.[2]), status: 'queued' }],
    } as any;
    if (sql.includes('profile_image_crop = CASE WHEN $4') && params?.[3]) storedCrop = JSON.parse(params[4]);
    if (sql.includes('SELECT id, profile_image_source')) return { rows: [{
      id: String(params?.[0]), profile_image_source: 'oidc', profile_image_url: 'https://provider.example/original',
      profile_image_focus_x: 50, profile_image_focus_y: 50, profile_image_crop: storedCrop,
    }] } as any;
    return { rows: [] } as any;
  });
});

async function request(path: string, body: unknown, method = 'POST', token: string | null = 'admin-token') {
  return fetch(`${baseUrl}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session-token': token } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
}

describe('scroller profile picture settings', () => {
  const broadcast = vi.fn();
  let settings: Map<string, unknown>;

  beforeAll(async () => {
    const { setPostQueueUpdate } = await import('./api.js');
    setPostQueueUpdate(broadcast);
  });

  beforeEach(() => {
    settings = new Map();
    vi.mocked(getSetting).mockImplementation(async (key) => settings.get(key) ?? null);
    vi.mocked(setSetting).mockImplementation(async (key, value) => { settings.set(key, value); });
  });

  afterEach(() => {
    vi.mocked(getSetting).mockReset().mockResolvedValue(null);
    vi.mocked(setSetting).mockReset();
  });

  afterAll(async () => {
    const { setPostQueueUpdate } = await import('./api.js');
    setPostQueueUpdate(() => {});
  });

  it('shows pictures by default for existing installations', async () => {
    const response = await request('/overlay/settings', undefined, 'GET', null);
    expect(await response.json()).toMatchObject({ showProfilePictures: true });
  });

  it.each([false, true])('persists and broadcasts showProfilePictures=%s', async (showProfilePictures) => {
    const saved = await request('/overlay/settings', { showProfilePictures });
    expect(saved.status).toBe(200);
    expect(settings.get('overlay.showProfilePictures')).toBe(String(showProfilePictures));
    expect(broadcast).toHaveBeenCalledWith('overlay.settings', expect.objectContaining({ showProfilePictures }));
    const response = await request('/overlay/settings', undefined, 'GET', null);
    expect(await response.json()).toMatchObject({ showProfilePictures });
  });

  it('preserves hidden pictures when another overlay setting changes', async () => {
    settings.set('overlay.showProfilePictures', 'false');
    await request('/overlay/settings', { showQrCode: false });
    expect(broadcast).toHaveBeenCalledWith('overlay.settings', expect.objectContaining({
      showQrCode: false, showProfilePictures: false,
    }));
    expect(settings.get('overlay.showProfilePictures')).toBe('false');
  });

  it('requires an admin session to change picture visibility', async () => {
    const response = await request('/overlay/settings', { showProfilePictures: false }, 'POST', null);
    expect(response.status).toBe(403);
    expect(setSetting).not.toHaveBeenCalled();
  });
});

describe.each([
  ['/queue', { trackId: 101 }],
  ['/karaoke-nerds/add', { title: 'Song', url: 'https://www.youtube.com/watch?v=example' }],
] as const)('%s requester contract', (endpoint, trackBody) => {
  it('enqueues the selected singer for an admin, not the host', async () => {
    const response = await request(endpoint, { ...trackBody, singerId: '9', requestedBy: 'Wrong Name', requestAsHost: true });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ singer_id: '9', requested_by: 'Selected Singer' });
    expect(ensureSingerInActiveRotation).toHaveBeenCalledWith(9n);
  });

  it('enqueues a new manual singer with host mode and no selected id', async () => {
    const response = await request(endpoint, { ...trackBody, requestedBy: 'New Singer', requestAsHost: true });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ singer_id: '9' });
    expect(findOrCreateSinger).toHaveBeenCalledWith('New Singer', null);
  });

  it.each([{ singerId: '9' }, { requestAsHost: true, requestedBy: 'Other' }])(
    'rejects a regular user trying to target another singer %j before queue writes', async (body) => {
      vi.mocked(validateSessionInfo).mockResolvedValue({ valid: true, userId: 1, role: 'user' });
      const response = await request(endpoint, { ...trackBody, ...body });
      expect(response.status).toBe(403);
      expect(queryMock.mock.calls.some(([sql]) => sql.includes('INSERT INTO queue'))).toBe(false);
    },
  );

  it('uses authenticated self identity despite requestedBy and UUID, including omitted requestedBy', async () => {
    // The resolver uses its real local function reference, so mock the transaction result at the DB boundary.
    for (const body of [{ requestedBy: 'Other', singerUuid: 'ignored' }, {}]) {
      vi.mocked(withTransaction).mockResolvedValueOnce(host);
      const response = await request(endpoint, { ...trackBody, ...body });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ singer_id: '7', requested_by: 'Host' });
    }
  });

  it('propagates singer/rotation failures instead of queuing anonymously', async () => {
    vi.mocked(ensureSingerInActiveRotation).mockRejectedValueOnce(new Error('rotation failure'));
    const response = await request(endpoint, { ...trackBody, singerId: '9', requestAsHost: true });
    expect(response.status).toBe(500);
    expect(queryMock.mock.calls.some(([sql]) => sql.includes('INSERT INTO queue'))).toBe(false);
  });
});

describe.each(['/singers/self/profile/focus', '/singers/9/profile/focus'])('%s crop contract', (endpoint) => {
  it('persists OIDC crop metadata without replacing or fetching the original image', async () => {
    const response = await request(endpoint, { crop }, 'PATCH');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      profile: { imageSource: 'oidc', imageUrl: 'https://provider.example/original', crop },
    });
    expect(queryMock.mock.calls.some(([sql]) => sql.includes('profile_image_data ='))).toBe(false);
  });

  it('rejects malformed and out-of-bounds crops with 400', async () => {
    for (const invalid of [null, { ...crop, x: -1 }, { ...crop, width: 99 }]) {
      const response = await request(endpoint, { crop: invalid }, 'PATCH');
      expect(response.status).toBe(400);
    }
    expect(storedCrop).toBeNull();
  });
});

describe('profile crop exports', () => {
  const row = {
    id: '9', public_uuid: 'target-uuid', display_name: 'Singer', normalized_name: 'singer',
    status: 'active', position: 1, has_queue: true, profile_image_source: 'oidc',
    profile_image_url: 'https://provider.example/original', profile_image_crop: crop,
  };

  it.each(['/overlay/rotation-singers', '/singers/archived'])('includes crop in %s', async (endpoint) => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: '1' }] } as any).mockResolvedValueOnce({ rows: [row] } as any);
    const response = await fetch(`${baseUrl}${endpoint}`, { headers: { 'x-session-token': 'admin-token' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([expect.objectContaining({ profile: expect.objectContaining({ crop }) })]);
    expect(queryMock.mock.calls[1][0]).toContain('profile_image_crop');
  });

  const guestUuid = 'b31327c2-ef24-4bf3-9558-9b27113247d3';
  const staleUuid = '573752cf-719e-456b-8c86-047407691de5';
  const otherUuid = '0429219e-ee20-4084-9161-1647025a2d81';
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  function useGuestDatabase(options: { linked?: boolean; empty?: boolean; history?: boolean; missingProfile?: boolean } = {}) {
    const fallback = queryMock.getMockImplementation()!;
    const singers = options.empty ? [] : [
      { ...target, public_uuid: guestUuid, display_name: 'Guest Singer', normalized_name: 'guest singer' },
      { ...target, id: 10n, public_uuid: otherUuid, display_name: 'Other Singer', normalized_name: 'other singer' },
    ];
    queryMock.mockImplementation(async (sql, params = []) => {
      if (sql.startsWith('SELECT * FROM singers')) {
        const singer = sql.includes('public_uuid = $1 OR normalized_name')
          ? singers.find((s) => s.public_uuid === params[0]) ?? singers.find((s) => s.normalized_name === params[1])
          : sql.includes('public_uuid = $1')
            ? singers.find((s) => s.public_uuid === params[0])
            : sql.includes('normalized_name = $1')
              ? singers.find((s) => s.normalized_name === params[0])
              : singers.find((s) => String(s.id) === String(params[0]));
        return { rows: singer ? [{ ...singer }] : [] } as any;
      }
      if (sql.startsWith('SELECT id FROM users WHERE singer_id')) {
        return { rows: options.linked ? [{ id: 1 }] : [] } as any;
      }
      if (sql.startsWith('SELECT id FROM singers WHERE normalized_name')) {
        return { rows: singers.filter((s) => s.normalized_name === params[0] && s.id !== params[1]) } as any;
      }
      if (sql.startsWith('INSERT INTO singers')) {
        singers.push({ ...target, public_uuid: params[0], display_name: params[1], normalized_name: params[2] });
        return { rows: [] } as any;
      }
      if (sql.startsWith('UPDATE singers SET display_name')) {
        const singer = singers.find((s) => s.id === params[2])!;
        Object.assign(singer, { display_name: params[0], normalized_name: params[1] });
        return { rows: [{ ...singer }] } as any;
      }
      if (sql.includes('SELECT id, profile_image_source') || sql.startsWith('SELECT id, public_uuid, display_name, normalized_name, total_songs_sung')) {
        const singer = singers.find((s) => String(s.id) === String(params[0]));
        return { rows: singer && !options.missingProfile ? [{
          ...singer, id: String(singer.id), profile_image_source: 'upload', profile_image_data: png,
          profile_image_mime: 'image/png', profile_image_updated_at: '2026-01-01T00:00:00.000Z',
        }] : [] } as any;
      }
      if (sql.includes('SELECT q.id AS queue_id')) {
        const singer = singers.find((s) => String(s.id) === String(params[0]));
        return { rows: singer && options.history ? [{
          ...singer, queue_id: '88', track_id: '101', singer_id: String(singer.id),
          requested_by: singer.display_name, status: 'done', title: 'Canonical History Song', source: 'local',
        }] : [] } as any;
      }
      return fallback(sql, params);
    });
    return singers;
  }

  const guestQuery = (uuid = staleUuid, name = '  GUEST   singer ') =>
    new URLSearchParams({ name, singerUuid: uuid }).toString();
  const kdFile = { format: 'karaokedock.singer-history', version: 2, singers: [] };

  describe('guest self identity recovery', () => {
    it('exports canonical image and history before the browser receives its recovered profile UUID', async () => {
      const singers = useGuestDatabase({ history: true });
      const history = await request(`/history/self/export?${guestQuery()}`, undefined, 'GET', null);
      expect(history.status).toBe(200);
      const file = await history.json() as any;
      expect(file).toMatchObject({
        format: 'karaokedock.singer-history', version: 2,
        singers: [{ singer: { uuid: guestUuid, displayName: 'Guest Singer', profile: { imageDataBase64: png.toString('base64') } }, songs: [{ title: 'Canonical History Song' }] }],
      });
      const response = await request(`/singers/self/profile?${guestQuery()}`, undefined, 'GET', null);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        singerId: '9', singerUuid: guestUuid, displayName: 'Guest Singer', canUpload: true,
        profile: { imageSource: 'upload', imageUrl: expect.stringContaining('/api/singers/9/profile-image') },
      });
      expect(singers[0].public_uuid).toBe(guestUuid);
      expect(queryMock.mock.calls.some(([sql]) => /SET\s+public_uuid/.test(sql))).toBe(false);
      const exportQuery = queryMock.mock.calls.find(([sql]) => sql.includes('SELECT q.id AS queue_id'))!;
      expect(exportQuery[0]).toContain('q.singer_id IS NULL');
      expect(exportQuery[1]).toEqual([9n, 'guest singer']);
    });

    it('recovers existing name-only guests and requires a UUID only for a new self identity', async () => {
      useGuestDatabase();
      const existing = await request('/singers/self/profile?name=Guest%20Singer', undefined, 'GET', null);
      expect(existing.status).toBe(200);
      expect(await existing.json()).toMatchObject({ singerUuid: guestUuid });
      const missing = await request('/history/self/export?name=Brand%20New', undefined, 'GET', null);
      expect(missing.status).toBe(400);
      expect(await missing.json()).toMatchObject({ error: expect.stringContaining('singerUuid') });
    });

    it('gives a brand-new named guest an empty valid .kd export, not 404', async () => {
      useGuestDatabase({ empty: true });
      const response = await request(`/history/self/export?${guestQuery()}`, undefined, 'GET', null);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        format: 'karaokedock.singer-history', version: 2,
        singers: [{ singer: { uuid: staleUuid, displayName: 'GUEST singer' }, songs: [] }],
      });
    });

    it('keeps an existing UUID authoritative over another existing singer name in reads and exports', async () => {
      const singers = useGuestDatabase({ history: true });
      for (const endpoint of ['/singers/self/profile', '/history/self/export']) {
        const response = await request(`${endpoint}?${guestQuery(guestUuid, 'Other Singer')}`, undefined, 'GET', null);
        expect(response.status).toBe(200);
        const data = await response.json() as any;
        expect(endpoint.includes('/profile') ? data.singerUuid : data.singers[0].singer.uuid).toBe(guestUuid);
      }
      expect(singers[0].display_name).toBe('Guest Singer');
      expect(queryMock.mock.calls.some(([sql]) => sql.startsWith('UPDATE singers'))).toBe(false);
    });

    it.each(['/queue', '/karaoke-nerds/add'])('recovers canonical guest identity during %s enqueue', async (endpoint) => {
      useGuestDatabase();
      const response = await request(endpoint, {
        requestedBy: 'GUEST SINGER', singerUuid: staleUuid, trackId: 101,
        title: 'Song', url: 'https://www.youtube.com/watch?v=example',
      }, 'POST', null);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ singer_id: '9', requested_by: 'Guest Singer' });
      expect(findOrCreateSinger).not.toHaveBeenCalled();
    });

    it.each(['/queue', '/karaoke-nerds/add'])('keeps %s Host manual account targeting outside guest restrictions', async (endpoint) => {
      useGuestDatabase({ linked: true });
      const response = await request(endpoint, {
        requestAsHost: true, requestedBy: 'Account Name', trackId: 101,
        title: 'Song', url: 'https://www.youtube.com/watch?v=example',
      });
      expect(response.status).toBe(200);
      expect(findOrCreateSinger).toHaveBeenCalledWith('Account Name', null);
      expect(queryMock.mock.calls.some(([sql]) => sql.startsWith('SELECT * FROM singers') && sql.includes('FOR UPDATE'))).toBe(false);
    });

    it.each([
      ['/singers/self/profile', 'GET'],
      ['/singers/self/profile/image', 'POST'],
      ['/singers/self/profile/focus', 'PATCH'],
      ['/singers/self/profile/image', 'DELETE'],
      ['/singers/self/name', 'POST'],
      ['/history/self/export', 'GET'],
      ['/history/self/import', 'POST'],
      ['/queue', 'POST'],
    ])('denies account-linked guest access to %s %s by UUID and name recovery', async (endpoint, method) => {
      useGuestDatabase({ linked: true });
      for (const uuid of [guestUuid, staleUuid]) {
        const response = await request(`${endpoint}?${guestQuery(uuid)}`, {
          name: 'Guest Singer', singerUuid: uuid, requestedBy: 'Guest Singer', trackId: 101, data: kdFile, crop,
        }, method, null);
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ error: expect.stringContaining('Sign in') });
      }
      expect(queryMock.mock.calls.some(([sql]) => /^(UPDATE|INSERT|DELETE)/.test(sql))).toBe(false);
    });

    it('adopts canonical UUID/name on an unknown-UUID name edit, and rejects a known-UUID rename collision', async () => {
      const singers = useGuestDatabase();
      const recovered = await request('/singers/self/name', { name: 'GUEST SINGER', singerUuid: staleUuid }, 'POST', null);
      expect(recovered.status).toBe(200);
      expect(await recovered.json()).toMatchObject({ singer: { uuid: guestUuid, displayName: 'Guest Singer' } });
      const conflict = await request('/singers/self/name', { name: 'Other Singer', singerUuid: guestUuid }, 'POST', null);
      expect(conflict.status).toBe(409);
      expect(singers[0].display_name).toBe('Guest Singer');
    });

    it('renames its own guest and active queue rows while retaining the canonical UUID', async () => {
      useGuestDatabase();
      const response = await request('/singers/self/name', { name: 'Renamed Guest', singerUuid: guestUuid }, 'POST', null);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ singer: { uuid: guestUuid, displayName: 'Renamed Guest' } });
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE queue SET requested_by"), ['Renamed Guest', 9n]);
    });

    it('uses canonical identity for guest profile uploads, crops, clears and imports', async () => {
      useGuestDatabase();
      const upload = await fetch(`${baseUrl}/singers/self/profile/image?${guestQuery()}`, {
        method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png,
      });
      expect(upload.status).toBe(200);
      expect(await upload.json()).toMatchObject({ singerUuid: guestUuid });
      for (const [endpoint, method, body] of [
        ['/singers/self/profile/focus', 'PATCH', { crop }],
        ['/singers/self/profile/image', 'DELETE', {}],
        ['/history/self/import', 'POST', { data: { ...kdFile, singers: [{ singer: { uuid: otherUuid, displayName: 'Other Singer', profile: { crop } }, songs: [] }] } }],
      ] as const) {
        const response = await request(`${endpoint}?${guestQuery()}`, body, method, null);
        expect(response.status).toBe(200);
      }
      const imageWrites = queryMock.mock.calls.filter(([sql]) => sql.startsWith('UPDATE singers') && sql.includes('profile_image'));
      expect(imageWrites.length).toBeGreaterThanOrEqual(3);
      expect(imageWrites.every(([, params]) => params?.[0] === 9n)).toBe(true);
      expect(findOrCreateSinger).not.toHaveBeenCalled();
    });

    it('returns explicit errors for invalid sessions and missing profile rows', async () => {
      useGuestDatabase({ missingProfile: true });
      const missing = await request(`/singers/self/profile?${guestQuery()}`, undefined, 'GET', null);
      expect(missing.status).toBe(404);
      expect(await missing.json()).toMatchObject({ error: 'Singer profile not found' });
      vi.mocked(validateSessionInfo).mockResolvedValueOnce({ valid: false, role: 'user' });
      const invalid = await request('/singers/self/name', { name: 'New Name', singerUuid: guestUuid }, 'POST', 'expired');
      expect(invalid.status).toBe(403);
    });

    it('accepts authenticated self/name without guest UUID and updates account, stable singer and active names', async () => {
      vi.mocked(validateSessionInfo).mockResolvedValue({ valid: true, userId: 1, role: 'user' });
      vi.mocked(getUserById).mockResolvedValue({ ...user, role: 'user', oidc_subject: null } as any);
      const fallback = queryMock.getMockImplementation()!;
      queryMock.mockImplementation(async (sql, params) => {
        if (sql.startsWith('SELECT singer_id FROM users')) return { rows: [{ singer_id: '7' }] } as any;
        if (sql.startsWith('SELECT * FROM singers') || sql.startsWith('UPDATE singers')) {
          return { rows: [{ ...host, display_name: sql.startsWith('UPDATE singers SET display_name = $1') ? params?.[0] : 'Host' }] } as any;
        }
        return fallback(sql, params);
      });
      const response = await request('/singers/self/name', { name: 'Account Name' });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ singer: { id: '7', uuid: 'host-uuid', displayName: 'Account Name' } });
      expect(queryMock).toHaveBeenCalledWith('UPDATE users SET display_name = $1 WHERE id = $2', ['Account Name', 1]);
      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE queue SET requested_by'), ['Account Name', 7n]);
      expect(findOrCreateSinger).not.toHaveBeenCalled();
    });

    it('exports only the stable authenticated singer even with another caller-supplied identity', async () => {
      const response = await request(`/history/self/export?${guestQuery()}`, undefined, 'GET');
      expect(response.status).toBe(200);
      const historyQuery = queryMock.mock.calls.find(([sql]) => sql.includes('SELECT q.id AS queue_id'))!;
      expect(historyQuery[0]).toContain('q.singer_id = ANY($1::bigint[])');
      expect(historyQuery[0]).not.toContain('LOWER(');
      expect(historyQuery[1]).toEqual([['7']]);
      expect(withTransaction).not.toHaveBeenCalled();
    });
  });

  describe('guest queue self-service boundaries', () => {
    it('loads only the canonical singer and unowned legacy names, not a stale name belonging to another singer', async () => {
      useGuestDatabase();
      const response = await request(`/queue/by-requester?${guestQuery(guestUuid, 'Other Singer')}`, undefined, 'GET', null);
      expect(response.status).toBe(200);
      const queueQuery = queryMock.mock.calls.find(([sql]) => sql.includes("q.status != 'removed'"))!;
      expect(queueQuery[0]).toContain('q.singer_id IS NULL');
      expect(queueQuery[1]).toEqual(['9', 'guest singer']);
    });

    it.each(['/queue/88/self-requeue', '/queue/88/self-remove'])('does not let a stale name authorize another known singer in %s', async (endpoint) => {
      useGuestDatabase();
      const fallback = queryMock.getMockImplementation()!;
      queryMock.mockImplementation(async (sql, params) => {
        if (sql.startsWith('SELECT id,') && sql.includes('FROM queue')) return { rows: [{
          id: '88', track_id: '101', singer_id: '10', requested_by: 'Other Singer', status: 'done',
        }] } as any;
        return fallback(sql, params);
      });
      const method = endpoint.endsWith('self-remove') ? 'DELETE' : 'POST';
      const response = await request(`${endpoint}?${guestQuery(guestUuid, 'Other Singer')}`, {
        name: 'Other Singer', singerUuid: guestUuid,
      }, method, null);
      expect(response.status).toBe(403);
      expect(queryMock.mock.calls.some(([sql]) => /^(INSERT INTO|UPDATE) queue/.test(sql))).toBe(false);
    });

    it('uses the recovered canonical singer on self-requeue and propagates rotation failures', async () => {
      useGuestDatabase();
      const fallback = queryMock.getMockImplementation()!;
      queryMock.mockImplementation(async (sql, params) => {
        if (sql.startsWith('SELECT id, track_id, requested_by')) return { rows: [{
          id: '88', track_id: '101', singer_id: '9', requested_by: 'Guest Singer', status: 'done',
        }] } as any;
        return fallback(sql, params);
      });
      const body = { name: 'Guest Singer', singerUuid: staleUuid };
      const response = await request('/queue/88/self-requeue', body, 'POST', null);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ singer_id: '9', requested_by: 'Guest Singer' });
      expect(findOrCreateSinger).not.toHaveBeenCalled();
      queryMock.mockClear();
      vi.mocked(ensureSingerInActiveRotation).mockRejectedValueOnce(new Error('rotation failure'));
      const failed = await request('/queue/88/self-requeue', body, 'POST', null);
      expect(failed.status).toBe(500);
      expect(queryMock.mock.calls.some(([sql]) => sql.startsWith('INSERT INTO queue'))).toBe(false);
    });

    it('does not reorder another known singer based on caller-supplied stale name', async () => {
      useGuestDatabase();
      const response = await request('/queue/self-reorder', {
        name: 'Other Singer', singerUuid: guestUuid, queueIds: [88],
      }, 'PATCH', null);
      expect(response.status).toBe(403);
      const ownership = queryMock.mock.calls.find(([sql]) => sql.startsWith('SELECT id FROM queue'))!;
      expect(ownership[0]).toContain('singer_id IS NULL');
      expect(ownership[1]).toEqual(['9', [88], 'guest singer']);
      expect(queryMock.mock.calls.some(([sql]) => sql.startsWith('UPDATE queue'))).toBe(false);
    });
  });

  it('exports .kd original image URLs and optional crop metadata', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as any).mockResolvedValueOnce({ rows: [row] } as any);
    const response = await fetch(`${baseUrl}/history/singers/9/export`, { headers: { 'x-session-token': 'admin-token' } });
    expect(response.status).toBe(200);
    const file = await response.json() as any;
    expect(file.singers[0].singer.profile).toMatchObject({
      imageSource: 'oidc', imageUrl: row.profile_image_url, crop,
    });
  });
});
