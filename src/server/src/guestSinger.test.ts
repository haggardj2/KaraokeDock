import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTransaction } from './db.js';
import { resolveGuestSinger } from './guestSinger.js';
import type { SingerRow } from './queueIdentity.js';

vi.mock('./db.js', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

const uuid = 'b31327c2-ef24-4bf3-9558-9b27113247d3';
const staleUuid = '573752cf-719e-456b-8c86-047407691de5';
const otherUuid = '0429219e-ee20-4084-9161-1647025a2d81';
const canonical: SingerRow = {
  id: 9n, public_uuid: uuid, display_name: 'Guest Singer', normalized_name: 'guest singer', status: 'active',
};
const clientQuery = vi.fn();
let singers: SingerRow[];
let accountLinked: boolean;

beforeEach(() => {
  vi.resetAllMocks();
  singers = [{ ...canonical }];
  accountLinked = false;
  clientQuery.mockImplementation(async (sql: string, params: any[] = []) => {
    if (sql.startsWith('SELECT * FROM singers')) {
      const match = sql.includes('public_uuid = $1 OR normalized_name')
        ? singers.find((s) => s.public_uuid === params[0]) ?? singers.find((s) => s.normalized_name === params[1])
        : sql.includes('public_uuid')
          ? singers.find((s) => s.public_uuid === params[0])
          : singers.find((s) => s.normalized_name === params[0]);
      return { rows: match ? [{ ...match }] : [] };
    }
    if (sql.startsWith('SELECT id FROM users')) return { rows: accountLinked ? [{ id: 1 }] : [] };
    if (sql.startsWith('SELECT id FROM singers')) {
      return { rows: singers.filter((s) => s.normalized_name === params[0] && s.id !== params[1]) };
    }
    if (sql.startsWith('INSERT INTO singers')) {
      singers.push({ id: 10n, public_uuid: params[0], display_name: params[1], normalized_name: params[2], status: 'active' });
    }
    if (sql.startsWith('UPDATE singers')) {
      const singer = singers.find((s) => s.id === params[2])!;
      Object.assign(singer, { display_name: params[0], normalized_name: params[1] });
      return { rows: [{ ...singer }] };
    }
    return { rows: [] };
  });
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ query: clientQuery } as any));
});

describe('guest canonical identity', () => {
  it.each([staleUuid, undefined, null])('recovers a normalized guest name for UUID %s without changing it', async (rawUuid) => {
    expect(await resolveGuestSinger('  GUEST   singer ', rawUuid)).toEqual(canonical);
    expect(clientQuery.mock.calls.some(([sql]) => /^(UPDATE|INSERT)/.test(sql))).toBe(false);
    expect(singers).toEqual([canonical]);
  });

  it('uses an existing UUID without renaming it from a stale name or looking up that name', async () => {
    singers.push({ ...canonical, id: 11n, public_uuid: otherUuid, display_name: 'Other', normalized_name: 'other' });
    expect(await resolveGuestSinger('Other', uuid)).toEqual(canonical);
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes('normalized_name = $1'))).toBe(false);
    expect(singers[0]).toEqual(canonical);
  });

  it('resolves a known UUID without requiring a name', async () => {
    expect(await resolveGuestSinger(undefined, uuid.toUpperCase())).toEqual(canonical);
  });

  it('creates a new guest with the supplied UUID when no identity matches', async () => {
    expect(await resolveGuestSinger(' New   Guest ', staleUuid)).toMatchObject({
      public_uuid: staleUuid, display_name: 'New Guest', normalized_name: 'new guest',
    });
    expect(singers[0]).toEqual(canonical);
  });

  it('requires a valid UUID to create a self profile but allows legacy name-only enqueue', async () => {
    await expect(resolveGuestSinger('New Guest', undefined)).rejects.toMatchObject({ status: 400 });
    const singer = await resolveGuestSinger('New Guest', undefined, { requireUuid: false });
    expect(singer.public_uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each(['', 'random', 123, []])('rejects malformed UUID %j without writes', async (rawUuid) => {
    await expect(resolveGuestSinger('Guest Singer', rawUuid)).rejects.toMatchObject({ status: 400 });
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it.each([uuid, staleUuid, undefined])('denies account-linked identities via UUID %s before any name mutation', async (rawUuid) => {
    accountLinked = true;
    await expect(resolveGuestSinger('Guest Singer', rawUuid, { rename: true }))
      .rejects.toMatchObject({ status: 403, message: expect.stringContaining('Sign in') });
    expect(clientQuery.mock.calls.some(([sql]) => /^(UPDATE|INSERT)/.test(sql))).toBe(false);
    expect(clientQuery).toHaveBeenCalledWith('SELECT id FROM users WHERE singer_id = $1 LIMIT 1', [9n]);
  });

  it('renames only the explicitly identified guest and its active queue names', async () => {
    const singer = await resolveGuestSinger(' New   Name ', uuid, { rename: true });
    expect(singer).toEqual({ ...canonical, display_name: 'New Name', normalized_name: 'new name' });
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining("status IN ('queued', 'playing')"), ['New Name', 9n]);
    expect(clientQuery.mock.calls.some(([sql]) => /SET\s+public_uuid/.test(sql))).toBe(false);
  });

  it('adopts the canonical row on an unknown-UUID name edit without changing canonical casing', async () => {
    expect(await resolveGuestSinger('GUEST SINGER', staleUuid, { rename: true })).toEqual(canonical);
    expect(clientQuery.mock.calls.some(([sql]) => /^(UPDATE|INSERT)/.test(sql))).toBe(false);
  });

  it('rejects renaming a known guest to another existing singer instead of aliasing or merging', async () => {
    singers.push({ ...canonical, id: 11n, public_uuid: otherUuid, display_name: 'Other', normalized_name: 'other' });
    await expect(resolveGuestSinger('Other', uuid, { rename: true })).rejects.toMatchObject({ status: 409 });
    expect(singers[0]).toEqual(canonical);
    expect(clientQuery.mock.calls.some(([sql]) => /^(UPDATE|DELETE)/.test(sql))).toBe(false);
  });

  it('surfaces persistence failures instead of returning an anonymous identity', async () => {
    clientQuery.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(resolveGuestSinger('Guest Singer', staleUuid)).rejects.toThrow('database unavailable');
  });
});
