import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../../../api";
import { isKaraokeAudioRunning } from "./audioContext";
import { KaraokeAudio } from "./audioEngine";
import { AuroraVisualizer } from "./auroraVisualizer";
import { LyricsRenderer } from "./lyricsRenderer";
import { KaraokeStreamAudio } from "./streamAudio";
import type { KaraokeManifest, KaraokeTimeline, PreparedKaraokeManifest } from "./types";
import "./KaraokeEngineStage.css";

export type KaraokeEngineStageProps = {
  songId: number;
  /** Shown in the centre while the song prepares, fading before the lyrics. */
  title?: string | null;
  artist?: string | null;
  /** Key adjustment in semitones (−6…+6), following the Host. */
  pitch?: number;
  /** Host pause state. */
  paused?: boolean;
  /** Song position to start from, e.g. after the Player page reloads mid-song. */
  startAtSec?: number;
  /** Background visualizer. Defaults to true. */
  visualizer?: boolean;
  /** Runs once the song is ready, before audio starts (fades out break music). */
  beforePlay?: () => Promise<void>;
  onTime?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
  onFatal?: (message: string) => void;
  className?: string;
};

// How long the browser may hold audio back before the stage says how to start it.
const AUDIO_BLOCKED_HINT_MS = 1500;
// The title card leaves this long before the first lyrics fade in.
const INTRO_LEAD_SEC = 0.6;

// Parts of the Player overlay that draw over the bottom of the stage.
const OVERLAY_SELECTOR = ".player-ticker, .player-qr";
const OVERLAY_MARGIN_PX = 12;

/** Height at the bottom of the stage covered by the Player's ticker and QR code. */
function measureOverlayInset(container: HTMLElement): number {
  const root = container.parentElement;
  if (!root) return 0;
  const bounds = container.getBoundingClientRect();
  let inset = 0;
  root.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR).forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.height <= 0 || rect.width <= 0 || rect.top >= bounds.bottom) return;
    inset = Math.max(inset, bounds.bottom - rect.top + OVERLAY_MARGIN_PX);
  });
  return inset;
}

/** The streamed server mix, or a whole song decoded in the browser (fallbacks). */
type StageAudio = KaraokeStreamAudio | KaraokeAudio;

