import type { PoolClient } from 'pg';
import { recalculateSingerStats } from '../singerStats.js';
import { ensureSingerInActiveRotation, normalizeSingerName } from '../queueIdentity.js';
import { sortQueuedRotationItems } from './queueSort.js';
import { withQueueTransaction } from './queueTransaction.js';
import { getPlayerPlaybackState, savePlayerPlayback } from '../playerPlayback.js';
import { DEFAULT_ROTATION_CONFIG, effectiveRotationType as basePolicy, normalizeRotationConfig, type RotationConfig, type RotationType } from './types.js';

interface LiveRotation {
  id: string;
  type: RotationType;
  base_policy: RotationType;
  status: string;
  current_round: number;
  config: Partial<RotationConfig>;
}

interface LiveSong {
  id: string;
  track_id: number;
  singer_id: string | null;
  requested_by: string | null;
  position: number;
  status: string;
  created_at: Date;
  request_order_at: Date;
  request_order_id: string;
  finished_at: Date | null;
}

export function liveRotationConfig(rotation: LiveRotation): RotationConfig {
  return normalizeRotationConfig({
    ...rotation.config,
    type: rotation.config.type ?? rotation.type,
    basePolicy: rotation.config.basePolicy ?? rotation.base_policy,
  });
}

async function getRotation(client: PoolClient): Promise<LiveRotation | null> {
  const result = await client.query<LiveRotation>(
    `SELECT id, type, base_policy, status, current_round, config FROM rotations
      WHERE status IN ('active', 'paused')
      ORDER BY (status = 'active') DESC, created_at DESC, id DESC LIMIT 1 FOR UPDATE`,
  );
  return result.rows[0] ?? null;
}

const singerKey = (song: LiveSong) => song.singer_id
  ? String(song.singer_id)
  : normalizeSingerName(song.requested_by ?? '')
    ? `name:${normalizeSingerName(song.requested_by ?? '')}`
    : `anonymous:${song.id}`;

export async function writeQueueOrder(client: PoolClient, ids: number[], positions: number[], manual = false): Promise<void> {
  if (!ids.length) return;
  if (manual) {
    // Preserve explicit host ordering separately from policy-generated positions.
    // Transfer the original FIFO slots without changing request timestamps.
    await client.query(
      `WITH slots AS (
         SELECT COALESCE(fifo_order_at, created_at) AS requested_at, COALESCE(fifo_order_id, id) AS requested_id,
                ROW_NUMBER() OVER (ORDER BY COALESCE(fifo_order_at, created_at), COALESCE(fifo_order_id, id), id) AS n
           FROM queue WHERE id = ANY($1::bigint[])
       ), desired AS (
         SELECT id, ordinality AS n FROM unnest($1::bigint[]) WITH ORDINALITY AS items(id, ordinality)
       )
       UPDATE queue q SET fifo_order_at = slots.requested_at, fifo_order_id = slots.requested_id
         FROM desired JOIN slots USING (n) WHERE q.id = desired.id`,
      [ids],
    );
  }
  await client.query(
    `UPDATE queue q SET position = shifted.position
       FROM (SELECT id, ordinality::int + (SELECT COALESCE(MAX(position), 0) FROM queue) AS position
               FROM unnest($1::bigint[]) WITH ORDINALITY AS items(id, ordinality)) shifted
      WHERE q.id = shifted.id`,
    [ids],
  );
  await client.query(
    `UPDATE queue q SET position = ordered.position
       FROM unnest($1::bigint[], $2::int[]) AS ordered(id, position) WHERE q.id = ordered.id`,
    [ids, positions],
  );
}

