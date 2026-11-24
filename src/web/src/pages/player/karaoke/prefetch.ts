import { API_BASE } from "../../../api";

// The server keeps a prepared song for hours; re-check after a while in case it was evicted.
const PREFETCH_REFRESH_MS = 20 * 60 * 1000;
const prefetchedAt = new Map<string, number>();

/** Asks the server to prepare a queued KaraFun song at its key (best effort). */
export function prefetchKarafunSong(songId: number, key = 0): void {
  const id = `${songId}:${key}`;
  const last = prefetchedAt.get(id);
  if (last != null && Date.now() - last < PREFETCH_REFRESH_MS) return;
  prefetchedAt.set(id, Date.now());
  void fetch(`${API_BASE}/api/karafun/prepared/${songId}?key=${key}`)
    .then((response) => response.body?.cancel())
    .catch(() => prefetchedAt.delete(id));
}
