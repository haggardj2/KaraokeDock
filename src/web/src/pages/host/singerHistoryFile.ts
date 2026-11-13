import type { SingerHistoryKdSinger } from './types'

// Helpers for KaraokeDock singer-history (.kd) export files.

export function getKdSingerDisplayName(singer: SingerHistoryKdSinger, index: number): string {
  return singer.singer?.displayName?.trim() || `Singer ${index + 1}`
}

export function getKdSingerAvatarUrl(singer: SingerHistoryKdSinger): string | null {
  const profile = singer.singer?.profile
  if (profile?.imageSource === 'upload' && profile.imageMime && profile.imageDataBase64) {
    return `data:${profile.imageMime};base64,${profile.imageDataBase64}`
  }
  return profile?.imageUrl ?? null
}
