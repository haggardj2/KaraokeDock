import { useEffect, useState, type ReactNode } from 'react'
import MaterialIcon from '../../components/MaterialIcon'
import ScrollingText from '../../components/ScrollingText'
import type { singerPlaybackAction } from '../../playerPlayback'
import { formatTime } from './format'
import { renderDiscIdTag } from './renderDiscIdTag'
import type { Row } from './types'

// The now-playing bar pinned to the bottom of the Host page: progress, song and singer,
// stop / play-pause / next, the autoplay chip and a "more" menu (refresh, clear all).
export default function TransportBar({
  currentPlaying,
  singerPaused,
  playbackAction,
  playbackLabel,
  currentTime,
  estimatedDuration,
  progressPercent,
  autoPlay,
  autoPlayDelay,
  busy,
  renderReplaceButton,
  onStop,
  onPlay,
  onNext,
  onRefresh,
  onClearAll,
}: {
  currentPlaying: Row | undefined
  singerPaused: boolean
  playbackAction: ReturnType<typeof singerPlaybackAction>
  playbackLabel: string
  currentTime: number
  estimatedDuration: number
  progressPercent: number
  autoPlay: boolean
  autoPlayDelay: number
  busy: boolean
  renderReplaceButton: (song: Row, label?: string) => ReactNode
  onStop: () => void
  onPlay: () => void
  onNext: () => void
  onRefresh: () => Promise<void>
  onClearAll: () => Promise<void>
}) {
  const [showHostMenu, setShowHostMenu] = useState(false)

  useEffect(() => {
    if (!showHostMenu) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      if (event.target instanceof Element && event.target.closest('.host-transport-extra')) return
      setShowHostMenu(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [showHostMenu])

  return (
    <div className="host-transport" role="region" aria-label="Playback controls">
      <div className="host-transport-progress" aria-hidden="true">
        <div style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="host-transport-inner">
        <div className="host-transport-info">
          {currentPlaying ? (
            <>
              <div className="host-transport-text">
                <ScrollingText
                  className="host-transport-title"
                  label={`${currentPlaying.title || 'Unknown Title'}${currentPlaying.disc_id ? ` (${currentPlaying.disc_id})` : ''}`}
                >
                  {currentPlaying.title || 'Unknown Title'}{renderDiscIdTag(currentPlaying.disc_id)}
                </ScrollingText>
                <div className="host-transport-meta">
                  <ScrollingText
                    className="host-transport-meta-text"
                    label={[singerPaused && 'Paused', currentPlaying.requested_by, currentPlaying.artist || 'Unknown Artist'].filter(Boolean).join(' · ')}
                  >
                    {singerPaused && <span className="host-paused">Paused · </span>}
                    {currentPlaying.requested_by && <strong>{currentPlaying.requested_by}</strong>}
                    {currentPlaying.requested_by ? ' · ' : ''}{currentPlaying.artist || 'Unknown Artist'}
                  </ScrollingText>
                  <span className="host-transport-time">{formatTime(currentTime)} / {formatTime(estimatedDuration)}</span>
                </div>
              </div>
              <span className="host-transport-replace">{renderReplaceButton(currentPlaying, 'Replace current song')}</span>
            </>
          ) : (
            <div className="host-transport-text">
              <div className="host-transport-title is-empty">Nothing playing</div>
              <div className="host-transport-meta">Select Play to start the next queued song.</div>
            </div>
          )}
          {autoPlay && (
            <span className="host-autoplay-chip" title={`Auto-play enabled · ${autoPlayDelay}s delay`} aria-label={`Auto-play enabled, ${autoPlayDelay} second delay`}>
              <MaterialIcon name="sync" />
              <span className="host-autoplay-chip-label">Auto {autoPlayDelay}s</span>
            </span>
          )}
        </div>
        <div className="host-transport-controls">
          <button className="control-btn danger" onClick={onStop} disabled={busy} title="Stop" aria-label="Stop">
            <MaterialIcon name="stop" />
          </button>
          <button className="control-btn success host-play-btn" onClick={onPlay} disabled={busy} title={playbackLabel} aria-label={playbackLabel}>
            <MaterialIcon name={playbackAction === 'pause' ? 'pause' : 'play_arrow'} style={singerPaused ? { color: 'var(--color-warning)' } : undefined} />
          </button>
          <button className="control-btn primary" onClick={onNext} disabled={busy} title="Next" aria-label="Next">
            <MaterialIcon name="skip_next" />
          </button>
        </div>
        <div className="host-transport-extra">
          <button
            className="control-btn ghost host-more-btn"
            onClick={() => setShowHostMenu((open) => !open)}
            aria-expanded={showHostMenu}
            aria-controls="host-more-menu"
            title="More controls"
            aria-label="More controls"
          >
            <MaterialIcon name="more_horiz" />
          </button>
          <div id="host-more-menu" className={`host-more-menu${showHostMenu ? ' is-open' : ''}`}>
            <button className="control-btn ghost" onClick={() => { setShowHostMenu(false); void onRefresh() }} disabled={busy} title="Refresh" aria-label="Refresh">
              <MaterialIcon name="refresh" />
              <span className="host-more-label">Refresh</span>
            </button>
            <button className="control-btn ghost danger-text" onClick={() => { setShowHostMenu(false); void onClearAll() }} disabled={busy} title="Clear all" aria-label="Clear all">
              <MaterialIcon name="delete" />
              <span className="host-more-label">Clear all</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
