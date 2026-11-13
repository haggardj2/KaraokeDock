import { useEffect, useState } from 'react'
import MaterialIcon from '../../components/MaterialIcon'
import ScrollingText from '../../components/ScrollingText'
import { formatTime } from './format'
import type { BreakMusic } from './useBreakMusic'

const HOST_TOP_COLLAPSED_STORAGE_KEY = 'host.topCardCollapsed'

function getInitialHostTopCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(HOST_TOP_COLLAPSED_STORAGE_KEY) === 'true'
}

// The Host's break music card: the current track and time left, the loaded playlist, and
// previous / pause / next controls. Collapses to a one-line ticker (remembered per browser).
export default function BreakMusicPanel({ breakMusic, busy }: { breakMusic: BreakMusic; busy: boolean }) {
  const {
    breakMusicPaused,
    breakMusicTrack,
    breakMusicRemainingSec,
    breakPlaylistTrackIds,
    controlBreakMusic,
    openBreakMusicManager,
    activeBreakPlaylistName,
  } = breakMusic
  const [hostTopCollapsed, setHostTopCollapsed] = useState(() => getInitialHostTopCollapsed())

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(HOST_TOP_COLLAPSED_STORAGE_KEY, String(hostTopCollapsed))
  }, [hostTopCollapsed])

  return (
    <section className="host-panel host-break-panel">
      <div className="host-panel-header">
        <button
          type="button"
          className="host-panel-toggle"
          onClick={() => setHostTopCollapsed((collapsed) => !collapsed)}
          aria-expanded={!hostTopCollapsed}
          aria-controls="host-break-panel-content"
          title={hostTopCollapsed ? 'Show break music' : 'Hide break music'}
        >
          <MaterialIcon name="music_note" />
          {breakMusicTrack && hostTopCollapsed ? (
            <>
              <ScrollingText
                className="host-break-inline-title"
                label={`${breakMusicTrack.title} — ${breakMusicTrack.artist || 'Unknown Artist'}`}
              >
                {breakMusicTrack.title} — {breakMusicTrack.artist || 'Unknown Artist'}
              </ScrollingText>
              {breakMusicRemainingSec != null && (
                <span className="host-break-inline-time" aria-label={`${formatTime(breakMusicRemainingSec)} remaining`}>
                  {formatTime(breakMusicRemainingSec)}
                </span>
              )}
            </>
          ) : (
            <span>Break music</span>
          )}
          <MaterialIcon name={hostTopCollapsed ? 'expand_more' : 'expand_less'} className="host-panel-chevron" />
        </button>
        <button
          className="control-btn"
          title="Manage break music library and playlist"
          aria-label="Manage break music library and playlist"
          onClick={openBreakMusicManager}
          disabled={busy}
        >
          <MaterialIcon name="build" />
        </button>
      </div>

      {!hostTopCollapsed && (
        <div id="host-break-panel-content" className="host-break-content">
          {breakMusicTrack ? (
            <>
              <ScrollingText
                className="host-break-track"
                label={`${breakMusicTrack.title} by ${breakMusicTrack.artist || 'Unknown Artist'}`}
              >
                <strong>{breakMusicTrack.title}</strong> by <strong>{breakMusicTrack.artist || 'Unknown Artist'}</strong>
              </ScrollingText>
              <div className="host-muted">
                Time remaining: {breakMusicRemainingSec == null ? '—' : formatTime(breakMusicRemainingSec)}
              </div>
            </>
          ) : (
            <div className="host-muted">No break track selected</div>
          )}

          {activeBreakPlaylistName && (
            <div role="status" aria-live="polite" className="host-muted host-small">
              Loaded playlist: <strong>{activeBreakPlaylistName}</strong>
            </div>
          )}

          {breakPlaylistTrackIds.length > 0 && (
            <div role="status" aria-live="polite" className="host-muted host-small">
              Playlist tracks: {breakPlaylistTrackIds.length}
            </div>
          )}

          <div className="host-break-controls">
            <button
              className="control-btn"
              title="Play previous break playlist track"
              aria-label="Play previous break playlist track"
              onClick={() => controlBreakMusic('previous')}
              disabled={busy || breakPlaylistTrackIds.length === 0}
            >
              <MaterialIcon name="skip_previous" />
            </button>
            <button
              className="control-btn"
              title={breakMusicPaused ? 'Resume break music' : 'Pause break music'}
              aria-label={breakMusicPaused ? 'Resume break music' : 'Pause break music'}
              onClick={() => controlBreakMusic(breakMusicPaused ? 'resume' : 'pause')}
              disabled={busy || !breakMusicTrack}
            >
              <MaterialIcon name={breakMusicPaused ? 'play_arrow' : 'pause'} />
            </button>
            <button
              className="control-btn"
              title="Skip to next break playlist track"
              aria-label="Skip to next break playlist track"
              onClick={() => controlBreakMusic('skip')}
              disabled={busy || breakPlaylistTrackIds.length === 0}
            >
              <MaterialIcon name="skip_next" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
