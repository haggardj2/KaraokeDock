import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../../api";
import "./KarafunStage.css";

type Syllable = { start: number; end: number; text: string };
type LyricLine = { start: number; end: number; words: Array<{ syllables: Syllable[] }> };

type KaraFunManifest = {
  songId: number;
  md5: string;
  durationSec: number;
  tracks: Array<{
    type: number;
    name: string;
    role: string;
    mime: string;
    size: number;
  }>;
  images: Array<{ type: number; name: string; mime: string; size: number }>;
  imageType: number | null;
  lyrics: { durationSec: number; lines: LyricLine[] };
};

export type KarafunStageProps = {
  songId: number;
  /** Host pause state. When true, all KaraFun audio is paused. */
  paused?: boolean;
  /** Position to resume from (e.g. after the Player page reloads mid-song). */
  startAtSec?: number;
  /** Awaited before audio starts, e.g. to fade out break music. */
  beforePlay?: () => Promise<void>;
  onTime?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
  className?: string;
};

// Tracks drift apart slightly; re-seeking too often causes audible glitches.
const RESYNC_THRESHOLD_SEC = 0.2;
const RESYNC_INTERVAL_MS = 1000;
// A line is shown this long before it is sung, and kept briefly after it ends.
const LINE_LEAD_IN_SEC = 5;
const LINE_HOLD_SEC = 0.4;
// audio.currentTime can advance in coarse steps; frames in between are interpolated.
const MAX_INTERPOLATION_SEC = 0.5;
// Autoplay is allowed for muted media; unmute once playback has started (as the video path does).
const UNMUTE_DELAY_MS = 100;

type RenderedSyllable = { el: HTMLSpanElement; start: number; end: number; progress: number };
type RowState = { lineIndex: number; syllables: RenderedSyllable[] };

