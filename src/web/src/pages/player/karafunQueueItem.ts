// KaraFun queue items are tracks with source "karafun" and external_url "karafun:<songId>".
// They play in KaraokeEngineStage (or KarafunStage) instead of the <video>/YouTube paths.
export function getKarafunSongId(
  item: { source?: string | null; external_url?: string | null } | null | undefined,
): number | null {
  if (!item || item.source !== "karafun") return null;
  const match = /^karafun:(\d+)$/.exec(item.external_url ?? "");
  if (!match) return null;
  const songId = Number(match[1]);
  return Number.isSafeInteger(songId) && songId > 0 ? songId : null;
}