async function schedule(client: PoolClient, rotation: LiveRotation | null, persist = true) {
  const config = rotation ? liveRotationConfig(rotation) : { ...DEFAULT_ROTATION_CONFIG, type: 'song_queue_only' as const };
  const songs = (await client.query<LiveSong>(
    `SELECT id, track_id, singer_id, requested_by, status, position, created_at, finished_at,
            COALESCE(fifo_order_at, created_at) AS request_order_at, COALESCE(fifo_order_id, id) AS request_order_id
       FROM queue WHERE status IN ('queued', 'playing') ORDER BY position, id FOR UPDATE`,
  )).rows;
  const previous = songs.find((song) => song.status === 'playing')
    ?? (await client.query<LiveSong>(
      `SELECT id, singer_id, requested_by FROM queue
        WHERE status = 'done' ORDER BY finished_at DESC NULLS LAST, id DESC LIMIT 1`,
    )).rows[0];
  const members = (await client.query<{
    singer_id: string; status: string; singer_status: string; position: number | null;
    last_sang_at: Date | null; joined_at: Date; current_round_joined: number | null; last_round_sang: number | null;
  }>(
    `SELECT s.id AS singer_id, s.status AS singer_status, rs.status, rs.position,
            GREATEST(rs.last_sang_at, s.last_sang_at,
              CASE WHEN $2 = 'move_to_end' THEN
                (SELECT MAX(finished_at) FROM queue WHERE singer_id = s.id AND status = 'skipped')
              END) AS last_sang_at,
            COALESCE(rs.joined_at, s.joined_at) AS joined_at,
            rs.current_round_joined, rs.last_round_sang
       FROM singers s LEFT JOIN rotation_singers rs ON rs.singer_id = s.id AND rs.rotation_id = $1`,
    [rotation?.id ?? null, config.skipPolicy],
  )).rows;
  const bySinger = new Map(members.map((member) => [String(member.singer_id), member]));
  let fallbackPosition = Math.max(-1, ...members.map((member) => member.position ?? -1));
  const fallbacks = new Map<string, number>();
  const queued = songs.filter((song) => song.status === 'queued');
  const eligible = queued.filter((song) => {
    const member = song.singer_id ? bySinger.get(String(song.singer_id)) : undefined;
    return !member || (member.singer_status === 'active' && (!member.status || member.status === 'active'));
  });
  const overrideByQueueId = new Map<number, string>();
  if (rotation) {
    const overrides = await client.query<{ id: string; singer_id: string; song_request_id: string | null; track_id: number | null }>(
      `SELECT mo.id, mo.singer_id, mo.song_request_id, sr.track_id
         FROM manual_overrides mo LEFT JOIN song_requests sr ON sr.id = mo.song_request_id
        WHERE mo.rotation_id = $1 AND mo.status = 'pending' ORDER BY mo.position, mo.created_at, mo.id`,
      [rotation.id],
    );
    for (const override of overrides.rows) {
      const song = eligible.find((item) =>
        String(item.singer_id) === String(override.singer_id)
        && (!override.song_request_id || item.track_id === override.track_id)
        && !overrideByQueueId.has(Number(item.id)),
      );
      if (song) overrideByQueueId.set(Number(song.id), override.id);
    }
  }
  const playing = songs.find((song) => song.status === 'playing');
  const sorted = sortQueuedRotationItems(eligible.map((song) => {
    const key = singerKey(song);
    const member = song.singer_id ? bySinger.get(String(song.singer_id)) : undefined;
    if (!fallbacks.has(key)) fallbacks.set(key, ++fallbackPosition);
    return {
      id: Number(song.id), singerKey: key, origPos: song.position,
      requestedAt: song.request_order_at, requestOrderId: Number(song.request_order_id), joinedAt: member?.joined_at,
      rotPos: member?.position ?? fallbacks.get(key)!,
      lastSangAt: member?.last_sang_at ?? null,
      currentRoundJoined: member?.current_round_joined ?? 1,
      lastRoundSang: member?.last_round_sang ?? null,
      isCurrentlyPlaying: !!playing && singerKey(playing) === key,
      songIndex: 0,
    };
  }), {
    currentRound: rotation?.current_round ?? 1,
    basePolicy: basePolicy(config),
    preventSameSingerBackToBack: config.preventSameSingerBackToBack,
    previousSingerKey: previous ? singerKey(previous) : null,
    playingSingerKey: playing ? singerKey(playing) : null,
    overrideIds: [...overrideByQueueId.keys()],
  });
  if (persist && rotation?.status !== 'paused') {
    const eligibleIds = new Set(sorted.map((song) => song.id));
    const ids = [...sorted.map((song) => song.id), ...queued.filter((song) => !eligibleIds.has(Number(song.id))).map((song) => Number(song.id))];
    if (ids.some((id, index) => id !== Number(queued[index].id))) {
      await writeQueueOrder(client, ids, queued.map((song) => song.position));
    }
  }
  return { config, sorted, overrideByQueueId, playing };
}

