// server/src/rotation/rotationService.ts
// DB-aware service that orchestrates the karaoke rotation.
// All scheduling policy logic lives in policies.ts; this module handles
// database reads/writes and ties everything together.

import { query } from '../db.js';
import {
  strictRoundRobin,
  leastRecentlySung,
  signupOrder,
  songQueueOnly,
  isRoundComplete,
} from './policies.js';
import {
  DEFAULT_ROTATION_CONFIG,
  type Rotation,
  type RotationConfig,
  type RotationSinger,
  type RotationTurn,
  type ManualOverride,
  type Singer,
  type SongRequest,
  type SingerSnapshot,
  type SongRequestSnapshot,
  type PolicyContext,
  type PolicyResult,
  type RotationState,
} from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Merge a partial config on top of the defaults. */
function mergeConfig(partial: Partial<RotationConfig> = {}): RotationConfig {
  return { ...DEFAULT_ROTATION_CONFIG, ...partial };
}

/** Convert DB row numbers/strings to bigint safely. */
function toBigInt(v: unknown): bigint {
  if (v === null || v === undefined) throw new Error(`Expected bigint, got ${v === null ? 'null' : 'undefined'}`);
  return BigInt(v as string | number);
}

function toOptBigInt(v: unknown): bigint | null {
  if (v === null || v === undefined) return null;
  return BigInt(v as string | number);
}

