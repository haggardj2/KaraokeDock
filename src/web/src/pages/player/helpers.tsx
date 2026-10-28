// Types and pure helpers for the Player (TV) page: request URL, YouTube ids, overlay settings and the ticker.
import { Fragment, type ReactNode } from "react";
import type { OverlaySettings } from "../../components/QueueOverlay";
import SingerAvatar, { type SingerProfile } from "../../components/SingerAvatar";

export type QItem = {
  id: number | string;
  track_id?: number | string;
  artist?: string;
  title?: string;
  requested_by?: string | null;
  status?: "queued" | "playing" | "finished" | string;
  kind?: "mp4" | "cdgmp3" | string;
  file_mp4?: string;
  file_mp3?: string;
  file_cdg?: string;
  path?: string;
  external_url?: string;
  source?: string;
  duration_ms?: number | null;
  key_adjustment?: number;
  profile?: SingerProfile | null;
};

export type BreakMusicState = {
  paused: boolean;
  pauseDuringKaraoke: boolean;
  mutedForKaraoke: boolean;
  crossfadeSeconds: number;
  volumePercent: number;
  elapsedSec: number;
  currentStartedAt: string | null;
  currentTrack: {
    id: number;
    title: string;
    artist: string | null;
    duration_ms: number | null;
    file_path: string;
  } | null;
};

export type RotationScrollerSinger = {
  displayName: string;
  position: number;
  hasQueuedSong: boolean;
  profile: SingerProfile;
};

export function getDefaultRequestsUrl(): string {
  if (typeof window === "undefined" || !window.location?.origin) {
    return "/request";
  }
  return new URL("/request", window.location.origin).toString();
}

export function formatRequestsUrlForDisplay(value: string): string {
  try {
    const parsed = new URL(
      value,
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost",
    );
    const trimmedPath = parsed.pathname
      .replace(/\/requests?\/?$/i, "")
      .replace(/\/$/, "");
    return `${parsed.host}${trimmedPath}`;
  } catch {
    return value
      .replace(/^https?:\/\//i, "")
      .replace(/\/requests?\/?$/i, "")
      .replace(/\/$/, "");
  }
}

// Helper function to extract YouTube video ID from URL
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const normalizedUrl = url.trim();
  const directIdMatch = normalizedUrl.match(/^([a-zA-Z0-9_-]{11})$/);
  if (directIdMatch?.[1]) {
    return directIdMatch[1];
  }

  const normalizeVideoId = (candidate: string | null | undefined) =>
    candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    const segments = parsedUrl.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be") {
      return normalizeVideoId(segments[0]);
    }

    if (
      hostname.endsWith("youtube.com") ||
      hostname.endsWith("youtube-nocookie.com")
    ) {
      const queryVideoId = normalizeVideoId(parsedUrl.searchParams.get("v"));
      if (queryVideoId) return queryVideoId;

      if (
        segments[0] === "embed" ||
        segments[0] === "shorts" ||
        segments[0] === "live"
      ) {
        return normalizeVideoId(segments[1]);
      }
    }

  } catch {
    return null;
  }

  return null;
}

export function describeYouTubeIframeError(code: unknown): string {
  switch (Number(code)) {
    case 2:
      return "The YouTube video id or request parameters are invalid.";
    case 5:
      return "The video cannot be played by the HTML5 YouTube player.";
    case 100:
      return "The YouTube video was not found or is private.";
    case 101:
    case 150:
      return "The video owner does not allow embedded playback.";
    case 153:
      return "YouTube rejected the embedded player configuration, usually because the request did not include an acceptable HTTP Referer.";
    default:
      return "The YouTube iframe player reported an unknown playback error.";
  }
}

// Helper function to validate duration values
export function isValidDuration(duration: number | null | undefined): boolean {
  return (
    duration != null && !isNaN(duration) && isFinite(duration) && duration > 0
  );
}

/**
 * Format a singer's display name.
 * If short=true and the name has a first + last component, return "First L."
 */
export function formatSingerName(
  name: string | null | undefined,
  short = false,
): string {
  if (!name) return "Anonymous";
  if (!short) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  visible: true,
  height: 90,
  qrSize: 60,
  customMessage: "",
  showRoller: true,
  showQrCode: true,
  hideSingerQueue: false,
  keepRotationScrollerSingers: false,
  showRequestsUrl: true,
  showBreakMusicTrack: false,
  showProfilePictures: true,
};

