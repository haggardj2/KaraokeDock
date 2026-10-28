import type { OverlaySettings } from "../../components/QueueOverlay";
import { getSingerTickerToken, type QItem, type RotationScrollerSinger } from "./helpers";

// "Artist - Title" for the break track shown in the ticker, or "" when it should not show.
export function getBreakMusicTrackText(
  overlaySettings: OverlaySettings,
  now: QItem | null,
  breakMusicState: { paused: boolean; currentTrack: { artist?: string | null; title?: string | null } | null },
): string {
  return overlaySettings.showBreakMusicTrack &&
    !now &&
    !breakMusicState.paused &&
    breakMusicState.currentTrack
    ? `${breakMusicState.currentTrack.artist || "Unknown Artist"} - ${breakMusicState.currentTrack.title}`
    : "";
}

// The scrolling ticker: who is singing, who is up next (or the singer rotation), the autoplay
// countdown, break music and the venue message. The text is doubled so the scroll loops smoothly.
export function buildTickerText({
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
}: {
  now: QItem | null;
  upNext: QItem[];
  overlaySettings: OverlaySettings;
  hideSingerQueueEnabled: boolean;
  keepRotationScrollerSingersEnabled: boolean;
  rotationScrollerSingers: RotationScrollerSinger[];
  autoPlay: boolean;
  countdown: number | null;
  manualStop: boolean;
  isCustomPlayerBackground: boolean;
  breakMusicTrackText: string;
}): string {
  const breakMusicTickerText = breakMusicTrackText
    ? `Now Playing: ${breakMusicTrackText}`
    : "";
  const rotationText = rotationScrollerSingers
    .slice(0, 8)
    .map((singer, idx) =>
      singer.hasQueuedSong
        ? `${idx + 1}. ${getSingerTickerToken(singer.displayName)}`
        : `${idx + 1}. ${getSingerTickerToken(singer.displayName)} (waiting)`,
    )
    .join(" • ");
  // If nothing is playing
  if (!now) {
    if (upNext.length === 0 && !rotationText) {
      if (breakMusicTickerText) {
        const fullText = overlaySettings.customMessage
          ? `${breakMusicTickerText} 📢 ${overlaySettings.customMessage}`
          : breakMusicTickerText;
        return `${fullText}     🎵     ${fullText}     🎵     `;
      }
      if (isCustomPlayerBackground) {
        return overlaySettings.customMessage
          ? `📢 ${overlaySettings.customMessage}     🎵     📢 ${overlaySettings.customMessage}     🎵     `
          : "";
      }
      // Show custom message at end if set, otherwise waiting message
      if (overlaySettings.customMessage) {
        return `🎵 Waiting for singers... Add your song from the request page! 📢 ${overlaySettings.customMessage}     🎵     🎵 Waiting for singers... Add your song from the request page! 📢 ${overlaySettings.customMessage}     🎵     `;
      }
      return "🎵 Waiting for singers... Add your song from the request page! 🎵     🎵 Waiting for singers... Add your song from the request page! 🎵     ";
    }

    // Show upcoming queue when nothing is playing
    const queueText =
      keepRotationScrollerSingersEnabled && rotationText
        ? rotationText
        : upNext
            .slice(0, 5)
            .map((item, idx) => {
              const singer = getSingerTickerToken(item.requested_by, true);
              return `${idx + 1}. ${singer}`;
            })
            .join(" • ");

    // Add countdown info if autoplay is enabled and not manually stopped
    const countdownInfo =
      autoPlay && countdown !== null && !manualStop
        ? `⏱️ Starting in ${countdown}s... `
        : "";

    // Add custom message at the end if set
    const idleNowPlaying = breakMusicTickerText
      ? `${breakMusicTickerText} • `
      : "";
    const fullText = overlaySettings.customMessage
      ? `${countdownInfo}${idleNowPlaying}🎤 QUEUE: ${queueText} 📢 ${overlaySettings.customMessage}`
      : `${countdownInfo}${idleNowPlaying}🎤 QUEUE: ${queueText}`;
    return `${fullText}     🎵     ${fullText}     🎵     `;
  }

  // Current singer is playing - always show who is singing
  const current = hideSingerQueueEnabled
    ? now.requested_by
      ? `🎤 NOW SINGING: ${getSingerTickerToken(now.requested_by)}`
      : `🎤 NOW PLAYING`
    : now.requested_by
      ? `🎤 NOW SINGING: ${getSingerTickerToken(now.requested_by)}: ${now.artist || "Unknown"} — ${now.title || "Unknown"}`
      : `🎤 NOW PLAYING: ${now.artist || "Unknown"} — ${now.title || "Unknown"}`;

  // Build queue list
  const queueText =
    keepRotationScrollerSingersEnabled && rotationText
      ? rotationText
      : upNext
          .slice(0, 5)
          .map((item, idx) => {
            const singer = getSingerTickerToken(item.requested_by, true);
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
}