export async function resortLiveQueue(): Promise<void> {
  await withQueueTransaction(async (client) => schedule(client, await getRotation(client)));
}

export async function getLiveQueueAutoplayState() {
  return withQueueTransaction(async (client) => {
    const rotation = await getRotation(client);
    const state = await schedule(client, rotation, false);
    const allowed = state.sorted.length > 0 && rotation?.status !== 'paused'
      && (basePolicy(state.config) !== 'manual' || state.overrideByQueueId.has(state.sorted[0]?.id));
    return {
      allowed,
      hasPlayingSong: !!state.playing,
      hasQueuedSongs: state.sorted.length > 0,
    };
  });
}

async function recordTurn(client: PoolClient, rotation: LiveRotation | null, song: LiveSong, skipped: boolean) {
  if (!rotation || !song.singer_id || rotation.status !== 'active') return;
  const config = liveRotationConfig(rotation);
  if (skipped && config.skipPolicy === 'keep_position') return;
  await client.query(
    `UPDATE rotation_singers SET last_round_sang = GREATEST(last_round_sang, $3),
        status = CASE WHEN $4 THEN 'inactive'::rotation_singer_status ELSE status END
      WHERE rotation_id = $1 AND singer_id = $2`,
    [rotation.id, song.singer_id, rotation.current_round, skipped && config.skipPolicy === 'remove_until_reactivated'],
  );
  if (basePolicy(config) === 'signup_order' || (skipped && config.skipPolicy === 'move_to_end')) {
    await client.query(
      `UPDATE rotation_singers SET position = (SELECT COALESCE(MAX(position), -1) + 1 FROM rotation_singers WHERE rotation_id = $1)
        WHERE rotation_id = $1 AND singer_id = $2`,
      [rotation.id, song.singer_id],
    );
  }
  if (config.emptySingerPolicy === 'remove_from_rotation') {
    await client.query(
      `UPDATE rotation_singers SET status = 'inactive'
        WHERE rotation_id = $1 AND singer_id = $2
          AND NOT EXISTS (SELECT 1 FROM queue WHERE singer_id = $2 AND status IN ('queued', 'playing'))`,
      [rotation.id, song.singer_id],
    );
  }
  if (basePolicy(config) === 'strict_round_robin') {
    const waiting = await client.query(
      `SELECT 1 FROM queue q
         LEFT JOIN rotation_singers rs ON rs.singer_id = q.singer_id AND rs.rotation_id = $1
         LEFT JOIN singers s ON s.id = q.singer_id
        WHERE q.status IN ('queued', 'playing')
          AND (s.status IS NULL OR s.status = 'active')
          AND (rs.status IS NULL OR rs.status = 'active')
          AND COALESCE(rs.current_round_joined, 1) <= $2
          AND COALESCE(rs.last_round_sang, 0) < $2 LIMIT 1`,
      [rotation.id, rotation.current_round],
    );
    if (!waiting.rows.length) {
      rotation.current_round++;
      await client.query(`UPDATE rotations SET current_round = $2, updated_at = NOW() WHERE id = $1`, [rotation.id, rotation.current_round]);
    }
  }
}

