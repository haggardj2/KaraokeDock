import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { API_BASE, api, getWsUrl } from "../api";
import type { OverlaySettings } from "../components/QueueOverlay";
import { parseZipMediaRef } from "../zipMediaRef";
import { DEFAULT_PLAYER_PLAYBACK_STATE, normalizePlayerPlaybackState, isSingerPaused, playSingerMedia, prepareSingerIframe, canReportSingerTiming, restoreSingerPosition, type PlayerPlaybackState } from "../playerPlayback";
import { observePlayerViewport } from "../playerViewport";
import "./Player.css";
import {
  DEFAULT_OVERLAY_SETTINGS,
  describeYouTubeIframeError,
  formatRequestsUrlForDisplay,
  getDefaultRequestsUrl,
  getSingerDurationSec,
  getYouTubeVideoId,
  isValidDuration,
  normalizeOverlaySettings,
  QItem,
  RotationScrollerSinger,
} from "./player/helpers";
import { keepPlayerScreenAwake } from "../playerWakeLock";
import { resolvePlayerTheme, themeCssVars } from "../theme";
import PlayerBackground from "./player/PlayerBackground";
import PlayerOverlay from "./player/PlayerOverlay";
import WaitingScreen from "./player/WaitingScreen";
import { buildTickerText, getBreakMusicTrackText } from "./player/tickerText";
import { useBreakMusicPlayer } from "./player/useBreakMusicPlayer";
import { usePlayerBackground } from "./player/usePlayerBackground";


