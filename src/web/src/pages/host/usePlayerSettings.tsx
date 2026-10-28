import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import type { OverlaySettings } from '../../components/QueueOverlay'
import {
  PLAYER_BACKGROUND_IMAGE_MAX_BYTES,
  PLAYER_BACKGROUND_IMAGE_TYPES,
  PLAYER_BACKGROUND_SLIDESHOW_MAX_INTERVAL_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MAX_TRANSITION_DURATION_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MIN_INTERVAL_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MIN_TRANSITION_DURATION_SECONDS,
  getApiAssetUrl,
  isPlayerBackgroundLibraryImage,
  normalizePlayerBackgroundSettings,
  type PlayerBackgroundLibraryImage,
  type PlayerBackgroundMode,
  type PlayerBackgroundSettings,
  type PlayerBackgroundSlideshowImage,
  type PlayerBackgroundTransitionStyle,
} from '../../playerBackground'

// Player display settings edited from the Host's Player Settings dialog: TV overlay,
// background image/slideshow and rotation type. Loaded when Host opens so the dialog shows current values.
export function usePlayerSettings({ headers, refreshQueue, refreshQueueState }: {
  headers: Record<string, string>
  refreshQueue: () => Promise<void>
  refreshQueueState: () => Promise<void>
}) {
  const auth = useAuth()
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [overlayHeight, setOverlayHeight] = useState(90)
  const [qrSize, setQrSize] = useState(60)
  const [customMessage, setCustomMessage] = useState('')
  const [showRoller, setShowRoller] = useState(true)
  const [showQrCode, setShowQrCode] = useState(true)
  const [hideSingerQueue, setHideSingerQueue] = useState(false)
  const [keepRotationScrollerSingers, setKeepRotationScrollerSingers] = useState(false)
  const [showRequestsUrl, setShowRequestsUrl] = useState(true)
  const [showBreakMusicTrack, setShowBreakMusicTrack] = useState(false)
  const [showProfilePictures, setShowProfilePictures] = useState(true)
  const [playerBackgroundMode, setPlayerBackgroundMode] = useState<PlayerBackgroundMode>('default')
  const [playerBackgroundImageUrl, setPlayerBackgroundImageUrl] = useState<string | null>(null)
  const [playerBackgroundImageFilename, setPlayerBackgroundImageFilename] = useState<string | null>(null)
  const [playerBackgroundUpdatedAt, setPlayerBackgroundUpdatedAt] = useState<string | null>(null)
  const [playerBackgroundLibraryImages, setPlayerBackgroundLibraryImages] = useState<PlayerBackgroundLibraryImage[]>([])
  const [playerBackgroundImageUploadDir, setPlayerBackgroundImageUploadDir] = useState('/media/images')
  const [playerBackgroundLibraryLoading, setPlayerBackgroundLibraryLoading] = useState(false)
  const [playerBackgroundSlideshowImages, setPlayerBackgroundSlideshowImages] = useState<PlayerBackgroundSlideshowImage[]>([])
  const [playerBackgroundSlideshowTransitionStyle, setPlayerBackgroundSlideshowTransitionStyle] = useState<PlayerBackgroundTransitionStyle>('fade')
  const [playerBackgroundSlideshowIntervalSeconds, setPlayerBackgroundSlideshowIntervalSeconds] = useState(10)
  const [playerBackgroundSlideshowTransitionDurationSeconds, setPlayerBackgroundSlideshowTransitionDurationSeconds] = useState(3)
  const [playerBackgroundUploading, setPlayerBackgroundUploading] = useState(false)
  const [playerBackgroundError, setPlayerBackgroundError] = useState('')
  const [activeRotationId, setActiveRotationId] = useState<string | null>(null)
  const [rotationType, setRotationType] = useState<string>('strict_round_robin')
  const [savingRotationType, setSavingRotationType] = useState(false)
  const playerBackgroundImageInputRef = useRef<HTMLInputElement | null>(null)
  const playerBackgroundSlideshowLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playerBackgroundPreviewUrl = useMemo(() => getApiAssetUrl(playerBackgroundImageUrl), [playerBackgroundImageUrl])
  const playerBackgroundLibraryPreviewUrls = useMemo(
    () => playerBackgroundLibraryImages.map((image) => ({ ...image, imageUrl: getApiAssetUrl(image.imageUrl) || image.imageUrl })),
    [playerBackgroundLibraryImages],
  )
  const playerBackgroundSlideshowPreviewUrls = useMemo(
    () => playerBackgroundSlideshowImages.map((image) => ({ ...image, imageUrl: getApiAssetUrl(image.imageUrl) || image.imageUrl })),
    [playerBackgroundSlideshowImages],
  )

  // Fetch initial overlay settings
  useEffect(() => {
    api('/api/overlay/settings')
      .then((settings: OverlaySettings) => {
        setOverlayVisible(settings.visible)
        setOverlayHeight(settings.height)
        setQrSize(settings.qrSize)
        setCustomMessage(settings.customMessage || '')
        setShowRoller(settings.showRoller ?? true)
        setShowQrCode(settings.showQrCode ?? true)
        setHideSingerQueue(settings.hideSingerQueue ?? false)
        setKeepRotationScrollerSingers(settings.keepRotationScrollerSingers ?? false)
        setShowRequestsUrl(settings.showRequestsUrl ?? true)
        setShowBreakMusicTrack(settings.showBreakMusicTrack ?? false)
        setShowProfilePictures(settings.showProfilePictures ?? true)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    api('/api/player/background/settings')
      .then(applyPlayerBackgroundSettings)
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadPlayerBackgroundLibraryImages()
  }, [auth.sessionToken, auth.canHost])

  useEffect(() => () => clearPlayerBackgroundSlideshowLongPressTimer(), [])

  async function updateOverlaySettings(
    visible: boolean,
    height: number,
    qrSizeVal: number,
    message?: string,
    rollerVal?: boolean,
    qrCodeVal?: boolean,
    hideSingerQueueVal?: boolean,
    keepRotationScrollerSingersVal?: boolean,
    showRequestsUrlVal?: boolean,
    showBreakMusicTrackVal?: boolean,
    showProfilePicturesVal?: boolean,
  ) {
    if (!auth.sessionToken || !auth.canHost) return
    try {
      await api('/api/overlay/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          visible,
          height,
          qrSize: qrSizeVal,
          customMessage: message ?? customMessage,
          showRoller: rollerVal ?? showRoller,
          showQrCode: qrCodeVal ?? showQrCode,
          hideSingerQueue: hideSingerQueueVal ?? hideSingerQueue,
          keepRotationScrollerSingers: keepRotationScrollerSingersVal ?? keepRotationScrollerSingers,
          showRequestsUrl: showRequestsUrlVal ?? showRequestsUrl,
          showBreakMusicTrack: showBreakMusicTrackVal ?? showBreakMusicTrack,
          showProfilePictures: showProfilePicturesVal ?? showProfilePictures,
        })
      })
    } catch (err) {
      console.error('Failed to update overlay settings:', err)
    }
  }

  function applyPlayerBackgroundSettings(settings: unknown) {
    const normalized = normalizePlayerBackgroundSettings(settings)
    setPlayerBackgroundMode(normalized.mode)
    setPlayerBackgroundImageUrl(normalized.imageUrl)
    setPlayerBackgroundImageFilename(normalized.imageFilename)
    setPlayerBackgroundUpdatedAt(normalized.updatedAt)
    setPlayerBackgroundSlideshowImages(normalized.slideshowImages)
    setPlayerBackgroundSlideshowTransitionStyle(normalized.slideshowTransitionStyle)
    setPlayerBackgroundSlideshowIntervalSeconds(normalized.slideshowIntervalSeconds)
    setPlayerBackgroundSlideshowTransitionDurationSeconds(normalized.slideshowTransitionDurationSeconds)
  }

  async function loadPlayerBackgroundLibraryImages() {
    if (!auth.sessionToken || !auth.canHost) return
    setPlayerBackgroundLibraryLoading(true)
    try {
      const result = await api('/api/player/background/library-images', { headers })
      const images = Array.isArray(result?.images)
        ? result.images.filter(isPlayerBackgroundLibraryImage)
        : []
      setPlayerBackgroundLibraryImages(images)
      if (typeof result?.uploadDir === 'string' && result.uploadDir.trim()) {
        setPlayerBackgroundImageUploadDir(result.uploadDir)
      }
    } catch (err: any) {
      setPlayerBackgroundError(err?.message || 'Failed to load image directory')
    } finally {
      setPlayerBackgroundLibraryLoading(false)
    }
  }

  async function updatePlayerBackgroundSettings(updates: {
    mode?: PlayerBackgroundMode
    slideshowTransitionStyle?: PlayerBackgroundTransitionStyle
    slideshowIntervalSeconds?: number
    slideshowTransitionDurationSeconds?: number
  }) {
    if (!auth.sessionToken || !auth.canHost) return
    const previous = {
      mode: playerBackgroundMode,
      slideshowTransitionStyle: playerBackgroundSlideshowTransitionStyle,
      slideshowIntervalSeconds: playerBackgroundSlideshowIntervalSeconds,
      slideshowTransitionDurationSeconds: playerBackgroundSlideshowTransitionDurationSeconds,
    }
    if (updates.mode) setPlayerBackgroundMode(updates.mode)
    if (updates.slideshowTransitionStyle) setPlayerBackgroundSlideshowTransitionStyle(updates.slideshowTransitionStyle)
    if (typeof updates.slideshowIntervalSeconds === 'number') {
      setPlayerBackgroundSlideshowIntervalSeconds(updates.slideshowIntervalSeconds)
    }
    if (typeof updates.slideshowTransitionDurationSeconds === 'number') {
      setPlayerBackgroundSlideshowTransitionDurationSeconds(updates.slideshowTransitionDurationSeconds)
    }
    setPlayerBackgroundError('')
    try {
      const settings = await api('/api/player/background/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: updates.mode,
          slideshowTransitionStyle: updates.slideshowTransitionStyle,
          slideshowIntervalSeconds: updates.slideshowIntervalSeconds,
          slideshowTransitionDurationSeconds: updates.slideshowTransitionDurationSeconds,
        }),
      })
      applyPlayerBackgroundSettings(settings)
    } catch (err: any) {
      setPlayerBackgroundMode(previous.mode)
      setPlayerBackgroundSlideshowTransitionStyle(previous.slideshowTransitionStyle)
      setPlayerBackgroundSlideshowIntervalSeconds(previous.slideshowIntervalSeconds)
      setPlayerBackgroundSlideshowTransitionDurationSeconds(previous.slideshowTransitionDurationSeconds)
      setPlayerBackgroundError(err?.message || 'Failed to update player background')
    }
  }

  function choosePlayerBackgroundMode(mode: PlayerBackgroundMode) {
    if (
      (mode === 'image' && !playerBackgroundImageUrl) ||
      (mode === 'slideshow' && playerBackgroundSlideshowImages.length === 0)
    ) {
      setPlayerBackgroundMode(mode)
      setPlayerBackgroundError('')
      return
    }
    updatePlayerBackgroundSettings({ mode })
  }

  async function uploadPlayerBackgroundImage(file: File) {
    if (!auth.sessionToken || !auth.canHost) return
    if (!PLAYER_BACKGROUND_IMAGE_TYPES.has(file.type)) {
      setPlayerBackgroundError('Choose a PNG, JPEG, WebP, or GIF image.')
      return
    }
    if (file.size > PLAYER_BACKGROUND_IMAGE_MAX_BYTES) {
      setPlayerBackgroundError('Choose an image smaller than 8 MB.')
      return
    }

    setPlayerBackgroundUploading(true)
    setPlayerBackgroundError('')
    try {
      const settings = await api('/api/player/background/image', {
        method: 'POST',
        headers: {
          'x-session-token': auth.sessionToken,
          'Content-Type': file.type,
        },
        body: file,
      })
      applyPlayerBackgroundSettings(settings)
      await loadPlayerBackgroundLibraryImages()
    } catch (err: any) {
      setPlayerBackgroundError(err?.message || 'Failed to upload player background image')
    } finally {
      setPlayerBackgroundUploading(false)
    }
  }

  async function uploadPlayerBackgroundSlideshowImages(files: File[]) {
    if (!auth.sessionToken || !auth.canHost || files.length === 0) return
    const invalidFile = files.find((file) => !PLAYER_BACKGROUND_IMAGE_TYPES.has(file.type))
    if (invalidFile) {
      setPlayerBackgroundError(`${invalidFile.name} is not a PNG, JPEG, WebP, or GIF image.`)
      return
    }
    const oversizedFile = files.find((file) => file.size > PLAYER_BACKGROUND_IMAGE_MAX_BYTES)
    if (oversizedFile) {
      setPlayerBackgroundError(`${oversizedFile.name} is larger than 8 MB.`)
      return
    }

    setPlayerBackgroundUploading(true)
    setPlayerBackgroundError('')
    try {
      let latestSettings: unknown = null
      for (const file of files) {
        latestSettings = await api('/api/player/background/slideshow-images', {
          method: 'POST',
          headers: {
            'x-session-token': auth.sessionToken,
            'Content-Type': file.type,
          },
          body: file,
        })
      }
      if (latestSettings) {
        applyPlayerBackgroundSettings(latestSettings)
      }
      await loadPlayerBackgroundLibraryImages()
    } catch (err: any) {
      setPlayerBackgroundError(err?.message || 'Failed to upload slideshow images')
    } finally {
      setPlayerBackgroundUploading(false)
    }
  }

  async function clearPlayerBackgroundImage() {
    if (!auth.sessionToken || !auth.canHost) return
    setPlayerBackgroundError('')
    try {
      const settings = await api('/api/player/background/image', {
        method: 'DELETE',
        headers,
      })
      applyPlayerBackgroundSettings(settings)
    } catch (err: any) {
      setPlayerBackgroundError(err?.message || 'Failed to remove player background image')
    }
  }

  async function clearPlayerBackgroundSlideshowImages() {
    if (!auth.sessionToken || !auth.canHost) return
    setPlayerBackgroundError('')
    try {
      const settings = await api('/api/player/background/slideshow-images', {
        method: 'DELETE',
        headers,
      })
      applyPlayerBackgroundSettings(settings)
    } catch (err: any) {
      setPlayerBackgroundError(err?.message || 'Failed to clear slideshow images')
    }
  }

  function clearPlayerBackgroundSlideshowLongPressTimer() {
    if (playerBackgroundSlideshowLongPressTimerRef.current) {
      clearTimeout(playerBackgroundSlideshowLongPressTimerRef.current)
      playerBackgroundSlideshowLongPressTimerRef.current = null
    }
  }

  function confirmRemovePlayerBackgroundSlideshowImage(imageId: string) {
    if (window.confirm('Remove this slideshow image?')) {
      removePlayerBackgroundSlideshowImage(imageId)
    }
  }

  function startPlayerBackgroundSlideshowImageLongPress(imageId: string) {
    clearPlayerBackgroundSlideshowLongPressTimer()
    playerBackgroundSlideshowLongPressTimerRef.current = setTimeout(() => {
      playerBackgroundSlideshowLongPressTimerRef.current = null
      confirmRemovePlayerBackgroundSlideshowImage(imageId)
    }, 650)
  }

  function startPlayerBackgroundStaticImageLongPress() {
    clearPlayerBackgroundSlideshowLongPressTimer()
    playerBackgroundSlideshowLongPressTimerRef.current = setTimeout(() => {
      playerBackgroundSlideshowLongPressTimerRef.current = null
      if (window.confirm('Remove this static background image?')) {
        clearPlayerBackgroundImage()
      }
    }, 650)
  }

  async function removePlayerBackgroundSlideshowImage(imageId: string) {
    if (!auth.sessionToken || !auth.canHost) return
    setPlayerBackgroundError('')
    try {
      const settings = await api(`/api/player/background/slideshow-images/${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
        headers,
      })
      applyPlayerBackgroundSettings(settings)
    } catch (err: any) {
      setPlayerBackgroundError(err?.message || 'Failed to remove slideshow image')
    }
  }

  async function selectPlayerBackgroundLibraryImage(filename: string) {
    if (!auth.sessionToken || !auth.canHost) return
    setPlayerBackgroundError('')
    try {
      const settings = await api('/api/player/background/image/select', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename }),
      })
      applyPlayerBackgroundSettings(settings)
    } catch (err: any) {
      setPlayerBackgroundError(err?.message || 'Failed to select background image')
    }
  }

  async function addPlayerBackgroundLibraryImageToSlideshow(filename: string) {
    if (!auth.sessionToken || !auth.canHost) return
    setPlayerBackgroundError('')
    try {
      const settings = await api('/api/player/background/slideshow-images/select', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename }),
      })
      applyPlayerBackgroundSettings(settings)
    } catch (err: any) {
      setPlayerBackgroundError(err?.message || 'Failed to add image to slideshow')
    }
  }

  // Fetch active rotation settings
  useEffect(() => {
    if (!auth.sessionToken || !auth.canHost) return
    api('/api/rotations', { headers })
      .then((rotations: { id: string | number; status: string; type?: string; config?: { type?: string } }[]) => {
        if (rotations && rotations.length > 0) {
          const active = rotations.find(r => r.status === 'active') || rotations[0]
          setActiveRotationId(String(active.id))
          setRotationType(active.config?.type || active.type || 'strict_round_robin')
        }
      })
      .catch((err) => { console.error('Failed to load rotation settings:', err) })
  }, [auth.sessionToken, auth.canHost, headers])

  async function updateRotationType(newType: string) {
    if (!auth.sessionToken || !auth.canHost) return
    setSavingRotationType(true)
    try {
      let rotId = activeRotationId
      if (!rotId) {
        // Auto-create a default rotation if none exists
        const created = await api('/api/rotations', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: 'Default Rotation', config: { type: newType } }),
        })
        rotId = String(created.id)
        setActiveRotationId(rotId)
      } else {
        await api(`/api/rotations/${rotId}/config`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ type: newType }),
        })
      }
      setRotationType(newType)
      await refreshQueue()
      await refreshQueueState()
    } catch (err) {
      console.error('Failed to update rotation type:', err)
    } finally {
      setSavingRotationType(false)
    }
  }

  return {
    overlayVisible,
    setOverlayVisible,
    overlayHeight,
    setOverlayHeight,
    qrSize,
    setQrSize,
    customMessage,
    setCustomMessage,
    showRoller,
    setShowRoller,
    showQrCode,
    setShowQrCode,
    hideSingerQueue,
    setHideSingerQueue,
    keepRotationScrollerSingers,
    setKeepRotationScrollerSingers,
    showRequestsUrl,
    setShowRequestsUrl,
    showBreakMusicTrack,
    setShowBreakMusicTrack,
    showProfilePictures,
    setShowProfilePictures,
    playerBackgroundMode,
    setPlayerBackgroundMode,
    playerBackgroundImageUrl,
    setPlayerBackgroundImageUrl,
    playerBackgroundImageFilename,
    setPlayerBackgroundImageFilename,
    playerBackgroundUpdatedAt,
    setPlayerBackgroundUpdatedAt,
    playerBackgroundLibraryImages,
    setPlayerBackgroundLibraryImages,
    playerBackgroundImageUploadDir,
    setPlayerBackgroundImageUploadDir,
    playerBackgroundLibraryLoading,
    setPlayerBackgroundLibraryLoading,
    playerBackgroundSlideshowImages,
    setPlayerBackgroundSlideshowImages,
    playerBackgroundSlideshowTransitionStyle,
    setPlayerBackgroundSlideshowTransitionStyle,
    playerBackgroundSlideshowIntervalSeconds,
    setPlayerBackgroundSlideshowIntervalSeconds,
    playerBackgroundSlideshowTransitionDurationSeconds,
    setPlayerBackgroundSlideshowTransitionDurationSeconds,
    playerBackgroundUploading,
    setPlayerBackgroundUploading,
    playerBackgroundError,
    setPlayerBackgroundError,
    activeRotationId,
    setActiveRotationId,
    rotationType,
    setRotationType,
    savingRotationType,
    setSavingRotationType,
    playerBackgroundImageInputRef,
    playerBackgroundSlideshowLongPressTimerRef,
    playerBackgroundPreviewUrl,
    playerBackgroundLibraryPreviewUrls,
    playerBackgroundSlideshowPreviewUrls,
    updateOverlaySettings,
    applyPlayerBackgroundSettings,
    loadPlayerBackgroundLibraryImages,
    updatePlayerBackgroundSettings,
    choosePlayerBackgroundMode,
    uploadPlayerBackgroundImage,
    uploadPlayerBackgroundSlideshowImages,
    clearPlayerBackgroundImage,
    clearPlayerBackgroundSlideshowImages,
    clearPlayerBackgroundSlideshowLongPressTimer,
    confirmRemovePlayerBackgroundSlideshowImage,
    startPlayerBackgroundSlideshowImageLongPress,
    startPlayerBackgroundStaticImageLongPress,
    removePlayerBackgroundSlideshowImage,
    selectPlayerBackgroundLibraryImage,
    addPlayerBackgroundLibraryImageToSlideshow,
    updateRotationType,
  }
}

export type PlayerSettings = ReturnType<typeof usePlayerSettings>