export function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

export function normalizeOverlaySettings(value: unknown): OverlaySettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_OVERLAY_SETTINGS;
  }
  const settings = value as Partial<OverlaySettings>;
  return {
    visible: parseBoolean(settings.visible, DEFAULT_OVERLAY_SETTINGS.visible),
    height:
      typeof settings.height === "number"
        ? settings.height
        : DEFAULT_OVERLAY_SETTINGS.height,
    qrSize:
      typeof settings.qrSize === "number"
        ? settings.qrSize
        : DEFAULT_OVERLAY_SETTINGS.qrSize,
    customMessage:
      typeof settings.customMessage === "string"
        ? settings.customMessage
        : DEFAULT_OVERLAY_SETTINGS.customMessage,
    showRoller: parseBoolean(
      settings.showRoller,
      DEFAULT_OVERLAY_SETTINGS.showRoller,
    ),
    showQrCode: parseBoolean(
      settings.showQrCode,
      DEFAULT_OVERLAY_SETTINGS.showQrCode,
    ),
    hideSingerQueue: parseBoolean(
      settings.hideSingerQueue,
      DEFAULT_OVERLAY_SETTINGS.hideSingerQueue,
    ),
    keepRotationScrollerSingers: parseBoolean(
      settings.keepRotationScrollerSingers,
      DEFAULT_OVERLAY_SETTINGS.keepRotationScrollerSingers,
    ),
    showRequestsUrl: parseBoolean(
      settings.showRequestsUrl,
      DEFAULT_OVERLAY_SETTINGS.showRequestsUrl,
    ),
    showBreakMusicTrack: parseBoolean(
      settings.showBreakMusicTrack,
      DEFAULT_OVERLAY_SETTINGS.showBreakMusicTrack,
    ),
    showProfilePictures: parseBoolean(
      settings.showProfilePictures,
      DEFAULT_OVERLAY_SETTINGS.showProfilePictures,
    ),
  };
}

export function getSingerTickerToken(name: string | null | undefined, short = false): string {
  if (!name) return "Anonymous";
  return `[[SINGER:${encodeURIComponent(name)}:${short ? "1" : "0"}]]`;
}

export function renderHighlightedTickerText(text: string, highlightedText: string, keyPrefix: string) {
  if (!highlightedText || !text.includes(highlightedText)) return text;
  return text.split(highlightedText).map((part, index) => (
    <Fragment key={`${keyPrefix}-${index}-${part.length}`}>
      {index > 0 && (
        <span
          style={{
            color: "#facc15",
            fontWeight: 800,
            textShadow:
              "0 0 12px rgba(250, 204, 21, 0.65), 2px 2px 4px rgba(0,0,0,0.95)",
          }}
        >
          {highlightedText}
        </span>
      )}
      {part}
    </Fragment>
  ));
}

export function renderTickerText(
  text: string,
  highlightedText: string,
  singers: RotationScrollerSinger[],
  showProfilePictures: boolean,
) {
  const profileByName = new Map(
    singers.map((singer) => [singer.displayName.trim().toLocaleLowerCase(), singer.profile]),
  );
  const tokenPattern = /\[\[SINGER:([^:\]]+):([01])\]\]/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      nodes.push(renderHighlightedTickerText(segment, highlightedText, `text-${lastIndex}`));
    }
    const fullName = decodeURIComponent(match[1]);
    const displayName = formatSingerName(fullName, match[2] === "1");
    const profile = profileByName.get(fullName.trim().toLocaleLowerCase());
    nodes.push(
      <span
        key={`singer-${match.index}-${fullName}`}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.38em", verticalAlign: "middle" }}
      >
        {showProfilePictures && profile?.imageUrl && <SingerAvatar name={fullName} profile={profile} size="1.7em" />}
        <span>{displayName}</span>
      </span>,
    );
    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(renderHighlightedTickerText(text.slice(lastIndex), highlightedText, `text-${lastIndex}`));
  }
  return nodes.length > 0 ? nodes : renderHighlightedTickerText(text, highlightedText, "text");
}
