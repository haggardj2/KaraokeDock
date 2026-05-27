// server/src/singerStats.ts
// Shared helper for recalculating singer stats from the authoritative
// done-song count in the queue table.

import { query } from './db.js';

/**
 * Recalculate and persist singer stats (total_songs_sung, last_sang_at) for
 * the given singer by counting their actual done rows in the queue table.
 *
 * Using a COUNT-based recalculation instead of incrementing avoids
 * double-counting when multiple code paths (player/next, autoplay, manual
 * status changes) all mark songs as done.
 *
 * Edge case: when a singer has no done songs (e.g. all songs restored to
 * queued), total_songs_sung will be set to 0 and last_sang_at will be NULL.
 */
export async function recalculateSingerStats(singerId: string): Promise<void> {
  const countRes = await query<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt FROM queue WHERE singer_id = $1 AND status = 'done'`,
    [singerId],
  );
  const totalSungCount = countRes.rows[0]?.cnt ?? 0;

  await query(
    `UPDATE singers
        SET total_songs_sung = $1,
            last_sang_at = (
              SELECT MAX(finished_at)
                FROM queue
               WHERE singer_id = $2
                 AND status = 'done'
            )
      WHERE id = $2`,
    [totalSungCount, singerId],
  );

  await query(
    `UPDATE rotation_singers rs
        SET total_songs_sung = $1,
            last_sang_at = (
              SELECT MAX(finished_at)
                FROM queue
               WHERE singer_id = $2
                 AND status = 'done'
            )
       FROM rotations rot
      WHERE rs.singer_id = $2
        AND rs.rotation_id = rot.id
        AND rot.status = 'active'`,
    [totalSungCount, singerId],
  );
}
