import { API_BASE } from './api'

// Player background settings shared by the Host controls and the Player display.

export type PlayerBackgroundMode = 'default' | 'image' | 'slideshow'
export type PlayerBackgroundTransitionStyle = 'fade' | 'slide' | 'zoom'

export type PlayerBackgroundSlideshowImage = {
  id: string
  filename?: string | null
  imageUrl: string
  updatedAt: string
}

export type PlayerBackgroundLibraryImage = {
  filename: string
  imageUrl: string
  updatedAt: string
  size: number
}

export type PlayerBackgroundSettings = {
  mode: PlayerBackgroundMode
  imageUrl: string | null
  imageFilename: string | null
  updatedAt: string | null
  slideshowImages: PlayerBackgroundSlideshowImage[]
  slideshowTransitionStyle: PlayerBackgroundTransitionStyle
  slideshowIntervalSeconds: number
  slideshowTransitionDurationSeconds: number
}

export const PLAYER_BACKGROUND_IMAGE_MAX_BYTES = 8 * 1024 * 1024
export const PLAYER_BACKGROUND_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
export const PLAYER_BACKGROUND_SLIDESHOW_MIN_INTERVAL_SECONDS = 3
export const PLAYER_BACKGROUND_SLIDESHOW_MAX_INTERVAL_SECONDS = 300
export const PLAYER_BACKGROUND_SLIDESHOW_MIN_TRANSITION_DURATION_SECONDS = 0.5
export const PLAYER_BACKGROUND_SLIDESHOW_MAX_TRANSITION_DURATION_SECONDS = 10

export const DEFAULT_PLAYER_BACKGROUND_SETTINGS: PlayerBackgroundSettings = {
  mode: 'default',
  imageUrl: null,
  imageFilename: null,
  updatedAt: null,
  slideshowImages: [],
  slideshowTransitionStyle: 'fade',
  slideshowIntervalSeconds: 10,
  slideshowTransitionDurationSeconds: 3,
}

export function normalizePlayerBackgroundSettings(value: unknown): PlayerBackgroundSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_PLAYER_BACKGROUND_SETTINGS
  }
  const settings = value as Partial<PlayerBackgroundSettings>
  const imageUrl = typeof settings.imageUrl === 'string' && settings.imageUrl.trim()
    ? settings.imageUrl
    : null
  const slideshowImages = Array.isArray(settings.slideshowImages)
    ? settings.slideshowImages.filter((image): image is PlayerBackgroundSlideshowImage => (
      !!image &&
      typeof image.id === 'string' &&
      (image.filename == null || typeof image.filename === 'string') &&
      typeof image.imageUrl === 'string' &&
      typeof image.updatedAt === 'string'
    ))
    : []
  const mode =
    settings.mode === 'image' && imageUrl
      ? 'image'
      : settings.mode === 'slideshow' && slideshowImages.length > 0
        ? 'slideshow'
        : 'default'
  const interval = Number(settings.slideshowIntervalSeconds)
  const transitionDuration = Number(settings.slideshowTransitionDurationSeconds)
  return {
    mode,
    imageUrl,
    imageFilename: typeof settings.imageFilename === 'string' && settings.imageFilename.trim()
      ? settings.imageFilename
      : null,
    updatedAt: typeof settings.updatedAt === 'string' && settings.updatedAt.trim()
      ? settings.updatedAt
      : null,
    slideshowImages,
    slideshowTransitionStyle:
      settings.slideshowTransitionStyle === 'slide' || settings.slideshowTransitionStyle === 'zoom'
        ? settings.slideshowTransitionStyle
        : 'fade',
    slideshowIntervalSeconds: Number.isFinite(interval)
      ? Math.max(
        PLAYER_BACKGROUND_SLIDESHOW_MIN_INTERVAL_SECONDS,
        Math.min(PLAYER_BACKGROUND_SLIDESHOW_MAX_INTERVAL_SECONDS, Math.round(interval)),
      )
      : DEFAULT_PLAYER_BACKGROUND_SETTINGS.slideshowIntervalSeconds,
    slideshowTransitionDurationSeconds: Number.isFinite(transitionDuration)
      ? Math.max(
        PLAYER_BACKGROUND_SLIDESHOW_MIN_TRANSITION_DURATION_SECONDS,
        Math.min(
          PLAYER_BACKGROUND_SLIDESHOW_MAX_TRANSITION_DURATION_SECONDS,
          Math.round(transitionDuration * 10) / 10,
        ),
      )
      : DEFAULT_PLAYER_BACKGROUND_SETTINGS.slideshowTransitionDurationSeconds,
  }
}

export function getApiAssetUrl(pathOrUrl: string | null): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${API_BASE}${pathOrUrl}`
}

export function isPlayerBackgroundLibraryImage(value: unknown): value is PlayerBackgroundLibraryImage {
  if (!value || typeof value !== 'object') return false
  const image = value as Partial<PlayerBackgroundLibraryImage>
  return (
    typeof image.filename === 'string' &&
    typeof image.imageUrl === 'string' &&
    typeof image.updatedAt === 'string' &&
    typeof image.size === 'number'
  )
}
