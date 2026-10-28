import type { PlayerSettings } from '../usePlayerSettings'

// The TV overlay: ticker, QR code and sizes, the custom message, and what the queue display shows.
export default function OverlaySettingsSection({ playerSettings }: { playerSettings: PlayerSettings }) {
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
    updateOverlaySettings,
  } = playerSettings

  return (
    <>
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
    </>
  )
}
