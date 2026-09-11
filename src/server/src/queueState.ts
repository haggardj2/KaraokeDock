// server/src/queueState.ts
// Service functions that build the nested queue state used by the Host page
// and handle operations that span the flat queue and the rotation tables.

import { query } from './db.js';
import { singerProfileFromRow, type SingerProfileResponse } from './singerProfile.js';
import { setLiveQueueStatus, writeQueueOrder } from './rotation/liveQueue.js';
import { withQueueTransaction } from './rotation/queueTransaction.js';

// ---------------------------------------------------------------------------
// Types returned by this module
// ---------------------------------------------------------------------------

export interface QueueSong {
  queueId: number;
  trackId: number;
  title: string;
  artist: string | null;
  discId: string | null;
  status: 'queued' | 'playing' | 'done' | string;
  position: number;
  requestedAt: string | null;
  requestedBy: string | null;
  startedAt: string | null;
  completedAt: string | null; // queue.finished_at
  keyAdjustment: number;
  durationMs: number | null;
}

export interface QueueSinger {
  singerId: string; // bigint serialised as string
  publicUuid?: string | null;
  displayName: string;
  status: string;
  rotationPosition: number | null;
  lastSangAt: string | null;
  totalSongsSung: number;
  nextSong: QueueSong | null;
  queuedSongs: QueueSong[];
  completedSongs: QueueSong[];
  completedSongsCount: number;
  queuedSongsCount: number;
  profile: SingerProfileResponse;
}

export interface ActiveRotationInfo {
  id: string;
  type: string;
  config: Record<string, unknown>;
  currentRound: number;
}

export interface QueueState {
  activeRotation: ActiveRotationInfo | null;
  nowPlaying: QueueSong | null;
  queueOrder: QueueSinger[];
  completedHistory: QueueSong[];
  flatQueue: QueueSong[];
}

