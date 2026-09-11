// Database scheduling and lifecycle operations share one transaction and lock
// the rotation before changing its next turn.
import { AsyncLocalStorage } from 'node:async_hooks';
import type { PoolClient, QueryResultRow } from 'pg';
import { query as poolQuery, withTransaction } from '../db.js';
import { normalizeSingerName } from '../queueIdentity.js';
import { isRoundComplete, selectNextByPolicy, selectSong } from './policies.js';
import {
  effectiveRotationType, normalizeRotationConfig, RotationValidationError,
  type Rotation, type RotationConfig, type RotationSinger, type RotationTurn,
  type ManualOverride, type Singer, type SongRequest, type SingerSnapshot,
  type PolicyResult, type RotationState,
} from './types.js';

const transactions = new AsyncLocalStorage<PoolClient>();

async function query<T extends QueryResultRow = any>(sql: string, params?: any[]) {
  const client = transactions.getStore();
  return client ? client.query<T>(sql, params) : poolQuery<T>(sql, params);
}

async function atomic<T>(work: () => Promise<T>): Promise<T> {
  if (transactions.getStore()) return work();
  return withTransaction((client) => transactions.run(client, work));
}

const toBigInt = (value: unknown): bigint => BigInt(value as string);
const optionalId = (value: unknown): bigint | null => value == null ? null : toBigInt(value);
const turnRow = (row: any): RotationTurn => ({
  ...row, id: toBigInt(row.id), rotation_id: toBigInt(row.rotation_id),
  singer_id: toBigInt(row.singer_id), song_request_id: optionalId(row.song_request_id),
});
const overrideRow = (row: any): ManualOverride => ({
  ...row, id: toBigInt(row.id), rotation_id: toBigInt(row.rotation_id),
  singer_id: toBigInt(row.singer_id), song_request_id: optionalId(row.song_request_id),
});
const rotationRow = (row: any): Rotation => ({
  ...row, id: toBigInt(row.id), current_turn_id: optionalId(row.current_turn_id),
  config: normalizeRotationConfig({ type: row.type, basePolicy: row.base_policy, ...row.config }),
});
const membershipRow = (row: any): RotationSinger => ({
  ...row, id: toBigInt(row.id), rotation_id: toBigInt(row.rotation_id), singer_id: toBigInt(row.singer_id),
});

export async function getRotation(rotationId: bigint): Promise<Rotation | null> {
  const result = await query('SELECT * FROM rotations WHERE id = $1', [rotationId]);
  return result.rows[0] ? rotationRow(result.rows[0]) : null;
}

async function lockRotation(rotationId: bigint): Promise<Rotation | null> {
  const result = await query('SELECT * FROM rotations WHERE id = $1 FOR UPDATE', [rotationId]);
  return result.rows[0] ? rotationRow(result.rows[0]) : null;
}

async function requireRotation(rotationId: bigint): Promise<Rotation> {
  const rotation = await lockRotation(rotationId);
  if (!rotation) throw new RotationValidationError(`Rotation ${rotationId} not found`);
  return rotation;
}

async function snapshots(rotationId: bigint, releasedSongId?: bigint | null): Promise<SingerSnapshot[]> {
  const memberships = await query(
    `SELECT rs.*, s.status AS singer_status, s.display_name,
       CASE WHEN r.config->>'skipPolicy' = 'move_to_end' THEN
         (SELECT MAX(rt.completed_at) FROM rotation_turns rt WHERE rt.rotation_id = rs.rotation_id
           AND rt.singer_id = rs.singer_id AND rt.status = 'skipped') END AS last_skipped_at
       FROM rotation_singers rs JOIN singers s ON s.id = rs.singer_id
       JOIN rotations r ON r.id = rs.rotation_id
      WHERE rs.rotation_id = $1 ORDER BY rs.position, rs.id`, [rotationId]);
  if (!memberships.rows.length) return [];
  const songs = await query(
    `SELECT sr.*, CASE WHEN r.config->>'skipPolicy' = 'move_to_end' THEN
        (SELECT MAX(rt.completed_at) FROM rotation_turns rt WHERE rt.rotation_id = r.id
          AND rt.song_request_id = sr.id AND rt.status = 'skipped') END AS last_skipped_at
       FROM song_requests sr CROSS JOIN rotations r
      WHERE r.id = $2 AND sr.singer_id = ANY($1::bigint[])
        AND (sr.status = 'pending' OR (sr.id = $3 AND sr.status = 'queued'))
      ORDER BY sr.requested_at, sr.id`, [memberships.rows.map((row) => row.singer_id), rotationId, releasedSongId ?? null]);
  return memberships.rows.map((row) => ({
    singerId: toBigInt(row.singer_id), displayName: row.display_name,
    singerStatus: row.singer_status, rotationStatus: row.status, position: row.position,
    joinedAt: row.joined_at, currentRoundJoined: row.current_round_joined,
    lastRoundSang: row.last_round_sang, lastSangAt: row.last_sang_at, lastSkippedAt: row.last_skipped_at,
    pendingSongs: songs.rows.filter((song) => String(song.singer_id) === String(row.singer_id)).map((song) => ({
      id: toBigInt(song.id), singerId: toBigInt(song.singer_id), title: song.title, artist: song.artist,
      priority: song.priority, requestedAt: song.requested_at, lastSkippedAt: song.last_skipped_at,
      participantSingerIds: (song.participant_singer_ids ?? []).map(toBigInt),
    })),
  }));
}

