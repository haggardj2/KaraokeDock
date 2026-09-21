import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTransaction, type User } from './db.js';
import { resolveSocialIdentity, socialProfile } from './socialIdentity.js';

vi.mock('./db.js', () => ({ withTransaction: vi.fn() }));
const clientQuery = vi.fn();
const profile = { subject: 'provider-subject', name: 'Same Name', picture: 'https://images.example/profile' };
const existing = {
  id: 12, singer_id: '42', username: 'social_google_random', display_name: 'Same Name (2)',
  picture: null, is_active: true, role: 'user', social_provider: 'google', social_subject: profile.subject,
} as User;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ query: clientQuery } as any));
  clientQuery.mockResolvedValue({ rows: [] });
});

describe('persistent social singer identities', () => {
  it('creates a distinct canonical singer before the passwordless user in the same transaction', async () => {
    clientQuery.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('INSERT INTO singers')) return { rows: [{ id: '42', display_name: params[1] }] };
      if (sql.includes('INSERT INTO users')) return { rows: [existing] };
      return { rows: [] };
    });
    expect(await resolveSocialIdentity('google', profile)).toEqual(existing);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(clientQuery.mock.calls[0][0]).toContain('karaokedock:live-queue');
    const calls = clientQuery.mock.calls.slice(1);
    expect(calls[0]).toEqual([expect.stringContaining('pg_advisory_xact_lock'), ['social:google:provider-subject']]);
    expect(calls[1]).toEqual(['SELECT * FROM users WHERE social_provider = $1 AND social_subject = $2 FOR UPDATE', ['google', 'provider-subject']]);
    expect(calls[3][0]).toContain('INSERT INTO singers');
    expect(calls[4][0]).toContain('INSERT INTO users');
    expect(calls[4][0]).toContain("'user'");
    expect(calls[4][1]).toEqual([expect.stringMatching(/^social_google_/), 'Same Name', profile.picture, 'google', profile.subject, '42']);
    expect(calls[4][0]).not.toContain('password_hash');
    expect(calls.some(([sql]) => sql.includes('oidc_') || sql.includes('SELECT * FROM singers'))).toBe(false);
  });

  it('uses unique normalized names rather than taking over an existing guest/account with the same name', async () => {
    clientQuery.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('INSERT INTO singers')) {
        if (params[2] === 'same name') return { rows: [] };
        return { rows: [{ id: '42', display_name: params[1] }] };
      }
      if (sql.includes('INSERT INTO users')) return { rows: [existing] };
      return { rows: [] };
    });
    await resolveSocialIdentity('google', profile);
    const singerInserts = clientQuery.mock.calls.filter(([sql]) => sql.includes('INSERT INTO singers'));
    expect(singerInserts.map(([, params]) => params.slice(1))).toEqual([['Same Name', 'same name'], ['Same Name (2)', 'same name (2)']]);
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes('UPDATE singers') || sql.includes('UPDATE queue'))).toBe(false);
  });

  it('reserves names for local accounts and legacy queue guests without singer rows', async () => {
    clientQuery.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.startsWith('SELECT EXISTS')) return { rows: [{ reserved: params[0] === 'same name' }] };
      if (sql.includes('INSERT INTO singers')) return { rows: [{ id: '42', display_name: params[1] }] };
      if (sql.includes('INSERT INTO users')) return { rows: [existing] };
      return { rows: [] };
    });
    await resolveSocialIdentity('google', profile);
    const reservation = clientQuery.mock.calls.find(([sql]) => sql.startsWith('SELECT EXISTS'))!;
    expect(reservation[0]).toContain('FROM users u WHERE u.singer_id IS NULL');
    expect(reservation[0]).toContain('FROM queue WHERE singer_id IS NULL');
    const singers = clientQuery.mock.calls.filter(([sql]) => sql.includes('INSERT INTO singers'));
    expect(singers).toHaveLength(1);
    expect(singers[0][1].slice(1)).toEqual(['Same Name (2)', 'same name (2)']);
  });

  it('always reuses the provider subject/user/singer after the provider name changes and refreshes the picture', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM users')) return { rows: [existing] };
      if (sql.startsWith('UPDATE users')) return { rows: [{ ...existing, picture: profile.picture }] };
      return { rows: [] };
    });
    const result = await resolveSocialIdentity('google', { ...profile, name: 'Someone Else' });
    expect(result).toMatchObject({ id: 12, singer_id: '42', display_name: 'Same Name (2)', picture: profile.picture });
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET picture'), [12, profile.picture, '42', 'Same Name (2)']);
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes('INSERT') || sql.includes('normalized_name'))).toBe(false);
  });

  it('keeps provider namespaces separate even if subjects match', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(new Error('stop after lock'));
    await expect(resolveSocialIdentity('facebook', profile)).rejects.toThrow();
    expect(clientQuery.mock.calls[1][1]).toEqual(['social:facebook:provider-subject']);
  });

  it('rejects disabled accounts before any profile, singer or queue changes', async () => {
    clientQuery.mockImplementation(async (sql: string) => ({
      rows: sql.startsWith('SELECT * FROM users') ? [{ ...existing, is_active: false }] : [],
    }));
    await expect(resolveSocialIdentity('google', profile)).rejects.toMatchObject({ status: 403 });
    expect(clientQuery.mock.calls.some(([sql]) => /INSERT|UPDATE users|UPDATE singers/.test(sql))).toBe(false);
  });
  it('does not rewrite a linked social identity or canonical presentation on callback', async () => {
    const linked = { ...existing, canonical_user_id: 7 };
    clientQuery.mockImplementation(async (sql: string) => ({
      rows: sql.startsWith('SELECT * FROM users') ? [linked] : [],
    }));
    expect(await resolveSocialIdentity('google', { ...profile, name: 'Provider rename', picture: 'https://images.example/new' })).toEqual(linked);
    expect(clientQuery.mock.calls.some(([sql]) => /^(INSERT|UPDATE|DELETE)/.test(sql))).toBe(false);
  });

  it('creates a new explicit singer rather than name-matching when an administrator deleted the old singer', async () => {
    clientQuery.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.startsWith('SELECT * FROM users')) return { rows: [{ ...existing, singer_id: null }] };
      if (sql.includes('INSERT INTO singers')) return { rows: [{ id: '43', display_name: params[1] }] };
      if (sql.startsWith('UPDATE users')) return { rows: [{ ...existing, singer_id: '43' }] };
      return { rows: [] };
    });
    expect(await resolveSocialIdentity('google', profile)).toMatchObject({ singer_id: '43' });
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes('SELECT * FROM singers'))).toBe(false);
  });

  it('retains only subject, sanitized name and safe picture, never email/tokens/full claims', () => {
    expect(socialProfile('id', ' \u0000Same   Name ', 'https://images.example/picture', 'google'))
      .toEqual({ subject: 'id', name: 'Same Name', picture: 'https://images.example/picture' });
    expect(socialProfile('id', null, null, 'facebook').name).toBe('Facebook singer');
    expect(() => socialProfile('', 'Name', null, 'google')).toThrow();
  });

  it('installs unique provider/subject identities and prevents startup migrations from claiming legacy names', () => {
    const migration = readFileSync(new URL('../migrations/023_singer_social_login.sql', import.meta.url), 'utf8');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_social_identity');
    expect(migration).toContain('ON users(social_provider, social_subject)');
    expect(migration).toContain('oidc_subject IS NULL AND oidc_issuer IS NULL');
    expect(readFileSync(new URL('../scripts/migrate.sh', import.meta.url), 'utf8')).toContain('023_singer_social_login.sql');
    expect(readFileSync(new URL('../migrations/init.sql', import.meta.url), 'utf8')).toContain('u.social_provider IS NOT NULL');
    expect(readFileSync(new URL('../migrations/021_singer_identity_and_crop.sql', import.meta.url), 'utf8'))
      .toContain("to_jsonb(u)->>'social_provider' IS NULL");
  });
});