async function changeStatus(client: PoolClient, rotation: LiveRotation | null, song: LiveSong, status: string): Promise<void> {
  if (song.status === status) return;
  await client.query(
    `UPDATE queue SET status = $2::track_status,
        finished_at = CASE WHEN $2::track_status IN ('done', 'skipped') THEN NOW() ELSE NULL END,
        started_at = CASE WHEN $2::track_status = 'queued' THEN NULL ELSE started_at END WHERE id = $1`,
    [song.id, status],
  );
  if (song.status === 'playing') await savePlayerPlayback(client, null);
  if ((song.status === 'playing' || song.status === 'queued') && (status === 'done' || status === 'skipped' || (status === 'removed' && song.status === 'playing'))) {
    await recordTurn(client, rotation, song, status !== 'done');
  }
  if (song.singer_id) await recalculateSingerStats(String(song.singer_id), client);
}

export async function setLiveQueueStatus(queueId: number, status: 'queued' | 'done' | 'removed' | 'skipped', playingOnly = false): Promise<boolean> {
  return withQueueTransaction(async (client) => {
    let rotation = await getRotation(client);
    const song = (await client.query<LiveSong>(`SELECT * FROM queue WHERE id = $1 FOR UPDATE`, [queueId])).rows[0];
    if (!song || (playingOnly && song.status !== 'playing')) return false;
    if (playingOnly && (await getPlayerPlaybackState(client)).paused) return false;
    if (status === 'queued' && !['queued', 'playing'].includes(song.status)) {
      if (song.singer_id) {
        const singer = (await client.query<{ status: string }>(`SELECT status FROM singers WHERE id = $1 FOR UPDATE`, [song.singer_id])).rows[0];
        if (singer?.status === 'banned') throw Object.assign(new Error('Reactivate this singer before restoring songs'), { status: 409 });
        await client.query(`UPDATE singers SET status = 'active' WHERE id = $1`, [song.singer_id]);
        await ensureSingerInActiveRotation(BigInt(song.singer_id), client);
        if (!rotation) rotation = await getRotation(client);
      }
      await client.query(
        `UPDATE queue SET position = (SELECT COALESCE(MAX(position), -1) + 1 FROM queue),
            created_at = NOW(), fifo_order_at = NULL, fifo_order_id = NULL WHERE id = $1`, [queueId],
      );
    } else if (status === 'queued' && song.status === 'playing') {
      return true;
    }
    await changeStatus(client, rotation, song, status);
    await schedule(client, rotation);
    return true;
  });
}

async function startSong(client: PoolClient, rotation: LiveRotation | null, queueId?: number, replaceCurrent = false): Promise<number | null> {
  if (queueId != null && !(await client.query(`SELECT id FROM queue WHERE id = $1`, [queueId])).rows.length) return null;
  const current = (await client.query<LiveSong>(`SELECT * FROM queue WHERE status = 'playing' FOR UPDATE`)).rows;
  if (current.length && !replaceCurrent) return null;
  if (replaceCurrent && current.length && (queueId == null || Number(current[0].id) === queueId)) {
    const playback = await getPlayerPlaybackState(client);
    await savePlayerPlayback(client, Number(current[0].id), false, playback.positionSec);
    return Number(current[0].id);
  }
  if (rotation?.status === 'paused' && queueId == null) return null;
  const state = await schedule(client, rotation);
  const id = queueId ?? state.sorted[0]?.id;
  if (id == null || (queueId == null && basePolicy(state.config) === 'manual' && !state.overrideByQueueId.has(id))) return null;
  if (replaceCurrent) await client.query(`UPDATE queue SET status = 'queued', started_at = NULL WHERE status = 'playing'`);
  const round = queueId == null ? state.sorted.find((song) => song.id === id)?.round : rotation?.current_round;
  if (rotation && round != null && round > rotation.current_round && basePolicy(state.config) === 'strict_round_robin') {
    rotation.current_round = round;
    await client.query(`UPDATE rotations SET current_round = $2, updated_at = NOW() WHERE id = $1`, [rotation.id, round]);
  }
  const started = await client.query<{ singer_id: string | null; status: string }>(
    `UPDATE queue SET status = 'playing', started_at = NOW(), finished_at = NULL WHERE id = $1 RETURNING singer_id, status`, [id],
  );
  await savePlayerPlayback(client, id);
  if (started.rows[0]?.singer_id) await recalculateSingerStats(String(started.rows[0].singer_id), client);
  const override = state.overrideByQueueId.get(id);
  if (override) await client.query(`UPDATE manual_overrides SET status = 'consumed' WHERE id = $1`, [override]);
  await schedule(client, rotation);
  return id;
}