async function pendingOverrides(rotationId: bigint): Promise<ManualOverride[]> {
  const result = await query(
    `SELECT * FROM manual_overrides WHERE rotation_id = $1 AND status = 'pending'
      ORDER BY position, created_at, id`, [rotationId]);
  return result.rows.map(overrideRow);
}

async function openTurn(rotationId: bigint): Promise<RotationTurn | null> {
  const result = await query(
    `SELECT * FROM rotation_turns WHERE rotation_id = $1 AND status IN ('scheduled', 'active')
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at, id LIMIT 1`, [rotationId]);
  return result.rows[0] ? turnRow(result.rows[0]) : null;
}

async function isScheduledTurnEligible(turn: RotationTurn): Promise<boolean> {
  const rotation = await getRotation(turn.rotation_id);
  if (!rotation) return false;
  const result = await query(
    `SELECT 1 FROM rotation_singers rs
       JOIN singers s ON s.id = rs.singer_id
       JOIN song_requests sr ON sr.id = $3 AND sr.singer_id = s.id
      WHERE rs.rotation_id = $1 AND rs.singer_id = $2
        AND rs.status = 'active' AND s.status = 'active' AND sr.status = 'queued'
        AND ($5::boolean = false OR rs.current_round_joined <= $4)`,
    [turn.rotation_id, turn.singer_id, turn.song_request_id, turn.round_number,
      effectiveRotationType(rotation.config) === 'strict_round_robin']);
  return result.rows.length > 0;
}

async function cancelScheduled(rotationId: bigint, singerId?: bigint): Promise<void> {
  const result = await query(
    `UPDATE rotation_turns SET status = 'skipped'
      WHERE rotation_id = $1 AND status = 'scheduled' AND ($2::bigint IS NULL OR singer_id = $2)
      RETURNING id, song_request_id`, [rotationId, singerId ?? null]);
  for (const turn of result.rows) {
    await query(`UPDATE song_requests SET status = 'pending' WHERE id = $1 AND status = 'queued'`, [turn.song_request_id]);
  }
  await query(
    `UPDATE rotations SET current_turn_id = NULL, updated_at = NOW()
      WHERE id = $1 AND current_turn_id = ANY($2::bigint[])`, [rotationId, result.rows.map((turn) => turn.id)]);
}

interface Selection {
  result: PolicyResult | null;
  round: number;
  source: RotationTurn['source'];
  invalidOverrideIds: bigint[];
}

