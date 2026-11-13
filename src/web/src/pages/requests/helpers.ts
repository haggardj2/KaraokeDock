// Pure helpers for the Request page: grouping, ordering, formatting and the singer's device id.
import type { CombinedSearchTrack, MyQueueItem, SearchRow } from './types'

export const VENUE_THEME_CACHE_KEY = "karaokedock.venueTheme";
export const MIN_KEY_ADJUSTMENT = -6;
export const MAX_KEY_ADJUSTMENT = 6;
export const MOBILE_BREAKPOINT = 640;
export const BROWSE_LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
export const SINGER_UUID_STORAGE_KEY = "karaoke-singer-uuid";

export function formatCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function normalizeMyQueueItems(items: unknown): MyQueueItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as {
        id?: unknown;
        title?: unknown;
        artist?: unknown;
        status?: unknown;
      };
      const id = Number(row.id);
      if (!Number.isFinite(id)) return null;
      return {
        id,
        title: typeof row.title === "string" ? row.title : null,
        artist: typeof row.artist === "string" ? row.artist : null,
        status: typeof row.status === "string" ? row.status : "",
      };
    })
    .filter((item): item is MyQueueItem => item !== null);
}

export function reorderQueuedItems(
  items: MyQueueItem[],
  draggedId: number,
  targetId: number,
): { items: MyQueueItem[]; queuedIds: number[] } | null {
  if (draggedId === targetId) return null;
  const queued = items.filter((item) => item.status === "queued");
  const fromIdx = queued.findIndex((item) => item.id === draggedId);
  const toIdx = queued.findIndex((item) => item.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return null;

  const reordered = [...queued];
  reordered.splice(toIdx, 0, reordered.splice(fromIdx, 1)[0]);
  const queuedIds = reordered.map((item) => item.id);
  const nextQueued = [...reordered];
  const nextItems = items.map((item) =>
    item.status === "queued" ? nextQueued.shift()! : item,
  );
  return { items: nextItems, queuedIds };
}

export function shouldHandleEnterKey(
  event: React.KeyboardEvent<HTMLInputElement>,
): boolean {
  const nativeEvent = event.nativeEvent as KeyboardEvent & {
    isComposing?: boolean;
  };
  return event.key === "Enter" && !nativeEvent.isComposing;
}

export function normalizeArtistForGroup(artist: string): string {
  const trimmed = artist.trim();
  const inverted = trimmed.replace(
    /^(.+),\s*(a|an|the)$/i,
    (_, name, article) => `${article} ${name}`.toLowerCase(),
  );
  return inverted.toLowerCase();
}

export function groupKey(title: string, artist: string): string {
  return `${title.toLowerCase().trim()}|${normalizeArtistForGroup(artist)}`;
}

export function searchRelevance(
  query: string,
  title: string,
  artist: string,
): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;

  const normalizedTitle = title.trim().toLowerCase();
  const normalizedArtist = artist.trim().toLowerCase();
  const combined = `${normalizedArtist} ${normalizedTitle}`.trim();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  if (normalizedTitle === normalizedQuery) return 0;
  if (normalizedArtist === normalizedQuery) return 1;
  if (combined === normalizedQuery) return 2;
  if (normalizedTitle.startsWith(normalizedQuery)) return 3;
  if (normalizedArtist.startsWith(normalizedQuery)) return 4;
  if (normalizedTitle.includes(normalizedQuery)) return 5;
  if (normalizedArtist.includes(normalizedQuery)) return 6;
  if (combined.includes(normalizedQuery)) return 7;
  if (tokens.every((token) => combined.includes(token))) return 8;
  return 9;
}

export function formatTrackKind(kind: string | null | undefined): string {
  if (kind === "mp4") return "Video";
  if (kind === "cdgmp3") return "CDG";
  return kind?.toUpperCase() ?? "";
}

export function createSingerUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (Math.random() * 16) >> (Number(char) / 4)
    ).toString(16),
  );
}

export function getOrCreateSingerUuid(): string {
  const existing = localStorage.getItem(SINGER_UUID_STORAGE_KEY);
  if (existing) return existing;
  const next = createSingerUuid();
  localStorage.setItem(SINGER_UUID_STORAGE_KEY, next);
  return next;
}

// A local library row in the shape the combined search list, browse list and version sheet use.
export function toLocalSearchTrack(row: SearchRow): CombinedSearchTrack {
  return {
    type: "local",
    key: `local-${row.id}`,
    title: row.title ?? "",
    artist: row.artist ?? "",
    discId: row.disc_id,
    kind: row.kind,
    track: row,
  };
}
