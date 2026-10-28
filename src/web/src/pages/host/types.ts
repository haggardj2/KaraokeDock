// Data shapes used across the Host page and its dialogs.
import type { SingerProfile, ProfileCrop } from '../../components/SingerAvatar'

export type Row = {
  id: number
  track_id: number
  requested_by: string | null
  status: 'queued' | 'playing' | 'done'
  position: number
  title: string | null
  artist: string | null
  disc_id?: string | null
  kind: 'mp4' | 'cdgmp3' | 'zip' | 'mp3'
  duration_ms?: number | null
  key_adjustment?: number
}

export type QueueSong = {
  queueId: number
  trackId: number | null
  title: string | null
  artist: string | null
  discId?: string | null
  status: string
  position: number | null
  requestedAt: string | null
  startedAt: string | null
  completedAt: string | null
  keyAdjustment: number
  durationMs: number | null
  requestedBy: string | null
}

export type QueueSinger = {
  singerId: string
  publicUuid?: string | null
  displayName: string
  status: string
  rotationPosition: number | null
  lastSangAt: string | null
  totalSongsSung: number
  nextSong: QueueSong | null
  queuedSongs: QueueSong[]
  completedSongs: QueueSong[]
  completedSongsCount: number
  queuedSongsCount: number
  profile: SingerProfile
}

export type ActiveRotation = {
  id: string | number
  type: string
  config: Record<string, unknown>
  currentRound: number
}

export type QueueState = {
  activeRotation: ActiveRotation | null
  nowPlaying: QueueSong | null
  queueOrder: QueueSinger[]
  completedHistory: QueueSong[]
  flatQueue: QueueSong[]
}

export type SingerHistorySong = {
  queueId: number
  trackId: number | null
  title: string | null
  artist: string | null
  discId?: string | null
  status: string
  position: number | null
  requestedAt: string | null
  startedAt: string | null
  completedAt: string | null
  keyAdjustment: number
  durationMs: number | null
}

export type SingerHistory = {
  singer: {
    id: string
    displayName: string
    normalizedName: string
    status: string
    totalSongsSung: number
    lastSangAt: string | null
    profile: SingerProfile
  }
  queuedSongs: SingerHistorySong[]
  completedSongs: SingerHistorySong[]
  skippedSongs: SingerHistorySong[]
  removedSongs: SingerHistorySong[]
  allSongs: SingerHistorySong[]
}

export type SingerHistoryKdSinger = {
  singer?: {
    id?: string
    displayName?: string
    normalizedName?: string
    profile?: {
      imageSource?: 'oidc' | 'upload' | null
      imageUrl?: string | null
      imageMime?: string | null
      imageDataBase64?: string | null
      focusX?: number | null
      focusY?: number | null
      crop?: ProfileCrop | null
      updatedAt?: string | null
    }
  }
  songs?: unknown[]
}

export type SingerHistoryKdFile = {
  format?: string
  version?: number
  exportedAt?: string
  singers?: SingerHistoryKdSinger[]
}

export type ArchivedSinger = {
  singerId: string
  displayName: string
  status: string
  totalSongsSung: number
  historyCount: number
  lastSangAt: string | null
  profile: SingerProfile
}

export type OidcPublicConfig = {
  enabled: boolean
  buttonText: string
  buttonColor: string
  passwordLoginEnabled: boolean
}

export type BreakPlaylist = {
  id: number
  name: string
}

export type BreakColumnVisibility = {
  song: boolean
  artist: boolean
  genre: boolean
  length: boolean
  path: boolean
}

export type BreakColumnKey = keyof BreakColumnVisibility

export type BreakColumnWidths = Record<BreakColumnKey, number>

export type BreakSortDirection = 'asc' | 'desc'

export type BreakSortState = {
  column: BreakColumnKey
  direction: BreakSortDirection
}