async function nextSelection(rotation: Rotation, singers: SingerSnapshot[], overrides: ManualOverride[]): Promise<Selection> {
  const invalidOverrideIds: bigint[] = [];
  const mode = effectiveRotationType(rotation.config);
  let round = rotation.current_round;
  const active = singers.filter((s) => s.singerStatus === 'active' && s.rotationStatus === 'active' && s.pendingSongs.length);
  if (mode === 'strict_round_robin' && active.length &&
      !active.some((s) => s.currentRoundJoined <= round && (s.lastRoundSang === null || s.lastRoundSang < round))) {
    round = Math.max(round + 1, Math.min(...active.map((s) =>
      Math.max(s.currentRoundJoined, (s.lastRoundSang ?? 0) + 1))));
  }
  for (const override of overrides) {
    const singer = singers.find((s) => s.singerId === override.singer_id &&
      s.singerStatus === 'active' && s.rotationStatus === 'active');
    if (!singer) { invalidOverrideIds.push(override.id); continue; }
    if (mode === 'strict_round_robin' && singer.currentRoundJoined > round) continue;
    const song = override.song_request_id
      ? singer.pendingSongs.find((s) => s.id === override.song_request_id)
      : selectSong(singer, { ...rotation.config, songSelectionPolicy:
        rotation.config.songSelectionPolicy === 'manual_host_selection' ? 'oldest_request_first' : rotation.config.songSelectionPolicy });
    if (!song) {
      // A singer-only persistent override can wait for another request.
      if (override.song_request_id || override.expires_after_turn) invalidOverrideIds.push(override.id);
      continue;
    }
    return { result: { singerId: singer.singerId, songRequestId: song.id }, round, source: 'manual_override', invalidOverrideIds };
  }
  const previous = await query(
    `SELECT singer_id FROM rotation_turns WHERE rotation_id = $1 AND status = 'completed'
      ORDER BY completed_at DESC, id DESC LIMIT 1`, [rotation.id]);
  const result = selectNextByPolicy(singers, {
    currentRound: round, lastCompletedSingerId: optionalId(previous.rows[0]?.singer_id), config: rotation.config,
  });
  const priority = result && singers.flatMap((s) => s.pendingSongs).find((s) => s.id === result.songRequestId)?.priority;
  return {
    result, round, invalidOverrideIds,
    source: priority && priority > 0 && ['weighted', 'vip_next'].includes(rotation.config.priorityPolicy) ? 'priority' : 'automatic',
  };
}

export async function getNextTurn(rotationId: bigint): Promise<RotationTurn | null> {
  return atomic(async () => {
    const rotation = await lockRotation(rotationId);
    if (!rotation || rotation.status !== 'active') return null;
    const existing = await openTurn(rotationId);
    if (existing?.status === 'active') return existing;
    if (existing && await isScheduledTurnEligible(existing)) return existing;
    if (existing) await cancelScheduled(rotationId);

    // A song may also be requested by a different rotation. The conditional
    // reservation, not just the snapshot, decides who owns it.
    for (;;) {
      const selected = await nextSelection(rotation, await snapshots(rotationId), await pendingOverrides(rotationId));
      if (selected.invalidOverrideIds.length) await query(
        `UPDATE manual_overrides SET status = 'cancelled' WHERE id = ANY($1::bigint[]) AND status = 'pending'`,
        [selected.invalidOverrideIds]);
      if (!selected.result) return null;
      const { singerId, songRequestId } = selected.result;
      const reserved = await query(
        `UPDATE song_requests SET status = 'queued' WHERE id = $1 AND singer_id = $2 AND status = 'pending' RETURNING id`,
        [songRequestId, singerId]);
      if (!reserved.rows.length) continue;
      const result = await query(
        `INSERT INTO rotation_turns (rotation_id, singer_id, song_request_id, round_number, source)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`, [rotationId, singerId, songRequestId, selected.round, selected.source]);
      const turn = turnRow(result.rows[0]);
      await query(
        `UPDATE rotations SET current_turn_id = $1, current_round = $2, updated_at = NOW() WHERE id = $3`,
        [turn.id, selected.round, rotationId]);
      return turn;
    }
  });
}

async function lockedTurn(turnId: bigint): Promise<{ turn: RotationTurn; rotation: Rotation } | null> {
  const id = await query('SELECT rotation_id FROM rotation_turns WHERE id = $1', [turnId]);
  if (!id.rows.length) return null;
  const rotation = await lockRotation(toBigInt(id.rows[0].rotation_id));
  if (!rotation) return null;
  const result = await query('SELECT * FROM rotation_turns WHERE id = $1 FOR UPDATE', [turnId]);
  return result.rows[0] ? { turn: turnRow(result.rows[0]), rotation } : null;
}

async function consumeOverride(turn: RotationTurn): Promise<void> {
  if (turn.source !== 'manual_override') return;
  const overrides = await pendingOverrides(turn.rotation_id);
  const override = overrides.find((o) => o.singer_id === turn.singer_id &&
    (o.song_request_id === null || o.song_request_id === turn.song_request_id));
  if (override?.expires_after_turn) {
    await query(`UPDATE manual_overrides SET status = 'consumed' WHERE id = $1 AND status = 'pending'`, [override.id]);
  }
}

