import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query, withTransaction } from './db.js';
import { getSingerMergeCandidates, mergeSingers, parseSingerId } from './singerMerge.js';
import { resortLiveQueue } from './rotation/liveQueue.js';

vi.mock('./db.js', () => ({ query: vi.fn(), withTransaction: vi.fn() }));
vi.mock('./rotation/liveQueue.js', () => ({ resortLiveQueue: vi.fn() }));
const clientQuery = vi.fn();
const target = {
  id: '7', public_uuid: 'target-uuid', display_name: 'Target', normalized_name: 'target', status: 'active',
  profile_image_source: 'oidc', profile_image_url: 'https://images.example/target',
};
const source = {
  id: '9', public_uuid: 'source-uuid', display_name: 'Source', normalized_name: 'source', status: 'inactive',
  profile_image_source: 'oidc', profile_image_url: 'https://images.example/source',
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ query: clientQuery } as any));
  clientQuery.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT * FROM singers')) return { rows: [target, source] };
    if (sql.startsWith('SELECT * FROM users')) return { rows: [] };
    return { rows: [] };
  });
});

describe('shared singer merge contract', () => {
  it.each(['1', '9007199254740993', '9223372036854775807', 1, Number.MAX_SAFE_INTEGER])('accepts exact positive IDs %s', (value) => {
    expect(parseSingerId(value).toString()).toBe(String(value));
  });
  it.each([undefined, null, '', '0', '01', '-1', '1.0', '1e3', ' 1', '9223372036854775808', 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, {}, []])(
    'rejects ambiguous or lossy IDs %j', (value) => expect(() => parseSingerId(value)).toThrow(),
  );
  it('merges guests under the queue lock with stats/order in the same transaction', async () => {
    expect(await mergeSingers('7', '9')).toEqual({ ok: true, singerId: '7', displayName: 'Target', linkedAccountCount: 0 });
    expect(clientQuery.mock.calls[0][0]).toContain('karaokedock:live-queue');
    expect(clientQuery).toHaveBeenCalledWith('UPDATE users SET singer_id = $1 WHERE singer_id = $2', [7n, 9n]);
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('profile_image_user_id = $2'), [7n, null]);
    expect(clientQuery.mock.calls.some(([sql]) => /UPDATE users SET (role|is_active)|DELETE FROM users|DELETE FROM sessions/.test(sql))).toBe(false);
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes('FROM queue WHERE singer_id') && sql.includes("status = 'done'"))).toBe(true);
    expect(resortLiveQueue).toHaveBeenCalledWith(expect.objectContaining({ query: clientQuery }));
  });
  it('rejects all account-linked singers without changing identity or privileges', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM singers')) return { rows: [target, source] };
      if (sql.startsWith('SELECT * FROM users')) return { rows: [{ id: 1, singer_id: '7' }] };
      return { rows: [] };
    });
    await expect(mergeSingers('7', '9')).rejects.toMatchObject({ status: 409 });
    expect(clientQuery.mock.calls.some(([sql]) => /^(UPDATE|DELETE)/.test(sql))).toBe(false);
  });
  it('rejects self/missing/stale merges without mutation', async () => {
    await expect(mergeSingers('7', '7')).rejects.toMatchObject({ status: 400 });
    expect(withTransaction).not.toHaveBeenCalled();
    clientQuery.mockResolvedValue({ rows: [] });
    await expect(mergeSingers('7', '99')).rejects.toMatchObject({ status: 404 });
    expect(clientQuery.mock.calls.some(([sql]) => /^(UPDATE|DELETE)/.test(sql))).toBe(false);
  });
  it('returns all database candidates rather than restricting candidates to the active queue', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ id: '7' }] } as any).mockResolvedValue({ rows: [] } as any);
    expect(await getSingerMergeCandidates('7', '50%_')).toEqual({ singers: [], hasMore: false });
    const [sql, params] = vi.mocked(query).mock.calls[2];
    expect(sql).toContain('LIMIT 51');
    expect(sql).toContain('u.username ILIKE $2');
    expect(sql).not.toContain("status = 'active'");
    expect(sql).toContain('NOT EXISTS (SELECT 1 FROM users owner WHERE owner.singer_id = s.id)');
    expect(params).toEqual([7n, '%50\\%\\_%']);
  });
  it('does not recreate the unique user-to-singer index on startup and installs durable canonical metadata', () => {
    for (const file of ['init.sql', '021_singer_identity_and_crop.sql', '024_shared_singer_identity.sql']) {
      const sql = readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
      expect(sql).not.toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_singer_id');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_users_singer_id');
    }
    const migration = readFileSync(new URL('../migrations/024_shared_singer_identity.sql', import.meta.url), 'utf8');
    expect(migration).toContain('DROP INDEX IF EXISTS idx_users_singer_id');
    expect(migration).toContain('identity_merged BOOLEAN');
    expect(migration).toContain('profile_image_user_id INT REFERENCES users(id) ON DELETE SET NULL');
  });
});
