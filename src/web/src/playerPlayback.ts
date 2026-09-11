export type PlayerPlaybackState = {
  manualStop: boolean;
  queueId: number | null;
  paused: boolean;
  positionSec: number;
};

export const DEFAULT_PLAYER_PLAYBACK_STATE: PlayerPlaybackState = {
  manualStop: false,
  queueId: null,
  paused: false,
  positionSec: 0,
};

export function normalizePlayerPlaybackState(
  value: Partial<PlayerPlaybackState>,
  previous = DEFAULT_PLAYER_PLAYBACK_STATE,
): PlayerPlaybackState {
  const queueId = value.queueId === undefined ? previous.queueId : value.queueId;
  return {
    manualStop: typeof value.manualStop === "boolean" ? value.manualStop : previous.manualStop,
    queueId: queueId != null && Number.isFinite(Number(queueId)) && Number(queueId) > 0
      ? Number(queueId) : null,
    paused: typeof value.paused === "boolean" ? value.paused : previous.paused,
    positionSec: typeof value.positionSec === "number" && Number.isFinite(value.positionSec)
      ? Math.max(0, value.positionSec) : previous.positionSec,
  };
}

export function isSingerPaused(state: PlayerPlaybackState, queueId: number | string | null | undefined) {
  return queueId != null && String(state.queueId) === String(queueId) && state.paused;
}

export function singerPlaybackAction(state: PlayerPlaybackState, queueId: number | string | null | undefined) {
  return queueId == null ? "play" : isSingerPaused(state, queueId) ? "resume" : "pause";
}

export function getSingerDisplaySong<T extends { status: string }>(singer: { queuedSongs: T[]; nextSong: T | null }): T | null {
  return singer.queuedSongs.find((song) => song.status === "playing") ?? singer.nextSong;
}

export function canReportSingerTiming(
  state: PlayerPlaybackState,
  activeQueueId: number | string | null,
  queueId: number | string,
) {
  return String(activeQueueId) === String(queueId) && !isSingerPaused(state, queueId);
}

export function restoreSingerPosition(
  media: Pick<HTMLMediaElement, "currentTime" | "addEventListener" | "removeEventListener">,
  positionSec: number,
) {
  let pending = Math.max(0, positionSec);
  const restore = () => {
    if (pending <= 0) return;
    try {
      media.currentTime = pending;
      pending = 0;
    } catch {
      // CDG/transcoded streams may need metadata before accepting a seek.
    }
  };
  media.addEventListener("loadedmetadata", restore);
  restore();
  return () => media.removeEventListener("loadedmetadata", restore);
}

type SingerIframe = {
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
};

export function controlSingerIframe(
  player: SingerIframe,
  state: PlayerPlaybackState,
  queueId: number | string,
  restorePosition = false,
) {
  if (restorePosition && String(state.queueId) === String(queueId) && state.positionSec > 0) {
    player.seekTo(state.positionSec, true);
  }
  if (isSingerPaused(state, queueId)) player.pauseVideo();
  else player.playVideo();
}

export async function prepareSingerIframe(
  player: SingerIframe,
  queueId: number | string,
  getState: () => PlayerPlaybackState,
  isCurrent: () => boolean,
  beforePlay: () => Promise<void>,
  restorePosition = false,
) {
  if (!isCurrent()) return;
  if (!isSingerPaused(getState(), queueId)) await beforePlay();
  if (!isCurrent()) return;
  controlSingerIframe(player, getState(), queueId, restorePosition);
}

type PlayableMedia = Pick<HTMLMediaElement, "play" | "pause" | "muted">;

// Both the play promise and the autoplay unmute delay can outlive a Host command.
export async function playSingerMedia(
  media: PlayableMedia,
  isCurrent: () => boolean,
  isPaused: () => boolean,
  unmuteDelayMs = 100,
  beforePlay?: () => Promise<void>,
): Promise<"playing" | "paused" | "stale" | "blocked"> {
  if (!isCurrent()) return "stale";
  if (isPaused()) {
    media.pause();
    return "paused";
  }
  if (beforePlay) {
    await beforePlay();
    if (!isCurrent()) return "stale";
    if (isPaused()) {
      media.pause();
      return "paused";
    }
  }
  try {
    media.muted = true;
    await media.play();
    if (!isCurrent()) return "stale";
    if (isPaused()) {
      media.pause();
      return "paused";
    }
    if (unmuteDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, unmuteDelayMs));
    }
    if (!isCurrent()) return "stale";
    if (isPaused()) {
      media.pause();
      return "paused";
    }
    media.muted = false;
    return "playing";
  } catch {
    if (!isCurrent()) return "stale";
    if (isPaused()) {
      media.pause();
      return "paused";
    }
    media.muted = false;
    return "blocked";
  }
}
