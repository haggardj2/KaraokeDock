import { useState } from 'react'
import type { PlayerSettings } from '../usePlayerSettings'

// How the next singer is chosen, with a short explainer of each rotation type.
export default function RotationSettings({ playerSettings }: { playerSettings: PlayerSettings }) {
  const {
    rotationType,
    savingRotationType,
    updateRotationType,
  } = playerSettings
  const [showRotationInfo, setShowRotationInfo] = useState(false)

  return (
    <>
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
    </>
  )
}
