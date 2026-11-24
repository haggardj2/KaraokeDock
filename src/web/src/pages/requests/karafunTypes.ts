/** Pure KaraFun result types/helpers, safe to unit test without the API module. */

export type KarafunTrack = {
  source: "karafun";
  songId: number;
  title: string;
  artist: string;
  year?: number;
  durationMs?: number;
  imageId?: string;
  imageUrl?: string;
  content?: string;
  meta?: string;
  brand: "KaraFun";
};

export function isKarafunTrack(value: unknown): value is KarafunTrack {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as KarafunTrack).source === "karafun",
  );
}

export function toKarafunCombinedTrack(track: KarafunTrack) {
  return {
    type: "karafun" as const,
    key: `karafun-${track.songId}`,
    title: track.title,
    artist: track.artist,
    brand: track.brand,
    track,
  };
}
