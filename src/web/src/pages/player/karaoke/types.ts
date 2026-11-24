// Shapes shared by the clean-room KaraokeDock KaraFun engine.
// The server produces this manifest from the .kit container.

export type KaraokeSyllable = { start: number; end: number; text: string };
export type KaraokeWord = { syllables: KaraokeSyllable[] };
/** Placement in KaraFun's 640×480 lyric screen. */
export type KaraokeLinePosition = { x: number; y: number; width: number; height: number };
export type KaraokeLine = {
  start: number;
  end: number;
  words: KaraokeWord[];
  /** Index into `pages`. */
  page?: number;
  position?: KaraokeLinePosition;
  /** Countdown before the first syllable, e.g. after an instrumental break. */
  countdown?: { start: number; x: number };
};
export type KaraokePage = {
  fadeInStart: number;
  fadeInDuration: number;
  fadeOutStart: number;
  fadeOutDuration: number;
  activeColor?: string;
  inactiveColor?: string;
  activeBorderColor?: string;
  inactiveBorderColor?: string;
};
export type KaraokeTimeline = {
  durationSec: number;
  lines: KaraokeLine[];
  pages?: KaraokePage[];
};

export type KaraokeTrack = {
  type: number;
  name: string;
  role: string;
  mime: string;
  size: number;
};

export type KaraokeImage = {
  type: number;
  name: string;
  mime: string;
  size: number;
};

export type KaraokePreset = {
  type: number;
  name: string;
  size: number;
};

export type KaraokeManifest = {
  songId: number;
  md5: string;
  durationSec: number;
  streamSize: number;
  notifyPlayTime: number;
  tracks: KaraokeTrack[];
  images: KaraokeImage[];
  presets: KaraokePreset[];
  imageType: number | null;
  lyrics: KaraokeTimeline;
};

/** A song mixed on the server at its queued key (GET /api/karafun/prepared/:songId). */
export type PreparedKaraokeManifest = KaraokeManifest & {
  key: number;
  audioMime: string;
  audioSize: number;
  /** AAC frame length; present when the server can stream from any frame. */
  frameSec?: number;
  frameCount?: number;
};
