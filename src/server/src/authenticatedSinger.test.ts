import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureAuthenticatedSinger, renameAuthenticatedSinger, resolveQueueRequester } from './authenticatedSinger.js';
import { getUserById, query, validateSessionInfo, withTransaction, type User } from './db.js';
import { findOrCreateSinger } from './queueIdentity.js';
import { syncSingerProfileFromOidc } from './singerProfile.js';

vi.mock('./db.js', () => ({
  query: vi.fn(), withTransaction: vi.fn(), validateSessionInfo: vi.fn(), getUserById: vi.fn(),
}));
vi.mock('./queueIdentity.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('./queueIdentity.js')>(), findOrCreateSinger: vi.fn(),
}));
vi.mock('./singerProfile.js', () => ({ syncSingerProfileFromOidc: vi.fn() }));

const user = {
  id: 1, username: 'host@example.com', display_name: 'Host', picture: 'https://id.example/host',
  is_active: true, role: 'admin', oidc_subject: 'oidc-host',
} as User;
const host = { id: 7n, display_name: 'Host', normalized_name: 'host', public_uuid: 'host-uuid', status: 'active' };
const target = { id: 9n, display_name: 'Selected Singer', normalized_name: 'selected singer', public_uuid: 'singer-uuid', status: 'active' };
const queryMock = vi.mocked(query);
const clientQuery = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(validateSessionInfo).mockResolvedValue({ valid: true, userId: 1, role: 'admin' });
  vi.mocked(getUserById).mockResolvedValue(user);
  queryMock.mockResolvedValue({ rows: [] } as any);
  clientQuery.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT singer_id FROM users')) return { rows: [{ singer_id: '7' }] };
    if (sql.startsWith('SELECT * FROM singers') || sql.startsWith('UPDATE singers')) return { rows: [host] };
    return { rows: [] };
  });
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ query: clientQuery } as any));
  vi.mocked(findOrCreateSinger).mockResolvedValue(target);
});

describe('queue requester identity', () => {
  it('resolves explicit admin singerId instead of host or caller-supplied name/UUID', async () => {
    queryMock.mockResolvedValueOnce({ rows: [target] } as any);
    const result = await resolveQueueRequester('admin-token', { singerId: '9', requestedBy: 'Host', singerUuid: 'ignored', requestAsHost: true });
    expect(result).toEqual(target);
    expect(queryMock).toHaveBeenNthCalledWith(1, 'SELECT * FROM singers WHERE id = $1', ['9']);
    expect(findOrCreateSinger).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('synchronizes the selected singer avatar, never the host avatar', async () => {
    const owner = { ...user, id: 2, picture: 'https://id.example/selected' };
    queryMock.mockResolvedValueOnce({ rows: [target] } as any).mockResolvedValueOnce({ rows: [owner] } as any);
    await resolveQueueRequester('admin-token', { singerId: '9' });
    expect(syncSingerProfileFromOidc).toHaveBeenCalledWith(9n, owner);
  });

  it('uses requestedBy and UUID for a new manual Host singer, not the authenticated host', async () => {
    const uuid = 'b31327c2-ef24-4bf3-9558-9b27113247d3';
    vi.mocked(findOrCreateSinger).mockResolvedValueOnce({ ...target, public_uuid: uuid });
    expect((await resolveQueueRequester('admin-token', {
      requestAsHost: true, requestedBy: ' New Singer ', singerUuid: uuid,
    }))?.id).toBe(9n);
    expect(findOrCreateSinger).toHaveBeenCalledWith('New Singer', uuid);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it.each([
    { singerId: '9' }, { requestAsHost: true, requestedBy: 'New' },
  ])('rejects non-admin targeting %j', async (body) => {
    vi.mocked(validateSessionInfo).mockResolvedValue({ valid: true, userId: 1, role: 'user' });
    await expect(resolveQueueRequester('user-token', body)).rejects.toMatchObject({ status: 403 });
    expect(queryMock).not.toHaveBeenCalled();
    expect(findOrCreateSinger).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated, invalid, expired and demoted admin sessions', async () => {
    await expect(resolveQueueRequester(undefined, { requestAsHost: true })).rejects.toMatchObject({ status: 403 });
    vi.mocked(validateSessionInfo).mockResolvedValueOnce({ valid: false, role: 'admin' });
    await expect(resolveQueueRequester('expired', { singerId: '9' })).rejects.toMatchObject({ status: 403 });
    vi.mocked(getUserById).mockResolvedValueOnce({ ...user, role: 'user' });
    await expect(resolveQueueRequester('demoted', { singerId: '9' })).rejects.toMatchObject({ status: 403 });
    vi.mocked(getUserById).mockResolvedValueOnce({ ...user, is_active: false });
    await expect(resolveQueueRequester('disabled', { singerId: '9' })).rejects.toMatchObject({ status: 403 });
  });

  it.each([null, 9, '', '-1', '1.2', '1e2', '9223372036854775808'])('rejects invalid singerId %j', async (singerId) => {
    await expect(resolveQueueRequester('admin-token', { singerId })).rejects.toMatchObject({ status: 400 });
  });

  it('does not silently fall back for a missing selected singer', async () => {
    await expect(resolveQueueRequester('admin-token', { singerId: '99' })).rejects.toMatchObject({ status: 404 });
    expect(findOrCreateSinger).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', '  '])('allows anonymous admin Host requests with name %j, never host self', async (requestedBy) => {
    expect(await resolveQueueRequester('admin-token', { requestAsHost: true, requestedBy })).toBeNull();
    expect(findOrCreateSinger).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
    expect(syncSingerProfileFromOidc).not.toHaveBeenCalled();
  });

  it.each([123, false, {}, []])('rejects invalid non-string manual Host names %j', async (requestedBy) => {
    await expect(resolveQueueRequester('admin-token', { requestAsHost: true, requestedBy })).rejects.toMatchObject({ status: 400 });
    expect(findOrCreateSinger).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it.each([{}, { requestedBy: 'Impersonated', singerUuid: 'spoofed' }, { requestAsHost: false, requestedBy: 'Other' }])(
    'always uses authenticated identity for ordinary self requests %j', async (body) => {
      expect(await resolveQueueRequester('session', body)).toEqual(host);
      expect(findOrCreateSinger).not.toHaveBeenCalled();
      expect(syncSingerProfileFromOidc).toHaveBeenCalledWith(7n, user);
    },
  );

  it('preserves guest requests and propagates identity persistence errors', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [target] }).mockResolvedValueOnce({ rows: [] });
    expect(await resolveQueueRequester(undefined, { requestedBy: 'Selected Singer' })).toEqual(target);
    vi.mocked(withTransaction).mockRejectedValueOnce(new Error('database unavailable'));
    await expect(resolveQueueRequester('session', {})).rejects.toThrow('database unavailable');
  });
});

describe('authenticated self name edits', () => {
  it('updates the account and stable singer/active queue names without a guest UUID', async () => {
    clientQuery.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.startsWith('SELECT singer_id FROM users')) return { rows: [{ singer_id: '7' }] };
      if (sql.startsWith('SELECT * FROM singers')) return { rows: [host] };
      if (sql.startsWith('UPDATE singers')) return { rows: [{ ...host, display_name: params?.[0] === 'New Host' ? 'New Host' : 'Host' }] };
      return { rows: [] };
    });
    expect(await renameAuthenticatedSinger(user, ' New   Host ')).toMatchObject({ id: 7n, display_name: 'New Host', public_uuid: host.public_uuid });
    expect(clientQuery).toHaveBeenCalledWith('UPDATE users SET display_name = $1 WHERE id = $2', ['New Host', 1]);
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining("UPDATE queue SET requested_by"), ['New Host', 7n]);
    expect(findOrCreateSinger).not.toHaveBeenCalled();
  });

  it('rejects an account rename collision without updating the user display name', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT singer_id FROM users')) return { rows: [{ singer_id: '7' }] };
      if (sql.startsWith('SELECT * FROM singers') || sql.startsWith('UPDATE singers')) return { rows: [host] };
      if (sql.startsWith('SELECT id FROM singers')) return { rows: [target] };
      return { rows: [] };
    });
    await expect(renameAuthenticatedSinger(user, 'Selected Singer')).rejects.toMatchObject({ status: 409 });
    expect(clientQuery.mock.calls.some(([sql]) => sql.startsWith('UPDATE users SET display_name'))).toBe(false);
  });
});