/** Build a SingerSnapshot from joined DB rows. */
function buildSnapshot(
  rs: RotationSinger & { singer_status: string; singer_display_name: string; singer_joined_at: Date; singer_last_sang_at: Date | null },
  songs: SongRequest[],
): SingerSnapshot {
  return {
    singerId: rs.singer_id,
    displayName: rs.singer_display_name,
    singerStatus: rs.singer_status as any,
    rotationStatus: rs.status,
    position: rs.position,
    joinedAt: rs.joined_at,
    currentRoundJoined: rs.current_round_joined,
    lastRoundSang: rs.last_round_sang ?? null,
    lastSangAt: rs.last_sang_at ?? null,
    pendingSongs: songs
      .filter((sr) => sr.singer_id === rs.singer_id)
      .map(
        (sr): SongRequestSnapshot => ({
          id: sr.id,
          singerId: sr.singer_id,
          title: sr.title,
          artist: sr.artist,
          priority: sr.priority,
          requestedAt: sr.requested_at,
          participantSingerIds: sr.participant_singer_ids ?? [],
        }),
      ),
  };
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export async function getRotation(rotationId: bigint): Promise<Rotation | null> {
  const res = await query<any>(
    'SELECT * FROM rotations WHERE id = $1 LIMIT 1',
    [rotationId],
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    ...row,
    id: toBigInt(row.id),
    current_turn_id: toOptBigInt(row.current_turn_id),
    config: mergeConfig(row.config ?? {}),
  } as Rotation;
}

async function getRotationSingersWithSnapshots(rotationId: bigint): Promise<SingerSnapshot[]> {
  // Join rotation_singers with singers
  const rsRes = await query<any>(
    `SELECT rs.*,
            s.status AS singer_status,
            s.display_name AS singer_display_name,
            s.joined_at AS singer_joined_at,
            s.last_sang_at AS singer_last_sang_at
       FROM rotation_singers rs
       JOIN singers s ON s.id = rs.singer_id
      WHERE rs.rotation_id = $1
      ORDER BY rs.position ASC`,
    [rotationId],
  );

  if (rsRes.rows.length === 0) return [];

  // Get all pending songs for these singers in one query
  const singerIds = rsRes.rows.map((r: any) => r.singer_id);
  const songRes = await query<any>(
    `SELECT * FROM song_requests
      WHERE singer_id = ANY($1::bigint[])
        AND status = 'pending'
      ORDER BY priority DESC, requested_at ASC`,
    [singerIds],
  );

  const songs: SongRequest[] = songRes.rows.map((r: any) => ({
    ...r,
    id: toBigInt(r.id),
    singer_id: toBigInt(r.singer_id),
    participant_singer_ids: (r.participant_singer_ids ?? []).map(toBigInt),
  }));

  return rsRes.rows.map((rs: any) => {
    const typedRs: RotationSinger & any = {
      ...rs,
      id: toBigInt(rs.id),
      rotation_id: toBigInt(rs.rotation_id),
      singer_id: toBigInt(rs.singer_id),
    };
    return buildSnapshot(typedRs, songs);
  });
}

async function getNextManualOverride(rotationId: bigint): Promise<ManualOverride | null> {
  const res = await query<any>(
    `SELECT mo.*
       FROM manual_overrides mo
      WHERE mo.rotation_id = $1
        AND mo.status = 'pending'
      ORDER BY mo.position ASC, mo.created_at ASC
      LIMIT 1`,
    [rotationId],
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    ...row,
    id: toBigInt(row.id),
    rotation_id: toBigInt(row.rotation_id),
    singer_id: toBigInt(row.singer_id),
    song_request_id: toOptBigInt(row.song_request_id),
  } as ManualOverride;
}

async function getLastCompletedSingerId(rotationId: bigint): Promise<bigint | null> {
  const res = await query<any>(
    `SELECT singer_id FROM rotation_turns
      WHERE rotation_id = $1 AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST
      LIMIT 1`,
    [rotationId],
  );
  if (res.rows.length === 0) return null;
  return toBigInt(res.rows[0].singer_id);
}

// ---------------------------------------------------------------------------
// Turn creation
// ---------------------------------------------------------------------------

async function createTurn(
  rotationId: bigint,
  singerId: bigint,
  songRequestId: bigint | null,
  roundNumber: number,
  source: 'automatic' | 'manual_override' | 'priority',
): Promise<RotationTurn> {
  const res = await query<any>(
    `INSERT INTO rotation_turns (rotation_id, singer_id, song_request_id, round_number, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [rotationId, singerId, songRequestId, roundNumber, source],
  );
  const row = res.rows[0];
  return {
    ...row,
    id: toBigInt(row.id),
    rotation_id: toBigInt(row.rotation_id),
    singer_id: toBigInt(row.singer_id),
    song_request_id: toOptBigInt(row.song_request_id),
  } as RotationTurn;
}

// ---------------------------------------------------------------------------
// getNextTurn — main scheduler entry point
// ---------------------------------------------------------------------------

export async function getNextTurn(rotationId: bigint): Promise<RotationTurn | null> {
  const rotation = await getRotation(rotationId);
  if (!rotation || rotation.status !== 'active') return null;

  // Check for an existing scheduled or active turn (don't create a duplicate)
  const activeTurnRes = await query<any>(
    `SELECT * FROM rotation_turns
      WHERE rotation_id = $1
        AND status IN ('scheduled', 'active')
      ORDER BY created_at ASC
      LIMIT 1`,
    [rotationId],
  );
  if (activeTurnRes.rows.length > 0) {
    const r = activeTurnRes.rows[0];
    return {
      ...r,
      id: toBigInt(r.id),
      rotation_id: toBigInt(r.rotation_id),
      singer_id: toBigInt(r.singer_id),
      song_request_id: toOptBigInt(r.song_request_id),
    } as RotationTurn;
  }

  // Manual overrides take priority over all automatic policies
  const override = await getNextManualOverride(rotationId);
  if (override) {
    return buildTurnFromOverride(rotation, override);
  }

  const { config } = rotation;

  // Manual mode: host drives everything, no automatic scheduling
  if (config.type === 'manual') return null;

  const singers = await getRotationSingersWithSnapshots(rotationId);
  const lastCompletedSingerId = await getLastCompletedSingerId(rotationId);

  const ctx: PolicyContext = {
    currentRound: rotation.current_round,
    lastCompletedSingerId,
    config,
  };

  let result: PolicyResult | null = null;
  let roundAdvanced = false;

  switch (config.type) {
    case 'strict_round_robin': {
      result = strictRoundRobin(singers, ctx);
      // If the scheduler fell back to next-round singers it means the round is complete
      if (result) {
        const currentRoundPool = singers.filter(
          (s) =>
            s.singerStatus === 'active' &&
            s.rotationStatus === 'active' &&
            s.pendingSongs.length > 0 &&
            (s.lastRoundSang === null || s.lastRoundSang < rotation.current_round) &&
            s.currentRoundJoined <= rotation.current_round,
        );
        if (currentRoundPool.length === 0) {
          // All eligible singers already sang this round → advance round
          await advanceRound(rotationId, rotation.current_round + 1);
          roundAdvanced = true;
          ctx.currentRound = rotation.current_round + 1;
          result = strictRoundRobin(singers, ctx);
        }
      }
      break;
    }
    case 'least_recently_sung':
      result = leastRecentlySung(singers, ctx);
      break;
    case 'signup_order':
      result = signupOrder(singers, ctx);
      break;
    case 'song_queue_only':
      result = songQueueOnly(singers, ctx);
      break;
    case 'hybrid':
      result = getNextResultUsingBasePolicy(singers, ctx, config.basePolicy);
      break;
    default:
      throw new Error(`Unsupported rotation type: ${config.type}`);
  }

  if (!result) return null;

  const round = roundAdvanced ? rotation.current_round + 1 : rotation.current_round;
  const turn = await createTurn(rotationId, result.singerId, result.songRequestId, round, 'automatic');

  // Update rotation.current_turn_id
  await query('UPDATE rotations SET current_turn_id = $1, updated_at = NOW() WHERE id = $2', [
    turn.id,
    rotationId,
  ]);

  // Mark song as 'queued' so it cannot be double-booked
  if (result.songRequestId) {
    await query(
      `UPDATE song_requests SET status = 'queued' WHERE id = $1 AND status = 'pending'`,
      [result.songRequestId],
    );
  }

  return turn;
}

/** Choose next result using the configured basePolicy (used by hybrid). */
function getNextResultUsingBasePolicy(
  singers: SingerSnapshot[],
  ctx: PolicyContext,
  basePolicy: string,
): PolicyResult | null {
  switch (basePolicy) {
    case 'strict_round_robin':
      return strictRoundRobin(singers, ctx);
    case 'least_recently_sung':
      return leastRecentlySung(singers, ctx);
    case 'signup_order':
      return signupOrder(singers, ctx);
    default:
      return strictRoundRobin(singers, ctx);
  }
}

/** Build a RotationTurn from a manual override and consume the override. */
async function buildTurnFromOverride(
  rotation: Rotation,
  override: ManualOverride,
): Promise<RotationTurn> {
  let songRequestId = override.song_request_id;

  // If override has no specific song, select the singer's next eligible song
  if (!songRequestId) {
    const songRes = await query<any>(
      `SELECT id FROM song_requests
        WHERE singer_id = $1 AND status = 'pending'
        ORDER BY priority DESC, requested_at ASC
        LIMIT 1`,
      [override.singer_id],
    );
    if (songRes.rows.length > 0) {
      songRequestId = toBigInt(songRes.rows[0].id);
    }
  }

  const turn = await createTurn(
    rotation.id,
    override.singer_id,
    songRequestId,
    rotation.current_round,
    'manual_override',
  );

  // Consume the override if expires_after_turn
  if (override.expires_after_turn) {
    await query(
      `UPDATE manual_overrides SET status = 'consumed' WHERE id = $1`,
      [override.id],
    );
  }

  // Update current_turn_id
  await query('UPDATE rotations SET current_turn_id = $1, updated_at = NOW() WHERE id = $2', [
    turn.id,
    rotation.id,
  ]);

  // Mark song as queued
  if (songRequestId) {
    await query(
      `UPDATE song_requests SET status = 'queued' WHERE id = $1 AND status = 'pending'`,
      [songRequestId],
    );
  }

  return turn;
}

// ---------------------------------------------------------------------------
// startTurn
// ---------------------------------------------------------------------------

export async function startTurn(turnId: bigint): Promise<RotationTurn | null> {
  const res = await query<any>(
    `UPDATE rotation_turns
        SET status = 'active', started_at = NOW()
      WHERE id = $1 AND status = 'scheduled'
      RETURNING *`,
    [turnId],
  );
  if (res.rows.length === 0) return null;

  // Mark song as 'singing'
  const row = res.rows[0];
  if (row.song_request_id) {
    await query(
      `UPDATE song_requests SET status = 'singing' WHERE id = $1`,
      [row.song_request_id],
    );
  }

  return {
    ...row,
    id: toBigInt(row.id),
    rotation_id: toBigInt(row.rotation_id),
    singer_id: toBigInt(row.singer_id),
    song_request_id: toOptBigInt(row.song_request_id),
  } as RotationTurn;
}

// ---------------------------------------------------------------------------
// completeTurn
// ---------------------------------------------------------------------------

export async function completeTurn(turnId: bigint): Promise<RotationTurn | null> {
  const turnRes = await query<any>(
    `UPDATE rotation_turns
        SET status = 'completed', completed_at = NOW()
      WHERE id = $1 AND status IN ('scheduled','active')
      RETURNING *`,
    [turnId],
  );
  if (turnRes.rows.length === 0) return null;

  const turnRow = turnRes.rows[0];
  const turn: RotationTurn = {
    ...turnRow,
    id: toBigInt(turnRow.id),
    rotation_id: toBigInt(turnRow.rotation_id),
    singer_id: toBigInt(turnRow.singer_id),
    song_request_id: toOptBigInt(turnRow.song_request_id),
  };

  // Mark song as completed
  if (turn.song_request_id) {
    await query(
      `UPDATE song_requests SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [turn.song_request_id],
    );
  }

  // Determine participant singer IDs for duet policy
  let participantIds: bigint[] = [turn.singer_id];
  if (turn.song_request_id) {
    const srRes = await query<any>('SELECT participant_singer_ids FROM song_requests WHERE id = $1', [
      turn.song_request_id,
    ]);
    if (srRes.rows.length > 0) {
      const ids: bigint[] = (srRes.rows[0].participant_singer_ids ?? []).map(toBigInt);
      participantIds = Array.from(new Set([...participantIds, ...ids].map(String))).map(BigInt);
    }
  }

  // Load the rotation config to apply duetPolicy
  const rotation = await getRotation(turn.rotation_id);
  const duetPolicy = rotation?.config.duetPolicy ?? 'all_participants';

  const singersToUpdate: bigint[] =
    duetPolicy === 'all_participants'
      ? participantIds
      : duetPolicy === 'primary_only'
      ? [turn.singer_id]
      : [turn.singer_id]; // group_as_singer treats the primary as the group

  // Update singer stats
  for (const sid of singersToUpdate) {
    await query(
      `UPDATE singers SET last_sang_at = NOW(), total_songs_sung = total_songs_sung + 1 WHERE id = $1`,
      [sid],
    );
    // Update rotation_singer stats
    await query(
      `UPDATE rotation_singers
          SET last_sang_at = NOW(),
              last_round_sang = $2,
              total_songs_sung = total_songs_sung + 1
        WHERE rotation_id = $3 AND singer_id = $1`,
      [sid, turn.round_number, turn.rotation_id],
    );
  }

  // Apply signup_order post-completion behaviour
  if (rotation?.config.type === 'signup_order' || rotation?.config.basePolicy === 'signup_order') {
    await applySignupOrderPostCompletion(turn.rotation_id, turn.singer_id, rotation.config);
  }

  // Clear current_turn_id if it points to this turn
  await query(
    `UPDATE rotations SET current_turn_id = NULL, updated_at = NOW()
      WHERE id = $1 AND current_turn_id = $2`,
    [turn.rotation_id, turn.id],
  );

  // For strict_round_robin: check if the round is now complete
  if (
    rotation &&
    (rotation.config.type === 'strict_round_robin' ||
      (rotation.config.type === 'hybrid' && rotation.config.basePolicy === 'strict_round_robin'))
  ) {
    const singers = await getRotationSingersWithSnapshots(turn.rotation_id);
    if (isRoundComplete(singers, rotation.current_round)) {
      await advanceRound(turn.rotation_id, rotation.current_round + 1);
    }
  }

  return turn;
}