export async function startLiveQueueSong(queueId?: number, replaceCurrent = false): Promise<number | null> {
  return withQueueTransaction(async (client) => {
    if (!replaceCurrent && queueId == null) {
      const settings = (await client.query<{ key: string; value: string }>(
        `SELECT key, value #>> '{}' AS value FROM settings WHERE key IN ('player.manual_stop', 'autoplay.enabled')`,
      )).rows;
      if (settings.some((setting) => setting.key === 'player.manual_stop' && setting.value === 'true')
          || !settings.some((setting) => setting.key === 'autoplay.enabled' && setting.value === 'true')) return null;
    }
    return startSong(client, await getRotation(client), queueId, replaceCurrent);
  });
}

export async function advanceLiveQueue(): Promise<number | null> {
  return withQueueTransaction(async (client) => {
    const rotation = await getRotation(client);
    const playing = (await client.query<LiveSong>(`SELECT * FROM queue WHERE status = 'playing' FOR UPDATE`)).rows;
    for (const song of playing) await changeStatus(client, rotation, song, 'done');
    return startSong(client, rotation);
  });
}

export async function stopLiveQueue(): Promise<void> {
  await withQueueTransaction(async (client) => {
    await client.query(`UPDATE queue SET status = 'queued', started_at = NULL WHERE status = 'playing'`);
    await savePlayerPlayback(client, null);
    await schedule(client, await getRotation(client));
  });
}

export async function deleteLiveQueueSong(queueId: number): Promise<boolean> {
  return withQueueTransaction(async (client) => {
    const rotation = await getRotation(client);
    const song = (await client.query<LiveSong>(`SELECT * FROM queue WHERE id = $1 FOR UPDATE`, [queueId])).rows[0];
    if (!song) return false;
    if (song.status === 'playing') await changeStatus(client, rotation, song, 'removed');
    await client.query(`DELETE FROM queue WHERE id = $1`, [queueId]);
    await client.query(`UPDATE queue SET position = position - 1 WHERE position > $1`, [song.position]);
    if (song.singer_id) await recalculateSingerStats(String(song.singer_id), client);
    await schedule(client, rotation);
    return true;
  });
}

export async function clearLiveQueue(): Promise<void> {
  await withQueueTransaction(async (client) => {
    await getRotation(client);
    await client.query(
      `UPDATE singers SET total_songs_sung = 0, last_sang_at = NULL
        WHERE id IN (SELECT singer_id FROM queue WHERE singer_id IS NOT NULL)`,
    );
    await client.query(`DELETE FROM queue`);
    await savePlayerPlayback(client, null);
    await client.query(
      `UPDATE rotation_singers SET total_songs_sung = 0, last_sang_at = NULL,
          last_round_sang = NULL, current_round_joined = 1
        WHERE rotation_id IN (SELECT id FROM rotations WHERE status IN ('active', 'paused'))`,
    );
    await client.query(`UPDATE rotations SET current_round = 1, updated_at = NOW() WHERE status IN ('active', 'paused')`);
    await client.query(
      `UPDATE manual_overrides SET status = 'cancelled' WHERE status = 'pending'
        AND rotation_id IN (SELECT id FROM rotations WHERE status IN ('active', 'paused'))`,
    );
  });
}
