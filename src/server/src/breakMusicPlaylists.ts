import type { PoolClient } from 'pg';
import { query, withTransaction } from './db.js';

export type BreakMusicTrackRow = {
  id: number;
  title: string;
  artist: string | null;
  genre: string | null;
  duration_ms: number | null;
  file_path: string;
};

export function rotateBreakPlaylistToFront<T>(tracks: T[], index: number): T[] {
  if (index <= 0 || index >= tracks.length) return tracks;
  return [...tracks.slice(index), ...tracks.slice(0, index)];
}

export function isPositiveTrackId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function validateBreakTrackIds(value: unknown, allowEmpty = false): number[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || !value.every(isPositiveTrackId)) {
    throw Object.assign(new Error('trackIds must be an array of positive safe integers' + (allowEmpty ? '' : ' with at least one track')), { status: 400 });
  }
  return value;
}

export async function getOrderedBreakTracks(trackIds: number[], client?: PoolClient): Promise<BreakMusicTrackRow[]> {
  if (!trackIds.length) return [];
  const sql = `SELECT t.id, t.title, t.artist, t.genre, t.duration_ms, t.file_path
       FROM unnest($1::bigint[]) WITH ORDINALITY AS requested(id, position)
       JOIN break_music_tracks t ON t.id = requested.id
      ORDER BY requested.position
      ${client ? 'FOR KEY SHARE OF t' : ''}`;
  const result = client
    ? await client.query<BreakMusicTrackRow>(sql, [trackIds])
    : await query<BreakMusicTrackRow>(sql, [trackIds]);
  return result.rows;
}

export async function saveBreakMusicPlaylist(name: string, trackIds: number[]) {
  validateBreakTrackIds(trackIds);
  return withTransaction(async (client) => {
    const tracks = await getOrderedBreakTracks(trackIds, client);
    if (tracks.length !== trackIds.length) {
      throw Object.assign(new Error('One or more tracks no longer exist. Refresh the break music library and retry.'), { status: 400 });
    }
    const playlist = await client.query<{ id: number }>(
      `INSERT INTO break_music_playlists(name) VALUES($1)
       ON CONFLICT (name) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [name]
    );
    const playlistId = playlist.rows[0].id;
    await client.query('DELETE FROM break_music_playlist_tracks WHERE playlist_id = $1', [playlistId]);
    await client.query(
      `INSERT INTO break_music_playlist_tracks(playlist_id, track_id, position)
       SELECT $1, id, position - 1
         FROM unnest($2::int[]) WITH ORDINALITY AS requested(id, position)`,
      [playlistId, trackIds]
    );
    return { playlistId, tracks };
  });
}