/** Move singer to end or mark absent after their turn, per signup_order. */
async function applySignupOrderPostCompletion(
  rotationId: bigint,
  singerId: bigint,
  config: RotationConfig,
): Promise<void> {
  // Check if singer still has pending songs
  const songRes = await query<any>(
    `SELECT COUNT(*) AS c FROM song_requests WHERE singer_id = $1 AND status = 'pending'`,
    [singerId],
  );
  const hasPending = Number(songRes.rows[0].c) > 0;

  if (hasPending) {
    // Move to end: set position to max + 1
    await query(
      `UPDATE rotation_singers rs
          SET position = (
            SELECT COALESCE(MAX(position), 0) + 1
              FROM rotation_singers
             WHERE rotation_id = $1
          )
        WHERE rs.rotation_id = $1 AND rs.singer_id = $2`,
      [rotationId, singerId],
    );
  } else {
    if (config.emptySingerPolicy === 'remove_from_rotation') {
      await query(
        `UPDATE rotation_singers SET status = 'inactive' WHERE rotation_id = $1 AND singer_id = $2`,
        [rotationId, singerId],
      );
    }
    // keep_active_without_song: leave the singer active even without songs
  }
}

// ---------------------------------------------------------------------------
// skipTurn
// ---------------------------------------------------------------------------

