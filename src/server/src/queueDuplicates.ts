import { query } from './db.js';

// Finds whether another singer already has the same song waiting, in any version: a
// local disc, a Karaoke Nerds video or KaraFun all count, matched by title and artist.

/** Title and artist reduced to what identifies the song across sources and brands. */
export function songMatchKey(title: string | null | undefined, artist: string | null | undefined): string {
  const cleanTitle = String(title ?? '')
    .toLowerCase()
    // "(Karaoke Version)", "[Explicit]", "(In the Style of …)" and similar tags.
    .replace(/[([][^)\]]*[)\]]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, '');
  const cleanArtist = String(artist ?? '')
    .toLowerCase()
    .trim()
    .replace(/^(.+),\s*(a|an|the)$/, '$2 $1')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, '');
  return `${cleanTitle}|${cleanArtist}`;
}

function sameRequester(name: string | null | undefined, other: string | null | undefined): boolean {
  const normalize = (value: string | null | undefined) =>
    String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  return !!normalize(name) && normalize(name) === normalize(other);
}

/** True when a singer other than the requester has this song queued or playing. */
export async function isSongQueuedByOtherSinger(
  trackId: number,
  requester: { singerId: string | number | bigint | null; requestedBy: string | null },
): Promise<boolean> {
  const requested = await query<{ title: string | null; artist: string | null }>(
    `SELECT t.title, a.name AS artist
       FROM tracks t
       LEFT JOIN artists a ON a.id = t.artist_id
      WHERE t.id = $1`,
    [trackId],
  );
  if (requested.rows.length === 0) return false;
  const key = songMatchKey(requested.rows[0].title, requested.rows[0].artist);
  if (key.startsWith('|')) return false;

  const active = await query<{
    title: string | null;
    artist: string | null;
    singer_id: string | null;
    requested_by: string | null;
  }>(
    `SELECT t.title, a.name AS artist, q.singer_id, q.requested_by
       FROM queue q
       JOIN tracks t ON t.id = q.track_id
       LEFT JOIN artists a ON a.id = t.artist_id
      WHERE q.status IN ('queued', 'playing')`,
  );
  const singerId = requester.singerId == null ? null : String(requester.singerId);
  return active.rows.some((row) => {
    if (songMatchKey(row.title, row.artist) !== key) return false;
    if (singerId && row.singer_id != null) return String(row.singer_id) !== singerId;
    return !sameRequester(requester.requestedBy, row.requested_by);
  });
}