export async function startTurn(turnId: bigint): Promise<RotationTurn | null> {
  return atomic(async () => {
    const locked = await lockedTurn(turnId);
    if (!locked) return null;
    const { turn, rotation } = locked;
    if (turn.status === 'active') return turn;
    if (turn.status !== 'scheduled' || rotation.status !== 'active') return null;
    if (!await isScheduledTurnEligible(turn)) { await cancelScheduled(rotation.id, turn.singer_id); return null; }
    const song = await query(
      `UPDATE song_requests SET status = 'singing' WHERE id = $1 AND status = 'queued' RETURNING id`, [turn.song_request_id]);
    if (!song.rows.length) { await cancelScheduled(rotation.id, turn.singer_id); return null; }
    const started = await query(
      `UPDATE rotation_turns SET status = 'active', started_at = NOW() WHERE id = $1 RETURNING *`, [turnId]);
    await consumeOverride(turn);
    await query(`UPDATE rotations SET current_turn_id = $1, updated_at = NOW() WHERE id = $2`, [turnId, rotation.id]);
    return turnRow(started.rows[0]);
  });
}

async function moveToEnd(rotationId: bigint, singerId: bigint): Promise<void> {
  await query(
    `UPDATE rotation_singers SET position =
       (SELECT COALESCE(MAX(position), -1) + 1 FROM rotation_singers WHERE rotation_id = $1)
      WHERE rotation_id = $1 AND singer_id = $2`, [rotationId, singerId]);
}

async function finishBookkeeping(rotation: Rotation, turn: RotationTurn): Promise<void> {
  await query(`UPDATE rotations SET current_turn_id = NULL, updated_at = NOW() WHERE id = $1 AND current_turn_id = $2`,
    [rotation.id, turn.id]);
  if (effectiveRotationType(rotation.config) === 'strict_round_robin' &&
      isRoundComplete(await snapshots(rotation.id), rotation.current_round)) {
    await query(`UPDATE rotations SET current_round = current_round + 1, updated_at = NOW() WHERE id = $1`, [rotation.id]);
  }
}

export async function completeTurn(turnId: bigint): Promise<RotationTurn | null> {
  return atomic(async () => {
    const locked = await lockedTurn(turnId);
    if (!locked) return null;
    const { turn, rotation } = locked;
    if (turn.status === 'completed') return turn;
    if (turn.status !== 'active') return null;
    const song = await query(
      `UPDATE song_requests SET status = 'completed', completed_at = NOW()
        WHERE id = $1 AND status = 'singing' RETURNING participant_singer_ids`, [turn.song_request_id]);
    if (!song.rows.length) return null;
    const updated = await query(
      `UPDATE rotation_turns SET status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`, [turnId]);
    const participants = rotation.config.duetPolicy === 'all_participants'
      ? [turn.singer_id, ...(song.rows[0].participant_singer_ids ?? []).map(toBigInt)] : [turn.singer_id];
    for (const singerId of new Set<bigint>(participants)) {
      await query(`UPDATE singers SET last_sang_at = NOW(), total_songs_sung = total_songs_sung + 1 WHERE id = $1`, [singerId]);
      await query(
        `UPDATE rotation_singers SET last_sang_at = NOW(), last_round_sang = GREATEST(COALESCE(last_round_sang, 0), $2),
           total_songs_sung = total_songs_sung + 1 WHERE rotation_id = $3 AND singer_id = $1`,
        [singerId, turn.round_number, rotation.id]);
      if (effectiveRotationType(rotation.config) === 'signup_order') await moveToEnd(rotation.id, singerId);
      if (rotation.config.emptySingerPolicy === 'remove_from_rotation') await query(
        `UPDATE rotation_singers SET status = 'inactive' WHERE rotation_id = $1 AND singer_id = $2
          AND NOT EXISTS (SELECT 1 FROM song_requests WHERE singer_id = $2 AND status = 'pending')`, [rotation.id, singerId]);
    }
    if (turn.source === 'manual_override') await query(
      `UPDATE manual_overrides SET status = 'consumed' WHERE rotation_id = $1 AND song_request_id = $2
        AND status = 'pending' AND expires_after_turn = false`, [rotation.id, turn.song_request_id]);
    await finishBookkeeping(rotation, turn);
    return turnRow(updated.rows[0]);
  });
}

