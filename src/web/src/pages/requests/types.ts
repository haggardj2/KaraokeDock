// Data shapes used by the Request page and its dialogs.
import type { SingerProfile } from "../../components/SingerAvatar";

export type SearchRow = {
  id: number;
  title: string | null;
  artist: string | null;
  disc_id: string | null;
  kind: "mp4" | "cdgmp3" | "zip" | "mp3";
  matched_term?: string | null;
};

export type KaraokeNerdsTrack = {
  title: string;
  artist: string;
  url: string;
  brand?: string;
  source: "karaoke-nerds";
};

export type MyQueueItem = {
  id: number;
  title: string | null;
  artist: string | null;
  status: string;
};

export type BrowseCategory = "artist" | "title";

export type SelfSingerProfileResponse = {
  singerId: string;
  singerUuid: string;
  displayName: string;
  canUpload: boolean;
  profile: SingerProfile;
};

export type BrowseArtistRow = {
  artist: string;
  songCount?: number;
  versionCount?: number;
};

export type CombinedSearchTrack =
  | {
      type: "local";
      key: string;
      title: string;
      artist: string;
      discId: string | null;
      kind: string | null;
      track: SearchRow;
    }
  | {
      type: "online";
      key: string;
      title: string;
      artist: string;
      brand: string | null;
      track: KaraokeNerdsTrack;
    };

export type CombinedSearchGroup = {
  key: string;
  title: string;
  artist: string;
  versions: CombinedSearchTrack[];
};

// The "choose a version" sheet: one song title with several matching tracks.
export type VersionPicker<T> = {
  title: string;
  artist: string;
  versions: T[];
};

// Lyrics fetched per track key ("local-12", "kn-…"), shown in the lyrics popup.
export type LyricsData = {
  [key: string]: {
    loading: boolean;
    lyrics: string | null;
    error: string | null;
  };
};
