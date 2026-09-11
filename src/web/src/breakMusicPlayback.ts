export type BreakMusicPlayback = {
  src: string;
  elapsedSec: number;
  paused: boolean;
  pauseDuringKaraoke: boolean;
  mutedForKaraoke: boolean;
  karaokeActive: boolean;
  volumePercent: number;
  crossfadeSeconds: number;
};

type BreakAudio = Pick<HTMLAudioElement,
  "src" | "currentTime" | "volume" | "muted" | "paused" | "play" | "pause" |
  "load" | "addEventListener" | "removeEventListener"
>;

export function shouldRunBreakMusic(state: Pick<BreakMusicPlayback,
  "src" | "paused" | "karaokeActive" | "pauseDuringKaraoke" | "mutedForKaraoke"
>) {
  return !!state.src && !state.paused &&
    (!(state.karaokeActive || state.mutedForKaraoke) || !state.pauseDuringKaraoke);
}

export function createBreakMusicPlayback(audio: BreakAudio) {
  let state: BreakMusicPlayback | null = null;
  let revision = 0;
  let source = "";
  let mustMute = true;
  let karaokeMuteHeld = false;
  let disposed = false;
  let seekPosition: number | null = null;
  let fadeTimer: ReturnType<typeof setInterval> | null = null;
  let fadeTarget: number | null = null;
  let preparation: Promise<void> | null = null;
  let finishPreparation: (() => void) | null = null;

  const settlePreparation = () => {
    const finish = finishPreparation;
    preparation = null;
    finishPreparation = null;
    finish?.();
  };

  const cancelFade = () => {
    if (fadeTimer) clearInterval(fadeTimer);
    fadeTimer = null;
    fadeTarget = null;
  };

  const silence = () => {
    mustMute = true;
    cancelFade();
    audio.muted = true;
    audio.volume = 0;
    settlePreparation();
  };

  const seek = () => {
    if (seekPosition == null) return;
    try {
      audio.currentTime = seekPosition;
      seekPosition = null;
    } catch {
      // A newly loaded track may not accept a seek until metadata arrives.
    }
  };
  audio.addEventListener("loadedmetadata", seek);

  const fadeTo = (target: number, duration: number, onComplete?: () => void) => {
    if (mustMute || disposed) return;
    if (fadeTimer && fadeTarget === target) return;
    cancelFade();
    const start = audio.volume;
    if (duration <= 0 || Math.abs(start - target) < 0.001) {
      audio.volume = target;
      onComplete?.();
      return;
    }
    fadeTarget = target;
    const steps = Math.max(1, Math.ceil(duration * 10));
    let step = 0;
    fadeTimer = setInterval(() => {
      if (mustMute || disposed) {
        silence();
        return;
      }
      audio.volume = start + (target - start) * Math.min(1, ++step / steps);
      if (step >= steps) {
        cancelFade();
        onComplete?.();
      }
    }, 100);
  };

  const prepareForKaraoke = (hold = true): Promise<void> => {
    if (hold) karaokeMuteHeld = true;
    if (preparation) return preparation;
    revision += 1;
    if (disposed || state?.pauseDuringKaraoke !== false || audio.paused ||
        audio.muted || audio.volume <= 0 || state.crossfadeSeconds <= 0) {
      silence();
      if (state?.pauseDuringKaraoke) audio.pause();
      return Promise.resolve();
    }
    cancelFade();
    mustMute = false;
    const pending = new Promise<void>((resolve) => { finishPreparation = resolve; });
    preparation = pending;
    fadeTo(0, state.crossfadeSeconds, () => {
      silence();
      if (state?.paused || state?.pauseDuringKaraoke) audio.pause();
    });
    return pending;
  };

  return {
    prepareForKaraoke,
    isPreparingForKaraoke: () => preparation !== null,
    // Called before React commits singer playback, not after a pending fade/play.
    muteForKaraoke() {
      karaokeMuteHeld = true;
      silence();
      if (state?.pauseDuringKaraoke) audio.pause();
    },
    confirmKaraokeActive(active: boolean) {
      karaokeMuteHeld = active;
      if (active) {
        void prepareForKaraoke();
      } else if (preparation) {
        cancelFade();
        settlePreparation();
      }
    },
    async update(next: BreakMusicPlayback) {
      if (disposed) return;
      revision += 1;
      // Only a fresh queue snapshot can release the immediate WebSocket mute.
      // An older break-music response may still describe the inter-song gap.
      next = { ...next, karaokeActive: next.karaokeActive || karaokeMuteHeld };
      state = next;
      if (next.karaokeActive || next.mutedForKaraoke) {
        void prepareForKaraoke(false);
        if (preparation) {
          if (next.paused) {
            silence();
            audio.pause();
          }
          return;
        }
      } else if (preparation) {
        cancelFade();
        settlePreparation();
      }
      const currentRevision = revision;
      mustMute = next.karaokeActive || next.mutedForKaraoke;
      const shouldRun = shouldRunBreakMusic(next);
      if (mustMute) silence();
      const isCurrent = () => !disposed && currentRevision === revision;
      const target = Math.max(0, Math.min(1, next.volumePercent / 100));
      const fadeDuration = Math.max(0, next.crossfadeSeconds);

      if (!shouldRun) {
        // Reload paused break tracks on resume to recover browser-suspended audio.
        source = "";
        if (mustMute) {
          audio.pause();
        } else {
          fadeTo(0, fadeDuration, () => {
            if (state && !shouldRunBreakMusic(state)) audio.pause();
          });
        }
        return;
      }

      const changedSource = source !== next.src;
      if (changedSource) {
        cancelFade();
        audio.src = next.src;
        audio.load();
        source = next.src;
      }
      if (changedSource || Math.abs(audio.currentTime - next.elapsedSec) > 2) {
        seekPosition = Math.max(0, next.elapsedSec);
        seek();
      }

      try {
        if (changedSource || audio.paused) {
          audio.volume = 0;
          audio.muted = true;
          await audio.play();
        }
        if (!isCurrent()) return;
        if (mustMute) {
          silence();
          if (state && !shouldRunBreakMusic(state)) audio.pause();
          return;
        }
        audio.muted = false;
        fadeTo(target, fadeDuration);
      } catch {
        // Never unmute a rejected, stale play attempt over an active singer.
        if (isCurrent() && !mustMute) audio.muted = false;
      }
    },
    dispose() {
      disposed = true;
      revision += 1;
      silence();
      audio.pause();
      audio.removeEventListener("loadedmetadata", seek);
    },
  };
}