export async function skipTurn(turnId: bigint): Promise<RotationTurn | null> {
  const turnRes = await query<any>(
    `UPDATE rotation_turns
        SET status = 'skipped'
      WHERE id = $1 AND status IN ('scheduled','active')
      RETURNING *`,
    [turnId],
  );
  if (turnRes.rows.length === 0) return null;

  const turnRow = turnRes.rows[0];
  const turn: RotationTurn = {
    ...turnRow,
    id: toBigInt(turnRow.id),
    rotation_id: toBigInt(turnRow.rotation_id),
    singer_id: toBigInt(turnRow.singer_id),
    song_request_id: toOptBigInt(turnRow.song_request_id),
  };

  // Revert song back to pending
  if (turn.song_request_id) {
    await query(
      `UPDATE song_requests SET status = 'pending' WHERE id = $1 AND status IN ('queued','singing')`,
      [turn.song_request_id],
    );
  }

  // Apply skip policy
  const rotation = await getRotation(turn.rotation_id);
  const skipPolicy = rotation?.config.skipPolicy ?? 'move_to_end';

  if (skipPolicy === 'move_to_end') {
    await query(
      `UPDATE rotation_singers rs
          SET position = (
            SELECT COALESCE(MAX(position), 0) + 1
              FROM rotation_singers
             WHERE rotation_id = $1
          )
        WHERE rs.rotation_id = $1 AND rs.singer_id = $2`,
      [turn.rotation_id, turn.singer_id],
    );
  } else if (skipPolicy === 'remove_until_reactivated') {
    await query(
      `UPDATE rotation_singers SET status = 'absent' WHERE rotation_id = $1 AND singer_id = $2`,
      [turn.rotation_id, turn.singer_id],
    );
  }
  // keep_position: do nothing

  // Clear current_turn_id
  await query(
    `UPDATE rotations SET current_turn_id = NULL, updated_at = NOW()
      WHERE id = $1 AND current_turn_id = $2`,
    [turn.rotation_id, turn.id],
  );

  return turn;
}

