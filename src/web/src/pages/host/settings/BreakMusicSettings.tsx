import type { BreakMusic } from '../useBreakMusic'

// Break music behaviour while a singer is on stage: pause or duck, crossfade, volume and resume delay.
export default function BreakMusicSettings({ breakMusic }: { breakMusic: BreakMusic }) {
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

  return (
    <>
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
    </>
  )
}
