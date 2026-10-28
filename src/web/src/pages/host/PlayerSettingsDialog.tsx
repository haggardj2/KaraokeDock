import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import MaterialIcon from '../../components/MaterialIcon'
import ScrollingText from '../../components/ScrollingText'
import { THEMES, isThemeId, type ThemeId } from '../../theme'
import {
  PLAYER_BACKGROUND_SLIDESHOW_MAX_INTERVAL_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MAX_TRANSITION_DURATION_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MIN_INTERVAL_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MIN_TRANSITION_DURATION_SECONDS,
  type PlayerBackgroundTransitionStyle,
} from '../../playerBackground'
import type { BreakMusic } from './useBreakMusic'
import type { PlayerSettings } from './usePlayerSettings'
// Host "Player Settings": auto-play, request page theme, break music behaviour, TV overlay, background and rotation.
export default function PlayerSettingsDialog({
  playerSettings,
  breakMusic,
  headers,
  setBanner,
  autoPlay,
  setAutoPlay,
  autoPlayDelay,
  setAutoPlayDelay,
  onClose,
}: {
  playerSettings: PlayerSettings
  breakMusic: BreakMusic
  headers: Record<string, string>
  setBanner: Dispatch<SetStateAction<string>>
  autoPlay: boolean
  setAutoPlay: Dispatch<SetStateAction<boolean>>
  autoPlayDelay: number
  setAutoPlayDelay: Dispatch<SetStateAction<number>>
  onClose: () => void
}) {
  const auth = useAuth()
  const {
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
    playerBackgroundImageFilename,
    playerBackgroundUpdatedAt,
    playerBackgroundImageUploadDir,
    playerBackgroundLibraryLoading,
    playerBackgroundSlideshowImages,
    playerBackgroundSlideshowTransitionStyle,
    setPlayerBackgroundSlideshowTransitionStyle,
    playerBackgroundSlideshowIntervalSeconds,
    setPlayerBackgroundSlideshowIntervalSeconds,
    playerBackgroundSlideshowTransitionDurationSeconds,
    setPlayerBackgroundSlideshowTransitionDurationSeconds,
    playerBackgroundUploading,
    playerBackgroundError,
    rotationType,
    savingRotationType,
    playerBackgroundImageInputRef,
    playerBackgroundPreviewUrl,
    playerBackgroundLibraryPreviewUrls,
    playerBackgroundSlideshowPreviewUrls,
    updateOverlaySettings,
    loadPlayerBackgroundLibraryImages,
    updatePlayerBackgroundSettings,
    choosePlayerBackgroundMode,
    uploadPlayerBackgroundImage,
    uploadPlayerBackgroundSlideshowImages,
    clearPlayerBackgroundImage,
    clearPlayerBackgroundSlideshowImages,
    clearPlayerBackgroundSlideshowLongPressTimer,
    startPlayerBackgroundSlideshowImageLongPress,
    startPlayerBackgroundStaticImageLongPress,
    removePlayerBackgroundSlideshowImage,
    selectPlayerBackgroundLibraryImage,
    addPlayerBackgroundLibraryImageToSlideshow,
    updateRotationType,
  } = playerSettings
  const {
    breakMusicCrossfadeSec,
    setBreakMusicCrossfadeSec,
    breakMusicVolumePercent,
    setBreakMusicVolumePercent,
    breakMusicResumeDelay,
    setBreakMusicResumeDelay,
    breakPauseDuringKaraoke,
    savingBreakPlayback,
    updateBreakCrossfade,
    updateBreakResumeDelay,
    updateBreakPauseDuringKaraoke,
    scheduleBreakVolumeUpdate,
  } = breakMusic
  const [requestTheme, setRequestTheme] = useState<ThemeId | null>(null)
  const [savingRequestTheme, setSavingRequestTheme] = useState(false)
  const [showRotationInfo, setShowRotationInfo] = useState(false)

  // Load the venue's Request page theme each time the dialog opens.
  useEffect(() => {
    api('/api/settings/public')
      .then((settings) => setRequestTheme(isThemeId(settings?.['requests.theme']) ? settings['requests.theme'] : 'midnight'))
      .catch((err) => console.error('Failed to load request page theme:', err))
  }, [])

  async function updateRequestTheme(theme: ThemeId) {
    const previous = requestTheme
    setRequestTheme(theme)
    setSavingRequestTheme(true)
    try {
      await api('/api/host/settings/request-theme', { method: 'PUT', headers, body: JSON.stringify({ theme }) })
    } catch (err) {
      console.error('Failed to save request page theme:', err)
      setRequestTheme(previous)
      setBanner('⚠️ Could not save the request page theme')
    } finally {
      setSavingRequestTheme(false)
    }
  }

  async function updateAutoPlaySettings(enabled: boolean, delay: number) {
    if (! auth.sessionToken || ! auth.canHost) return
    try {
      await api('/api/autoplay/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ enabled, delay })
      })
    } catch (err) {
      console.error('Failed to update autoplay settings:', err)
    }
  }

  return (
    <>
    <div className="modal-backdrop" onClick={() => onClose()} />
    <div className="modal">
      <div className="modal-header">
        <h3 style={{ margin: 0 }}><MaterialIcon name="tune" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Player Settings</h3>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: 24,
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
          onMouseLeave={e => e.currentTarget. style.background = 'transparent'}
          onClick={() => onClose()}
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      <div className="player-settings-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div className="settings-section">
        <div className="settings-title">Request Page Theme</div>
        <label className="form-label" htmlFor="request-page-theme">Theme singers see on their phones</label>
        <select
          id="request-page-theme"
          className="form-input"
          value={requestTheme ?? ''}
          disabled={requestTheme === null || savingRequestTheme}
          onChange={e => void updateRequestTheme(e.target.value as ThemeId)}
        >
          {requestTheme === null && <option value="">Loading…</option>}
          {THEMES.map(theme => (
            <option key={theme.id} value={theme.id}>{theme.label}</option>
          ))}
        </select>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Singers can still pick their own theme from their profile menu.
        </p>
      </div>

      {/* Auto-play Settings */}
      <div className="settings-section">
        <div className="settings-title">Auto-play Settings</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          marginBottom: autoPlay ? '16px' : '0'
        }}>
          <span style={{ fontSize: '15px', fontWeight: '500' }}>Auto-play</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Toggle Switch with Inline Styles */}
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '48px',
              height: '24px'
            }}>
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={e => {
                  const newEnabled = e.target.checked
                  setAutoPlay(newEnabled)
                  updateAutoPlaySettings(newEnabled, autoPlayDelay)
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: autoPlay ? 'var(--color-success)' : 'var(--color-border-strong)',
                transition: '. 4s',
                borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '16px',
                  width: '16px',
                  left: autoPlay ? '28px' : '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%'
                }}></span>
              </span>
            </label>
            <span style={{
              color: autoPlay ? 'var(--color-success)' : 'var(--color-text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
              minWidth: '60px'
            }}>
              {autoPlay ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {autoPlay && (
          <div style={{
            padding: '16px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)'
          }}>
            <label className="form-label" style={{ marginBottom: '12px' }}>
              Delay between songs: <strong>{autoPlayDelay}</strong> seconds
            </label>
            <div className="slider-control">
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>0s</span>
              <input
                type="range"
                className="slider"
                value={autoPlayDelay}
                onChange={e => {
                  const newDelay = parseInt(e. target.value)
                  setAutoPlayDelay(newDelay)
                }}
                onMouseUp={() => updateAutoPlaySettings(autoPlay, autoPlayDelay)}
                onTouchEnd={() => updateAutoPlaySettings(autoPlay, autoPlayDelay)}
                min="0"
                max="60"
                style={{ margin: '0 12px', flex: 1 }}
              />
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>60s</span>
              <span style={{
                minWidth: '50px',
                textAlign: 'center',
                padding: '4px 8px',
                background: 'var(--color-bg-primary)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                marginLeft: '12px'
              }}>
                {autoPlayDelay}s
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-title">Break Music During Karaoke</div>
        <label className="form-label" htmlFor="break-music-during-karaoke">While a singer is on stage</label>
        <select
          id="break-music-during-karaoke"
          className="form-input"
          value={breakPauseDuringKaraoke ? 'pause' : 'continue'}
          disabled={savingBreakPlayback}
          onChange={e => void updateBreakPauseDuringKaraoke(e.target.value === 'pause')}
        >
          <option value="pause">Pause break music (default)</option>
          <option value="continue">Keep break music advancing silently</option>
        </select>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Break music is always muted during a singer&apos;s song, including when the singer is paused.
          Manually paused break music stays paused.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-title">Break Music Crossfade</div>
        <div style={{
          padding: '16px',
          background: 'var(--color-bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <label className="form-label" style={{ marginBottom: '12px' }}>
            Crossfade: <strong>{breakMusicCrossfadeSec}</strong> seconds
          </label>
          <div className="slider-control">
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>0s</span>
            <input
              type="range"
              className="slider"
              value={breakMusicCrossfadeSec}
              min="0"
              max="15"
              onChange={e => setBreakMusicCrossfadeSec(parseInt(e.target.value))}
              onMouseUp={() => updateBreakCrossfade(breakMusicCrossfadeSec)}
              onTouchEnd={() => updateBreakCrossfade(breakMusicCrossfadeSec)}
              style={{ margin: '0 12px', flex: 1 }}
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>15s</span>
            <span style={{
              minWidth: '50px',
              textAlign: 'center',
              padding: '4px 8px',
              background: 'var(--color-bg-primary)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              marginLeft: '12px'
            }}>
              {breakMusicCrossfadeSec}s
            </span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Break Music Volume</div>
        <div style={{
          padding: '16px',
          background: 'var(--color-bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <label className="form-label" style={{ marginBottom: '12px' }}>
            Volume: <strong>{breakMusicVolumePercent}%</strong>
          </label>
          <div className="slider-control">
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>0%</span>
            <input
              type="range"
              className="slider"
              value={breakMusicVolumePercent}
              min="0"
              max="100"
              onChange={e => {
                const nextVolume = parseInt(e.target.value)
                setBreakMusicVolumePercent(nextVolume)
                scheduleBreakVolumeUpdate(nextVolume)
              }}
              style={{ margin: '0 12px', flex: 1 }}
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>100%</span>
            <span style={{
              minWidth: '50px',
              textAlign: 'center',
              padding: '4px 8px',
              background: 'var(--color-bg-primary)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              marginLeft: '12px'
            }}>
              {breakMusicVolumePercent}%
            </span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Break Music Resume Delay</div>
        <div style={{
          padding: '16px',
          background: 'var(--color-bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <label className="form-label" style={{ marginBottom: '12px' }}>
            Delay after karaoke ends before resuming break music: <strong>{breakMusicResumeDelay}</strong> seconds
          </label>
          <div className="slider-control">
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>0s</span>
            <input
              type="range"
              className="slider"
              value={breakMusicResumeDelay}
              min="0"
              max="30"
              onChange={e => setBreakMusicResumeDelay(parseInt(e.target.value))}
              onMouseUp={() => updateBreakResumeDelay(breakMusicResumeDelay)}
              onTouchEnd={() => updateBreakResumeDelay(breakMusicResumeDelay)}
              style={{ margin: '0 12px', flex: 1 }}
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>30s</span>
            <span style={{
              minWidth: '50px',
              textAlign: 'center',
              padding: '4px 8px',
              background: 'var(--color-bg-primary)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              marginLeft: '12px'
            }}>
              {breakMusicResumeDelay}s
            </span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Player Background</div>
        <div style={{
          padding: '16px',
          background: 'var(--color-bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px'
          }}>
            {([
              ['default', 'Default splash', 'Use the built-in player splash.'],
              ['image', 'Static image', 'Show one selected image.'],
              ['slideshow', 'Slideshow', 'Rotate through selected images.'],
            ] as const).map(([mode, label, description]) => (
              <label
                key={mode}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '10px',
                  border: playerBackgroundMode === mode
                    ? '2px solid var(--color-accent)'
                    : '1px solid var(--color-border)',
                  background: 'var(--color-bg-primary)'
                }}
              >
                <input
                  type="radio"
                  name="player-background"
                  checked={playerBackgroundMode === mode}
                  onChange={() => choosePlayerBackgroundMode(mode)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 600 }}>{label}</span>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {playerBackgroundMode !== 'default' && (
            <>
              <input
                ref={playerBackgroundImageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple={playerBackgroundMode === 'slideshow'}
                onChange={e => {
                  const files = Array.from(e.target.files ?? [])
                  if (playerBackgroundMode === 'slideshow') {
                    uploadPlayerBackgroundSlideshowImages(files)
                  } else if (files[0]) {
                    uploadPlayerBackgroundImage(files[0])
                  }
                  e.currentTarget.value = ''
                }}
                style={{ display: 'none' }}
              />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>
                    {playerBackgroundMode === 'image' ? 'Choose one image' : 'Choose slideshow images'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                    Select from the mapped directory or upload {playerBackgroundMode === 'image' ? 'an image' : 'more images'}.
                  </div>
                </div>
                <button
                  type="button"
                  className="control-btn primary"
                  disabled={playerBackgroundUploading}
                  onClick={() => playerBackgroundImageInputRef.current?.click()}
                  style={{ padding: '9px 13px', fontSize: '13px' }}
                >
                  <MaterialIcon name={playerBackgroundMode === 'image' ? 'image' : 'photo_library'} style={{ fontSize: 18 }} />
                  {playerBackgroundUploading
                    ? 'Uploading…'
                    : playerBackgroundMode === 'image'
                      ? 'Upload Image'
                      : 'Upload Images'}
                </button>
              </div>

              {playerBackgroundMode === 'image' && playerBackgroundPreviewUrl && (
                <div
                  className="slideshow-thumb"
                  onTouchStart={startPlayerBackgroundStaticImageLongPress}
                  onTouchEnd={clearPlayerBackgroundSlideshowLongPressTimer}
                  onTouchCancel={clearPlayerBackgroundSlideshowLongPressTimer}
                  onTouchMove={clearPlayerBackgroundSlideshowLongPressTimer}
                  onContextMenu={e => e.preventDefault()}
                  style={{
                  position: 'relative',
                  borderRadius: '10px',
                  border: '2px solid var(--color-accent)',
                  overflow: 'hidden',
                  background: 'var(--color-bg-primary)'
                  }}
                >
                  <img
                    key={playerBackgroundUpdatedAt || playerBackgroundPreviewUrl}
                    src={playerBackgroundPreviewUrl}
                    alt="Current player background"
                    style={{ display: 'block', width: '100%', maxHeight: '180px', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    className="slideshow-thumb-remove"
                    title="Remove static background image"
                    aria-label="Remove static background image"
                    onClick={clearPlayerBackgroundImage}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '999px',
                      border: '1px solid rgba(255,255,255,0.55)',
                      background: 'rgba(15, 23, 42, 0.88)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '19px',
                      fontWeight: 700,
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                  <div style={{
                    position: 'absolute',
                    left: '8px',
                    bottom: '8px',
                    maxWidth: 'calc(100% - 16px)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.82)',
                    color: '#fff',
                    fontSize: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <ScrollingText mode="hover" label={playerBackgroundImageFilename || 'Legacy uploaded image'}>{playerBackgroundImageFilename || 'Legacy uploaded image'}</ScrollingText>
                  </div>
                </div>
              )}

              {playerBackgroundMode === 'slideshow' && playerBackgroundSlideshowPreviewUrls.length > 0 && (
                <div style={{
                  padding: '12px',
                  background: 'var(--color-bg-primary)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                      {playerBackgroundSlideshowImages.length} selected image{playerBackgroundSlideshowImages.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      className="control-btn"
                      onClick={clearPlayerBackgroundSlideshowImages}
                      style={{ padding: '7px 10px', fontSize: '12px' }}
                    >
                      Clear All
                    </button>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: '8px'
                  }}>
                    {playerBackgroundSlideshowPreviewUrls.map((image, index) => (
                      <div
                        key={image.id}
                        className="slideshow-thumb"
                        onTouchStart={() => startPlayerBackgroundSlideshowImageLongPress(image.id)}
                        onTouchEnd={clearPlayerBackgroundSlideshowLongPressTimer}
                        onTouchCancel={clearPlayerBackgroundSlideshowLongPressTimer}
                        onTouchMove={clearPlayerBackgroundSlideshowLongPressTimer}
                        onContextMenu={e => e.preventDefault()}
                        style={{
                          position: 'relative',
                          aspectRatio: '16 / 9',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-secondary)'
                        }}
                      >
                        <img
                          src={image.imageUrl}
                          alt={image.filename || `Slideshow image ${index + 1}`}
                          title={image.filename || `Slideshow image ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          type="button"
                          className="slideshow-thumb-remove"
                          title="Remove slideshow image"
                          aria-label={`Remove slideshow image ${index + 1}`}
                          onClick={e => {
                            e.stopPropagation()
                            removePlayerBackgroundSlideshowImage(image.id)
                          }}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            width: '26px',
                            height: '26px',
                            borderRadius: '999px',
                            border: '1px solid rgba(255,255,255,0.55)',
                            background: 'rgba(15, 23, 42, 0.88)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 700,
                            lineHeight: 1
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Hover over an image to remove it, or press and hold on mobile.
                  </span>
                </div>
              )}

              <div style={{
                padding: '14px',
                background: 'var(--color-bg-primary)',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>Image Directory</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '3px', wordBreak: 'break-word' }}>
                      {playerBackgroundImageUploadDir}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="control-btn"
                    disabled={playerBackgroundLibraryLoading}
                    onClick={loadPlayerBackgroundLibraryImages}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  >
                    <MaterialIcon name="refresh" style={{ fontSize: 16 }} />
                    {playerBackgroundLibraryLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {playerBackgroundLibraryPreviewUrls.length > 0 ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '10px'
                  }}>
                    {playerBackgroundLibraryPreviewUrls.map((image) => {
                      const selectedSlide = playerBackgroundSlideshowImages.find(
                        (slide) => slide.filename === image.filename,
                      )
                      const selected = playerBackgroundMode === 'image'
                        ? playerBackgroundImageFilename === image.filename
                        : !!selectedSlide
                      return (
                        <button
                          key={image.filename}
                          type="button"
                          onClick={() => {
                            if (playerBackgroundMode === 'image') {
                              if (selected) clearPlayerBackgroundImage()
                              else selectPlayerBackgroundLibraryImage(image.filename)
                            } else if (selectedSlide) {
                              removePlayerBackgroundSlideshowImage(selectedSlide.id)
                            } else {
                              addPlayerBackgroundLibraryImageToSlideshow(image.filename)
                            }
                          }}
                          style={{
                            position: 'relative',
                            padding: 0,
                            textAlign: 'left',
                            borderRadius: '10px',
                            border: selected
                              ? '2px solid var(--color-accent)'
                              : '1px solid var(--color-border)',
                            background: 'var(--color-bg-secondary)',
                            color: 'inherit',
                            overflow: 'hidden',
                            cursor: 'pointer'
                          }}
                        >
                          <img
                            src={image.imageUrl}
                            alt={image.filename}
                            title={image.filename}
                            style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
                          />
                          <div style={{ padding: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            <ScrollingText mode="hover" label={image.filename}>{image.filename}</ScrollingText>
                          </div>
                          {selected && (
                            <span style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              width: '25px',
                              height: '25px',
                              borderRadius: '999px',
                              background: 'rgba(15, 23, 42, 0.88)',
                              border: '1px solid rgba(255,255,255,0.55)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: 700
                            }}>
                              ×
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    No images found. Upload an image or add files to the mapped directory.
                  </div>
                )}
              </div>
            </>
          )}

          {playerBackgroundMode === 'slideshow' && (
            <div style={{
              padding: '14px',
              background: 'var(--color-bg-primary)',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div>
                <label className="form-label">Transition style</label>
                <select
                  className="form-input"
                  value={playerBackgroundSlideshowTransitionStyle}
                  onChange={e => {
                    const nextStyle = e.target.value as PlayerBackgroundTransitionStyle
                    setPlayerBackgroundSlideshowTransitionStyle(nextStyle)
                    updatePlayerBackgroundSettings({ slideshowTransitionStyle: nextStyle })
                  }}
                  style={{ marginBottom: 0 }}
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide + fade</option>
                  <option value="zoom">Zoom + fade</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '12px' }}>
                  Fade duration: <strong>{playerBackgroundSlideshowTransitionDurationSeconds.toFixed(1)}</strong> seconds
                </label>
                <div className="slider-control">
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>0.5s</span>
                  <input
                    type="range"
                    className="slider"
                    value={playerBackgroundSlideshowTransitionDurationSeconds}
                    min={PLAYER_BACKGROUND_SLIDESHOW_MIN_TRANSITION_DURATION_SECONDS}
                    max={PLAYER_BACKGROUND_SLIDESHOW_MAX_TRANSITION_DURATION_SECONDS}
                    step="0.5"
                    onChange={e => setPlayerBackgroundSlideshowTransitionDurationSeconds(parseFloat(e.target.value))}
                    onMouseUp={() => updatePlayerBackgroundSettings({ slideshowTransitionDurationSeconds: playerBackgroundSlideshowTransitionDurationSeconds })}
                    onTouchEnd={() => updatePlayerBackgroundSettings({ slideshowTransitionDurationSeconds: playerBackgroundSlideshowTransitionDurationSeconds })}
                    style={{ margin: '0 12px', flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>10s</span>
                  <span style={{
                    minWidth: '50px',
                    textAlign: 'center',
                    padding: '4px 8px',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginLeft: '12px'
                  }}>
                    {playerBackgroundSlideshowTransitionDurationSeconds.toFixed(1)}s
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '12px' }}>
                  Time between pictures: <strong>{playerBackgroundSlideshowIntervalSeconds}</strong> seconds
                </label>
                <div className="slider-control">
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>3s</span>
                  <input
                    type="range"
                    className="slider"
                    value={playerBackgroundSlideshowIntervalSeconds}
                    min={PLAYER_BACKGROUND_SLIDESHOW_MIN_INTERVAL_SECONDS}
                    max={PLAYER_BACKGROUND_SLIDESHOW_MAX_INTERVAL_SECONDS}
                    onChange={e => setPlayerBackgroundSlideshowIntervalSeconds(parseInt(e.target.value, 10))}
                    onMouseUp={() => updatePlayerBackgroundSettings({ slideshowIntervalSeconds: playerBackgroundSlideshowIntervalSeconds })}
                    onTouchEnd={() => updatePlayerBackgroundSettings({ slideshowIntervalSeconds: playerBackgroundSlideshowIntervalSeconds })}
                    style={{ margin: '0 12px', flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>300s</span>
                  <span style={{
                    minWidth: '50px',
                    textAlign: 'center',
                    padding: '4px 8px',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginLeft: '12px'
                  }}>
                    {playerBackgroundSlideshowIntervalSeconds}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {playerBackgroundError && (
            <div style={{ fontSize: '13px', color: 'var(--color-danger)' }}>
              {playerBackgroundError}
            </div>
          )}
        </div>
      </div>

      {/* Overlay Settings */}
      <div className="settings-section">
        <div className="settings-title">Overlay Settings</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          marginBottom: overlayVisible ? '16px' : '0'
        }}>
          <span style={{ fontSize: '15px', fontWeight: '500' }}>Show Overlay</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Toggle Switch with Inline Styles */}
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '48px',
              height: '24px'
            }}>
              <input
                type="checkbox"
                checked={overlayVisible}
                onChange={e => {
                  const newVisible = e.target.checked
                  setOverlayVisible(newVisible)
                  updateOverlaySettings(newVisible, overlayHeight, qrSize)
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: overlayVisible ? 'var(--color-success)' : 'var(--color-border-strong)',
                transition: '.4s',
                borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '16px',
                  width: '16px',
                  left: overlayVisible ? '28px' : '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%'
                }}></span>
              </span>
            </label>
            <span style={{
              color: overlayVisible ? 'var(--color-success)' : 'var(--color-text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
              minWidth: '60px'
            }}>
              {overlayVisible ? 'Visible' : 'Hidden'}
            </span>
          </div>
        </div>

        {overlayVisible && (
          <div style={{
            padding: '16px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '12px' }}>
                Scroller Height: <strong>{overlayHeight}px</strong>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>40px</span>
                <input
                  type="range"
                  value={overlayHeight}
                  onChange={e => setOverlayHeight(parseInt(e. target.value))}
                  onMouseUp={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                  onTouchEnd={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                  min="40"
                  max="150"
                  style={{
                    flex: 1,
                    height: '6px',
                    background: 'var(--color-bg-primary)',
                    borderRadius: '3px',
                    outline: 'none',
                    WebkitAppearance: 'none'
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>150px</span>
                <span style={{
                  minWidth: '50px',
                  textAlign: 'center',
                  padding: '4px 8px',
                  background: 'var(--color-bg-primary)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {overlayHeight}px
                </span>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '12px' }}>
                QR Code Size: <strong>{qrSize}px</strong>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>40px</span>
                <input
                  type="range"
                  value={qrSize}
                  onChange={e => setQrSize(parseInt(e.target.value))}
                  onMouseUp={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                  onTouchEnd={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                  min="40"
                  max="150"
                  style={{
                    flex: 1,
                    height: '6px',
                    background: 'var(--color-bg-primary)',
                    borderRadius: '3px',
                    outline: 'none',
                    WebkitAppearance: 'none'
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>150px</span>
                <span style={{
                  minWidth: '50px',
                  textAlign: 'center',
                  padding: '4px 8px',
                  background: 'var(--color-bg-primary)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {qrSize}px
                </span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Show Roller toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Show Roller</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                    <input
                      type="checkbox"
                      checked={showRoller}
                      onChange={e => {
                        const val = e.target.checked
                        setShowRoller(val)
                        updateOverlaySettings(overlayVisible, overlayHeight, qrSize, undefined, val, showQrCode)
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: showRoller ? 'var(--color-success)' : 'var(--color-border-strong)',
                      transition: '.4s', borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute', height: '16px', width: '16px',
                        left: showRoller ? '28px' : '4px', bottom: '4px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                  <span style={{
                    color: showRoller ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    fontSize: '14px', fontWeight: '500', minWidth: '60px'
                  }}>
                    {showRoller ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <span id="scroller-profile-pictures-label" style={{ fontSize: 14, fontWeight: 500 }}>Show Profile Pictures</span>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Show singer pictures beside their names in the scroller.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 24 }}>
                    <input
                      type="checkbox"
                      aria-labelledby="scroller-profile-pictures-label"
                      checked={showProfilePictures}
                      onChange={e => {
                        const val = e.target.checked
                        setShowProfilePictures(val)
                        updateOverlaySettings(
                          overlayVisible, overlayHeight, qrSize, undefined, showRoller, showQrCode,
                          hideSingerQueue, keepRotationScrollerSingers, showRequestsUrl, showBreakMusicTrack, val,
                        )
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', inset: 0,
                      backgroundColor: showProfilePictures ? 'var(--color-success)' : 'var(--color-border-strong)',
                      transition: '.4s', borderRadius: 34,
                    }}>
                      <span style={{
                        position: 'absolute', height: 16, width: 16,
                        left: showProfilePictures ? 28 : 4, bottom: 4,
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      }} />
                    </span>
                  </label>
                  <span style={{
                    color: showProfilePictures ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    fontSize: 14, fontWeight: 500, minWidth: 60,
                  }}>
                    {showProfilePictures ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>

              {/* Show QR Code toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Show QR Code</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                    <input
                      type="checkbox"
                      checked={showQrCode}
                      onChange={e => {
                        const val = e.target.checked
                        setShowQrCode(val)
                        updateOverlaySettings(overlayVisible, overlayHeight, qrSize, undefined, showRoller, val)
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: showQrCode ? 'var(--color-success)' : 'var(--color-border-strong)',
                      transition: '.4s', borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute', height: '16px', width: '16px',
                        left: showQrCode ? '28px' : '4px', bottom: '4px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                  <span style={{
                    color: showQrCode ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    fontSize: '14px', fontWeight: '500', minWidth: '60px'
                  }}>
                    {showQrCode ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Show Request URL</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                    <input
                      type="checkbox"
                      checked={showRequestsUrl}
                      onChange={e => {
                        const val = e.target.checked
                        setShowRequestsUrl(val)
                        updateOverlaySettings(overlayVisible, overlayHeight, qrSize, undefined, showRoller, showQrCode, hideSingerQueue, keepRotationScrollerSingers, val)
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: showRequestsUrl ? 'var(--color-success)' : 'var(--color-border-strong)',
                      transition: '.4s', borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute', height: '16px', width: '16px',
                        left: showRequestsUrl ? '28px' : '4px', bottom: '4px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                  <span style={{
                    color: showRequestsUrl ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    fontSize: '14px', fontWeight: '500', minWidth: '60px'
                  }}>
                    {showRequestsUrl ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Show Break Music Track</span>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Show the current break track in the scroller while no singer is performing.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                    <input
                      type="checkbox"
                      checked={showBreakMusicTrack}
                      onChange={e => {
                        const val = e.target.checked
                        setShowBreakMusicTrack(val)
                        updateOverlaySettings(
                          overlayVisible,
                          overlayHeight,
                          qrSize,
                          undefined,
                          showRoller,
                          showQrCode,
                          hideSingerQueue,
                          keepRotationScrollerSingers,
                          showRequestsUrl,
                          val,
                        )
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: showBreakMusicTrack ? 'var(--color-success)' : 'var(--color-border-strong)',
                      transition: '.4s', borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute', height: '16px', width: '16px',
                        left: showBreakMusicTrack ? '28px' : '4px', bottom: '4px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                  <span style={{
                    color: showBreakMusicTrack ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    fontSize: '14px', fontWeight: '500', minWidth: '60px'
                  }}>
                    {showBreakMusicTrack ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Message */}
      {overlayVisible && (
        <div className="settings-section">
          <div className="settings-title">Custom Message</div>
          <input
            type="text"
            className="form-input"
            placeholder="Enter custom message for overlay..."
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
            onBlur={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize, customMessage)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                updateOverlaySettings(overlayVisible, overlayHeight, qrSize, customMessage)
              }
            }}
            style={{ marginBottom: customMessage ? '12px' : '0' }}
          />
          {customMessage && (
            <button
              className="control-btn"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                padding: '8px 16px',
                fontSize: '13px'
              }}
              onClick={() => {
                setCustomMessage('')
                updateOverlaySettings(overlayVisible, overlayHeight, qrSize, '')
              }}
            >
              Clear Message
            </button>
          )}
        </div>
      )}

      {/* Queue Display Settings */}
      <div className="settings-section">
        <div className="settings-title">Queue Display</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0'
        }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: '500' }}>Hide Singer's Queued Songs</span>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Show the singer's name but hide the song titles they've queued
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '48px',
              height: '24px'
            }}>
              <input
                type="checkbox"
                checked={hideSingerQueue}
                onChange={e => {
                  const val = e.target.checked
                  setHideSingerQueue(val)
                  updateOverlaySettings(overlayVisible, overlayHeight, qrSize, undefined, showRoller, showQrCode, val)
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: hideSingerQueue ? 'var(--color-success)' : 'var(--color-border-strong)',
                transition: '.4s', borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute', height: '16px', width: '16px',
                  left: hideSingerQueue ? '28px' : '4px', bottom: '4px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                }}></span>
              </span>
            </label>
            <span style={{
              color: hideSingerQueue ? 'var(--color-success)' : 'var(--color-text-secondary)',
              fontSize: '14px', fontWeight: '500', minWidth: '60px'
            }}>
              {hideSingerQueue ? 'Hidden' : 'Visible'}
            </span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderTop: '1px solid var(--color-border)'
        }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: '500' }}>Keep Rotation Singers Visible</span>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              When singer-only queue mode is enabled, keep rotation singers in the scroller even without queued songs
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '48px',
              height: '24px',
              opacity: hideSingerQueue ? 1 : 0.5
            }}>
              <input
                type="checkbox"
                checked={keepRotationScrollerSingers}
                disabled={!hideSingerQueue}
                onChange={e => {
                  const val = e.target.checked
                  setKeepRotationScrollerSingers(val)
                  updateOverlaySettings(overlayVisible, overlayHeight, qrSize, undefined, showRoller, showQrCode, hideSingerQueue, val)
                }}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: hideSingerQueue ? 'pointer' : 'not-allowed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: keepRotationScrollerSingers ? 'var(--color-success)' : 'var(--color-border-strong)',
                transition: '.4s', borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute', height: '16px', width: '16px',
                  left: keepRotationScrollerSingers ? '28px' : '4px', bottom: '4px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                }}></span>
              </span>
            </label>
            <span style={{
              color: keepRotationScrollerSingers ? 'var(--color-success)' : 'var(--color-text-secondary)',
              fontSize: '14px', fontWeight: '500', minWidth: '60px'
            }}>
              {keepRotationScrollerSingers ? 'Shown' : 'Hidden'}
            </span>
          </div>
        </div>
      </div>

      {/* Rotation Settings */}
      <div className="settings-section">
        <div className="settings-title">Rotation Settings</div>
        <div style={{
          padding: '16px',
          background: 'var(--color-bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <label className="form-label" style={{ marginBottom: 0, flex: 1 }}>
              Rotation Type
            </label>
            <button
              title="Learn about rotation types"
              onClick={() => setShowRotationInfo(v => !v)}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ℹ
            </button>
          </div>
          {showRotationInfo && (
            <div style={{
              marginBottom: '14px',
              padding: '12px',
              background: 'var(--color-bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.6',
            }}>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--color-text-primary)' }}>Strict Round Robin</strong> — Each singer gets exactly one turn per round, cycling through in position order.</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--color-text-primary)' }}>Least Recently Sung</strong> — The singer who has waited the longest since their last song goes next.</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--color-text-primary)' }}>Signup Order</strong> — Singers perform in the order they joined the rotation list.</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--color-text-primary)' }}>Song Queue Only</strong> — Songs play in the order they were requested, ignoring singer fairness.</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--color-text-primary)' }}>Manual</strong> — You (the host) pick who goes next each time.</li>
                <li><strong style={{ color: 'var(--color-text-primary)' }}>Hybrid</strong> — Round-robin base with host override priority support.</li>
              </ul>
            </div>
          )}
          <select
            className="form-input"
            value={rotationType}
            disabled={savingRotationType}
            onChange={e => updateRotationType(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="strict_round_robin">Strict Round Robin</option>
            <option value="least_recently_sung">Least Recently Sung</option>
            <option value="signup_order">Signup Order</option>
            <option value="song_queue_only">Song Queue Only</option>
            <option value="manual">Manual</option>
            <option value="hybrid">Hybrid</option>
          </select>
          {savingRotationType && (
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Saving…
            </p>
          )}
        </div>
      </div>
      </div>{/* end scrollable body */}

      <button
        className="control-btn primary"
        style={{ width: '100%', marginTop: '8px', flexShrink: 0 }}
        onClick={() => onClose()}
      >
        Done
      </button>
    </div>
    </>
  )
}