export default function Player() {
  const [queue, setQueue] = useState<QItem[]>([]);
  const [now, setNow] = useState<QItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const youtubeVideoId = now?.external_url ? getYouTubeVideoId(now.external_url) : null;
  const isYouTube = !!youtubeVideoId;
  const [playerState, setPlayerState] = useState(DEFAULT_PLAYER_PLAYBACK_STATE);
  const playerStateRef = useRef(DEFAULT_PLAYER_PLAYBACK_STATE);
  const currentQueueIdRef = useRef<QItem["id"] | null>(null);
  const refreshRevisionRef = useRef(0);
  const localPlaybackRevisionRef = useRef(0);
  const localPlayRef = useRef<(() => Promise<void>) | null>(null);
  const singerPaused = isSingerPaused(playerState, now?.id);
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(
    DEFAULT_OVERLAY_SETTINGS,
  );
  const [wakeLockMessage, setWakeLockMessage] = useState<string | null>(null);
  const wakeLockRef = useRef<ReturnType<typeof keepPlayerScreenAwake> | null>(null);
  const [requestsUrl, setRequestsUrl] = useState(getDefaultRequestsUrl);
  // Colours follow the venue's Request Page Theme (dark themes only; see resolvePlayerTheme).
  const [playerThemeId, setPlayerThemeId] = useState(() => resolvePlayerTheme(null));
  const themeStyle = useMemo(() => themeCssVars(playerThemeId) as CSSProperties, [playerThemeId]);
  const [rotationScrollerSingers, setRotationScrollerSingers] = useState<
    RotationScrollerSinger[]
  >([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlayDelay, setAutoPlayDelay] = useState(5);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [manualStop, setManualStop] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const youtubePlayerRef = useRef<YT.Player | null>(null);
  const youtubeReadyRef = useRef(false);
  const youtubeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const youtubeFallbackInFlightRef = useRef(false);
  const youtubeFallbackAttemptedRef = useRef<Set<string>>(new Set());
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const {
    playerBackgroundSettings,
    backgroundSettingsError,
    playerBackgroundSlideIndex,
    isCustomPlayerBackground,
    refreshPlayerBackground,
    applyBackgroundSettings,
  } = usePlayerBackground();
  const { breakMusicState, breakAudioRef, breakPlaybackRef, refreshBreakMusicState } =
    useBreakMusicPlayer({ now, playerState });
  const hideSingerQueueEnabled = overlaySettings.hideSingerQueue;
  const keepRotationScrollerSingersEnabled =
    hideSingerQueueEnabled && overlaySettings.keepRotationScrollerSingers;
  const splashRequestsUrl = useMemo(
    () => formatRequestsUrlForDisplay(requestsUrl),
    [requestsUrl],
  );

  useLayoutEffect(() => {
    if (containerRef.current) return observePlayerViewport(containerRef.current);
  }, [!!now]);

  useEffect(() => {
    const wakeLock = keepPlayerScreenAwake(setWakeLockMessage);
    wakeLockRef.current = wakeLock;
    return () => {
      wakeLockRef.current = null;
      wakeLock.dispose();
    };
  }, []);

  // Force dark theme
  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    const prevScheme = document.documentElement.style.colorScheme;
    document.documentElement.style.colorScheme = "dark";
    document.body.style.background = "#000";
    document.body.style.color = "#e5e7eb";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    const els: HTMLElement[] = Array.from(
      document.querySelectorAll("nav, header, .top-shortcuts"),
    ) as HTMLElement[];
    els.forEach((e) => (e.style.display = "none"));

    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    return () => {
      document.documentElement.style.colorScheme = prevScheme;
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
      document.body.style.margin = "";
      document.body.style.overflow = "";
      els.forEach((e) => (e.style.display = ""));
    };
  }, []);

  // Handle mouse movement for controls visibility
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  // Handle play button click
  const handlePlayClick = async () => {
    if (isSingerPaused(playerStateRef.current, currentQueueIdRef.current)) return;
    await localPlayRef.current?.();
  };

  const applyPlayerState = useCallback((value: Partial<PlayerPlaybackState>) => {
    const state = normalizePlayerPlaybackState(value, playerStateRef.current);
    playerStateRef.current = state;
    setPlayerState(state);
    setManualStop(state.manualStop);
    if (state.queueId != null) {
      void breakPlaybackRef.current?.prepareForKaraoke();
    }
    if (isSingerPaused(state, currentQueueIdRef.current)) {
      videoRef.current?.pause();
      if (youtubeReadyRef.current) youtubePlayerRef.current?.pauseVideo();
    }
  }, []);

  // Load pause state with the queue so freshly bound media never starts a paused singer.
  const refresh = useCallback(async () => {
    const revision = ++refreshRevisionRef.current;
    const [q, rotationSingers, autoplaySettings, playback] = await Promise.all([
      api("/api/queue") as Promise<QItem[]>,
      api("/api/overlay/rotation-singers")
        .then((rows: RotationScrollerSinger[]) => rows)
        .catch(() => [] as RotationScrollerSinger[]),
      api("/api/autoplay/settings") as Promise<{ enabled: boolean; delay: number; rotationAllowsAutoplay?: boolean }>,
      api("/api/player/state") as Promise<PlayerPlaybackState>,
    ]);
    if (revision !== refreshRevisionRef.current) return;
    const cur = q.find((x) => x.status === "playing") || null;
    if (!cur || String(cur.id) !== String(currentQueueIdRef.current)) {
      videoRef.current?.pause();
      if (youtubeReadyRef.current) youtubePlayerRef.current?.pauseVideo();
    }
    currentQueueIdRef.current = cur?.id ?? null;
    applyPlayerState(playback);
    breakPlaybackRef.current?.confirmKaraokeActive(!!cur || playback.queueId != null);
    if (cur) {
      void breakPlaybackRef.current?.prepareForKaraoke();
    }
    setQueue(q);
    setRotationScrollerSingers(rotationSingers);
    setAutoPlay(autoplaySettings.enabled && autoplaySettings.rotationAllowsAutoplay !== false);
    setAutoPlayDelay(autoplaySettings.delay);
    setNow((prev) => {
      // No change: nothing was playing, nothing is playing now
      if (!prev && !cur) return null;
      // Song started: nothing was playing, now something is playing
      if (!prev && cur) return cur;
      // Song stopped: something was playing, now nothing is playing
      if (prev && !cur) return null;
      // Song changed: different song is now playing
      if (prev && cur && String(prev.id) !== String(cur.id)) return cur;
      // Same queue entry was replaced with another track; reload playback.
      if (prev && cur && String(prev.track_id) !== String(cur.track_id))
        return cur;
      // Same song is still playing - don't update to avoid triggering re-renders
      // that could restart the video
      return prev;
    });
  }, [applyPlayerState]);

  useEffect(() => {
    refresh();
    refreshBreakMusicState();
  }, []);

  // Fetch initial overlay settings
  useEffect(() => {
    api("/api/overlay/settings")
      .then((settings: OverlaySettings) => {
        setOverlaySettings(normalizeOverlaySettings(settings));
      })
      .catch(() => {
        // Use defaults on error
      });
  }, []);

  useEffect(() => {
    api("/api/settings/public")
      .then((settings: { "requests.url"?: string; "requests.theme"?: string }) => {
        setPlayerThemeId(resolvePlayerTheme(settings["requests.theme"]));
        if (
          typeof settings["requests.url"] === "string" &&
          settings["requests.url"].trim()
        ) {
          setRequestsUrl(settings["requests.url"]);
        }
      })
      .catch(() => {
        // Keep the client-derived fallback URL on error
      });
  }, []);

  // WebSocket live updates
  useEffect(() => {
    function connect() {
      try {
        wsRef.current = new WebSocket(getWsUrl());
        wsRef.current.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (
              msg.type === "library.scanned" ||
              msg.type === "queue.updated" ||
              msg.type === "player.updated" ||
              msg.type === "player.play" ||
              msg.type === "player.next" ||
              msg.type === "player.pause" ||
              msg.type === "player.resume" ||
              msg.type === "player.stop"
            ) {
              if (msg.type === "player.pause" || msg.type === "player.resume") {
                applyPlayerState(msg);
              }
              if (msg.type === "player.play" || msg.type === "player.next") {
                void breakPlaybackRef.current?.prepareForKaraoke();
              }
              refresh();
              refreshBreakMusicState();
              if (msg.type === "player.stop") {
                currentQueueIdRef.current = null;
                videoRef.current?.pause();
                if (youtubeReadyRef.current) youtubePlayerRef.current?.pauseVideo();
                setManualStop(true);
              } else if (
                msg.type === "player.play" ||
                msg.type === "player.next"
              ) {
                setManualStop(false);
              }
            }
            if (msg.type === "break_music.updated") {
              refreshBreakMusicState();
            }
            // Handle overlay settings updates
            if (msg.type === "overlay.settings") {
              const settings = normalizeOverlaySettings(msg);
              setOverlaySettings(settings);
              if (settings.keepRotationScrollerSingers) {
                refresh();
              }
            }
            // Handle autoplay settings updates
            if (msg.type === "autoplay.settings") {
              if (typeof msg.enabled === "boolean") {
                setAutoPlay(msg.enabled && msg.rotationAllowsAutoplay !== false);
              }
              if (typeof msg.delay === "number") {
                // Only update delay if it actually changed to avoid resetting countdown
                setAutoPlayDelay((prevDelay) => {
                  if (prevDelay !== msg.delay) {
                    return msg.delay;
                  }
                  return prevDelay;
                });
              }
            }
            if (msg.type === "requests.theme") {
              setPlayerThemeId(resolvePlayerTheme(msg.theme));
            }
            if (msg.type === "player.background.settings") {
              applyBackgroundSettings(msg);
            }
          } catch {
            /* ignore */
          }
        };
        wsRef.current.onclose = () => {
          console.log("WebSocket closed, reconnecting...");
          wsRef.current = null;
          // Clear heartbeat timer
          if (wsHeartbeatRef.current) {
            clearInterval(wsHeartbeatRef.current);
            wsHeartbeatRef.current = null;
          }
          setTimeout(connect, 1000);
        };
        wsRef.current.onerror = (err) => {
          console.error("WebSocket error:", err);
        };
        wsRef.current.onopen = () => {
          console.log("WebSocket connected");
          refresh().catch(() => {});
          refreshBreakMusicState();
          void refreshPlayerBackground();
          // Start heartbeat - send a message every 45 seconds to keep connection alive
          // This is in addition to server's ping/pong mechanism
          wsHeartbeatRef.current = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              // Send a lightweight heartbeat message
              wsRef.current.send(JSON.stringify({ type: "heartbeat" }));
            }
          }, 45000);
        };
      } catch {
        setTimeout(connect, 1500);
      }
    }
    connect();
    return () => {
      if (wsHeartbeatRef.current) {
        clearInterval(wsHeartbeatRef.current);
      }
      wsRef.current?.close();
    };
  }, [refresh, refreshBreakMusicState, applyPlayerState]);

  // Build the media URL - pure computation, no side effects
  const mediaSrc = useMemo(() => {
    if (!now) return "";
    const keyAdjustment = now.key_adjustment ?? 0;

    // Handle external URLs (e.g., from Karaoke Nerds)
    if (now.external_url) {
      const videoId = getYouTubeVideoId(now.external_url);
      if (videoId) {
        return "";
      }
      // For non-YouTube external URLs, use video element
      return now.external_url;
    }

    // Handle MP4 files
    if (now.kind === "mp4" && now.file_mp4) {
      const params = new URLSearchParams();
      params.set("path", now.file_mp4);
      if (keyAdjustment) {
        params.set("pitch", String(keyAdjustment));
      }
      return `${API_BASE}/media/mp4stream?${params.toString()}`;
    }

    // Handle CDG+MP3 files
    if (now.kind === "cdgmp3" && now.file_cdg && now.file_mp3) {
      const isFromZip =
        now.file_cdg.startsWith("zip://") || now.file_mp3.startsWith("zip://");

      const params = new URLSearchParams();

      if (isFromZip) {
        const parsedCdg = parseZipMediaRef(now.file_cdg);
        const parsedMp3 = parseZipMediaRef(now.file_mp3);
        const zipFile = parsedCdg?.zipPath || parsedMp3?.zipPath || "";
        const cdgEntry = parsedCdg?.entryName || "";
        const mp3Entry = parsedMp3?.entryName || "";

        params.set("file", zipFile);
        params.set("cdg", cdgEntry || "");
        params.set("mp3", mp3Entry || "");
      } else {
        params.set("cdg", now.file_cdg);
        params.set("mp3", now.file_mp3);
      }
      if (keyAdjustment) {
        params.set("pitch", String(keyAdjustment));
      }

      return `${API_BASE}/media/cdgmp4?${params.toString()}`;
    }

    return "";
  }, [
    now?.id,
    now?.track_id,
    now?.external_url,
    now?.kind,
    now?.file_mp4,
    now?.file_cdg,
    now?.file_mp3,
    now?.key_adjustment,
  ]);

  // Source binding is independent of pause/resume; never reload to toggle playback.
  useEffect(() => {
    setNeedsUserInteraction(false);
    setIsPlaying(false);
    const v = videoRef.current;
    if (!v || !mediaSrc || isYouTube || !now) return;
    let disposed = false;
    const state = playerStateRef.current;

    v.src = mediaSrc;
    v.load();
    const clearRestorePosition = restoreSingerPosition(
      v,
      String(state.queueId) === String(now.id) ? state.positionSec : 0,
    );

    const playVideo = async () => {
      const revision = ++localPlaybackRevisionRef.current;
      const result = await playSingerMedia(
        v,
        () => !disposed && revision === localPlaybackRevisionRef.current &&
          String(currentQueueIdRef.current) === String(now.id),
        () => isSingerPaused(playerStateRef.current, now.id),
        undefined,
        () => breakPlaybackRef.current?.prepareForKaraoke() ?? Promise.resolve(),
      );
      if (result === "stale") return;
      setIsPlaying(result === "playing");
      setNeedsUserInteraction(result === "blocked");
    };
    localPlayRef.current = playVideo;
    void playVideo();
    return () => {
      disposed = true;
      localPlaybackRevisionRef.current += 1;
      localPlayRef.current = null;
      clearRestorePosition();
      v.pause();
    };
  }, [mediaSrc, isYouTube, now?.id, now?.track_id]);

  useEffect(() => {
    if (!now) return;
    if (isYouTube) {
      if (!youtubeReadyRef.current || !youtubePlayerRef.current) return;
      const player = youtubePlayerRef.current;
      void prepareSingerIframe(
        player, now.id, () => playerStateRef.current,
        () => youtubePlayerRef.current === player && String(currentQueueIdRef.current) === String(now.id),
        () => breakPlaybackRef.current?.prepareForKaraoke() ?? Promise.resolve(),
      ).catch((err) => console.error("Error controlling YouTube playback:", err));
    } else if (singerPaused) {
      videoRef.current?.pause();
    } else if (videoRef.current?.paused) {
      void localPlayRef.current?.();
    }
  }, [singerPaused, isYouTube, now?.id]);

  // Helper function to send timing updates
  const sendTimingUpdate = useCallback(
    (currentTime: number, duration: number, queueId: number | string) => {
      if (breakPlaybackRef.current?.isPreparingForKaraoke()) return;
      if (!canReportSingerTiming(playerStateRef.current, currentQueueIdRef.current, queueId)) return;
      if (isValidDuration(duration)) {
        api("/api/player/timing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentTime,
            duration,
            queueId,
          }),
        }).catch((err) => {
          console.error("Failed to send timing update:", err);
        });
      }
    },
    [],
  );

  const fallbackYouTubeToDownloadedTrack = useCallback(
    async (errorCode?: number | string) => {
      if (!now?.id || !now.external_url || !getYouTubeVideoId(now.external_url))
        return;
      const attemptKey = `${now.id}:${now.external_url}`;
      if (
        youtubeFallbackInFlightRef.current ||
        youtubeFallbackAttemptedRef.current.has(attemptKey)
      )
        return;

      youtubeFallbackInFlightRef.current = true;
      youtubeFallbackAttemptedRef.current.add(attemptKey);
      try {
        await api("/api/player/youtube-fallback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: now.id, errorCode }),
        });
        await refresh();
      } catch (err) {
        console.error("YouTube fallback download failed:", err);
      } finally {
        youtubeFallbackInFlightRef.current = false;
      }
    },
    [now?.id, now?.external_url, refresh],
  );

  // Monitor video play/pause state and handle video end
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !now) return;

    const handlePlay = () => {
      if (isSingerPaused(playerStateRef.current, now.id)) {
        v.pause();
        return;
      }
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (isSingerPaused(playerStateRef.current, now.id)) return;

      // Send final timing update when video ends
      const duration = getSingerDurationSec(now, v);

      // Send currentTime = duration to ensure Host detects song completion
      if (isValidDuration(duration)) {
        console.log("Video ended, sending final timing update:", duration);
        sendTimingUpdate(duration, duration, now.id);
      } else {
        // No valid duration available — send a sentinel value so the server
        // still marks the song as finished and advances to the next song.
        console.warn(
          "Video ended but no valid duration available; sending sentinel timing update",
        );
        sendTimingUpdate(1, 1, now.id);
      }
    };

    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);
    v.addEventListener("ended", handleEnded);

    return () => {
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
      v.removeEventListener("ended", handleEnded);
    };
  }, [now, sendTimingUpdate]);

  // Report timing updates to server for Host page
  useEffect(() => {
    if (!now) return;

    if (isYouTube) return;

    const v = videoRef.current;
    if (!v) return;

    // Send timing updates every 1 second
    const intervalId = setInterval(() => {
      if (isSingerPaused(playerStateRef.current, now.id) || v.paused) return;
      const currentTime = v.currentTime || 0;

      const duration = getSingerDurationSec(now, v);

      // Send timing update - only if we have a valid duration
      if (isValidDuration(duration)) {
        sendTimingUpdate(currentTime, duration, now.id);
      } else {
        // Log when we can't get duration (for debugging)
        console.warn(
          `Cannot send timing update for song ${now.id}: duration not available (video.duration=${v.duration}, db.duration_ms=${now.duration_ms})`,
        );
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [now, isYouTube, sendTimingUpdate]);

  // Report YouTube timing updates using the IFrame API. YouTube is attempted
  // through the iframe first; fallback download only starts after an iframe API
  // error such as embedding disabled (101/150).
  useEffect(() => {
    if (!now || !isYouTube || !youtubeVideoId) return;

    const playerId = `youtube-player-${now.id}-${youtubeVideoId}`;
    let disposed = false;
    let instance: YT.Player | null = null;
    let initTimer: ReturnType<typeof setTimeout>;
    const initPlayer = () => {
      if (disposed) return;
      const YT = (window as any).YT;
      if (!YT?.Player) {
        initTimer = setTimeout(initPlayer, 100);
        return;
      }

      if (youtubeTimerRef.current) {
        clearInterval(youtubeTimerRef.current);
      }

      try {
        instance = new YT.Player(playerId, {
          events: {
            onReady: (event: any) => {
              if (disposed || String(currentQueueIdRef.current) !== String(now.id)) {
                event.target.stopVideo();
                return;
              }
              youtubeReadyRef.current = true;
              void prepareSingerIframe(
                event.target, now.id, () => playerStateRef.current,
                () => !disposed && String(currentQueueIdRef.current) === String(now.id),
                () => breakPlaybackRef.current?.prepareForKaraoke() ?? Promise.resolve(),
                true,
              ).then(() => {
                if (!disposed && String(currentQueueIdRef.current) === String(now.id) &&
                    !isSingerPaused(playerStateRef.current, now.id)) {
                  event.target.unMute();
                  event.target.setVolume(100);
                }
              }).catch((err) => console.error("Error starting YouTube iframe playback:", err));

              youtubeTimerRef.current = setInterval(() => {
                if (disposed || isSingerPaused(playerStateRef.current, now.id)) return;
                try {
                  const currentTime = event.target.getCurrentTime();
                  const duration = event.target.getDuration();
                  if (isValidDuration(duration)) {
                    sendTimingUpdate(currentTime || 0, duration, now.id);
                  }
                } catch (err) {
                  console.error("Error getting YouTube iframe timing:", err);
                }
              }, 1000);
            },
            onStateChange: (event: any) => {
              if (disposed) return;
              if (String(currentQueueIdRef.current) !== String(now.id) ||
                  isSingerPaused(playerStateRef.current, now.id) ||
                  breakPlaybackRef.current?.isPreparingForKaraoke()) {
                if (event.data === 1) event.target.pauseVideo();
                setIsPlaying(false);
                return;
              }
              setIsPlaying(event.data === 1);
              if (event.data === 1) {
                try {
                  if (event.target.isMuted()) {
                    event.target.unMute();
                    event.target.setVolume(100);
                  }
                } catch (err) {
                  console.error("Error unmuting YouTube iframe:", err);
                }
              }
              if (event.data === 0) {
                try {
                  const duration = event.target.getDuration();
                  sendTimingUpdate(
                    isValidDuration(duration) ? duration : 1,
                    isValidDuration(duration) ? duration : 1,
                    now.id,
                  );
                } catch (err) {
                  console.error("Error sending final YouTube iframe timing:", err);
                  sendTimingUpdate(1, 1, now.id);
                }
              }
            },
            onError: (event: any) => {
              if (disposed) return;
              console.error("YouTube iframe error:", {
                code: event.data,
                message: describeYouTubeIframeError(event.data),
                videoId: youtubeVideoId,
                url: now.external_url,
                origin: window.location.origin,
                referrer: document.referrer,
                userAgent: navigator.userAgent,
              });
              void fallbackYouTubeToDownloadedTrack(event.data);
            },
          },
        });
        youtubePlayerRef.current = instance;
      } catch (err) {
        console.error("Failed to initialize YouTube iframe player:", err);
      }
    };

    initTimer = setTimeout(initPlayer, 500);

    return () => {
      disposed = true;
      youtubeReadyRef.current = false;
      clearTimeout(initTimer);
      if (youtubeTimerRef.current) {
        clearInterval(youtubeTimerRef.current);
        youtubeTimerRef.current = null;
      }
      if (instance) {
        try {
          instance.stopVideo();
        } catch (err) {
          console.warn("Failed to stop YouTube iframe player:", err);
        }
        if (youtubePlayerRef.current === instance) youtubePlayerRef.current = null;
      }
    };
  }, [
    now?.id,
    now?.track_id,
    isYouTube,
    youtubeVideoId,
    sendTimingUpdate,
    fallbackYouTubeToDownloadedTrack,
  ]);

  // Get next up singers
  const upNext = queue
    .filter((q) => q.status === "queued")
    .sort((a, b) => queue.indexOf(a) - queue.indexOf(b));

  // Memoize the queue count to avoid unnecessary effect re-runs
  const queuedCount = useMemo(() => upNext.length, [queue]);

  // Countdown timer for autoplay when no song is playing but queue has items
  useEffect(() => {
    // Clear existing countdown timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // Only show countdown if:
    // 1. No song is currently playing
    // 2. Autoplay is enabled
    // 3. There are songs in the queue
    // 4. Host has not manually stopped playback
    if (!now && autoPlay && queuedCount > 0 && !manualStop) {
      // Capture the current autoplay delay value to use for this countdown
      // This ensures the countdown uses a consistent value even if settings change mid-countdown
      const delayToUse = autoPlayDelay;

      // Initialize countdown to autoplay delay
      setCountdown(delayToUse);

      // Start countdown timer
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 0) {
            // Keep showing 0 until song starts (server controls actual autoplay)
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
    // Note: We DO include autoPlayDelay so that when a new countdown starts, it uses the current setting
    // But this won't affect an already-running countdown since we capture the value in a local variable
  }, [now, autoPlay, queuedCount, autoPlayDelay, manualStop]);

  const breakMusicTrackText = getBreakMusicTrackText(overlaySettings, now, breakMusicState);

  // Build ticker text with current singer and queue
  const tickerText = useMemo(
    () =>
      buildTickerText({
        now,
        upNext,
        overlaySettings,
        hideSingerQueueEnabled,
        keepRotationScrollerSingersEnabled,
        rotationScrollerSingers,
        autoPlay,
        countdown,
        manualStop,
        isCustomPlayerBackground,
        breakMusicTrackText,
      }),
    [
      now,
      upNext,
      overlaySettings,
      hideSingerQueueEnabled,
      keepRotationScrollerSingersEnabled,
      rotationScrollerSingers,
      autoPlay,
      countdown,
      manualStop,
      isCustomPlayerBackground,
      breakMusicTrackText,
    ],
  );

  // Render the overlay (shown always, unless visibility is false)
  const renderWakeLockNotice = () => wakeLockMessage && (
    <div role="status" className="player-wake-lock-notice">
      {wakeLockMessage}{" "}
      <button type="button" onClick={() => wakeLockRef.current?.retry()}>Keep screen awake</button>
    </div>
  );

  const renderOverlay = () => (
    <PlayerOverlay
      overlaySettings={overlaySettings}
      tickerText={tickerText}
      breakMusicTrackText={breakMusicTrackText}
      rotationScrollerSingers={rotationScrollerSingers}
      showControls={showControls}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    />
  );

  // When nothing is playing, show waiting screen with ticker
  if (!now) {
    return (
      <>
        <style>{`
          @keyframes ticker-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          .ticker-text {
            display: inline-block;
            white-space: nowrap;
            animation: ticker-scroll 30s linear infinite;
          }

          .controls-overlay {
            transition: opacity 0.3s ease-in-out;
          }
        `}</style>

        <div
          ref={containerRef}
          className="player-screen"
          onPointerDown={handleMouseMove}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setShowControls(true)}
          style={{
            ...themeStyle,
            background: "#000",
            color: "var(--color-text-primary)",
            display: "grid",
            placeItems: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            cursor: showControls ? "default" : "none",
          }}
        >
          <audio
            ref={breakAudioRef}
            preload="auto"
            style={{ display: "none" }}
          />
          <PlayerBackground
          settings={playerBackgroundSettings}
          error={backgroundSettingsError}
          slideIndex={playerBackgroundSlideIndex}
          onRetry={() => void refreshPlayerBackground()}
        />
          {renderWakeLockNotice()}
          {/* Show waiting screen - queue is displayed in the roller overlay */}
          <WaitingScreen
            upNext={upNext}
            overlaySettings={overlaySettings}
            hideSingerQueueEnabled={hideSingerQueueEnabled}
            isCustomPlayerBackground={isCustomPlayerBackground}
            showCountdown={autoPlay && countdown !== null && !manualStop}
            countdown={countdown}
            splashRequestsUrl={splashRequestsUrl}
          />

          {/* Always show the overlay with ticker */}
          {renderOverlay()}
        </div>
      </>
    );
  }

  // Playing screen
  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .ticker-text {
          display: inline-block;
          white-space: nowrap;
          animation: ticker-scroll 30s linear infinite;
        }

        .controls-overlay {
          transition: opacity 0.3s ease-in-out;
        }

        .play-button-overlay {
          border: 0;
          padding: 0;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 100;
          background: rgba(0,0,0,0.7);
          border-radius: 50%;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }

        .play-button-overlay:hover {
          transform: translate(-50%, -50%) scale(1.1);
          background: rgba(0,0,0,0.8);
        }

        .play-icon {
          width: 0;
          height: 0;
          border-left: 40px solid white;
          border-top: 25px solid transparent;
          border-bottom: 25px solid transparent;
          margin-left: 10px;
        }
      `}</style>

      <div
        ref={containerRef}
        className="player-screen"
        onPointerDown={handleMouseMove}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setShowControls(true)}
        style={{
          ...themeStyle,
          background: "#000",
          color: "var(--color-text-primary)",
          overflow: "hidden",
          cursor: showControls ? "default" : "none",
        }}
      >
        <audio ref={breakAudioRef} preload="auto" style={{ display: "none" }} />
        <PlayerBackground
          settings={playerBackgroundSettings}
          error={backgroundSettingsError}
          slideIndex={playerBackgroundSlideIndex}
          onRetry={() => void refreshPlayerBackground()}
        />
        {renderWakeLockNotice()}
        {isYouTube && youtubeVideoId ? (
          <iframe
            key={`${now.id}-${youtubeVideoId}`}
            id={`youtube-player-${now.id}-${youtubeVideoId}`}
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&fs=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&widget_referrer=${encodeURIComponent(window.location.href)}`}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
              zIndex: 1,
            }}
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            onError={() => {
              if (now?.external_url && getYouTubeVideoId(now.external_url)) {
                void fallbackYouTubeToDownloadedTrack("stream");
              }
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              background: "#000",
              zIndex: 1,
            }}
          />
        )}

        {/* Play button overlay when autoplay is blocked (only for video element) */}
        {needsUserInteraction && !isPlaying && !singerPaused && (
          <button type="button" aria-label="Start playback" className="play-button-overlay" onClick={handlePlayClick}>
            <div className="play-icon" />
          </button>
        )}

        {/* Always show the overlay with ticker */}
        {renderOverlay()}
      </div>
    </>
  );
}
