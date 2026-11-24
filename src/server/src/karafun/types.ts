// Types shared by the KaraFun server integration.
// These mirror the subset of the KaraFun API and .kit container the app needs.

export interface KarafunConfig {
  enabled: boolean;
  username: string;
  /** MD5 of the substituted password (same value the desktop app stores). Never expose. */
  passwordHash: string;
}

export interface KarafunSession {
  key: string;
  userId: number;
  userLogin: string;
  plan?: string;
  planCaption?: string;
  isPro: boolean;
  subscriptionEndDate?: string;
  imagesUrlSchema?: string;
}

export interface KarafunSongSummary {
  id: number;
  content?: string;
  meta?: string;
}

export interface KarafunTrackInfo {
  type?: string;
  file?: string;
  caption?: string;
  index?: number;
}

export interface KarafunSongDetail {
  id: number;
  title: string;
  artist: string;
  artistId?: number;
  year?: number;
  durationSec: number;
  bpm?: number;
  keys?: string;
  imageId?: string;
  content?: string;
  meta?: string;
  explicit?: boolean;
  preview?: boolean;
  previewLenSec?: number;
  previewStartSec?: number;
  free?: boolean;
  tracks: KarafunTrackInfo[];
  /** Present on /song/request responses. */
  stream?: string;
  filesize?: number;
  md5?: string;
  notifyPlay?: number;
}

export interface KarafunSearchResult {
  source: 'karafun';
  songId: number;
  title: string;
  artist: string;
  year?: number;
  durationMs?: number;
  imageId?: string;
  imageUrl?: string;
  content?: string;
  meta?: string;
  brand: 'KaraFun';
}

export interface KarafunMediaDescriptor {
  stream: string;
  filesize: number;
  md5: string;
  durationSec: number;
  preview: boolean;
  previewStartSec: number;
  notifyPlay?: number;
  song: KarafunSongDetail;
}

export type KarafunKitFileKind = 'audio' | 'image' | 'preset' | 'xml' | 'binary';

export interface KarafunKitFile {
  type: number;
  name: string;
  label: string;
  kind: KarafunKitFileKind;
  mime: string;
  size: number;
  data: Uint8Array;
}

export interface KarafunKit {
  magic: number;
  directory: Array<{ type: number; totalSize: number }>;
  chunks: Array<{ type: number; size: number; offset: number; dataStart: number }>;
  files: KarafunKitFile[];
  xml: string;
  audioFiles: KarafunKitFile[];
  imageFiles: KarafunKitFile[];
  presetFiles: KarafunKitFile[];
}