export async function skipTurn(turnId: bigint): Promise<RotationTurn | null> {
  return atomic(async () => {
    const locked = await lockedTurn(turnId);
    if (!locked) return null;
    const { turn, rotation } = locked;
    if (turn.status === 'skipped') return turn;
    if (!['scheduled', 'active'].includes(turn.status)) return null;
    const updated = await query(
      `UPDATE rotation_turns SET status = 'skipped', completed_at = NOW() WHERE id = $1 RETURNING *`, [turnId]);
    await query(`UPDATE song_requests SET status = 'pending' WHERE id = $1 AND status IN ('queued', 'singing')`, [turn.song_request_id]);
    if (turn.status === 'scheduled') await consumeOverride(turn);
    if (rotation.config.skipPolicy === 'move_to_end') {
      await moveToEnd(rotation.id, turn.singer_id);
      if (effectiveRotationType(rotation.config) === 'strict_round_robin') await query(
        `UPDATE rotation_singers SET last_round_sang = GREATEST(COALESCE(last_round_sang, 0), $3)
          WHERE rotation_id = $1 AND singer_id = $2`, [rotation.id, turn.singer_id, turn.round_number]);
    } else if (rotation.config.skipPolicy === 'remove_until_reactivated') {
      await query(`UPDATE rotation_singers SET status = 'absent' WHERE rotation_id = $1 AND singer_id = $2`, [rotation.id, turn.singer_id]);
      await query(
        `UPDATE manual_overrides SET status = 'cancelled' WHERE rotation_id = $1 AND singer_id = $2 AND status = 'pending'`,
        [rotation.id, turn.singer_id]);
    }
    await finishBookkeeping(rotation, turn);
    return turnRow(updated.rows[0]);
  });
}

export async function createRotation(params: { name: string; config?: Partial<RotationConfig> }): Promise<Rotation> {
  if (typeof params.name !== 'string' || !params.name.trim()) throw new RotationValidationError('name is required');
  const config = normalizeRotationConfig(params.config);
  const result = await query(
    `INSERT INTO rotations (name, type, base_policy, config) VALUES ($1, $2, $3, $4) RETURNING *`,
    [params.name.trim(), config.type, config.basePolicy, JSON.stringify(config)]);
  return rotationRow(result.rows[0]);
}