export interface SingerHistory {
  singer: {
    id: string;
    displayName: string;
    normalizedName: string;
    status: string;
    totalSongsSung: number;
    lastSangAt: string | null;
    profile: SingerProfileResponse;
  };
  queuedSongs: QueueSong[];
  completedSongs: QueueSong[];
  skippedSongs: QueueSong[];
  removedSongs: QueueSong[];
  allSongs: QueueSong[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ROW_TO_QUEUE_SONG = (r: any): QueueSong => ({
  queueId: Number(r.id),
  trackId: Number(r.track_id),
  title: r.title ?? null,
  artist: r.artist ?? null,
  status: r.status,
  position: Number(r.position),
  requestedAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  requestedBy: r.requested_by ?? null,
  discId: r.disc_id ?? null,
  startedAt: r.started_at ? new Date(r.started_at).toISOString() : null,
  completedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
  keyAdjustment: Number(r.key_adjustment ?? 0),
  durationMs: r.duration_ms != null ? Number(r.duration_ms) : null,
});

export function compareQueueSingersForDisplay(a: QueueSinger, b: QueueSinger): number {
  const aIsPlaying = a.queuedSongs.some((song) => song.status === 'playing');
  const bIsPlaying = b.queuedSongs.some((song) => song.status === 'playing');
  if (aIsPlaying !== bIsPlaying) return aIsPlaying ? -1 : 1;

  const aNextPos = a.nextSong?.position ?? null;
  const bNextPos = b.nextSong?.position ?? null;
  if (aNextPos != null && bNextPos != null && aNextPos !== bNextPos) {
    return aNextPos - bNextPos;
  }
  if (aNextPos != null && bNextPos == null) return -1;
  if (aNextPos == null && bNextPos != null) return 1;

  if (a.rotationPosition != null && b.rotationPosition != null && a.rotationPosition !== b.rotationPosition) {
    return a.rotationPosition - b.rotationPosition;
  }
  if (a.rotationPosition != null && b.rotationPosition == null) return -1;
  if (a.rotationPosition == null && b.rotationPosition != null) return 1;

  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
}

// ---------------------------------------------------------------------------
// getQueueState — the main API for the Host page
// ---------------------------------------------------------------------------

export async function getQueueState(): Promise<QueueState> {
  // 1. Active rotation
  const rotRes = await query<any>(
    `SELECT id, type, base_policy, status, current_round, config
       FROM rotations
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  const rotRow = rotRes.rows[0] ?? null;
  const activeRotation: ActiveRotationInfo | null = rotRow
    ? {
        id: String(rotRow.id),
        type: (rotRow.config?.type as string) || rotRow.type,
        config: rotRow.config ?? {},
        currentRound: Number(rotRow.current_round),
      }
    : null;

  // 2. All queue rows with track info (flat)
  const qRes = await query<any>(`
    SELECT q.id, q.track_id, q.requested_by, q.singer_id, q.status, q.position,
           q.key_adjustment, q.created_at, q.started_at, q.finished_at,
           t.title, t.disc_id, t.duration_ms,
           a.name AS artist
      FROM queue q
      JOIN tracks t ON t.id = q.track_id
      LEFT JOIN artists a ON a.id = t.artist_id
     ORDER BY q.position
  `);

  const allRows: any[] = qRes.rows;
  const flatQueue = allRows.map(ROW_TO_QUEUE_SONG);
  const nowPlaying = flatQueue.find((s) => s.status === 'playing') ?? null;
  const completedHistory = flatQueue.filter((s) => s.status === 'done');

  // 3. Build singer-grouped queue order
  // Collect all unique singer_ids referenced in the queue
  const singerIdSet = new Set<string>();
  for (const r of allRows) {
    if (r.singer_id != null && (r.status === 'queued' || r.status === 'playing')) {
      singerIdSet.add(String(r.singer_id));
    }
  }
  // Also include singers present in the active rotation even if they have no queue entries
  if (rotRow) {
    const rsRes = await query<{ singer_id: string }>(
      `SELECT singer_id FROM rotation_singers WHERE rotation_id = $1 AND status = 'active'`,
      [rotRow.id],
    );
    for (const rs of rsRes.rows) singerIdSet.add(String(rs.singer_id));
  }

  // Load singer rows
  const singerIds = Array.from(singerIdSet);
  let singerRows: any[] = [];
  if (singerIds.length > 0) {
    const sRes = await query<any>(
      `SELECT s.id, s.public_uuid, s.display_name, s.normalized_name, s.status,
              s.last_sang_at, s.total_songs_sung, s.profile_image_source,
              s.profile_image_url, s.profile_image_mime, s.profile_image_focus_x,
              s.profile_image_focus_y, s.profile_image_crop, s.profile_image_updated_at,
              rs.position AS rotation_position, rs.status AS rotation_status
         FROM singers s
         LEFT JOIN rotation_singers rs ON rs.singer_id = s.id
                                      AND rs.rotation_id = $1
        WHERE s.id = ANY($2::bigint[])`,
      [rotRow?.id ?? null, singerIds.map(Number)],
    );
    singerRows = sRes.rows;
  }

  // Map singer rows by id
  const singerMap = new Map<string, any>();
  for (const s of singerRows) singerMap.set(String(s.id), s);

  // Map queue rows by singer_id
  const bySinger = new Map<string, any[]>();
  for (const r of allRows) {
    if (r.singer_id == null) continue;
    const key = String(r.singer_id);
    if (!bySinger.has(key)) bySinger.set(key, []);
    bySinger.get(key)!.push(r);
  }

  // Build queueOrder sorted by rotation position then by first queued song position
  const queueOrder: QueueSinger[] = [];
  for (const sid of singerIds) {
    const sRow = singerMap.get(sid);
    if (!sRow) continue;
    const rows = bySinger.get(sid) ?? [];
    const queued = rows
      .filter((r) => r.status === 'queued' || r.status === 'playing')
      .map(ROW_TO_QUEUE_SONG)
      .sort((a, b) => a.position - b.position);
    const completed = rows
      .filter((r) => r.status === 'done')
      .map(ROW_TO_QUEUE_SONG)
      .sort((a, b) => {
        if (a.completedAt && b.completedAt) return b.completedAt.localeCompare(a.completedAt);
        return 0;
      });
    const nextSong = queued.find((s) => s.status === 'queued') ?? null;

    queueOrder.push({
      singerId: sid,
      publicUuid: sRow.public_uuid ?? null,
      displayName: sRow.display_name,
      status: sRow.status === 'active' ? sRow.rotation_status ?? sRow.status : sRow.status,
      rotationPosition: sRow.rotation_position != null ? Number(sRow.rotation_position) : null,
      lastSangAt: sRow.last_sang_at ? new Date(sRow.last_sang_at).toISOString() : null,
      totalSongsSung: Number(sRow.total_songs_sung ?? 0),
      nextSong,
      queuedSongs: queued,
      completedSongs: completed,
      completedSongsCount: completed.length,
      queuedSongsCount: queued.filter((s) => s.status === 'queued').length,
      profile: singerProfileFromRow(sRow),
    });
  }

  queueOrder.sort(compareQueueSingersForDisplay);

  return { activeRotation, nowPlaying, queueOrder, completedHistory, flatQueue };
}

// ---------------------------------------------------------------------------
// getSingerHistory
// ---------------------------------------------------------------------------

export async function getSingerHistory(singerId: bigint): Promise<SingerHistory | null> {
  const sRes = await query<any>(
    `SELECT id, display_name, normalized_name, status, last_sang_at, total_songs_sung,
            profile_image_source, profile_image_url, profile_image_mime,
            profile_image_focus_x, profile_image_focus_y, profile_image_crop, profile_image_updated_at
       FROM singers
      WHERE id = $1`,
    [singerId],
  );
  if (sRes.rows.length === 0) return null;
  const sRow = sRes.rows[0];

  const qRes = await query<any>(`
    SELECT q.id, q.track_id, q.singer_id, q.requested_by, q.status, q.position,
           q.key_adjustment, q.created_at, q.started_at, q.finished_at,
           t.title, t.disc_id, t.duration_ms,
           a.name AS artist
      FROM queue q
      JOIN tracks t ON t.id = q.track_id
      LEFT JOIN artists a ON a.id = t.artist_id
     WHERE q.singer_id = $1
     ORDER BY q.position, q.created_at
  `, [singerId]);

  const allSongs = qRes.rows.map(ROW_TO_QUEUE_SONG);
  const queuedSongs = allSongs.filter((s) => s.status === 'queued' || s.status === 'playing');
  const completedSongs = allSongs.filter((s) => s.status === 'done');
  const skippedSongs = allSongs.filter((s) => s.status === 'skipped');
  const removedSongs = allSongs.filter((s) => s.status === 'removed' || s.status === 'cancelled');

  return {
    singer: {
      id: String(sRow.id),
      displayName: sRow.display_name,
      normalizedName: sRow.normalized_name ?? '',
      status: sRow.status,
      totalSongsSung: Number(sRow.total_songs_sung ?? 0),
      lastSangAt: sRow.last_sang_at ? new Date(sRow.last_sang_at).toISOString() : null,
      profile: singerProfileFromRow(sRow),
    },
    queuedSongs,
    completedSongs,
    skippedSongs,
    removedSongs,
    allSongs,
  };
}

// ---------------------------------------------------------------------------
// restoreCompletedSongToQueue
// ---------------------------------------------------------------------------

/**
 * Change a queue row's status from done/skipped/removed back to 'queued'.
 * Clears finished_at. Appends it at the end of the singer's queued songs.
 * Does NOT increment totalSongsSung (that only happens on completion).
 * Caller is responsible for broadcasting.
 */
export async function restoreCompletedSongToQueue(queueId: number): Promise<boolean> {
  return setLiveQueueStatus(queueId, 'queued');
}

// ---------------------------------------------------------------------------
// reorderSingerQueue — change the order of a singer's queued songs
// ---------------------------------------------------------------------------

/**
 * Re-order a singer's queued songs according to the supplied queueId list.
 * Only touches rows that (a) belong to this singer, (b) are status='queued'.
 * Completed/removed rows are left untouched.
 * After reordering the singer's songs, positions are reassigned globally.
 */
export async function reorderSingerQueue(
  singerId: bigint,
  queueIds: number[],
): Promise<{ ok: boolean; error?: string }> {
  if (queueIds.length === 0) return { ok: true };
  if (new Set(queueIds).size !== queueIds.length) return { ok: false, error: 'Queue order contains duplicate songs' };
  return withQueueTransaction(async (client) => {
    const owned = await client.query<{ id: string; position: number }>(
      `SELECT id, position FROM queue WHERE singer_id = $1 AND status = 'queued' ORDER BY position, id FOR UPDATE`,
      [singerId],
    );
    const ownedIds = new Set(owned.rows.map((row) => Number(row.id)));
    for (const id of queueIds) {
      if (!ownedIds.has(id)) {
        return { ok: false, error: `Queue item ${id} does not belong to singer ${singerId} or is not queued` };
      }
    }
    const specified = new Set(queueIds);
    const order = [...queueIds, ...owned.rows.map((row) => Number(row.id)).filter((id) => !specified.has(id))];
    await writeQueueOrder(client, order, owned.rows.map((row) => row.position), true);
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// updateQueueItemStatus
// ---------------------------------------------------------------------------

/**
 * Update a queue item's status and rotation bookkeeping atomically.
 */
export async function updateQueueItemStatus(
  queueId: number,
  newStatus: 'queued' | 'done' | 'removed' | 'skipped',
): Promise<{ ok: boolean; error?: string }> {
  return await setLiveQueueStatus(queueId, newStatus)
    ? { ok: true }
    : { ok: false, error: 'Queue item not found' };
}
