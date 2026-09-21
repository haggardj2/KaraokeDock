import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserById, query, withTransaction, type User } from './db.js';
import { ensureAuthenticatedSinger } from './authenticatedSinger.js';
import { mergeSingersWithClient } from './singerMerge.js';
import { getAccountLinkCandidates, linkAccountLogin, parseUserId, resolveSocialLoginUser } from './accountLinks.js';

vi.mock('./db.js', () => ({ getUserById: vi.fn(), query: vi.fn(), withTransaction: vi.fn() }));
vi.mock('./authenticatedSinger.js', () => ({ ensureAuthenticatedSinger: vi.fn() }));
vi.mock('./singerMerge.js', () => ({ mergeSingersWithClient: vi.fn() }));
const clientQuery = vi.fn();
const target = {
  id: 1, username: 'admin', display_name: 'Admin Singer', singer_id: '7', role: 'admin', is_active: true,
  oidc_subject: 'oidc-id', social_provider: null, password_hash: null,
} as User;
const source = {
  id: 2, username: 'social_google_uuid', display_name: 'Social Singer', singer_id: '9', role: 'user', is_active: true,
  social_provider: 'google', social_subject: 'google-id', password_hash: null, oidc_subject: null,
} as User;
let users: User[];

beforeEach(() => {
  vi.resetAllMocks();
  users = [{ ...target }, { ...source }];
  vi.mocked(getUserById).mockImplementation(async (id) => users.find((user) => user.id === id) ?? null);
  vi.mocked(query).mockResolvedValue({ rows: [] } as any);
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ query: clientQuery } as any));
  clientQuery.mockImplementation(async (sql) => ({ rows: sql.startsWith('SELECT * FROM users') ? users : [] }));
});

describe('explicit social credential links', () => {
  it('merges singer references and preserves source credentials and canonical account privileges atomically', async () => {
    expect(await linkAccountLogin('1', 2)).toEqual({
      ok: true, userId: 1, sourceUserId: 2, singerId: '7', username: 'admin', role: 'admin', alreadyLinked: false,
    });
    expect(clientQuery.mock.calls[0][0]).toContain('karaokedock:live-queue');
    expect(mergeSingersWithClient).toHaveBeenCalledWith(expect.anything(), 7n, 9n, true);
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('SET canonical_user_id = $1'), [1, 2]);
    expect(clientQuery).toHaveBeenCalledWith('DELETE FROM sessions WHERE user_id = $1 OR login_user_id = $1', [2]);
    expect(clientQuery.mock.calls.some(([sql]) => /DELETE FROM users|SET (role|password_hash|social_subject)/.test(sql))).toBe(false);
  });
  it('links previously shared singers without a self-merge or implicit promotion of other owners', async () => {
    users[1].singer_id = '7';
    expect(await linkAccountLogin(1, 2)).toMatchObject({ alreadyLinked: false, singerId: '7' });
    expect(mergeSingersWithClient).not.toHaveBeenCalled();
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('SET canonical_user_id = $1'), [1, 2]);
  });
  it('makes repeat linking idempotent without invalidating new canonical sessions', async () => {
    users[1].canonical_user_id = 1;
    users[1].singer_id = '7';
    expect(await linkAccountLogin(1, 2)).toMatchObject({ alreadyLinked: true });
    expect(clientQuery.mock.calls.some(([sql]) => /^(UPDATE|DELETE)/.test(sql))).toBe(false);
  });
  it.each(['disabled-target', 'disabled-source', 'local-source', 'oidc-source', 'social-target', 'already-linked'])(
    'rejects unsafe linking: %s', async (state) => {
      if (state === 'disabled-target') users[0].is_active = false;
      if (state === 'disabled-source') users[1].is_active = false;
      if (state === 'local-source') users[1].password_hash = 'hash';
      if (state === 'oidc-source') users[1].oidc_subject = 'other-oidc';
      if (state === 'social-target') users[0] = { ...source, id: 1 };
      if (state === 'already-linked') users[1].canonical_user_id = 99;
      await expect(linkAccountLogin(1, 2)).rejects.toMatchObject({ status: 409 });
      expect(withTransaction).not.toHaveBeenCalled();
    },
  );
  it('revalidates accounts under the lock after singer initialization', async () => {
    vi.mocked(ensureAuthenticatedSinger).mockImplementationOnce(async () => {
      users[1].canonical_user_id = 99;
      return {} as any;
    });
    await expect(linkAccountLogin(1, 2)).rejects.toMatchObject({ status: 409 });
    expect(clientQuery.mock.calls.some(([sql]) => /^(UPDATE|DELETE)/.test(sql))).toBe(false);
  });
  it.each([undefined, null, '', '01', '-1', 0, -1, 1.5, true, [], {}, '2147483648', '1e2'])('rejects invalid account IDs %j', (id) => {
    expect(() => parseUserId(id)).toThrow();
  });
  it('validates missing and self links', async () => {
    await expect(linkAccountLogin(1, 1)).rejects.toMatchObject({ status: 400 });
    await expect(linkAccountLogin(1, 99)).rejects.toMatchObject({ status: 404 });
  });
  it('returns safe searchable social candidates including the same singer, not only top-level managed users', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ ...source, singer_id: '7', password_hash: 'not-returned' }] } as any);
    const result = await getAccountLinkCandidates('1', '50%_');
    expect(result).toEqual({ users: [{
      id: 2, username: source.username, displayName: source.display_name, picture: undefined,
      provider: 'google', role: 'user', isActive: true, singerId: '7',
    }], hasMore: false });
    const [sql, values] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain('u.canonical_user_id IS NULL');
    expect(sql).toContain('u.password_hash IS NULL AND u.oidc_subject IS NULL');
    expect(sql).not.toContain('s.id <>');
    expect(values).toEqual([1, '%50\\%\\_%']);
    expect(JSON.stringify(result)).not.toMatch(/password|subject|not-returned/);
  });
  it('never grants an unlinked social identity admin privileges, even after a prior singer merge', async () => {
    expect(await resolveSocialLoginUser({ ...source, role: 'admin', singer_id: '7' })).toMatchObject({ id: 2, role: 'user' });
    expect(getUserById).not.toHaveBeenCalled();
  });
  it('authenticates a linked social credential as its current active canonical account', async () => {
    expect(await resolveSocialLoginUser({ ...source, canonical_user_id: 1 })).toEqual(target);
    users[0].is_active = false;
    await expect(resolveSocialLoginUser({ ...source, canonical_user_id: 1 })).rejects.toMatchObject({ status: 403 });
  });
  it('installs durable restrictive links and session provenance without backfilling or changing roles', () => {
    const sql = readFileSync(new URL('../migrations/026_account_login_links.sql', import.meta.url), 'utf8');
    expect(sql).toContain('canonical_user_id INT REFERENCES users(id) ON DELETE RESTRICT');
    expect(sql).toContain('login_user_id INT REFERENCES users(id) ON DELETE CASCADE');
    expect(sql).not.toMatch(/UPDATE users|DELETE FROM users|SET role/);
  });
});