export async function updateRotationConfig(rotationId: bigint, config: Partial<RotationConfig>): Promise<Rotation | null> {
  return atomic(async () => {
    const rotation = await lockRotation(rotationId);
    if (!rotation) return null;
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new RotationValidationError('Rotation config must be an object');
    const merged = normalizeRotationConfig({ ...rotation.config, ...config });
    await cancelScheduled(rotationId);
    const result = await query(
      `UPDATE rotations SET config = $1, type = $2, base_policy = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [JSON.stringify(merged), merged.type, merged.basePolicy, rotationId]);
    return rotationRow(result.rows[0]);
  });
}

export async function pauseRotation(rotationId: bigint): Promise<void> {
  await query(`UPDATE rotations SET status = 'paused', updated_at = NOW() WHERE id = $1`, [rotationId]);
}
export async function resumeRotation(rotationId: bigint): Promise<void> {
  await query(`UPDATE rotations SET status = 'active', updated_at = NOW() WHERE id = $1`, [rotationId]);
}
export async function listRotations(): Promise<Rotation[]> {
  return (await query('SELECT * FROM rotations ORDER BY created_at DESC, id DESC')).rows.map(rotationRow);
}
export async function createSinger(displayName: string): Promise<Singer> {
  if (typeof displayName !== 'string' || !displayName.trim()) throw new RotationValidationError('displayName is required');
  const result = await query(
    `INSERT INTO singers (display_name, normalized_name) VALUES ($1, $2)
     ON CONFLICT (normalized_name) DO UPDATE SET normalized_name = EXCLUDED.normalized_name RETURNING *`,
    [displayName.trim(), normalizeSingerName(displayName)]);
  return { ...result.rows[0], id: toBigInt(result.rows[0].id) };
}

async function lockSingerRotations(singerId: bigint): Promise<bigint[]> {
  const result = await query(
    `SELECT r.id FROM rotations r JOIN rotation_singers rs ON rs.rotation_id = r.id
      WHERE rs.singer_id = $1 ORDER BY r.id FOR UPDATE OF r`, [singerId]);
  return result.rows.map((row) => toBigInt(row.id));
}

export async function setSingerStatus(singerId: bigint, status: Singer['status']): Promise<void> {
  if (!['active', 'inactive', 'absent', 'skipped', 'banned'].includes(status)) throw new RotationValidationError('Invalid singer status');
  await atomic(async () => {
    const rotations = await lockSingerRotations(singerId);
    await query('UPDATE singers SET status = $1 WHERE id = $2', [status, singerId]);
    if (status !== 'active') for (const id of rotations) {
      await cancelScheduled(id, singerId);
      await query(`UPDATE manual_overrides SET status = 'cancelled' WHERE rotation_id = $1 AND singer_id = $2 AND status = 'pending'`, [id, singerId]);
    }
  });
}

export async function addSingerToRotation(rotationId: bigint, singerId: bigint): Promise<RotationSinger> {
  return atomic(async () => {
    const rotation = await requireRotation(rotationId);
    const singer = await query(`SELECT status FROM singers WHERE id = $1`, [singerId]);
    if (!singer.rows.length || singer.rows[0].status !== 'active') throw new RotationValidationError('Singer must be active');
    const existing = await query('SELECT * FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2', [rotationId, singerId]);
    if (existing.rows[0]?.status === 'active') return membershipRow(existing.rows[0]);
    let round = rotation.current_round;
    const mode = effectiveRotationType(rotation.config);
    if (mode === 'strict_round_robin' && rotation.config.newSingerPlacement === 'next_round') round++;
    const maximum = await query('SELECT COALESCE(MAX(position), -1) AS max_pos FROM rotation_singers WHERE rotation_id = $1', [rotationId]);
    let position = Number(maximum.rows[0].max_pos) + 1;
    if (mode === 'strict_round_robin' && rotation.config.newSingerPlacement === 'next_available') {
      const current = await openTurn(rotationId);
      const member = current && await query('SELECT position FROM rotation_singers WHERE rotation_id = $1 AND singer_id = $2', [rotationId, current.singer_id]);
      position = member?.rows[0] ? Number(member.rows[0].position) + 1 : 0;
      await query('UPDATE rotation_singers SET position = position + 1 WHERE rotation_id = $1 AND position >= $2', [rotationId, position]);
    }
    const result = await query(
      `INSERT INTO rotation_singers (rotation_id, singer_id, position, current_round_joined) VALUES ($1, $2, $3, $4)
       ON CONFLICT (rotation_id, singer_id) DO UPDATE SET status = 'active', position = EXCLUDED.position,
         current_round_joined = EXCLUDED.current_round_joined RETURNING *`, [rotationId, singerId, position, round]);
    await cancelScheduled(rotationId);
    return membershipRow(result.rows[0]);
  });
}

export async function removeSingerFromRotation(rotationId: bigint, singerId: bigint): Promise<void> {
  await setRotationSingerStatus(rotationId, singerId, 'inactive');
}

export async function setRotationSingerStatus(rotationId: bigint, singerId: bigint, status: RotationSinger['status']): Promise<void> {
  if (!['active', 'inactive', 'absent', 'skipped'].includes(status)) throw new RotationValidationError('Invalid rotation singer status');
  await atomic(async () => {
    await requireRotation(rotationId);
    if (status === 'active') { await addSingerToRotation(rotationId, singerId); return; }
    await query('UPDATE rotation_singers SET status = $1 WHERE rotation_id = $2 AND singer_id = $3', [status, rotationId, singerId]);
    await cancelScheduled(rotationId, singerId);
    await query(`UPDATE manual_overrides SET status = 'cancelled' WHERE rotation_id = $1 AND singer_id = $2 AND status = 'pending'`, [rotationId, singerId]);
  });
}

export async function moveSinger(rotationId: bigint, singerId: bigint, newPosition: number): Promise<void> {
  if (!Number.isSafeInteger(newPosition) || newPosition < 0 || newPosition > 2147483646) {
    throw new RotationValidationError('position must be a nonnegative integer');
  }
  await atomic(async () => {
    await requireRotation(rotationId);
    const members = (await query('SELECT singer_id FROM rotation_singers WHERE rotation_id = $1 ORDER BY position, id', [rotationId])).rows;
    if (!members.some((row) => toBigInt(row.singer_id) === singerId)) await addSingerToRotation(rotationId, singerId);
    const ids = members.map((row) => toBigInt(row.singer_id)).filter((id) => id !== singerId);
    ids.splice(Math.min(newPosition, ids.length), 0, singerId);
    for (const [position, id] of ids.entries()) await query(
      'UPDATE rotation_singers SET position = $1 WHERE rotation_id = $2 AND singer_id = $3', [position, rotationId, id]);
    await cancelScheduled(rotationId);
  });
}

export async function reorderSingers(rotationId: bigint, orderedSingerIds: bigint[]): Promise<void> {
  if (!orderedSingerIds.length) return;
  await atomic(async () => {
    const rotation = await requireRotation(rotationId);
    const existing = (await query(
      `SELECT singer_id, position FROM rotation_singers WHERE rotation_id = $1 AND status = 'active' ORDER BY position, id`, [rotationId])).rows;
    const known = new Set(existing.map((row) => toBigInt(row.singer_id)));
    const ids = [...new Set(orderedSingerIds.filter((id) => known.has(id)))];
    if (!ids.length) return;
    const requested = [...ids];
    for (const row of existing) if (!ids.includes(toBigInt(row.singer_id))) ids.push(toBigInt(row.singer_id));
    for (const [index, id] of ids.entries()) await query(
      'UPDATE rotation_singers SET position = $1 WHERE rotation_id = $2 AND singer_id = $3', [existing[index].position, rotationId, id]);
    await cancelScheduled(rotationId);
    if (rotation.config.type === 'hybrid') {
      await query(
        `UPDATE manual_overrides SET status = 'cancelled'
          WHERE rotation_id = $1 AND status = 'pending' AND song_request_id IS NULL
            AND expires_after_turn = true AND singer_id = ANY($2::bigint[])`, [rotationId, requested]);
      const minimum = await query(
        `SELECT COALESCE(MIN(position), 0) AS position FROM manual_overrides WHERE rotation_id = $1 AND status = 'pending'`,
        [rotationId]);
      let position = Number(minimum.rows[0].position) - requested.length;
      for (const singerId of requested) await query(
        `INSERT INTO manual_overrides (rotation_id, singer_id, position, expires_after_turn)
         SELECT $1, s.id, $3, true FROM singers s WHERE s.id = $2 AND s.status = 'active'`,
        [rotationId, singerId, position++]);
    }
  });
}

export async function insertSingerNext(rotationId: bigint, singerId: bigint): Promise<void> {
  await atomic(async () => {
    await requireRotation(rotationId);
    const current = await openTurn(rotationId);
    const members = (await query('SELECT singer_id FROM rotation_singers WHERE rotation_id = $1 ORDER BY position, id', [rotationId])).rows;
    if (current?.singer_id !== singerId) {
      const others = members.filter((row) => toBigInt(row.singer_id) !== singerId);
      const index = current ? others.findIndex((row) => toBigInt(row.singer_id) === current.singer_id) : -1;
      await moveSinger(rotationId, singerId, index + 1);
    }
    const override = await addManualOverride({ rotationId, singerId, expiresAfterTurn: true });
    await query(
      `UPDATE manual_overrides SET position =
        (SELECT COALESCE(MIN(position), 0) - 1 FROM manual_overrides
          WHERE rotation_id = $1 AND status = 'pending' AND id <> $2)
        WHERE id = $2`, [rotationId, override.id]);
  });
}

export async function addSongRequest(params: {
  singerId: bigint; title: string; artist?: string; trackId?: number; priority?: number; participantSingerIds?: bigint[];
}): Promise<SongRequest> {
  if (typeof params.title !== 'string' || !params.title.trim()) throw new RotationValidationError('title is required');
  if (params.priority !== undefined && (!Number.isInteger(params.priority) || params.priority < -2147483648 || params.priority > 2147483647)) {
    throw new RotationValidationError('priority must be a 32-bit integer');
  }
  return atomic(async () => {
    const rotations = await lockSingerRotations(params.singerId);
    const singer = await query('SELECT status FROM singers WHERE id = $1 FOR UPDATE', [params.singerId]);
    if (!singer.rows.length || singer.rows[0].status !== 'active') throw new RotationValidationError('Singer must be active');
    const count = await query(`SELECT COUNT(*) AS c FROM song_requests WHERE singer_id = $1 AND status IN ('pending', 'queued', 'singing')`, [params.singerId]);
    for (const id of rotations) {
      const rotation = await getRotation(id);
      if (!rotation || rotation.status === 'closed') continue;
      const limit = rotation.config.allowSingerMultipleSongsInQueue ? rotation.config.maxPendingSongsPerSinger : 1;
      if (Number(count.rows[0].c) >= limit) throw new RotationValidationError(`Singer may have at most ${limit} pending songs`);
    }
    const result = await query(
      `INSERT INTO song_requests (singer_id, track_id, title, artist, priority, participant_singer_ids)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [params.singerId, params.trackId ?? null, params.title.trim(), params.artist ?? null, params.priority ?? 0,
        [...new Set(params.participantSingerIds ?? [])]]);
    const row = result.rows[0];
    return { ...row, id: toBigInt(row.id), singer_id: toBigInt(row.singer_id), participant_singer_ids: row.participant_singer_ids.map(toBigInt) };
  });
}

