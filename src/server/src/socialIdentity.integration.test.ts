import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { query } from './db.js';
import { resolveSocialIdentity } from './socialIdentity.js';
import { ensureAuthenticatedSinger } from './authenticatedSinger.js';

const { enabled, schema } = vi.hoisted(() => {
  const value = process.env.SOCIAL_AUTH_TEST_DATABASE_URL;
  const schema = `social_auth_test_${process.pid}`;
  if (value) {
    const url = new URL(value);
    if (!['/social_auth_test', '/rotation_test'].includes(url.pathname)) {
      throw new Error('Social identity tests require a dedicated social_auth_test or rotation_test database');
    }
    url.searchParams.set('options', `-csearch_path=${schema},public`);
    process.env.DATABASE_URL = url.toString();
  }
  return { enabled: Boolean(value), schema };
});

describe.runIf(enabled)('social identity transactions against PostgreSQL', () => {
  beforeAll(async () => {
    await query(`CREATE SCHEMA ${schema}`);
    await query(`
      CREATE TABLE singers (
        id BIGSERIAL PRIMARY KEY, public_uuid TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
        normalized_name TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'active',
        profile_image_source TEXT, profile_image_url TEXT, profile_image_mime TEXT, profile_image_data BYTEA,
        profile_image_crop JSONB, profile_image_updated_at TIMESTAMPTZ,
        identity_merged BOOLEAN NOT NULL DEFAULT FALSE, profile_image_user_id INT,
        profile_image_admin_override BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE TABLE users (
        id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT,
        display_name TEXT, picture TEXT, role TEXT NOT NULL DEFAULT 'user', is_active BOOLEAN NOT NULL DEFAULT TRUE,
        oidc_subject TEXT, oidc_issuer TEXT, singer_id BIGINT UNIQUE REFERENCES singers(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE queue (
        id BIGSERIAL PRIMARY KEY, singer_id BIGINT REFERENCES singers(id), requested_by TEXT, status TEXT NOT NULL
      );
    `);
    const migration = await readFile(new URL('../migrations/023_singer_social_login.sql', import.meta.url), 'utf8');
    await query(migration);
    await query(migration);
  });
  afterAll(async () => { await query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); });
  beforeEach(async () => { await query('TRUNCATE users, singers, queue RESTART IDENTITY CASCADE'); });

  const profile = { subject: 'subject', name: 'Same Name', picture: 'https://images.example/profile' };

  it('serializes concurrent callbacks into exactly one identity and one linked singer', async () => {
    const users = await Promise.all(Array.from({ length: 8 }, () => resolveSocialIdentity('google', profile)));
    expect(new Set(users.map((user) => user.id)).size).toBe(1);
    expect(new Set(users.map((user) => user.singer_id)).size).toBe(1);
    expect(users[0]).toMatchObject({ role: 'user', password_hash: null, oidc_subject: null, oidc_issuer: null });
    expect((await query('SELECT * FROM users')).rowCount).toBe(1);
    expect((await query('SELECT * FROM singers')).rowCount).toBe(1);
  });

  it('keeps same-name people and provider namespaces separate, without claiming guest or legacy queue', async () => {
    const guest = await query("INSERT INTO singers (public_uuid, display_name, normalized_name) VALUES ('guest', 'Same Name', 'same name') RETURNING id");
    await query("INSERT INTO queue (singer_id, requested_by, status) VALUES ($1, 'Same Name', 'done'), (NULL, 'Same Name', 'queued')", [guest.rows[0].id]);
    const [google, facebook] = await Promise.all([
      resolveSocialIdentity('google', profile), resolveSocialIdentity('facebook', profile),
    ]);
    expect(google.singer_id).not.toBe(facebook.singer_id);
    expect(google.singer_id).not.toBe(guest.rows[0].id);
    expect(google.display_name).not.toBe(facebook.display_name);
    await ensureAuthenticatedSinger(google);
    await ensureAuthenticatedSinger(facebook);
    expect((await query('SELECT singer_id FROM queue ORDER BY id')).rows.map((row) => row.singer_id))
      .toEqual([guest.rows[0].id, null]);
  });

  it('does not reserve an unlinked local account or legacy guest name for a new social singer', async () => {
    await query("INSERT INTO users (username, display_name) VALUES ('local-user', 'Same Name')");
    await query("INSERT INTO queue (requested_by, status) VALUES ('Same Name (2)', 'done')");
    const social = await resolveSocialIdentity('google', profile);
    expect(social.display_name).toBe('Same Name (3)');
    expect((await query("SELECT singer_id FROM users WHERE username = 'local-user'")).rows[0].singer_id).toBeNull();
    expect((await query('SELECT singer_id FROM queue')).rows[0].singer_id).toBeNull();
  });

  it('restores the same queue/history identity across changed provider names and syncs picture changes/removal', async () => {
    const first = await resolveSocialIdentity('google', profile);
    await query("INSERT INTO queue (singer_id, requested_by, status) VALUES ($1, 'Same Name', 'done'), ($1, 'Stale Name', 'queued')", [first.singer_id]);
    const returning = await resolveSocialIdentity('google', { ...profile, name: 'Provider renamed', picture: 'https://images.example/new' });
    expect(returning.id).toBe(first.id);
    expect(returning.singer_id).toBe(first.singer_id);
    await ensureAuthenticatedSinger(returning);
    expect((await query('SELECT profile_image_source, profile_image_url FROM singers WHERE id = $1', [first.singer_id])).rows[0])
      .toEqual({ profile_image_source: 'oidc', profile_image_url: 'https://images.example/new' });
    expect((await query('SELECT singer_id, requested_by FROM queue ORDER BY id')).rows)
      .toEqual([{ singer_id: first.singer_id, requested_by: 'Same Name' }, { singer_id: first.singer_id, requested_by: 'Same Name' }]);
    await ensureAuthenticatedSinger(await resolveSocialIdentity('google', { ...profile, picture: null }));
    expect((await query('SELECT profile_image_url FROM singers WHERE id = $1', [first.singer_id])).rows[0].profile_image_url).toBeNull();
  });

  it('rejects disabled identities and database duplicate provider subjects', async () => {
    const user = await resolveSocialIdentity('google', profile);
    await query('UPDATE users SET is_active = FALSE WHERE id = $1', [user.id]);
    await expect(resolveSocialIdentity('google', profile)).rejects.toMatchObject({ status: 403 });
    await expect(query(
      "INSERT INTO users (username, social_provider, social_subject) VALUES ('duplicate', 'google', 'subject')",
    )).rejects.toMatchObject({ code: '23505' });
    expect((await query('SELECT * FROM users')).rowCount).toBe(1);
  });
});
