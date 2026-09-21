import { query, type User } from './db.js';
import { type SingerRow } from './queueIdentity.js';
import { withQueueTransaction } from './rotation/queueTransaction.js';
import { resortLiveQueue } from './rotation/liveQueue.js';
import { recalculateSingerStats } from './singerStats.js';
import type { PoolClient } from 'pg';

const requestError = (message: string, status: number) => Object.assign(new Error(message), { status });

export function parseSingerId(value: unknown, label = 'singerId'): bigint {
  const text = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== 'string' || !/^[1-9]\d{0,18}$/.test(text) || BigInt(text) > 9223372036854775807n) {
    throw requestError(`${label} must be a positive bigint string or safe integer`, 400);
  }
  return BigInt(text);
}

export type SingerMergeCandidate = {
  singerId: string;
  displayName: string;
  status: string;
  historyCount: number;
  accountLogins: {
    userId: number; username: string; provider: 'google' | 'facebook' | 'oidc' | 'local';
    role: 'admin' | 'user'; isActive: boolean;
  }[];
};

export async function getSingerMergeCandidates(target: unknown, search: unknown) {
  const targetId = parseSingerId(target);
  if (search !== undefined && (typeof search !== 'string' || search.length > 200)) {
    throw requestError('q must be a search string of at most 200 characters', 400);
  }
  const exists = await query('SELECT id FROM singers WHERE id = $1', [targetId]);
  if (!exists.rows.length) throw requestError('Target singer not found', 404);
  const owners = await query('SELECT id FROM users WHERE singer_id = $1 LIMIT 1', [targetId]);
  if (owners.rows.length) throw requestError('Account-linked singers must be linked from Admin User Manager', 409);
  const pattern = `%${(typeof search === 'string' ? search.trim() : '').replace(/[\\%_]/g, '\\$&')}%`;
  const result = await query<SingerMergeCandidate>(
    `SELECT s.id::text AS "singerId", s.display_name AS "displayName", s.status,
       (SELECT COUNT(*)::int FROM queue q WHERE q.singer_id = s.id) AS "historyCount",
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'userId', u.id, 'username', u.username,
         'provider', COALESCE(u.social_provider, CASE WHEN u.oidc_subject IS NOT NULL THEN 'oidc' ELSE 'local' END),
         'role', u.role, 'isActive', u.is_active) ORDER BY u.id)
         FROM users u WHERE u.singer_id = s.id), '[]'::jsonb) AS "accountLogins"
     FROM singers s WHERE s.id <> $1
       AND NOT EXISTS (SELECT 1 FROM users owner WHERE owner.singer_id = s.id)
       AND (s.display_name ILIKE $2 OR EXISTS (
         SELECT 1 FROM users u WHERE u.singer_id = s.id AND u.username ILIKE $2))
     ORDER BY LOWER(s.display_name), s.id LIMIT 51`,
    [targetId, pattern],
  );
  return { singers: result.rows.slice(0, 50), hasMore: result.rows.length > 50 };
}

function hasImage(singer: SingerRow): boolean {
  return Boolean(singer.profile_image_source === 'oidc'
    ? singer.profile_image_url
    : singer.profile_image_source === 'upload' && singer.profile_image_data?.length);
}

function imageOwner(singer: SingerRow, users: User[]): number | null {
  if (singer.identity_merged) return singer.profile_image_user_id ?? null;
  if (hasImage(singer) && singer.profile_image_source !== 'oidc') return null;
  const owners = users.filter((user) => String(user.singer_id) === String(singer.id)
    && (user.oidc_subject || user.social_provider));
  if (owners.length === 1) return owners[0].id;
  const matching = owners.find((user) => (user.picture?.trim() || null) === (singer.profile_image_url || null));
  return matching?.id ?? (hasImage(singer) ? null : owners[0]?.id ?? null);
}

export async function mergeSingers(target: unknown, source: unknown) {
  const targetId = parseSingerId(target, 'targetId');
  const sourceId = parseSingerId(source, 'sourceId');
  if (targetId === sourceId) throw requestError('Cannot merge singer with itself', 400);
  return withQueueTransaction((client) => mergeSingersWithClient(client, targetId, sourceId));
}

