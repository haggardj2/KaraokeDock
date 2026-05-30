import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { API_BASE, api, getWsUrl } from "../api";
import { parseZipMediaRef } from "../zipMediaRef";
// Helper function to extract YouTube video ID from URL
function getYouTubeVideoId(url) {
    if (!url)
        return null;
    const normalizedUrl = url.trim();
    const directIdMatch = normalizedUrl.match(/^([a-zA-Z0-9_-]{11})$/);
    if (directIdMatch?.[1]) {
        return directIdMatch[1];
    }
    const normalizeVideoId = (candidate) => candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
    try {
        const parsedUrl = new URL(normalizedUrl);
        const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
        const segments = parsedUrl.pathname.split("/").filter(Boolean);
        if (hostname === "youtu.be") {
            return normalizeVideoId(segments[0]);
        }
        if (hostname.endsWith("youtube.com") ||
            hostname.endsWith("youtube-nocookie.com")) {
            const queryVideoId = normalizeVideoId(parsedUrl.searchParams.get("v"));
            if (queryVideoId)
                return queryVideoId;
            if (segments[0] === "embed" ||
                segments[0] === "shorts" ||
                segments[0] === "live") {
                return normalizeVideoId(segments[1]);
            }
        }
    }
    catch {
        return null;
    }
    return null;
}
// Helper function to validate duration values
function isValidDuration(duration) {
    return duration != null && !isNaN(duration) && isFinite(duration) && duration > 0;
}
const AUTOPLAY_UNMUTE_DELAY_MS = 100; // Delay before unmuting video after autoplay starts
const DEFAULT_OVERLAY_SETTINGS = {
    visible: true,
    height: 90,
    qrSize: 60,
    customMessage: "",
    showRoller: true,
    showQrCode: true,
    hideSingerQueue: false,
};
function parseBoolean(value, fallback) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        if (value.toLowerCase() === "true")
            return true;
        if (value.toLowerCase() === "false")
            return false;
    }
    return fallback;
}
function normalizeOverlaySettings(value) {
    if (!value || typeof value !== "object") {
        return DEFAULT_OVERLAY_SETTINGS;
    }
    const settings = value;
    return {
        visible: parseBoolean(settings.visible, DEFAULT_OVERLAY_SETTINGS.visible),
        height: typeof settings.height === "number"
            ? settings.height
            : DEFAULT_OVERLAY_SETTINGS.height,
        qrSize: typeof settings.qrSize === "number"
            ? settings.qrSize
            : DEFAULT_OVERLAY_SETTINGS.qrSize,
        customMessage: typeof settings.customMessage === "string"
            ? settings.customMessage
            : DEFAULT_OVERLAY_SETTINGS.customMessage,
        showRoller: parseBoolean(settings.showRoller, DEFAULT_OVERLAY_SETTINGS.showRoller),
        showQrCode: parseBoolean(settings.showQrCode, DEFAULT_OVERLAY_SETTINGS.showQrCode),
        hideSingerQueue: parseBoolean(settings.hideSingerQueue, DEFAULT_OVERLAY_SETTINGS.hideSingerQueue),
    };
}
export default function Player() {
    const [queue, setQueue] = useState([]);
    const [now, setNow] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isYouTube, setIsYouTube] = useState(false);
    const [youtubeVideoId, setYoutubeVideoId] = useState(null);
    const [overlaySettings, setOverlaySettings] = useState(DEFAULT_OVERLAY_SETTINGS);
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoPlayDelay, setAutoPlayDelay] = useState(5);
    const [countdown, setCountdown] = useState(null);
    const [manualStop, setManualStop] = useState(false);
    const [breakMusicState, setBreakMusicState] = useState({
        paused: false,
        crossfadeSeconds: 3,
        volumePercent: 100,
        elapsedSec: 0,
        currentTrack: null,
    });
    const videoRef = useRef(null);
    const breakAudioRef = useRef(null);
    const iframeRef = useRef(null);
    const containerRef = useRef(null);
    const wsRef = useRef(null);
    const hideControlsTimer = useRef(null);
    const youtubePlayerRef = useRef(null);
    const youtubeTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);
    const wsHeartbeatRef = useRef(null);
    const breakTimingRef = useRef(null);
    const breakFadeRef = useRef(null);
    const breakShouldPlayRef = useRef(false);
    const breakTrackIdRef = useRef(null);
    const breakTrackSrcRef = useRef("");
    const hideSingerQueueEnabled = overlaySettings.hideSingerQueue;
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
        const els = Array.from(document.querySelectorAll("nav, header, .top-shortcuts"));
        els.forEach((e) => (e.style.display = "none"));
        // Load YouTube IFrame API
        if (!window.YT) {
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
            if (breakTimingRef.current) {
                clearInterval(breakTimingRef.current);
            }
            if (breakFadeRef.current) {
                clearInterval(breakFadeRef.current);
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
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        };
    }, []);
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen();
        }
        else {
            await document.exitFullscreen();
        }
    };
    // Handle play button click
    const handlePlayClick = async () => {
        const v = videoRef.current;
        if (!v)
            return;
        try {
            await v.play();
            setNeedsUserInteraction(false);
            setIsPlaying(true);
        }
        catch (err) {
            console.error("Play failed:", err);
        }
    };
    // Fetch queue + determine current
    async function refresh() {
        const q = await api("/api/queue");
        setQueue(q);
        const cur = q.find((x) => x.status === "playing") || null;
        setNow((prev) => {
            // No change: nothing was playing, nothing is playing now
            if (!prev && !cur)
                return null;
            // Song started: nothing was playing, now something is playing
            if (!prev && cur)
                return cur;
            // Song stopped: something was playing, now nothing is playing
            if (prev && !cur)
                return null;
            // Song changed: different song is now playing
            if (prev && cur && String(prev.id) !== String(cur.id))
                return cur;
            // Same song is still playing - don't update to avoid triggering re-renders
            // that could restart the video
            return prev;
        });
    }
    async function refreshBreakMusicState() {
        try {
            const state = await api("/api/break-music/state");
            setBreakMusicState({
                paused: !!state.paused,
                crossfadeSeconds: typeof state.crossfadeSeconds === "number" ? state.crossfadeSeconds : 3,
                volumePercent: typeof state.volumePercent === "number" ? Math.max(0, Math.min(100, Math.round(state.volumePercent))) : 100,
                elapsedSec: typeof state.elapsedSec === "number" ? state.elapsedSec : 0,
                currentTrack: state.currentTrack || null,
            });
        }
        catch {
            // ignore
        }
    }
    useEffect(() => {
        refresh();
        refreshBreakMusicState();
        // Fetch player state to initialize manualStop (handles page reload after stop was selected)
        api("/api/player/state")
            .then((state) => {
            setManualStop(state.manualStop);
        })
            .catch(() => {
            // Use default (false) on error
        });
    }, []);
    // Fetch initial overlay settings
    useEffect(() => {
        api("/api/overlay/settings")
            .then((settings) => {
            setOverlaySettings(normalizeOverlaySettings(settings));
        })
            .catch(() => {
            // Use defaults on error
        });
    }, []);
    // Fetch initial autoplay settings
    useEffect(() => {
        api("/api/autoplay/settings")
            .then((settings) => {
            setAutoPlay(settings.enabled);
            // Only update delay if it's different from current value
            setAutoPlayDelay((prevDelay) => {
                if (prevDelay !== settings.delay) {
                    return settings.delay;
                }
                return prevDelay;
            });
        })
            .catch(() => {
            // Use defaults on error
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
                        if (msg.type === "library.scanned" ||
                            msg.type === "queue.updated" ||
                            msg.type === "player.updated" ||
                            msg.type === "player.play" ||
                            msg.type === "player.next" ||
                            msg.type === "player.stop") {
                            refresh();
                            if (msg.type === "player.stop") {
                                setManualStop(true);
                            }
                            else if (msg.type === "player.play" || msg.type === "player.next") {
                                setManualStop(false);
                            }
                        }
                        if (msg.type === "break_music.updated") {
                            refreshBreakMusicState();
                        }
                        // Handle overlay settings updates
                        if (msg.type === "overlay.settings") {
                            setOverlaySettings(normalizeOverlaySettings(msg));
                        }
                        // Handle autoplay settings updates
                        if (msg.type === "autoplay.settings") {
                            if (typeof msg.enabled === "boolean") {
                                setAutoPlay(msg.enabled);
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
                    }
                    catch {
                        /* ignore */
                    }
                };
                wsRef.current.onclose = () => {
                    console.log('WebSocket closed, reconnecting...');
                    wsRef.current = null;
                    // Clear heartbeat timer
                    if (wsHeartbeatRef.current) {
                        clearInterval(wsHeartbeatRef.current);
                        wsHeartbeatRef.current = null;
                    }
                    setTimeout(connect, 1000);
                };
                wsRef.current.onerror = (err) => {
                    console.error('WebSocket error:', err);
                };
                wsRef.current.onopen = () => {
                    console.log('WebSocket connected');
                    // Re-fetch player state on reconnect to restore manualStop
                    // (handles WS disconnect that occurred while stop was selected)
                    api("/api/player/state")
                        .then((state) => {
                        setManualStop(state.manualStop);
                    })
                        .catch(() => { });
                    // Start heartbeat - send a message every 45 seconds to keep connection alive
                    // This is in addition to server's ping/pong mechanism
                    wsHeartbeatRef.current = setInterval(() => {
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                            // Send a lightweight heartbeat message
                            wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
                        }
                    }, 45000);
                };
            }
            catch {
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
    }, []);
    // Determine YouTube state based on current song (moved out of useMemo to avoid side effects)
    useEffect(() => {
        if (!now) {
            setIsYouTube(false);
            setYoutubeVideoId(null);
            // Clean up YouTube player when song ends
            if (youtubePlayerRef.current) {
                try {
                    youtubePlayerRef.current.destroy();
                }
                catch (err) {
                    console.warn('Failed to destroy YouTube player:', err);
                }
                youtubePlayerRef.current = null;
            }
            if (youtubeTimerRef.current) {
                clearInterval(youtubeTimerRef.current);
                youtubeTimerRef.current = null;
            }
            return;
        }
        // Handle external URLs (e.g., from Karaoke Nerds)
        if (now.external_url) {
            const videoId = getYouTubeVideoId(now.external_url);
            if (videoId) {
                setIsYouTube(true);
                setYoutubeVideoId(videoId);
            }
            else {
                setIsYouTube(false);
                setYoutubeVideoId(null);
            }
        }
        else {
            setIsYouTube(false);
            setYoutubeVideoId(null);
        }
    }, [now?.id, now?.external_url]);
    // Build the media URL - pure computation, no side effects
    const mediaSrc = useMemo(() => {
        if (!now)
            return "";
        const keyAdjustment = now.key_adjustment ?? 0;
        // Handle external URLs (e.g., from Karaoke Nerds)
        if (now.external_url) {
            // Check if it's a YouTube URL - return empty string as we'll use iframe instead
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
            const isFromZip = now.file_cdg.startsWith("zip://") || now.file_mp3.startsWith("zip://");
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
            }
            else {
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
        now?.external_url,
        now?.kind,
        now?.file_mp4,
        now?.file_cdg,
        now?.file_mp3,
        now?.key_adjustment,
    ]);
    // Load video when mediaSrc changes or YouTube video changes
    useEffect(() => {
        // Reset states when source changes
        setNeedsUserInteraction(false);
        setIsPlaying(false);
        // Handle YouTube videos
        if (isYouTube && youtubeVideoId) {
            // YouTube iframe will autoplay via URL parameter
            setIsPlaying(true);
            return;
        }
        // Handle regular video element
        const v = videoRef.current;
        if (!v || !mediaSrc)
            return;
        v.src = mediaSrc;
        v.load();
        // Try to play automatically
        const playVideo = async () => {
            try {
                // Try with muted first (usually works)
                v.muted = true;
                await v.play();
                setIsPlaying(true);
                // Wait for video to actually start playing before unmuting
                // This prevents browsers from blocking autoplay after unmute
                await new Promise(resolve => setTimeout(resolve, AUTOPLAY_UNMUTE_DELAY_MS));
                v.muted = false;
            }
            catch (err) {
                // If even muted play fails, we need user interaction
                v.muted = false;
                setNeedsUserInteraction(true);
            }
        };
        playVideo();
    }, [mediaSrc, isYouTube, youtubeVideoId]);
    // Helper function to send timing updates
    const sendTimingUpdate = useCallback((currentTime, duration, queueId) => {
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
    }, []);
    const fadeBreakAudioTo = useCallback((targetVolume, durationSeconds, onComplete) => {
        const audio = breakAudioRef.current;
        if (!audio)
            return;
        if (breakFadeRef.current) {
            clearInterval(breakFadeRef.current);
            breakFadeRef.current = null;
        }
        const start = audio.volume;
        const clampedTarget = Math.max(0, Math.min(1, targetVolume));
        if (durationSeconds <= 0) {
            audio.volume = clampedTarget;
            onComplete?.();
            return;
        }
        const steps = Math.max(1, Math.floor((durationSeconds * 1000) / 100));
        let currentStep = 0;
        breakFadeRef.current = setInterval(() => {
            currentStep += 1;
            const t = Math.min(1, currentStep / steps);
            audio.volume = start + (clampedTarget - start) * t;
            if (t >= 1) {
                if (breakFadeRef.current) {
                    clearInterval(breakFadeRef.current);
                    breakFadeRef.current = null;
                }
                onComplete?.();
            }
        }, 100);
    }, []);
    // Monitor video play/pause state and handle video end
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !now)
            return;
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            // Send final timing update when video ends
            // Prioritize database duration when:
            // 1. It's a CDG file (fragmented MP4 streams may report incorrect durations), OR
            // 2. Pitch adjustment is applied (re-encoding creates fragmented streams)
            let duration;
            const hasPitchAdjustment = now.key_adjustment !== undefined && now.key_adjustment !== 0;
            if ((now.kind === 'cdgmp3' || hasPitchAdjustment) && now.duration_ms && now.duration_ms > 0) {
                // For CDG files or pitch-shifted tracks, always use database duration
                duration = now.duration_ms / 1000;
            }
            else {
                // For regular MP4 files without pitch adjustment, try video element first
                duration = v.duration;
                if (!isValidDuration(duration)) {
                    if (now.duration_ms) {
                        duration = now.duration_ms / 1000;
                    }
                }
            }
            // Send currentTime = duration to ensure Host detects song completion
            if (isValidDuration(duration)) {
                console.log("Video ended, sending final timing update:", duration);
                sendTimingUpdate(duration, duration, now.id);
            }
            else {
                // No valid duration available — send a sentinel value so the server
                // still marks the song as finished and advances to the next song.
                console.warn("Video ended but no valid duration available; sending sentinel timing update");
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
    // Report timing updates to server for Host page (regular videos only)
    useEffect(() => {
        if (!now)
            return;
        // YouTube timing is handled separately via YouTube IFrame API
        if (isYouTube)
            return;
        const v = videoRef.current;
        if (!v)
            return;
        // Send timing updates every 1 second
        const intervalId = setInterval(() => {
            const currentTime = v.currentTime || 0;
            // Prioritize database duration over video element duration when:
            // 1. It's a CDG file (fragmented MP4 streams may report incorrect durations), OR
            // 2. Pitch adjustment is applied (re-encoding creates fragmented streams)
            let duration;
            const hasPitchAdjustment = now.key_adjustment !== undefined && now.key_adjustment !== 0;
            if ((now.kind === 'cdgmp3' || hasPitchAdjustment) && now.duration_ms && now.duration_ms > 0) {
                // For CDG files or pitch-shifted tracks, always use database duration if available
                // because re-encoded streams produce fragmented MP4s with unreliable duration
                duration = now.duration_ms / 1000; // Convert ms to seconds
            }
            else {
                // For regular MP4 files without pitch adjustment, try video element first
                duration = v.duration;
                // Fall back to database duration if video element can't provide it
                if (!isValidDuration(duration)) {
                    if (now.duration_ms && now.duration_ms > 0) {
                        duration = now.duration_ms / 1000; // Convert ms to seconds
                    }
                }
            }
            // Send timing update - only if we have a valid duration
            if (isValidDuration(duration)) {
                sendTimingUpdate(currentTime, duration, now.id);
            }
            else {
                // Log when we can't get duration (for debugging)
                console.warn(`Cannot send timing update for song ${now.id}: duration not available (video.duration=${v.duration}, db.duration_ms=${now.duration_ms})`);
            }
        }, 1000);
        return () => clearInterval(intervalId);
    }, [now, isYouTube, sendTimingUpdate]);
    // Report YouTube timing updates using IFrame API
    useEffect(() => {
        if (!now || !isYouTube || !youtubeVideoId)
            return;
        // Create a unique player container ID
        const playerId = "youtube-player-" + youtubeVideoId;
        const IFRAME_READY_TIMEOUT = 100;
        const INIT_DELAY = 500;
        // Initialize YouTube player when API is ready
        const initPlayer = () => {
            const YT = window.YT;
            if (!YT || !YT.Player) {
                setTimeout(initPlayer, IFRAME_READY_TIMEOUT);
                return;
            }
            // Clean up existing timer
            if (youtubeTimerRef.current) {
                clearInterval(youtubeTimerRef.current);
            }
            // Create player instance (reusing existing iframe if possible)
            try {
                youtubePlayerRef.current = new YT.Player(playerId, {
                    events: {
                        onReady: (event) => {
                            console.log("YouTube player ready");
                            // Unmute the player after it's ready (video starts muted for autoplay to work)
                            try {
                                event.target.unMute();
                                event.target.setVolume(100);
                                console.log("YouTube player unmuted");
                            }
                            catch (err) {
                                console.error("Error unmuting YouTube player:", err);
                            }
                            // Start timing updates
                            youtubeTimerRef.current = setInterval(() => {
                                try {
                                    const currentTime = event.target.getCurrentTime();
                                    const duration = event.target.getDuration();
                                    if (duration && currentTime !== undefined) {
                                        // Send timing to server using helper function
                                        sendTimingUpdate(currentTime, duration, now.id);
                                    }
                                }
                                catch (err) {
                                    console.error("Error getting YouTube timing:", err);
                                }
                            }, 1000);
                        },
                        onStateChange: (event) => {
                            // YT.PlayerState.PLAYING = 1
                            if (event.data === 1) {
                                // Ensure video is unmuted when playing starts
                                try {
                                    if (event.target.isMuted()) {
                                        event.target.unMute();
                                        event.target.setVolume(100);
                                        console.log("YouTube player unmuted on play");
                                    }
                                }
                                catch (err) {
                                    console.error("Error unmuting YouTube player on play:", err);
                                }
                            }
                            // YT.PlayerState.ENDED = 0
                            if (event.data === 0) {
                                console.log("YouTube video ended, sending final timing update");
                                try {
                                    const duration = event.target.getDuration();
                                    if (isValidDuration(duration)) {
                                        // Send final timing update with currentTime = duration
                                        sendTimingUpdate(duration, duration, now.id);
                                    }
                                    else {
                                        // No valid duration from YouTube — send sentinel to force completion
                                        console.warn("YouTube ended but no valid duration; sending sentinel timing update");
                                        sendTimingUpdate(1, 1, now.id);
                                    }
                                }
                                catch (err) {
                                    console.error("Error sending final YouTube timing:", err);
                                    // If we can't get the duration after the video ends, still advance
                                    // to the next song so the session doesn't stall.
                                    sendTimingUpdate(1, 1, now.id);
                                }
                            }
                        },
                        onError: (event) => {
                            console.error("YouTube player error:", event.data);
                        },
                    },
                });
            }
            catch (err) {
                console.error("Failed to initialize YouTube player:", err);
            }
        };
        // Wait for iframe to be rendered in the DOM
        setTimeout(initPlayer, INIT_DELAY);
        return () => {
            if (youtubeTimerRef.current) {
                clearInterval(youtubeTimerRef.current);
            }
            if (youtubePlayerRef.current) {
                try {
                    youtubePlayerRef.current.destroy();
                }
                catch (err) {
                    console.warn('Failed to destroy YouTube player in cleanup:', err);
                }
                youtubePlayerRef.current = null;
            }
        };
    }, [now, isYouTube, youtubeVideoId, sendTimingUpdate]);
    useEffect(() => {
        const audio = breakAudioRef.current;
        if (!audio)
            return;
        const track = breakMusicState.currentTrack;
        const shouldPlayBreak = !now && !breakMusicState.paused && !!track?.file_path;
        const fadeDuration = Math.max(0, breakMusicState.crossfadeSeconds || 0);
        const targetVolume = Math.max(0, Math.min(1, (breakMusicState.volumePercent ?? 100) / 100));
        const trackId = track?.id ?? null;
        if (!shouldPlayBreak) {
            breakShouldPlayRef.current = false;
            breakTrackIdRef.current = trackId;
            // Reset the src reference so the next resume always calls audio.load() before
            // audio.play(). Without this, browsers that suspend idle media elements would
            // silently fail to produce audio on resume even though play() appears to succeed.
            breakTrackSrcRef.current = "";
            const pauseTrackId = trackId;
            fadeBreakAudioTo(0, fadeDuration, () => {
                if (!breakShouldPlayRef.current && breakTrackIdRef.current === pauseTrackId) {
                    audio.pause();
                }
            });
            return;
        }
        const src = `${API_BASE}/media/file?path=${encodeURIComponent(track.file_path)}`;
        const elementSrc = audio.getAttribute("src") || "";
        const srcChanged = breakTrackSrcRef.current !== src || elementSrc !== src;
        if (srcChanged) {
            audio.src = src;
            audio.load();
            breakTrackSrcRef.current = src;
        }
        if (breakMusicState.elapsedSec > 0 && (srcChanged || Math.abs((audio.currentTime || 0) - breakMusicState.elapsedSec) > 2)) {
            audio.currentTime = breakMusicState.elapsedSec;
        }
        const run = async () => {
            try {
                const shouldRestartPlayback = srcChanged ||
                    audio.paused ||
                    !breakShouldPlayRef.current ||
                    breakTrackIdRef.current !== trackId;
                if (shouldRestartPlayback) {
                    audio.volume = 0;
                    audio.muted = true;
                    await audio.play();
                    audio.muted = false;
                    fadeBreakAudioTo(targetVolume, fadeDuration);
                }
                else if (Math.abs(audio.volume - targetVolume) > 0.01) {
                    fadeBreakAudioTo(targetVolume, Math.min(1, fadeDuration || 0.5));
                }
            }
            catch {
                audio.muted = false;
                // ignore autoplay block for break audio
            }
        };
        breakShouldPlayRef.current = true;
        breakTrackIdRef.current = trackId;
        run();
    }, [
        now,
        breakMusicState.paused,
        breakMusicState.crossfadeSeconds,
        breakMusicState.volumePercent,
        breakMusicState.elapsedSec,
        breakMusicState.currentTrack?.id,
        breakMusicState.currentTrack?.file_path,
        fadeBreakAudioTo,
    ]);
    useEffect(() => {
        if (breakTimingRef.current) {
            clearInterval(breakTimingRef.current);
            breakTimingRef.current = null;
        }
        if (now || breakMusicState.paused || !breakMusicState.currentTrack?.id)
            return;
        breakTimingRef.current = setInterval(() => {
            refreshBreakMusicState().catch(() => { });
        }, 1000);
        return () => {
            if (breakTimingRef.current) {
                clearInterval(breakTimingRef.current);
                breakTimingRef.current = null;
            }
        };
    }, [breakMusicState.currentTrack?.id, breakMusicState.paused, now]);
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
        }
        else {
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
    // Build ticker text with current singer and queue
    const tickerText = useMemo(() => {
        // If nothing is playing
        if (!now) {
            if (upNext.length === 0) {
                // Show custom message at end if set, otherwise waiting message
                if (overlaySettings.customMessage) {
                    return `🎵 Waiting for singers... Add your song from the request page! 📢 ${overlaySettings.customMessage}     🎵     🎵 Waiting for singers... Add your song from the request page! 📢 ${overlaySettings.customMessage}     🎵     `;
                }
                return "🎵 Waiting for singers... Add your song from the request page! 🎵     🎵 Waiting for singers... Add your song from the request page! 🎵     ";
            }
            // Show upcoming queue when nothing is playing
            const queueText = upNext
                .slice(0, 5)
                .map((item, idx) => {
                const singer = item.requested_by || "Anonymous";
                return `${idx + 1}. ${singer}`;
            })
                .join(" • ");
            // Add countdown info if autoplay is enabled and not manually stopped
            const countdownInfo = autoPlay && countdown !== null && !manualStop
                ? `⏱️ Starting in ${countdown}s... `
                : "";
            // Add custom message at the end if set
            const fullText = overlaySettings.customMessage
                ? `${countdownInfo}🎤 QUEUE: ${queueText} 📢 ${overlaySettings.customMessage}`
                : `${countdownInfo}🎤 QUEUE: ${queueText}`;
            return `${fullText}     🎵     ${fullText}     🎵     `;
        }
        // Current singer is playing - always show who is singing
        const current = hideSingerQueueEnabled
            ? now.requested_by
                ? `🎤 NOW SINGING: ${now.requested_by}`
                : `🎤 NOW PLAYING`
            : now.requested_by
                ? `🎤 NOW SINGING: ${now.requested_by} — ${now.artist || "Unknown"} — ${now.title || "Unknown"}`
                : `🎤 NOW PLAYING: ${now.artist || "Unknown"} — ${now.title || "Unknown"}`;
        // Build queue list
        const queueText = upNext
            .slice(0, 5)
            .map((item, idx) => {
            const singer = item.requested_by || "Anonymous";
            return `${idx + 1}. ${singer}`;
        })
            .join(" • ");
        // Combine with proper spacing, adding custom message at the end if set
        let fullText = queueText ? `${current} ⭐ UP NEXT: ${queueText}` : current;
        // Add custom message at the end if set
        if (overlaySettings.customMessage) {
            fullText += ` 📢 ${overlaySettings.customMessage}`;
        }
        // Repeat for smooth scrolling with divider
        return `${fullText}     🎵     ${fullText}     🎵     `;
    }, [now, upNext, overlaySettings.customMessage, hideSingerQueueEnabled, autoPlay, countdown, manualStop]);
    // Render the overlay (shown always, unless visibility is false)
    const renderOverlay = () => {
        if (!overlaySettings.visible) {
            return null;
        }
        // Calculate scale factor based on height (default 90px = 1.0 scale)
        const scaleFactor = overlaySettings.height / 90;
        const tickerHeight = Math.round(40 * scaleFactor);
        const tickerFontSize = Math.round(16 * scaleFactor);
        const padding = Math.round(15 * scaleFactor);
        const gap = Math.round(15 * scaleFactor);
        const borderRadius = Math.round(8 * scaleFactor);
        // QR size is controlled separately
        const qrSizeValue = overlaySettings.qrSize;
        const qrPadding = Math.max(4, Math.round(qrSizeValue / 12));
        const qrBorderRadius = Math.max(8, Math.round(qrSizeValue / 8));
        const qrBlockSize = qrSizeValue + qrPadding * 2;
        const qrOffset = 15;
        const leftInset = overlaySettings.showQrCode
            ? Math.max(padding, qrOffset + qrBlockSize + gap)
            : padding;
        return (_jsxs("div", { className: "controls-overlay", style: {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "transparent",
                zIndex: 10,
                opacity: 1,
            }, children: [overlaySettings.showQrCode && (_jsx("div", { style: {
                        position: "absolute",
                        left: `${qrOffset}px`,
                        bottom: `${qrOffset}px`,
                        width: `${qrSizeValue}px`,
                        height: `${qrSizeValue}px`,
                        background: "white",
                        borderRadius: `${qrBorderRadius}px`,
                        padding: `${qrPadding}px`,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }, children: _jsx("img", { src: `${API_BASE}/api/qr`, alt: "QR", style: {
                            width: "100%",
                            height: "100%",
                            imageRendering: "crisp-edges",
                        }, onError: (e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                        } }) })), _jsxs("div", { style: {
                        height: `${overlaySettings.height}px`,
                        display: "flex",
                        alignItems: "flex-end",
                        padding: `${padding}px`,
                        paddingLeft: `${leftInset}px`,
                        gap: `${gap}px`,
                    }, children: [overlaySettings.showRoller && (_jsx("div", { style: {
                                flex: 1,
                                height: `${tickerHeight}px`,
                                overflow: "hidden",
                                position: "relative",
                                backgroundColor: "transparent",
                                borderRadius: `${borderRadius}px`,
                                display: "flex",
                                alignItems: "center",
                                paddingLeft: `${padding}px`,
                                paddingRight: `${padding}px`,
                            }, children: _jsx("div", { className: "ticker-text", style: {
                                    fontSize: `${tickerFontSize}px`,
                                    fontWeight: 600,
                                    color: "#fff",
                                    textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
                                    letterSpacing: "0.5px",
                                }, children: tickerText }) })), showControls && (_jsx("button", { onClick: toggleFullscreen, style: {
                                flexShrink: 0,
                                padding: `${Math.round(10 * scaleFactor)}px ${Math.round(20 * scaleFactor)}px`,
                                background: "rgba(255,255,255,0.15)",
                                border: "1px solid rgba(255,255,255,0.3)",
                                borderRadius: `${borderRadius}px`,
                                color: "white",
                                cursor: "pointer",
                                fontSize: `${Math.round(14 * scaleFactor)}px`,
                                fontWeight: 500,
                                transition: "all 0.3s ease",
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                                e.currentTarget.style.transform = "scale(1.05)";
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                                e.currentTarget.style.transform = "scale(1)";
                            }, children: isFullscreen ? "⊗ Exit Fullscreen" : "⛶ Fullscreen" }))] })] }));
    };
    // When nothing is playing, show waiting screen with ticker
    if (!now) {
        return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
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
        ` }), _jsxs("div", { ref: containerRef, onMouseMove: handleMouseMove, onMouseEnter: () => setShowControls(true), style: {
                        position: "relative",
                        height: "100vh",
                        width: "100vw",
                        background: "#000",
                        color: "#e5e7eb",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        cursor: showControls ? "default" : "none",
                    }, children: [_jsx("audio", { ref: breakAudioRef, preload: "auto", style: { display: "none" } }), upNext.length > 0 ? (_jsxs("div", { style: {
                                textAlign: "center",
                                padding: "20px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "24px",
                                animation: "fadeInUp 0.6s ease",
                            }, children: [autoPlay && countdown !== null && !manualStop && (_jsxs("div", { style: {
                                        fontSize: "clamp(24px, 4vw, 40px)",
                                        background: "linear-gradient(135deg, #10b981, #34d399)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text",
                                        fontWeight: 700,
                                        animation: "pulse 2s ease infinite",
                                    }, children: ["\u23F1\uFE0F Starting in ", countdown, "s..."] })), _jsx("h2", { style: {
                                        fontSize: "clamp(32px, 5vw, 56px)",
                                        margin: 0,
                                        fontWeight: 700,
                                        background: "linear-gradient(135deg, #6366f1, #a855f7)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text",
                                        letterSpacing: "-0.02em",
                                    }, children: "\uD83C\uDFA4 Up Next" }), _jsxs("div", { style: { textAlign: "center" }, children: [_jsx("div", { style: {
                                                fontSize: "clamp(24px, 4vw, 48px)",
                                                fontWeight: 700,
                                                color: "#ffffff",
                                                marginBottom: "8px",
                                            }, children: upNext[0].requested_by || "Anonymous" }), !hideSingerQueueEnabled && (_jsxs("div", { style: {
                                                fontSize: "clamp(14px, 2vw, 20px)",
                                                color: "rgba(161, 161, 170, 1)",
                                            }, children: [upNext[0].title || "Unknown", " \u2022 ", upNext[0].artist || "Unknown"] }))] })] })) : (_jsxs("div", { style: { textAlign: "center", animation: "fadeInUp 0.6s ease" }, children: [_jsx("h1", { style: {
                                        fontSize: "clamp(32px, 6vw, 64px)",
                                        fontWeight: 700,
                                        margin: "0 0 16px 0",
                                        background: "linear-gradient(135deg, #6366f1, #a855f7)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text",
                                        letterSpacing: "-0.02em",
                                    }, children: "\uD83C\uDFA4 Waiting for singers..." }), _jsx("p", { style: {
                                        fontSize: "clamp(16px, 2. 5vw, 20px)",
                                        color: "rgba(161, 161, 170, 1)",
                                        margin: 0,
                                    }, children: "Add your song from the request page!" })] })), renderOverlay()] })] }));
    }
    // Playing screen
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
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
      ` }), _jsxs("div", { ref: containerRef, onMouseMove: handleMouseMove, onMouseEnter: () => setShowControls(true), style: {
                    position: "relative",
                    height: "100vh",
                    width: "100vw",
                    background: "#000",
                    color: "#e5e7eb",
                    overflow: "hidden",
                    cursor: showControls ? "default" : "none",
                }, children: [_jsx("audio", { ref: breakAudioRef, preload: "auto", style: { display: "none" } }), isYouTube && youtubeVideoId ? (_jsx("iframe", { id: `youtube-player-${youtubeVideoId}`, ref: iframeRef, src: `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&fs=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`, referrerPolicy: "strict-origin-when-cross-origin", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowFullScreen: true, style: {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            border: "none",
                            zIndex: 1,
                        } })) : (_jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, style: {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            zIndex: 1,
                        } })), !isYouTube && needsUserInteraction && !isPlaying && (_jsx("div", { className: "play-button-overlay", onClick: handlePlayClick, children: _jsx("div", { className: "play-icon" }) })), renderOverlay()] })] }));
}