export async function removeSongRequest(songRequestId: bigint): Promise<void> {
  await atomic(async () => {
    const song = await query('SELECT singer_id FROM song_requests WHERE id = $1', [songRequestId]);
    if (!song.rows.length) return;
    const rotations = await lockSingerRotations(toBigInt(song.rows[0].singer_id));
    const removed = await query(`UPDATE song_requests SET status = 'removed' WHERE id = $1 AND status IN ('pending', 'queued') RETURNING id`, [songRequestId]);
    if (!removed.rows.length) return;
    for (const id of rotations) {
      const turn = await openTurn(id);
      if (turn?.status === 'scheduled' && turn.song_request_id === songRequestId) await cancelScheduled(id);
    }
    await query(`UPDATE manual_overrides SET status = 'cancelled' WHERE song_request_id = $1 AND status = 'pending'`, [songRequestId]);
  });
}

export async function addManualOverride(params: {
  rotationId: bigint; singerId: bigint; songRequestId?: bigint; expiresAfterTurn?: boolean;
}): Promise<ManualOverride> {
  if (params.expiresAfterTurn !== undefined && typeof params.expiresAfterTurn !== 'boolean') {
    throw new RotationValidationError('expiresAfterTurn must be a boolean');
  }
  return atomic(async () => {
    await requireRotation(params.rotationId);
    const singer = await query(
      `SELECT 1 FROM rotation_singers rs JOIN singers s ON s.id = rs.singer_id
        WHERE rs.rotation_id = $1 AND rs.singer_id = $2 AND rs.status = 'active' AND s.status = 'active'`,
      [params.rotationId, params.singerId]);
    if (!singer.rows.length) throw new RotationValidationError('Override singer must be active in this rotation');
    if (params.songRequestId) {
      const song = await query(`SELECT status FROM song_requests WHERE id = $1 AND singer_id = $2`, [params.songRequestId, params.singerId]);
      const scheduled = await openTurn(params.rotationId);
      if (!song.rows.length || (song.rows[0].status !== 'pending' &&
          !(song.rows[0].status === 'queued' && scheduled?.status === 'scheduled' && scheduled.song_request_id === params.songRequestId))) {
        throw new RotationValidationError('Override song must be pending and belong to its singer');
      }
    }
    await cancelScheduled(params.rotationId);
    const result = await query(
      `INSERT INTO manual_overrides (rotation_id, singer_id, song_request_id, position, expires_after_turn)
       VALUES ($1, $2, $3, (SELECT COALESCE(MAX(position), -1) + 1 FROM manual_overrides WHERE rotation_id = $1 AND status = 'pending'), $4)
       RETURNING *`, [params.rotationId, params.singerId, params.songRequestId ?? null, params.expiresAfterTurn ?? true]);
    return overrideRow(result.rows[0]);
  });
}