// ---------------------------------------------------------------------------
// Round management
// ---------------------------------------------------------------------------

async function advanceRound(rotationId: bigint, newRound: number): Promise<void> {
  await query(
    `UPDATE rotations SET current_round = $1, updated_at = NOW() WHERE id = $2`,
    [newRound, rotationId],
  );
}

// ---------------------------------------------------------------------------
// CRUD — Rotations
// ---------------------------------------------------------------------------

export async function createRotation(params: {
  name: string;
  config?: Partial<RotationConfig>;
}): Promise<Rotation> {
  const config = mergeConfig(params.config);
  const res = await query<any>(
    `INSERT INTO rotations (name, type, base_policy, config)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.name, config.type, config.basePolicy, JSON.stringify(config)],
  );
  const row = res.rows[0];
  return {
    ...row,
    id: toBigInt(row.id),
    current_turn_id: toOptBigInt(row.current_turn_id),
    config: mergeConfig(row.config),
  } as Rotation;
}

export async function updateRotationConfig(
  rotationId: bigint,
  config: Partial<RotationConfig>,
): Promise<Rotation | null> {
  const current = await getRotation(rotationId);
  if (!current) return null;
  const merged = mergeConfig({ ...current.config, ...config });
  const res = await query<any>(
    `UPDATE rotations
        SET config = $1, type = $2, base_policy = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *`,
    [JSON.stringify(merged), merged.type, merged.basePolicy, rotationId],
  );
  if (res.rows.length === 0) return null;

  // Cancel any pending scheduled turns so the new policy picks the next singer
  // fresh. Active turns (currently being sung) are intentionally left alone.
  const scheduledRes = await query<{ id: string; song_request_id: string | null }>(
    `SELECT id::text, song_request_id::text FROM rotation_turns
      WHERE rotation_id = $1 AND status = 'scheduled'`,
    [rotationId],
  );
  for (const turn of scheduledRes.rows) {
    if (turn.song_request_id) {
      await query(
        `UPDATE song_requests SET status = 'pending' WHERE id = $1 AND status = 'queued'`,
        [BigInt(turn.song_request_id)],
      );
    }
  }
  if (scheduledRes.rows.length > 0) {
    const scheduledIds = scheduledRes.rows.map((t) => BigInt(t.id));
    await query(
      `UPDATE rotation_turns SET status = 'skipped' WHERE rotation_id = $1 AND status = 'scheduled'`,
      [rotationId],
    );
    // Clear current_turn_id if it pointed to one of the now-cancelled turns
    await query(
      `UPDATE rotations SET current_turn_id = NULL, updated_at = NOW()
        WHERE id = $1 AND current_turn_id = ANY($2::bigint[])`,
      [rotationId, scheduledIds],
    );
  }

  const row = res.rows[0];
  return {
    ...row,
    id: toBigInt(row.id),
    current_turn_id: toOptBigInt(row.current_turn_id),
    config: mergeConfig(row.config),
  } as Rotation;
}

export async function pauseRotation(rotationId: bigint): Promise<void> {
  await query(
    `UPDATE rotations SET status = 'paused', updated_at = NOW() WHERE id = $1`,
    [rotationId],
  );
}

export async function resumeRotation(rotationId: bigint): Promise<void> {
  await query(
    `UPDATE rotations SET status = 'active', updated_at = NOW() WHERE id = $1`,
    [rotationId],
  );
}

export async function listRotations(): Promise<Rotation[]> {
  const res = await query<any>('SELECT * FROM rotations ORDER BY created_at DESC');
  return res.rows.map((row: any) => ({
    ...row,
    id: toBigInt(row.id),
    current_turn_id: toOptBigInt(row.current_turn_id),
    config: mergeConfig(row.config),
  }));
}

// ---------------------------------------------------------------------------
// CRUD — Singers
// ---------------------------------------------------------------------------

export async function createSinger(displayName: string): Promise<Singer> {
  const res = await query<any>(
    `INSERT INTO singers (display_name) VALUES ($1) RETURNING *`,
    [displayName],
  );
  const row = res.rows[0];
  return { ...row, id: toBigInt(row.id) } as Singer;
}

export async function setSingerStatus(
  singerId: bigint,
  status: Singer['status'],
): Promise<void> {
  await query(`UPDATE singers SET status = $1 WHERE id = $2`, [status, singerId]);
}

// ---------------------------------------------------------------------------
// CRUD — RotationSingers
// ---------------------------------------------------------------------------

export async function addSingerToRotation(
  rotationId: bigint,
  singerId: bigint,
): Promise<RotationSinger> {
  const rotation = await getRotation(rotationId);
  if (!rotation) throw new Error(`Rotation ${rotationId} not found`);

  // Compute join round based on newSingerPlacement
  const placement = rotation.config.newSingerPlacement;
  let joinRound = rotation.current_round;
  if (placement === 'next_round') {
    joinRound = rotation.current_round + 1;
  }
  // next_available / end_of_current_round: join the current round
  // (end_of_current_round: position will be after existing current-round singers)

  // Get current max position
  const posRes = await query<any>(
    `SELECT COALESCE(MAX(position), -1) AS max_pos FROM rotation_singers WHERE rotation_id = $1`,
    [rotationId],
  );
  const position = Number(posRes.rows[0].max_pos) + 1;

  const res = await query<any>(
    `INSERT INTO rotation_singers
       (rotation_id, singer_id, position, current_round_joined)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (rotation_id, singer_id) DO UPDATE
       SET status = 'active'
     RETURNING *`,
    [rotationId, singerId, position, joinRound],
  );
  const row = res.rows[0];
  return {
    ...row,
    id: toBigInt(row.id),
    rotation_id: toBigInt(row.rotation_id),
    singer_id: toBigInt(row.singer_id),
  } as RotationSinger;
}

export async function removeSingerFromRotation(
  rotationId: bigint,
  singerId: bigint,
): Promise<void> {
  await query(
    `UPDATE rotation_singers SET status = 'inactive' WHERE rotation_id = $1 AND singer_id = $2`,
    [rotationId, singerId],
  );
}

export async function moveSinger(
  rotationId: bigint,
  singerId: bigint,
  newPosition: number,
): Promise<void> {
  // Shift other singers to make room
  await query(
    `UPDATE rotation_singers
        SET position = position + 1
      WHERE rotation_id = $1 AND position >= $2 AND singer_id != $3`,
    [rotationId, newPosition, singerId],
  );
  await query(
    `UPDATE rotation_singers SET position = $1 WHERE rotation_id = $2 AND singer_id = $3`,
    [newPosition, rotationId, singerId],
  );
}

export async function insertSingerNext(rotationId: bigint, singerId: bigint): Promise<void> {
  // Find the position right after the current active turn's singer
  const rotation = await getRotation(rotationId);
  let insertAt = 0;
  if (rotation?.current_turn_id) {
    const turnRes = await query<any>(
      `SELECT rs.position
         FROM rotation_turns rt
         JOIN rotation_singers rs ON rs.singer_id = rt.singer_id AND rs.rotation_id = rt.rotation_id
        WHERE rt.id = $1`,
      [rotation.current_turn_id],
    );
    if (turnRes.rows.length > 0) {
      insertAt = Number(turnRes.rows[0].position) + 1;
    }
  }
  await moveSinger(rotationId, singerId, insertAt);
}

export async function setRotationSingerStatus(
  rotationId: bigint,
  singerId: bigint,
  status: RotationSinger['status'],
): Promise<void> {
  await query(
    `UPDATE rotation_singers SET status = $1 WHERE rotation_id = $2 AND singer_id = $3`,
    [status, rotationId, singerId],
  );
}

// ---------------------------------------------------------------------------
// CRUD — Song Requests
// ---------------------------------------------------------------------------

export async function addSongRequest(params: {
  singerId: bigint;
  title: string;
  artist?: string;
  trackId?: number;
  priority?: number;
  participantSingerIds?: bigint[];
}): Promise<SongRequest> {
  const res = await query<any>(
    `INSERT INTO song_requests
       (singer_id, track_id, title, artist, priority, participant_singer_ids)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      params.singerId,
      params.trackId ?? null,
      params.title,
      params.artist ?? null,
      params.priority ?? 0,
      params.participantSingerIds ?? [],
    ],
  );
  const row = res.rows[0];
  return {
    ...row,
    id: toBigInt(row.id),
    singer_id: toBigInt(row.singer_id),
    participant_singer_ids: (row.participant_singer_ids ?? []).map(toBigInt),
  } as SongRequest;
}

