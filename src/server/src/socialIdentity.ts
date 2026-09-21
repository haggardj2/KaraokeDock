import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { type User } from './db.js';
import { normalizeSingerName, type SingerRow } from './queueIdentity.js';
import { SocialAuthError, type SocialProvider } from './socialAuthConfig.js';
import { withQueueTransaction } from './rotation/queueTransaction.js';

export type SocialProfile = { subject: string; name: string; picture: string | null };

export function socialPicture(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.searchParams.has('access_token')) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function socialProfile(subject: unknown, name: unknown, picture: unknown, provider: SocialProvider): SocialProfile {
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 512) {
    throw new SocialAuthError('Social sign-in failed', 401);
  }
  const displayName = typeof name === 'string' ? name.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ').slice(0, 160) : '';
  return { subject, name: displayName || (provider === 'google' ? 'Google singer' : 'Facebook singer'), picture: socialPicture(picture) };
}

async function createSocialSinger(client: PoolClient, name: string, userId?: number): Promise<SingerRow> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const displayName = attempt === 0 ? name : `${name} (${attempt + 1})`;
    const normalizedName = normalizeSingerName(displayName);
    // Reserve names of accounts/legacy guests whose canonical singer has not been created yet.
    const reserved = await client.query<{ reserved: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM users u WHERE u.singer_id IS NULL AND ($2::int IS NULL OR u.id <> $2)
          AND (LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(u.display_name, ''), u.username)), '\\s+', ' ', 'g')) = $1
            OR LOWER(REGEXP_REPLACE(TRIM(u.username), '\\s+', ' ', 'g')) = $1)
      ) OR EXISTS (
        SELECT 1 FROM queue WHERE singer_id IS NULL
          AND LOWER(REGEXP_REPLACE(TRIM(requested_by), '\\s+', ' ', 'g')) = $1
      ) AS reserved`,
      [normalizedName, userId ?? null],
    );
    if (reserved.rows[0]?.reserved) continue;
    const result = await client.query<SingerRow>(
      `INSERT INTO singers (public_uuid, display_name, normalized_name, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT (normalized_name) DO NOTHING RETURNING *`,
      [randomUUID(), displayName, normalizedName],
    );
    if (result.rows[0]) return result.rows[0];
  }
  const displayName = `${name} (${randomUUID()})`;
  const result = await client.query<SingerRow>(
    `INSERT INTO singers (public_uuid, display_name, normalized_name, status)
     VALUES ($1, $2, $3, 'active') RETURNING *`,
    [randomUUID(), displayName, normalizeSingerName(displayName)],
  );
  return result.rows[0];
}

export async function resolveSocialIdentity(provider: SocialProvider, profile: SocialProfile): Promise<User> {
  return withQueueTransaction(async (client) => {
    // The database lock also serializes callbacks handled by different API processes.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`social:${provider}:${profile.subject}`]);
    const existing = await client.query<User>(
      'SELECT * FROM users WHERE social_provider = $1 AND social_subject = $2 FOR UPDATE',
      [provider, profile.subject],
    );
    let user = existing.rows[0];
    if (user && !user.is_active) throw new SocialAuthError('Social sign-in is unavailable for this account', 403);
    // Keep provider subjects on their original rows. Linked credentials never rewrite canonical presentation.
    if (user?.canonical_user_id) return user;
    if (!user) {
      const singer = await createSocialSinger(client, profile.name);
      const created = await client.query<User>(
        `INSERT INTO users (username, display_name, picture, role, social_provider, social_subject, singer_id)
         VALUES ($1, $2, $3, 'user', $4, $5, $6) RETURNING *`,
        [`social_${provider}_${randomUUID()}`, singer.display_name, profile.picture, provider, profile.subject, singer.id],
      );
      return created.rows[0];
    }

    // Keep the canonical name (including collision suffixes and singer edits) on later logins.
    // Provider names are never used to rediscover or claim an existing singer.
    let singerId = user.singer_id;
    if (!singerId) {
      const singer = await createSocialSinger(client, user.display_name || profile.name, user.id);
      singerId = String(singer.id);
      user = { ...user, display_name: singer.display_name };
    }
    const updated = await client.query<User>(
      'UPDATE users SET picture = $2, singer_id = $3, display_name = $4, updated_at = NOW() WHERE id = $1 RETURNING *',
      [user.id, profile.picture, singerId, user.display_name],
    );
    return updated.rows[0];
  });
}
