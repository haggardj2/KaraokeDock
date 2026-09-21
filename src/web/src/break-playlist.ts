export type BreakTrack = {
  id: number
  title: string
  artist: string | null
  genre: string | null
  duration_ms: number | null
  file_path: string
}

export function optionalPlaylistId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function samePlaylistOrder(tracks: readonly BreakTrack[], ids: readonly number[]): boolean {
  return tracks.length === ids.length && tracks.every((track, index) => track.id === ids[index])
}

export function matchesBreakTrack(track: BreakTrack, search: string): boolean {
  const query = search.trim().toLowerCase().replace(/\\/g, '/')
  if (!query) return true
  return [track.title, track.artist, track.genre, track.file_path]
    .filter((value): value is string => typeof value === 'string')
    .join(' ').toLowerCase().replace(/\\/g, '/').includes(query)
}