export async function clearManualOverrides(rotationId: bigint): Promise<void> {
  await atomic(async () => {
    await requireRotation(rotationId);
    const current = await openTurn(rotationId);
    if (current?.status === 'scheduled' && current.source === 'manual_override') await cancelScheduled(rotationId);
    await query(`UPDATE manual_overrides SET status = 'cancelled' WHERE rotation_id = $1 AND status = 'pending'`, [rotationId]);
  });
}

export async function getRotationState(rotationId: bigint): Promise<RotationState | null> {
  return atomic(async () => {
    const rotation = await lockRotation(rotationId);
    if (!rotation) return null;
    const existing = await openTurn(rotationId);
    const currentTurn = existing?.status === 'active' || (existing && await isScheduledTurnEligible(existing)) ? existing : null;
    const singersInOrder = await snapshots(rotationId, currentTurn ? null : existing?.song_request_id);
    const manualOverrides = await pendingOverrides(rotationId);
    const recent = await query(
      `SELECT * FROM rotation_turns WHERE rotation_id = $1 AND status = 'completed'
        ORDER BY completed_at DESC, id DESC LIMIT 10`, [rotationId]);
    let nextTurnPreview: PolicyResult | null = null;
    if (rotation.status === 'active') {
      nextTurnPreview = currentTurn?.song_request_id
        ? { singerId: currentTurn.singer_id, songRequestId: currentTurn.song_request_id }
        : (await nextSelection(rotation, singersInOrder, manualOverrides)).result;
    }
    return {
      rotation, currentTurn, nextTurnPreview, singersInOrder,
      pendingSongsBySinger: Object.fromEntries(singersInOrder.map((s) => [String(s.singerId), s.pendingSongs])),
      recentlyCompletedTurns: recent.rows.map(turnRow), manualOverrides, currentRound: rotation.current_round,
    };
  });
}
