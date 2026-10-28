import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import MaterialIcon from '../../components/MaterialIcon'
import { THEMES, isThemeId, type ThemeId } from '../../theme'
import type { BreakMusic } from './useBreakMusic'
import type { PlayerSettings } from './usePlayerSettings'
import BreakMusicSettings from './settings/BreakMusicSettings'
import OverlaySettingsSection from './settings/OverlaySettingsSection'
import PlayerBackgroundSettings from './settings/PlayerBackgroundSettings'
import RotationSettings from './settings/RotationSettings'
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
  const [requestTheme, setRequestTheme] = useState<ThemeId | null>(null)
  const [savingRequestTheme, setSavingRequestTheme] = useState(false)

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

      <BreakMusicSettings breakMusic={breakMusic} />

      <PlayerBackgroundSettings playerSettings={playerSettings} />

      <OverlaySettingsSection playerSettings={playerSettings} />

      <RotationSettings playerSettings={playerSettings} />
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
