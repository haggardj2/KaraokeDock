import MaterialIcon from '../../../components/MaterialIcon'
import ScrollingText from '../../../components/ScrollingText'
import {
  PLAYER_BACKGROUND_SLIDESHOW_MAX_INTERVAL_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MAX_TRANSITION_DURATION_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MIN_INTERVAL_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MIN_TRANSITION_DURATION_SECONDS,
  type PlayerBackgroundTransitionStyle,
} from '../../../playerBackground'
import type { PlayerSettings } from '../usePlayerSettings'

// What the Player shows behind the waiting screen: nothing, one image or a slideshow, with an image library.
export default function PlayerBackgroundSettings({ playerSettings }: { playerSettings: PlayerSettings }) {
  const {
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
    playerBackgroundImageInputRef,
    playerBackgroundPreviewUrl,
    playerBackgroundLibraryPreviewUrls,
    playerBackgroundSlideshowPreviewUrls,
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
  } = playerSettings

  return (
    <>
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
    </>
  )
}