function mediaDuration(audio: HTMLAudioElement | null, fallback: number): number {
  const value = audio?.duration ?? Number.NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function buildLine(line: LyricLine): { el: HTMLDivElement; syllables: RenderedSyllable[] } {
  const el = document.createElement("div");
  el.className = "kf-line";
  const syllables: RenderedSyllable[] = [];
  line.words.forEach((word, wordIndex) => {
    if (wordIndex > 0) el.appendChild(document.createTextNode(" "));
    for (const syllable of word.syllables) {
      const span = document.createElement("span");
      span.className = "kf-syl";
      span.textContent = syllable.text;
      span.style.setProperty("--p", "0");
      el.appendChild(span);
      syllables.push({ el: span, start: syllable.start, end: syllable.end, progress: 0 });
    }
  });
  return { el, syllables };
}

/** Swap a row's line with a cross-fade: the old line fades out while the new one fades in. */
function replaceRowLine(row: HTMLDivElement, next: HTMLDivElement | null): void {
  for (const child of Array.from(row.children)) {
    if (child.classList.contains("kf-leaving")) continue;
    child.classList.add("kf-leaving");
    child.addEventListener("animationend", () => child.remove(), { once: true });
  }
  if (next) row.appendChild(next);
}

/**
 * KaraFun-only playback stage: background image, mixed audio and timed lyrics.
 *
 * It fetches the progressive manifest (tracks + lyrics) and lets native <audio>
 * elements stream the reconstructed Ogg tracks from the server while the kit
 * is still downloading. It is mounted only for queue items with
 * source === "karafun"; local/Karaoke Nerds/YouTube playback keeps using the
 * existing <video>/iframe path. The Host controls playback, so there are no
 * on-screen controls apart from a Play button when the browser blocks autoplay.
 */
export default function KarafunStage({
  songId,
  paused = false,
  startAtSec = 0,
  beforePlay,
  onTime,
  onEnded,
  onError,
  className = "",
}: KarafunStageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const tracksRef = useRef<HTMLAudioElement[]>([]);
  const masterRef = useRef<HTMLAudioElement | null>(null);
  const linesRef = useRef<LyricLine[]>([]);
  const rowElsRef = useRef<Array<HTMLDivElement | null>>([null, null]);
  const rowStatesRef = useRef<RowState[]>([
    { lineIndex: -1, syllables: [] },
    { lineIndex: -1, syllables: [] },
  ]);
  const clockRef = useRef({ mediaTime: -1, at: 0 });
  const durationRef = useRef(0);
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const lastReportRef = useRef(0);
  const lastResyncRef = useRef(0);
  const endedRef = useRef(false);
  const onTimeRef = useRef(onTime);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const beforePlayRef = useRef(beforePlay);
  const pausedRef = useRef(paused);
  const playRevisionRef = useRef(0);

  useEffect(() => {
    onTimeRef.current = onTime;
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
    beforePlayRef.current = beforePlay;
  }, [onTime, onEnded, onError, beforePlay]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!ready || error) return;
    if (paused) pauseAll();
    else void playAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, ready, error]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setReady(false);
    setBlocked(false);
    endedRef.current = false;
    lastReportRef.current = 0;
    durationRef.current = 0;
    clockRef.current = { mediaTime: -1, at: 0 };

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      setLoading(false);
      pauseAll();
      onErrorRef.current?.(message);
    };

    const cleanupTracks = () => {
      for (const audio of tracksRef.current) {
        try {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        } catch {
          // Ignore cleanup failures.
        }
      }
      tracksRef.current = [];
      masterRef.current = null;
    };

    const handleEnded = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      const total = mediaDuration(masterRef.current, durationRef.current);
      onTimeRef.current?.(total, total);
      onEndedRef.current?.();
    };

    const tick = () => {
      if (cancelled) return;
      const master = masterRef.current;
      if (master && !master.paused) {
        const mediaTime = master.currentTime;
        const now = performance.now();
        const total = mediaDuration(master, durationRef.current);
        if (now - lastResyncRef.current >= RESYNC_INTERVAL_MS) {
          lastResyncRef.current = now;
          for (const audio of tracksRef.current) {
            if (audio !== master && Math.abs(audio.currentTime - mediaTime) > RESYNC_THRESHOLD_SEC) {
              audio.currentTime = mediaTime;
            }
          }
        }
        renderLyrics(smoothTime(mediaTime, now, master.playbackRate));
        if (lastReportRef.current === 0 || now - lastReportRef.current >= 1000) {
          lastReportRef.current = now;
          onTimeRef.current?.(mediaTime, total);
        }
      } else {
        clockRef.current.mediaTime = -1;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/karafun/manifest/${songId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const message = (await response.text()).trim();
          throw new Error(message || `KaraFun manifest failed: HTTP ${response.status}`);
        }
        const manifest = (await response.json()) as KaraFunManifest;
        if (cancelled) return;

        const lyrics = manifest.lyrics;
        linesRef.current = lyrics?.lines ?? [];
        durationRef.current = manifest.durationSec || lyrics?.durationSec || 0;

        const probe = document.createElement("audio");
        if (!probe.canPlayType('audio/ogg; codecs="vorbis"')) {
          throw new Error("This browser cannot play KaraFun's Ogg Vorbis audio.");
        }
        if (!manifest.tracks?.length) throw new Error("KaraFun kit has no audio tracks.");

        const order: Record<string, number> = { instrumental: 0, backing: 1, lead: 2 };
        const tracks: HTMLAudioElement[] = [...manifest.tracks]
          .sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9))
          .map((track) => {
            const audio = new Audio();
            audio.src = `${API_BASE}/api/karafun/audio/${songId}/${track.type}`;
            audio.preload = "auto";
            audio.volume = track.role === "lead" ? 0 : track.role === "backing" ? 0.7 : 1;
            audio.addEventListener("error", () => {
              fail(`KaraFun audio failed to load (${track.role || track.name})`);
            });
            return audio;
          });

        tracksRef.current = tracks;
        masterRef.current = tracks[0] ?? null;
        masterRef.current?.addEventListener("ended", handleEnded);
        if (startAtSec > 0) {
          for (const audio of tracks) audio.currentTime = startAtSec;
        }

        if (manifest.imageType != null && backgroundRef.current) {
          backgroundRef.current.style.backgroundImage =
            `url("${API_BASE}/api/karafun/image/${songId}/${manifest.imageType}")`;
        }

        setReady(true);
        setLoading(false);
        renderLyrics(startAtSec);
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        fail(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      playRevisionRef.current += 1;
      controller.abort();
      cancelAnimationFrame(rafRef.current);
      cleanupTracks();
      if (backgroundRef.current) backgroundRef.current.style.backgroundImage = "";
      rowElsRef.current.forEach((row) => row?.replaceChildren());
      rowStatesRef.current = [
        { lineIndex: -1, syllables: [] },
        { lineIndex: -1, syllables: [] },
      ];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  /** Media time advanced smoothly between the audio element's currentTime updates. */
  function smoothTime(mediaTime: number, now: number, rate: number): number {
    const clock = clockRef.current;
    if (mediaTime !== clock.mediaTime) {
      clock.mediaTime = mediaTime;
      clock.at = now;
      return mediaTime;
    }
    const elapsed = ((now - clock.at) / 1000) * (rate || 1);
    return mediaTime + Math.min(elapsed, MAX_INTERPOLATION_SEC);
  }

  // Two alternating rows, as on a karaoke screen: line N is shown in row N % 2. When a
  // line has been sung, its row cross-fades to the line after next while the other row
  // keeps the line being sung, so nothing jumps.
  function renderLyrics(time: number): void {
    const lines = linesRef.current;
    if (lines.length === 0) return;

    let current = lines.findIndex((line) => line.end + LINE_HOLD_SEC > time);
    if (current === -1) current = lines.length;

    const wanted: [number, number] = [-1, -1];
    for (const index of [current, current + 1]) {
      if (index >= lines.length) continue;
      if (lines[index].start - time > LINE_LEAD_IN_SEC) continue;
      wanted[index % 2] = index;
    }

    for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
      const row = rowElsRef.current[rowIndex];
      const state = rowStatesRef.current[rowIndex];
      if (!row) continue;
      if (state.lineIndex !== wanted[rowIndex]) {
        const built = wanted[rowIndex] >= 0 ? buildLine(lines[wanted[rowIndex]]) : null;
        replaceRowLine(row, built?.el ?? null);
        rowStatesRef.current[rowIndex] = {
          lineIndex: wanted[rowIndex],
          syllables: built?.syllables ?? [],
        };
      }
      for (const syllable of rowStatesRef.current[rowIndex].syllables) {
        const length = Math.max(0.05, syllable.end - syllable.start);
        const progress = Math.min(1, Math.max(0, (time - syllable.start) / length));
        if (Math.abs(progress - syllable.progress) < 0.004) continue;
        syllable.progress = progress;
        syllable.el.style.setProperty("--p", progress.toFixed(3));
      }
    }
  }

  async function playAll(): Promise<void> {
    const revision = ++playRevisionRef.current;
    const isStale = () => revision !== playRevisionRef.current || pausedRef.current;
    if (beforePlayRef.current) {
      await beforePlayRef.current();
      if (isStale()) return;
    }
    const tracks = tracksRef.current;
    const master = masterRef.current;
    if (!master) return;
    const target = master.currentTime;
    for (const audio of tracks) {
      if (audio !== master && Math.abs(audio.currentTime - target) > 0.05) {
        audio.currentTime = target;
      }
    }
    const stop = () => {
      for (const audio of tracks) audio.pause();
    };
    try {
      for (const audio of tracks) audio.muted = true;
      await Promise.all(tracks.map((audio) => audio.play()));
      if (isStale()) return stop();
      await new Promise((resolve) => setTimeout(resolve, UNMUTE_DELAY_MS));
      if (isStale()) return stop();
      for (const audio of tracks) audio.muted = false;
      setBlocked(false);
    } catch {
      if (revision !== playRevisionRef.current) return;
      stop();
      for (const audio of tracks) audio.muted = false;
      setBlocked(!pausedRef.current);
    }
  }

  function pauseAll(): void {
    playRevisionRef.current += 1;
    for (const audio of tracksRef.current) audio.pause();
  }

  return (
    <div className={`karafun-stage ${className}`.trim()}>
      <div className="kf-background" ref={backgroundRef} />

      <div className="kf-lyrics">
        <div className="kf-row" ref={(el) => { rowElsRef.current[0] = el; }} />
        <div className="kf-row" ref={(el) => { rowElsRef.current[1] = el; }} />
      </div>

      {loading && <div className="kf-overlay">Loading song…</div>}
      {error && <div className="kf-overlay kf-error">{error}</div>}
      {blocked && !error && !loading && (
        <button
          type="button"
          aria-label="Start playback"
          className="play-button-overlay"
          onClick={() => void playAll()}
        >
          <div className="play-icon" />
        </button>
      )}
    </div>
  );
}