describe('persistent authenticated singer linkage', () => {
  it('keeps linked identity across display-name changes and synchronizes existing queue rows', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT singer_id FROM users')) return { rows: [{ singer_id: '7' }] };
      if (sql.startsWith('SELECT * FROM singers')) return { rows: [host] };
      if (sql.startsWith('UPDATE singers')) return { rows: [{ ...host, display_name: 'Renamed Host' }] };
      return { rows: [] };
    });
    const result = await ensureAuthenticatedSinger({ ...user, display_name: 'Renamed Host' });
    expect(result.id).toBe(7n);
    expect(result.display_name).toBe('Renamed Host');
    expect(clientQuery).toHaveBeenCalledWith('SELECT * FROM singers WHERE id = $1', ['7']);
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE queue SET singer_id'),
      [7n, 'Renamed Host', ['renamed host', 'host@example.com', 'host']]);
  });

  it('links existing name or username singers before creating new ones', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT singer_id FROM users')) return { rows: [{ singer_id: null }] };
      if (sql.startsWith('SELECT * FROM singers') || sql.startsWith('UPDATE singers')) return { rows: [host] };
      return { rows: [] };
    });
    await ensureAuthenticatedSinger(user);
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('normalized_name = ANY'),
      [['host', 'host@example.com'], 'host']);
    expect(clientQuery).toHaveBeenCalledWith('UPDATE users SET singer_id = $1 WHERE id = $2', [7n, 1]);
    expect(clientQuery.mock.calls.some(([sql]) => sql.startsWith('INSERT INTO singers'))).toBe(false);
  });

  it('does not claim a singer linked to another account', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT singer_id FROM users')) return { rows: [{ singer_id: null }] };
      if (sql.startsWith('SELECT * FROM singers')) return { rows: [host] };
      if (sql.startsWith('SELECT id FROM users')) return { rows: [{ id: 2 }] };
      return { rows: [] };
    });
    await expect(ensureAuthenticatedSinger(user)).rejects.toMatchObject({ status: 409 });
    expect(syncSingerProfileFromOidc).not.toHaveBeenCalled();
  });

  it('does not claim ambiguous pre-linkage singers shared by account display names', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT singer_id FROM users')) return { rows: [{ singer_id: null }] };
      if (sql.startsWith('SELECT * FROM singers')) return { rows: [host] };
      if (sql.startsWith('SELECT id FROM users WHERE id <>')) return { rows: [{ id: 2 }] };
      return { rows: [] };
    });
    await expect(ensureAuthenticatedSinger(user)).rejects.toMatchObject({ status: 409 });
    expect(syncSingerProfileFromOidc).not.toHaveBeenCalled();
  });
});
