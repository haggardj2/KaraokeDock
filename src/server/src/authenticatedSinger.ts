import { randomUUID } from 'crypto';
import { query, withTransaction, validateSessionInfo, getUserById, type User } from './db.js';
import { findOrCreateSinger, normalizeSingerName, normalizeSingerUuid, type SingerRow } from './queueIdentity.js';
import { syncSingerProfileFromOidc } from './singerProfile.js';
import { resolveGuestSinger } from './guestSinger.js';

const requestError = (message: string, status: number) => Object.assign(new Error(message), { status });

export async function ensureAuthenticatedSinger(user: User): Promise<SingerRow> {
  const displayName = (user.display_name?.trim() || user.username).trim().replace(/\s+/g, ' ');
  const normalizedName = normalizeSingerName(displayName);
  const singer = await withTransaction(async (client) => {
    const owner = await client.query<{ singer_id: string | null }>(
      'SELECT singer_id FROM users WHERE id = $1 FOR UPDATE', [user.id],
    );
    if (!owner.rows[0]) throw requestError('Authenticated user not found', 403);
    let result = owner.rows[0].singer_id
      ? await client.query<SingerRow>('SELECT * FROM singers WHERE id = $1', [owner.rows[0].singer_id])
      : await client.query<SingerRow>(
        `SELECT * FROM singers WHERE normalized_name = ANY($1::text[])
          ORDER BY CASE WHEN normalized_name = $2 THEN 0 ELSE 1 END LIMIT 1`,
        [[normalizedName, normalizeSingerName(user.username)], normalizedName],
      );
    if (!result.rows.length) {
      await client.query(
        `INSERT INTO singers (public_uuid, display_name, normalized_name, status)
         VALUES ($1, $2, $3, 'active') ON CONFLICT (normalized_name) DO NOTHING`,
        [randomUUID(), displayName, normalizedName],
      );
      result = await client.query<SingerRow>('SELECT * FROM singers WHERE normalized_name = $1', [normalizedName]);
    }
    const singerId = BigInt(result.rows[0].id);
    const otherOwner = await client.query(
      'SELECT id FROM users WHERE singer_id = $1 AND id <> $2 LIMIT 1', [singerId, user.id],
    );
    if (otherOwner.rows.length) throw requestError('Singer is already linked to another user', 409);
    if (!owner.rows[0].singer_id) {
      const ambiguousOwner = await client.query(
        `SELECT id FROM users WHERE id <> $1 AND singer_id IS NULL AND (
          LOWER(REGEXP_REPLACE(TRIM(COALESCE(NULLIF(display_name, ''), username)), '\\s+', ' ', 'g')) = $2
          OR LOWER(REGEXP_REPLACE(TRIM(username), '\\s+', ' ', 'g')) = $2
        ) LIMIT 1`,
        [user.id, result.rows[0].normalized_name],
      );
      if (ambiguousOwner.rows.length) throw requestError('Singer name matches multiple user accounts', 409);
    }
    await client.query('UPDATE users SET singer_id = $1 WHERE id = $2', [singerId, user.id]);
    const updated = await client.query<SingerRow>(
      `UPDATE singers SET display_name = $2,
          normalized_name = CASE WHEN EXISTS (
            SELECT 1 FROM singers other WHERE other.normalized_name = $3 AND other.id <> $1
          ) THEN normalized_name ELSE $3 END
        WHERE id = $1 RETURNING *`,
      [singerId, displayName, normalizedName],
    );
    // Attach legacy name-only requests; never move requests already owned by another singer.
    await client.query(
      `UPDATE queue SET singer_id = $1, requested_by = $2
        WHERE (singer_id = $1 AND status IN ('queued', 'playing'))
           OR (singer_id IS NULL AND
               LOWER(REGEXP_REPLACE(TRIM(requested_by), '\\s+', ' ', 'g')) = ANY($3::text[]))`,
      [singerId, displayName, [normalizedName, normalizeSingerName(user.username), result.rows[0].normalized_name]],
    );
    return { ...updated.rows[0], id: singerId };
  });
  await syncSingerProfileFromOidc(singer.id, user);
  return singer;
}

export async function getRequestIdentity(token: unknown): Promise<{ user: User | null; isAdmin: boolean }> {
  if (token === undefined) return { user: null, isAdmin: false };
  if (typeof token !== 'string' || !token.trim()) throw requestError('Invalid session token', 403);
  const info = await validateSessionInfo(token);
  if (!info.valid) throw requestError('Invalid or expired session', 403);
  const user = info.userId ? await getUserById(info.userId) : null;
  if (info.userId && (!user || !user.is_active)) throw requestError('Account disabled or missing', 403);
  return { user, isAdmin: info.role === 'admin' && (!user || user.role === 'admin') };
}

