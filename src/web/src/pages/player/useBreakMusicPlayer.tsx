import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { API_BASE, api } from "../../api";
import { createBreakMusicPlayback, shouldRunBreakMusic } from "../../breakMusicPlayback";
import type { PlayerPlaybackState } from "../../playerPlayback";
import type { BreakMusicState, QItem } from "./helpers";

// Break music on the Player: server state, the hidden <audio> element's playback
// (crossfades, ducking during karaoke) and a once-a-second refresh while it plays.
export function useBreakMusicPlayer({
  now,
  playerState,
}: {
  now: QItem | null;
  playerState: PlayerPlaybackState;
}) {
  const [breakMusicState, setBreakMusicState] = useState<BreakMusicState>({
    paused: false,
    pauseDuringKaraoke: true,
    mutedForKaraoke: false,
    crossfadeSeconds: 3,
    volumePercent: 100,
    elapsedSec: 0,
    currentStartedAt: null,
    currentTrack: null,
  });
  const breakAudioRef = useRef<HTMLAudioElement>(null);
  const breakTimingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakPlaybackRef = useRef<ReturnType<typeof createBreakMusicPlayback> | null>(null);

  const refreshBreakMusicState = useCallback(async () => {
    try {
      const state = await api("/api/break-music/state");
      setBreakMusicState({
        paused: !!state.paused,
        pauseDuringKaraoke: state.pauseDuringKaraoke !== false,
        mutedForKaraoke: !!state.mutedForKaraoke,
        crossfadeSeconds:
          typeof state.crossfadeSeconds === "number"
            ? state.crossfadeSeconds
            : 3,
        volumePercent:
          typeof state.volumePercent === "number"
            ? Math.max(0, Math.min(100, Math.round(state.volumePercent)))
            : 100,
        elapsedSec: typeof state.elapsedSec === "number" ? state.elapsedSec : 0,
        currentStartedAt: typeof state.currentStartedAt === "string" ? state.currentStartedAt : null,
        currentTrack: state.currentTrack || null,
      });
    } catch {
      // ignore
    }
  }, []);

  useLayoutEffect(() => {
    const audio = breakAudioRef.current;
    if (!audio) return;
    if (!breakPlaybackRef.current) {
      breakPlaybackRef.current = createBreakMusicPlayback(audio);
    }
    const track = breakMusicState.currentTrack;
    void breakPlaybackRef.current.update({
      ...breakMusicState,
      src: track?.file_path ? `${API_BASE}/media/file?path=${encodeURIComponent(track.file_path)}` : "",
      karaokeActive: !!now,
    });
  }, [
    now,
    playerState,
    breakMusicState.paused,
    breakMusicState.pauseDuringKaraoke,
    breakMusicState.mutedForKaraoke,
    breakMusicState.crossfadeSeconds,
    breakMusicState.volumePercent,
    breakMusicState.elapsedSec,
    breakMusicState.currentStartedAt,
    breakMusicState.currentTrack?.id,
    breakMusicState.currentTrack?.file_path,
  ]);

  useEffect(() => {
    if (breakTimingRef.current) {
      clearInterval(breakTimingRef.current);
      breakTimingRef.current = null;
    }
    if (!shouldRunBreakMusic({
      ...breakMusicState,
      src: breakMusicState.currentTrack?.file_path || "",
      karaokeActive: !!now,
    }))
      return;

    breakTimingRef.current = setInterval(() => {
      refreshBreakMusicState().catch(() => {});
    }, 1000);

    return () => {
      if (breakTimingRef.current) {
        clearInterval(breakTimingRef.current);
        breakTimingRef.current = null;
      }
    };
  }, [
    breakMusicState.currentTrack?.id,
    breakMusicState.paused,
    breakMusicState.pauseDuringKaraoke,
    breakMusicState.mutedForKaraoke,
    now,
    refreshBreakMusicState,
  ]);

  useEffect(() => {
    return () => {
      if (breakTimingRef.current) {
        clearInterval(breakTimingRef.current);
      }
      breakPlaybackRef.current?.dispose();
      breakPlaybackRef.current = null;
    };
  }, []);

  return { breakMusicState, breakAudioRef, breakPlaybackRef, refreshBreakMusicState };
}