/** Internal primitive for the explicit admin account-link transaction; never expose its flag in HTTP input. */
export async function mergeSingersWithClient(
  client: PoolClient, targetId: bigint, sourceId: bigint, accountLink = false,
) {
    // All identity/rotation mutations use the queue lock before row locks.
    await client.query('SELECT id FROM rotations ORDER BY id FOR UPDATE');
    const users = await client.query<User>(
      'SELECT * FROM users WHERE singer_id = ANY($1::bigint[]) ORDER BY id FOR UPDATE',
      [[targetId, sourceId]],
    );
    // This also prevents a concurrent foreign-key insert from escaping the queue remap.
    const singers = await client.query<SingerRow>(
      'SELECT * FROM singers WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE',
      [[targetId, sourceId]],
    );
    const targetSinger = singers.rows.find((singer) => BigInt(singer.id) === targetId);
    const sourceSinger = singers.rows.find((singer) => BigInt(singer.id) === sourceId);
    if (!targetSinger || !sourceSinger) throw requestError('One or both singers not found', 404);
    if (!accountLink && users.rows.length) {
      throw requestError('Account-linked singers must be linked from Admin User Manager', 409);
    }
    const adopt = !accountLink && !hasImage(targetSinger) && !targetSinger.profile_image_admin_override && hasImage(sourceSinger);
    const selectedImage = adopt ? sourceSinger : targetSinger;
    const selectedOwner = imageOwner(selectedImage, users.rows);

    await client.query(
      `UPDATE queue SET singer_id = $1, requested_by = $3
       WHERE singer_id = $2 OR (singer_id = $1 AND status IN ('queued', 'playing'))`,
      [targetId, sourceId, targetSinger.display_name],
    );
    await client.query(
      `UPDATE rotation_singers target SET
         position = LEAST(target.position, source.position),
         joined_at = LEAST(target.joined_at, source.joined_at),
         current_round_joined = LEAST(target.current_round_joined, source.current_round_joined),
         last_round_sang = GREATEST(target.last_round_sang, source.last_round_sang),
         last_sang_at = GREATEST(target.last_sang_at, source.last_sang_at),
         total_songs_sung = target.total_songs_sung + source.total_songs_sung,
         status = CASE WHEN target.status = 'active' OR source.status = 'active' THEN 'active' ELSE target.status END
       FROM rotation_singers source
       WHERE target.singer_id = $1 AND source.singer_id = $2 AND target.rotation_id = source.rotation_id`,
      [targetId, sourceId],
    );
    await client.query(
      `DELETE FROM rotation_singers WHERE singer_id = $2 AND rotation_id IN (
         SELECT rotation_id FROM rotation_singers WHERE singer_id = $1)`,
      [targetId, sourceId],
    );
    await client.query('UPDATE rotation_singers SET singer_id = $1 WHERE singer_id = $2', [targetId, sourceId]);
    await client.query('UPDATE rotation_turns SET singer_id = $1 WHERE singer_id = $2', [targetId, sourceId]);
    await client.query('UPDATE manual_overrides SET singer_id = $1 WHERE singer_id = $2', [targetId, sourceId]);
    await client.query(
      `UPDATE song_requests SET participant_singer_ids = ARRAY(
         SELECT mapped_id FROM (
           SELECT CASE WHEN participant_id = $2::bigint THEN $1::bigint ELSE participant_id END AS mapped_id,
                  MIN(ordinality) AS first_position
           FROM unnest(participant_singer_ids) WITH ORDINALITY AS participant(participant_id, ordinality)
           GROUP BY CASE WHEN participant_id = $2::bigint THEN $1::bigint ELSE participant_id END
         ) deduplicated ORDER BY first_position
       ) WHERE $2::bigint = ANY(participant_singer_ids)`,
      [targetId, sourceId],
    );
    await client.query('UPDATE song_requests SET singer_id = $1 WHERE singer_id = $2', [targetId, sourceId]);
    if (adopt) {
      await client.query(
        `UPDATE singers target SET
           profile_image_source = source.profile_image_source, profile_image_url = source.profile_image_url,
           profile_image_mime = source.profile_image_mime, profile_image_data = source.profile_image_data,
           profile_image_focus_x = source.profile_image_focus_x, profile_image_focus_y = source.profile_image_focus_y,
           profile_image_crop = source.profile_image_crop, profile_image_admin_override = source.profile_image_admin_override,
           profile_image_updated_at = source.profile_image_updated_at
         FROM singers source WHERE target.id = $1 AND source.id = $2`,
        [targetId, sourceId],
      );
    }
    await client.query(
      'UPDATE singers SET identity_merged = TRUE, profile_image_user_id = $2 WHERE id = $1',
      [targetId, selectedOwner],
    );
    await client.query('UPDATE users SET singer_id = $1 WHERE singer_id = $2', [targetId, sourceId]);
    await client.query('DELETE FROM singers WHERE id = $1', [sourceId]);
    await recalculateSingerStats(String(targetId), client);
    await resortLiveQueue(client);
    return {
      ok: true, singerId: String(targetId), displayName: targetSinger.display_name,
      linkedAccountCount: users.rows.length,
    };
}