export async function renameAuthenticatedSinger(user: User, name: string): Promise<SingerRow> {
  const displayName = name.trim().replace(/\s+/g, ' ');
  if (!displayName) throw requestError('name is required', 400);
  await ensureAuthenticatedSinger(user);
  try {
    return await withTransaction(async (client) => {
      const owner = await client.query<{ singer_id: string | null }>(
        'SELECT singer_id FROM users WHERE id = $1 FOR UPDATE', [user.id],
      );
      if (!owner.rows[0]?.singer_id) throw requestError('Authenticated singer not found', 409);
      const singerId = BigInt(owner.rows[0].singer_id);
      const normalizedName = normalizeSingerName(displayName);
      const conflict = await client.query(
        'SELECT id FROM singers WHERE normalized_name = $1 AND id <> $2 LIMIT 1',
        [normalizedName, singerId],
      );
      if (conflict.rows.length) throw requestError('Singer name is already in use; choose a different name', 409);
      await client.query('UPDATE users SET display_name = $1 WHERE id = $2', [displayName, user.id]);
      const updated = await client.query<SingerRow>(
        'UPDATE singers SET display_name = $1, normalized_name = $2 WHERE id = $3 RETURNING *',
        [displayName, normalizedName, singerId],
      );
      if (!updated.rows[0]) throw requestError('Authenticated singer not found', 409);
      await client.query(
        `UPDATE queue SET requested_by = $1 WHERE singer_id = $2 AND status IN ('queued', 'playing')`,
        [displayName, singerId],
      );
      return { ...updated.rows[0], id: singerId };
    });
  } catch (error: any) {
    if (error?.code === '23505') throw requestError('Singer name is already in use; choose a different name', 409);
    throw error;
  }
}

export type QueueRequesterBody = {
  singerId?: unknown;
  requestedBy?: unknown;
  singerUuid?: unknown;
  requestAsHost?: unknown;
};

export async function resolveQueueRequester(token: unknown, body: QueueRequesterBody): Promise<SingerRow | null> {
  const { user, isAdmin } = await getRequestIdentity(token);
  if (body.requestAsHost !== undefined && typeof body.requestAsHost !== 'boolean') {
    throw requestError('requestAsHost must be a boolean', 400);
  }
  const targetProvided = body.singerId !== undefined;
  if (targetProvided || body.requestAsHost === true) {
    if (!isAdmin) throw requestError('Admin session required to request for another singer', 403);
    if (targetProvided) {
      if (typeof body.singerId !== 'string' || !/^[1-9]\d*$/.test(body.singerId)
          || BigInt(body.singerId) > 9223372036854775807n) {
        throw requestError('singerId must be a positive integer string', 400);
      }
      const result = await query<SingerRow>('SELECT * FROM singers WHERE id = $1', [body.singerId]);
      if (!result.rows[0]) throw requestError('Singer not found', 404);
      const singer = { ...result.rows[0], id: BigInt(result.rows[0].id) };
      const owners = await query<User>('SELECT * FROM users WHERE singer_id = $1 AND is_active = TRUE', [singer.id]);
      if (owners.rows[0]) await syncSingerProfileFromOidc(singer.id, owners.rows[0]);
      return singer;
    }
  } else if (user) {
    return ensureAuthenticatedSinger(user);
  }
  if (body.requestedBy !== undefined && body.requestedBy !== null && typeof body.requestedBy !== 'string') {
    throw requestError('requestedBy must be a string', 400);
  }
  const name = typeof body.requestedBy === 'string' ? body.requestedBy.trim() : '';
  if (!name) {
    return null;
  }
  const singerUuid = normalizeSingerUuid(body.singerUuid);
  if (body.singerUuid != null && !singerUuid) throw requestError('Invalid singerUuid', 400);
  if (body.requestAsHost !== true) {
    return resolveGuestSinger(name, body.singerUuid, { requireUuid: false });
  }
  const singer = await findOrCreateSinger(name, singerUuid);
  if (singerUuid && singer.public_uuid !== singerUuid) {
    throw requestError('This singer name belongs to another profile', 409);
  }
  const owners = await query<User>('SELECT * FROM users WHERE singer_id = $1 AND is_active = TRUE', [singer.id]);
  if (owners.rows[0]) await syncSingerProfileFromOidc(singer.id, owners.rows[0]);
  return singer;
}