function clampPitch(pitch: number): number {
  return Math.max(-6, Math.min(6, Math.round(Number(pitch) || 0)));
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const message = (await response.text()).trim();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * KaraFun songs on the Player: video and sound only. There are no on-screen controls;
 * playback starts by itself and follows the Host's pause/resume and key changes.
 */
export default function KaraokeEngineStage({
  songId,
  title,
  artist,
  pitch = 0,
  paused = false,
  startAtSec = 0,
  visualizer: showVisualizer = true,
  beforePlay,
  onTime,
  onEnded,
  onError,
  onFatal,
  className = "",
}: KaraokeEngineStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const visualizerRef = useRef<HTMLCanvasElement | null>(null);
  const lyricsRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<StageAudio | null>(null);
  const lyricsRendererRef = useRef<LyricsRenderer | null>(null);
  const lyricsContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const visualizerInstanceRef = useRef<AuroraVisualizer | null>(null);
  const rafRef = useRef(0);
  const lastReportRef = useRef(0);
  const durationRef = useRef(0);
  const endedRef = useRef(false);
  const pausedRef = useRef(paused);
  const pitchRef = useRef(clampPitch(pitch));
  /** Key already applied to the loaded audio (by the server or the browser). */
  const appliedKeyRef = useRef(0);
  const startAtRef = useRef(startAtSec);
  const callbacksRef = useRef({ beforePlay, onTime, onEnded, onError, onFatal });
  callbacksRef.current = { beforePlay, onTime, onEnded, onError, onFatal };
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  pausedRef.current = paused;

  const resize = useCallback(() => {
    const container = containerRef.current;
    const lyricsCanvas = lyricsRef.current;
    if (!container || !lyricsCanvas) return;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    lyricsCanvas.width = Math.round(width * dpr);
    lyricsCanvas.height = Math.round(height * dpr);
    lyricsCanvas.style.width = `${width}px`;
    lyricsCanvas.style.height = `${height}px`;
    const context = lyricsCanvas.getContext("2d");
    if (context) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      lyricsContextRef.current = context;
    }
    lyricsRendererRef.current?.resize(width, height);
    lyricsRendererRef.current?.setBottomInset(measureOverlayInset(container));
    visualizerInstanceRef.current?.resize(width, height);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    const controller = new AbortController();
    endedRef.current = false;
    lastReportRef.current = 0;
    durationRef.current = 0;
    setLoading(true);
    setStarted(false);
    setIntroVisible(true);
    setAudioBlocked(false);
    setError(null);

    const lyrics = new LyricsRenderer();
    lyricsRendererRef.current = lyrics;
    const visualizerCanvas = visualizerRef.current;
    const visualizer = visualizerCanvas ? new AuroraVisualizer(visualizerCanvas) : null;
    visualizerInstanceRef.current = visualizer?.available ? visualizer : null;
    let introDone = false;
    let playing = false;

    // Visuals run from the start, behind the title card, while the song prepares.
    const tick = () => {
      if (cancelled) return;
      const audio = audioRef.current;
      const context = lyricsContextRef.current;
      visualizerInstanceRef.current?.render(performance.now(), audio?.getSpectrum() ?? null);
      if (audio && context && playing) {
        const time = audio.currentTime;
        lyrics.render(context, time);
        if (!introDone && time >= lyrics.firstLyricsAt - INTRO_LEAD_SEC) {
          introDone = true;
          setIntroVisible(false);
        }
        const now = performance.now();
        if (lastReportRef.current === 0 || now - lastReportRef.current >= 1000) {
          lastReportRef.current = now;
          // Only real, audible progress reaches the Host: never a held or paused clock.
          if (time > 0.2 && audio.isPlaying && isKaraokeAudioRunning()) {
            callbacksRef.current.onTime?.(time, durationRef.current);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    resize();
    observer = new ResizeObserver(() => resize());
    if (containerRef.current) observer.observe(containerRef.current);
    // A 2D canvas the browser had to drop comes back blank with its scale reset.
    const lyricsCanvas = lyricsRef.current;
    lyricsCanvas?.addEventListener("contextrestored", resize);
    rafRef.current = requestAnimationFrame(tick);
    // Overlay settings (bar height, QR size, visibility) can change during a song.
    const overlayTimer = window.setInterval(() => {
      const container = containerRef.current;
      if (container) lyricsRendererRef.current?.setBottomInset(measureOverlayInset(container));
    }, 2000);

    const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";
    const startPosition = (duration: number) =>
      Math.max(0, Math.min(startAtRef.current || 0, duration - 1));
    const adoptAudio = <T extends StageAudio>(audio: T): T => {
      audioRef.current?.dispose();
      audioRef.current = audio;
      return audio;
    };

    void (async () => {
      try {
        // The server normally has this song mixed at its key already (it starts when
        // the song is requested) and streams it. Failing that, the whole mix is decoded
        // here, and failing that the browser mixes the tracks itself.
        let audio: StageAudio;
        let manifest: KaraokeManifest;
        let prepared: PreparedKaraokeManifest | null = null;
        try {
          prepared = await fetchJson<PreparedKaraokeManifest>(
            `${API_BASE}/api/karafun/prepared/${songId}?key=${pitchRef.current}`,
            controller.signal,
          );
        } catch (preparedError) {
          if (cancelled || isAbort(preparedError)) return;
          console.warn("KaraFun server mix unavailable, mixing in the browser:", preparedError);
        }
        if (cancelled) return;

        let streamed: KaraokeStreamAudio | null = null;
        if (prepared?.frameSec) {
          try {
            streamed = adoptAudio(
              new KaraokeStreamAudio(songId, prepared.key, prepared.frameSec, prepared.durationSec),
            );
            await streamed.load(startPosition(prepared.durationSec), controller.signal);
          } catch (streamError) {
            if (cancelled || isAbort(streamError)) return;
            console.warn("KaraFun stream unavailable, decoding the whole mix:", streamError);
            streamed = null;
          }
        }
        if (cancelled) return;

        if (streamed && prepared) {
          audio = streamed;
          manifest = prepared;
          appliedKeyRef.current = prepared.key;
        } else {
          const buffered = adoptAudio(new KaraokeAudio());
          audio = buffered;
          let decoded = false;
          if (prepared) {
            try {
              await buffered.loadPrepared(songId, prepared.key, controller.signal);
              decoded = true;
            } catch (decodeError) {
              if (cancelled || isAbort(decodeError)) return;
              console.warn("KaraFun server mix could not be decoded, mixing in the browser:", decodeError);
            }
          }
          if (decoded && prepared) {
            manifest = prepared;
            appliedKeyRef.current = prepared.key;
          } else {
            manifest = await fetchJson<KaraokeManifest>(
              `${API_BASE}/api/karafun/manifest/${songId}`,
              controller.signal,
            );
            await buffered.load(songId, manifest);
            if (cancelled) return;
            if (pitchRef.current !== 0) await buffered.setPitch(pitchRef.current);
            appliedKeyRef.current = pitchRef.current;
          }
        }
        if (cancelled) return;
        audio.setOnEnded(() => {
          if (endedRef.current) return;
          endedRef.current = true;
          const final = durationRef.current || audio.duration;
          callbacksRef.current.onTime?.(final, final);
          callbacksRef.current.onEnded?.();
        });

        const timeline: KaraokeTimeline = manifest.lyrics ?? {
          durationSec: manifest.durationSec,
          lines: [],
        };
        lyrics.setTimeline(timeline);
        durationRef.current = manifest.durationSec || timeline.durationSec || audio.duration;
        const baseColor = timeline.pages?.find((page) => page.activeColor)?.activeColor;
        if (baseColor) visualizer?.setBaseColor(baseColor);
        if (manifest.imageType != null && backgroundRef.current) {
          backgroundRef.current.style.backgroundImage =
            `url("${API_BASE}/api/karafun/image/${songId}/${manifest.imageType}")`;
        }

        resize();

        // Break music keeps playing until this point.
        await callbacksRef.current.beforePlay?.().catch(() => undefined);
        if (cancelled) return;
        const startAt = startPosition(audio.duration);
        if (startAt > 0) {
          introDone = true;
          setIntroVisible(false);
        }
        if (pausedRef.current) await audio.seek(startAt);
        else await audio.play(startAt);
        if (cancelled) return;
        playing = true;
        setLoading(false);
        setStarted(true);
      } catch (err) {
        if (cancelled || isAbort(err)) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setLoading(false);
        callbacksRef.current.onError?.(message);
        callbacksRef.current.onFatal?.(message);
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(overlayTimer);
      lyricsCanvas?.removeEventListener("contextrestored", resize);
      controller.abort();
      cancelAnimationFrame(rafRef.current);
      observer?.disconnect();
      audioRef.current?.dispose();
      audioRef.current = null;
      visualizer?.dispose();
      visualizerInstanceRef.current = null;
      lyricsRendererRef.current = null;
      lyricsContextRef.current = null;
      if (backgroundRef.current) backgroundRef.current.style.backgroundImage = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  // Host pause/resume, once the song has started.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !started) return;
    if (paused) {
      audio.pause();
    } else {
      void audio.resume().catch((err) => callbacksRef.current.onError?.(String(err)));
    }
  }, [paused, started]);

  // Host key changes after the song was loaded, relative to the key already applied.
  useEffect(() => {
    const next = clampPitch(pitch);
    pitchRef.current = next;
    const audio = audioRef.current;
    if (!audio || !started) return;
    // A streamed song switches to the server's mix at the new key; a decoded one is
    // shifted here, relative to the key it was loaded at.
    const change =
      audio instanceof KaraokeStreamAudio
        ? audio.setKey(next)
        : audio.setPitch(next - appliedKeyRef.current);
    void change.catch((err) => callbacksRef.current.onError?.(String(err)));
  }, [pitch, started]);

  // Browsers can hold audio back until the page is touched. The page-wide unlock
  // (installKaraokeAudioUnlock) starts it on any tap or key press; until then the song
  // waits at its first second and a short hint says how to start it.
  useEffect(() => {
    if (!started) return;
    let blockedSince = 0;
    const check = () => {
      const audio = audioRef.current;
      const elementBlocked = audio instanceof KaraokeStreamAudio && audio.playBlocked;
      if ((isKaraokeAudioRunning() && !elementBlocked) || pausedRef.current) {
        blockedSince = 0;
        setAudioBlocked(false);
        return;
      }
      blockedSince ||= performance.now();
      if (performance.now() - blockedSince >= AUDIO_BLOCKED_HINT_MS) setAudioBlocked(true);
    };
    check();
    const interval = window.setInterval(check, 500);
    return () => window.clearInterval(interval);
  }, [started]);

  return (
    <div ref={containerRef} className={`kf-engine-stage ${className}`.trim()}>
      <div className="kf-engine-background" ref={backgroundRef} />
      <div className="kf-engine-vignette" />
      {showVisualizer && <canvas className="kf-engine-visualizer" ref={visualizerRef} />}
      <canvas className="kf-engine-lyrics" ref={lyricsRef} />

      {(title || artist) && !error && (
        <div className={`kf-engine-intro ${introVisible ? "visible" : ""}`} aria-hidden={!introVisible}>
          {title ? <div className="kf-engine-intro-title">{title}</div> : null}
          {artist ? <div className="kf-engine-intro-artist">{artist}</div> : null}
          <div className={`kf-engine-intro-status ${loading ? "visible" : ""}`}>Preparing song…</div>
        </div>
      )}
      {loading && !title && !artist && !error && (
        <div className="kf-engine-overlay" role="status">
          Preparing song…
        </div>
      )}
      {error && (
        <div className="kf-engine-overlay kf-engine-error" role="alert">
          {error}
        </div>
      )}
      {audioBlocked && !error && !paused && (
        <div className="kf-engine-overlay kf-engine-hint" role="status">
          The browser is holding back sound. Tap the screen or press any key to start.
        </div>
      )}
    </div>
  );
}