export async function removeSongRequest(songRequestId: bigint): Promise<void> {
  await query(
    `UPDATE song_requests SET status = 'removed' WHERE id = $1 AND status IN ('pending','queued')`,
    [songRequestId],
  );
}

// ---------------------------------------------------------------------------
// Manual Overrides
// ---------------------------------------------------------------------------

export async function addManualOverride(params: {
  rotationId: bigint;
  singerId: bigint;
  songRequestId?: bigint;
  expiresAfterTurn?: boolean;
}): Promise<ManualOverride> {
  // Get next position
  const posRes = await query<any>(
    `SELECT COALESCE(MAX(position), -1) AS max_pos FROM manual_overrides WHERE rotation_id = $1 AND status = 'pending'`,
    [params.rotationId],
  );
  const position = Number(posRes.rows[0].max_pos) + 1;

  const res = await query<any>(
    `INSERT INTO manual_overrides
       (rotation_id, singer_id, song_request_id, position, expires_after_turn)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      params.rotationId,
      params.singerId,
      params.songRequestId ?? null,
      position,
      params.expiresAfterTurn ?? true,
    ],
  );
  const row = res.rows[0];
  return {
    ...row,
    id: toBigInt(row.id),
    rotation_id: toBigInt(row.rotation_id),
    singer_id: toBigInt(row.singer_id),
    song_request_id: toOptBigInt(row.song_request_id),
  } as ManualOverride;
}

export async function clearManualOverrides(rotationId: bigint): Promise<void> {
  await query(
    `UPDATE manual_overrides SET status = 'cancelled' WHERE rotation_id = $1 AND status = 'pending'`,
    [rotationId],
  );
}

// ---------------------------------------------------------------------------
// getRotationState — full snapshot for UI
// ---------------------------------------------------------------------------

export async function getRotationState(rotationId: bigint): Promise<RotationState | null> {
  const rotation = await getRotation(rotationId);
  if (!rotation) return null;

  const singersInOrder = await getRotationSingersWithSnapshots(rotationId);

  // Current active/scheduled turn
  let currentTurn: RotationTurn | null = null;
  if (rotation.current_turn_id) {
    const ctRes = await query<any>('SELECT * FROM rotation_turns WHERE id = $1 LIMIT 1', [
      rotation.current_turn_id,
    ]);
    if (ctRes.rows.length > 0) {
      const r = ctRes.rows[0];
      currentTurn = {
        ...r,
        id: toBigInt(r.id),
        rotation_id: toBigInt(r.rotation_id),
        singer_id: toBigInt(r.singer_id),
        song_request_id: toOptBigInt(r.song_request_id),
      };
    }
  }

  // Recently completed turns
  const rcRes = await query<any>(
    `SELECT * FROM rotation_turns
      WHERE rotation_id = $1 AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST
      LIMIT 10`,
    [rotationId],
  );
  const recentlyCompletedTurns: RotationTurn[] = rcRes.rows.map((r: any) => ({
    ...r,
    id: toBigInt(r.id),
    rotation_id: toBigInt(r.rotation_id),
    singer_id: toBigInt(r.singer_id),
    song_request_id: toOptBigInt(r.song_request_id),
  }));

  // Pending overrides
  const ovRes = await query<any>(
    `SELECT * FROM manual_overrides WHERE rotation_id = $1 AND status = 'pending' ORDER BY position ASC`,
    [rotationId],
  );
  const manualOverrides: ManualOverride[] = ovRes.rows.map((r: any) => ({
    ...r,
    id: toBigInt(r.id),
    rotation_id: toBigInt(r.rotation_id),
    singer_id: toBigInt(r.singer_id),
    song_request_id: toOptBigInt(r.song_request_id),
  }));

  // Pending songs grouped by singer
  const pendingSongsBySinger: Record<string, SongRequestSnapshot[]> = {};
  for (const s of singersInOrder) {
    pendingSongsBySinger[String(s.singerId)] = s.pendingSongs;
  }

  return {
    rotation,
    currentTurn,
    nextTurnPreview: null, // preview omitted to avoid side-effects; use getNextTurn
    singersInOrder,
    pendingSongsBySinger,
    recentlyCompletedTurns,
    manualOverrides,
    currentRound: rotation.current_round,
  };
}
