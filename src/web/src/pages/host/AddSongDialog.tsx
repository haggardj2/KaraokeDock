import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import MaterialIcon from '../../components/MaterialIcon'
import { KARAOKE_NERDS_SEARCH_DELAY_MS, LOCAL_SEARCH_DELAY_MS, fetchVideoTitle, renderSearchResultText } from './songSearch'
import type { QueueState } from './types'

// Opened from a singer's dialog, it starts out adding for that singer.
export type AddSongPreset = { singerId: string | null; name: string }

// Host-side "Add to Queue": pick a singer, then a local track, a Karaoke Nerds result or a video URL.
export default function AddSongDialog({
  preset,
  headers,
  busy,
  setBusy,
  queueState,
  localLibraryEnabled,
  externalLibraryEnabled,
  allowDownloads,
  downloadingTrack,
  downloadVideo,
  refreshQueue,
  onClose,
}: {
  preset: AddSongPreset | null
  headers: Record<string, string>
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  queueState: QueueState | null
  localLibraryEnabled: boolean
  externalLibraryEnabled: boolean
  allowDownloads: boolean
  downloadingTrack: string | null
  downloadVideo: (url: string, title: string, artist: string, brand?: string, discId?: string) => void | Promise<void>
  refreshQueue: () => Promise<void>
  onClose: () => void
}) {
  const auth = useAuth()
  const [manualRequestMode, setManualRequestMode] = useState<'local' | 'external' | 'url'>('local')
  const [manualRequestQuery, setManualRequestQuery] = useState('')
  const [manualRequestResults, setManualRequestResults] = useState<any[]>([])
  const [manualRequestName, setManualRequestName] = useState(preset?.name ?? '')
  const [manualRequestUrl, setManualRequestUrl] = useState('')
  const [manualRequestTitle, setManualRequestTitle] = useState('')
  const [manualRequestArtist, setManualRequestArtist] = useState('')
  const [manualRequestDiscId, setManualRequestDiscId] = useState('')
  const [showManualSingerSuggestions, setShowManualSingerSuggestions] = useState(false)
  const [manualSingerHighlightIndex, setManualSingerHighlightIndex] = useState(0)
  const [manualRequestForSingerId, setManualRequestForSingerId] = useState<string | null>(preset?.singerId ?? null)
  const manualRequestSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const manualSingerSuggestions = useMemo(() => {
    const normalizedQuery = manualRequestName.trim().toLocaleLowerCase()
    const seen = new Set<string>()

    return (queueState?.queueOrder ?? [])
      .map((singer) => ({
        singerId: singer.singerId,
        publicUuid: singer.publicUuid ?? null,
        displayName: singer.displayName.trim(),
      }))
      .filter((singer) => {
        const name = singer.displayName
        if (!name) return false
        const normalizedName = name.toLocaleLowerCase()
        if (seen.has(normalizedName)) return false
        seen.add(normalizedName)
        return !normalizedQuery || normalizedName.includes(normalizedQuery)
      })
      .sort((a, b) => {
        const aStarts = a.displayName.toLocaleLowerCase().startsWith(normalizedQuery)
        const bStarts = b.displayName.toLocaleLowerCase().startsWith(normalizedQuery)
        if (aStarts !== bStarts) return aStarts ? -1 : 1
        return a.displayName.localeCompare(b.displayName)
      })
      .slice(0, 8)
  }, [manualRequestName, queueState])

  // Auto-fetch video title when URL is entered in manual request mode
  useEffect(() => {
    if (manualRequestMode === 'url' && manualRequestUrl.trim() && !manualRequestTitle) {
      const timer = setTimeout(async () => {
        const title = await fetchVideoTitle(manualRequestUrl)
        setManualRequestTitle(title)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [manualRequestUrl, manualRequestMode, manualRequestTitle])

  // Effect to handle manual request search with debouncing
  useEffect(() => {
    if (manualRequestMode === 'url') {
      setManualRequestResults([])
      return
    }

    if (manualRequestSearchTimeoutRef.current) {
      clearTimeout(manualRequestSearchTimeoutRef.current)
    }

    const searchDelay = manualRequestMode === 'local' ? LOCAL_SEARCH_DELAY_MS : KARAOKE_NERDS_SEARCH_DELAY_MS
    manualRequestSearchTimeoutRef.current = setTimeout(() => searchManualRequest(manualRequestQuery), searchDelay)

    return () => {
      if (manualRequestSearchTimeoutRef.current) {
        clearTimeout(manualRequestSearchTimeoutRef.current)
      }
    }
  }, [manualRequestQuery, manualRequestMode])


  async function searchManualRequest(query: string) {
    if (!query.trim()) {
      setManualRequestResults([])
      return
    }

    try {
      if (manualRequestMode === 'local') {
        const results = await api(`/api/search?q=${encodeURIComponent(query)}`)
        setManualRequestResults(results || [])
      } else if (manualRequestMode === 'external') {
        const results = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(query)}`)
        setManualRequestResults(results || [])
      }
    } catch {
      setManualRequestResults([])
    }
  }

  // Closing unmounts the dialog, which also clears everything typed into it.
  function resetManualRequestModal() {
    onClose()
  }

  function selectManualRequestSinger(singer: { singerId: string; displayName: string }) {
    setManualRequestName(singer.displayName)
    setManualRequestForSingerId(singer.singerId)
    setShowManualSingerSuggestions(false)
    setManualSingerHighlightIndex(0)
  }

  function getManualRequestTarget() {
    const normalizedName = manualRequestName.trim().toLocaleLowerCase()
    const selected = manualRequestForSingerId
      ? (queueState?.queueOrder ?? []).find((singer) => singer.singerId === manualRequestForSingerId)
      : (queueState?.queueOrder ?? []).find((singer) => singer.displayName.trim().toLocaleLowerCase() === normalizedName)
    return {
      requestAsHost: true,
      singerId: manualRequestForSingerId ?? selected?.singerId,
      singerUuid: selected?.publicUuid ?? null,
    }
  }

  async function addManualRequestLocal(trackId: number) {
    if (!auth.sessionToken || !auth.canHost) return

    setBusy(true)
    try {
      await api('/api/queue', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          trackId,
          requestedBy: manualRequestName || null,
          ...getManualRequestTarget(),
        })
      })

      resetManualRequestModal()
    } finally {
      setBusy(false)
      await refreshQueue()
    }
  }

  async function addManualRequestExternal(track: { title: string; artist: string; url: string; brand?: string }) {
    if (!auth.sessionToken || !auth.canHost) return

    setBusy(true)
    try {
      await api('/api/karaoke-nerds/add', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          url: track.url,
          brand: track.brand || null,
          requestedBy: manualRequestName || null,
          ...getManualRequestTarget(),
        })
      })

      resetManualRequestModal()
    } finally {
      setBusy(false)
      await refreshQueue()
    }
  }

  async function addManualRequestUrl() {
    if (!auth.sessionToken || !auth.canHost) return
    if (!manualRequestUrl.trim()) return

    setBusy(true)
    try {
      await api('/api/karaoke-nerds/add', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: manualRequestTitle || 'Video',
          artist: manualRequestArtist || 'Unknown',
          url: manualRequestUrl,
          requestedBy: manualRequestName || null,
          discId: manualRequestDiscId || null,
          ...getManualRequestTarget(),
        })
      })

      resetManualRequestModal()
    } finally {
      setBusy(false)
      await refreshQueue()
    }
  }

  return (
    <>
    <div className="modal-backdrop" onClick={resetManualRequestModal} />
    <div className="modal">
      <div className="modal-header">
        <h3 style={{ margin: 0 }}><MaterialIcon name="add" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Add to Queue</h3>
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
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          onClick={resetManualRequestModal}
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      {/* Singer Name Field — hidden when opened from singer modal */}
      {manualRequestForSingerId ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-accent-soft)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Adding for:</span>
          <strong style={{ fontSize: 13 }}><MaterialIcon name="mic_external_on" style={{ fontSize: 15, verticalAlign: 'text-bottom', marginRight: 3 }} />{manualRequestName}</strong>
          <button className="control-btn" type="button" onClick={() => setManualRequestForSingerId(null)}>Change Singer</button>
        </div>
      ) : (
      <div className="form-group" style={{ position: 'relative' }}>
        <label className="form-label">Singer Name (Optional)</label>
        <input
          className="form-input"
          placeholder="Enter singer name..."
          value={manualRequestName}
          autoComplete="off"
          onChange={e => {
            setManualRequestName(e.target.value)
            setManualRequestForSingerId(null)
            setShowManualSingerSuggestions(true)
            setManualSingerHighlightIndex(0)
          }}
          onFocus={() => {
            setShowManualSingerSuggestions(true)
            setManualSingerHighlightIndex(0)
          }}
          onBlur={() => {
            window.setTimeout(() => setShowManualSingerSuggestions(false), 120)
          }}
          onKeyDown={e => {
            if (!showManualSingerSuggestions || manualSingerSuggestions.length === 0) {
              if (e.key === 'Escape') setShowManualSingerSuggestions(false)
              return
            }

            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setManualSingerHighlightIndex((idx) => (idx + 1) % manualSingerSuggestions.length)
              return
            }

            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setManualSingerHighlightIndex((idx) => (idx - 1 + manualSingerSuggestions.length) % manualSingerSuggestions.length)
              return
            }

            if (e.key === 'Enter') {
              e.preventDefault()
              selectManualRequestSinger(manualSingerSuggestions[manualSingerHighlightIndex] ?? manualSingerSuggestions[0])
              return
            }

            if (e.key === 'Escape') {
              setShowManualSingerSuggestions(false)
            }
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
        {showManualSingerSuggestions && manualSingerSuggestions.length > 0 && (
          <div className="manual-singer-suggestions">
            {manualSingerSuggestions.map((singer, index) => (
              <button
                key={singer.publicUuid || singer.singerId || singer.displayName}
                type="button"
                className={`manual-singer-suggestion${index === manualSingerHighlightIndex ? ' active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectManualRequestSinger(singer)
                }}
              >
                <span>{singer.displayName}</span>
                <span className="manual-singer-suggestion-hint">Use existing singer</span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Mode Toggle */}
      <div className="search-mode-toggle">
        {localLibraryEnabled && (
          <button
            className={`mode-button ${manualRequestMode === 'local' ? 'active' : ''}`}
            onClick={() => setManualRequestMode('local')}
          >
            <MaterialIcon name="library_music" className="mode-icon" style={{ fontSize: 20, marginRight: 6 }} />
            Local
          </button>
        )}

        {externalLibraryEnabled && (
          <button
            className={`mode-button ${manualRequestMode === 'external' ? 'active karaoke-nerds' : ''}`}
            onClick={() => setManualRequestMode('external')}
          >
            <img
              src="https://karaokenerds.com/Content/Icons/favicon.ico"
              alt="Karaoke Nerds"
              className="mode-icon"
              style={{ width: "20px", height: "20px", marginRight: "6px" }}
            />
            External
          </button>
        )}

        <button
          className={`mode-button ${manualRequestMode === 'url' ? 'active' : ''}`}
          onClick={() => setManualRequestMode('url')}
        >
          <MaterialIcon name="link" style={{ fontSize: 18, marginRight: 6 }} /> URL
        </button>
      </div>

      {/* Search or URL Input */}
      {manualRequestMode === 'url' ? (
        <>
          <div className="form-group">
            <label className="form-label">Video URL</label>
            <input
              className="form-input"
              placeholder="Enter YouTube or video URL..."
              value={manualRequestUrl}
              onChange={e => setManualRequestUrl(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: '16px'
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Song Title</label>
            <input
              className="form-input"
              placeholder="Title (auto-filled from URL)"
              value={manualRequestTitle}
              onChange={e => setManualRequestTitle(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: '16px'
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Artist Name</label>
            <input
              className="form-input"
              placeholder="Enter artist name..."
              value={manualRequestArtist}
              onChange={e => setManualRequestArtist(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: '16px'
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Disc ID (Optional)</label>
            <input
              className="form-input"
              placeholder="Enter disc ID (e.g., SC123)..."
              value={manualRequestDiscId}
              onChange={e => setManualRequestDiscId(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: '16px'
              }}
            />
          </div>

          <button
            className="control-btn primary"
            style={{ width: '100%', marginBottom: '16px' }}
            onClick={addManualRequestUrl}
            disabled={busy || !manualRequestUrl.trim() || !manualRequestTitle.trim()}
          >
            {busy ? (
              <>
                <span className="loading-spinner"></span> Adding...
              </>
            ) : (
              'Add to Queue'
            )}
          </button>

          {allowDownloads && (
            <button
              className="control-btn success"
              style={{ width: '100%', marginBottom: '16px' }}
              onClick={() => downloadVideo(manualRequestUrl, manualRequestTitle, manualRequestArtist, undefined, manualRequestDiscId)} // brand=undefined, discId from user input
              disabled={busy || !manualRequestUrl.trim() || !manualRequestTitle.trim() || downloadingTrack === manualRequestUrl}
            >
              {downloadingTrack === manualRequestUrl ? (
                <>
                  <span className="loading-spinner"></span> Downloading...
                </>
              ) : (
                <><MaterialIcon name="download" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} /> Download to Library</>
              )}
            </button>
          )}
        </>
      ) : (
        <>
          <input
            className="search-input"
            placeholder={manualRequestMode === 'local' ? "Search local library..." : "Search Karaoke Nerds..."}
            value={manualRequestQuery}
            onChange={e => setManualRequestQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box'
            }}
          />

          <div className="search-results" style={{
            minHeight: '200px',
            maxHeight: '400px',
            marginBottom: '16px'
          }}>
            {manualRequestResults.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px'
              }}>
                {manualRequestQuery ? (
                  <>
                    <MaterialIcon name="search" style={{ fontSize: 24, marginBottom: 12, opacity: 0.5 }} />
                    <div style={{ fontSize: '14px' }}>
                      {manualRequestMode === 'local' ? 'No local results found' : 'No external results found'}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                      Try a different search term
                    </div>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="music_note" style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }} />
                    <div style={{ fontSize: '14px' }}>
                      Start typing to search {manualRequestMode === 'local' ? 'local library' : 'external library'}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {manualRequestMode === 'local' ? (
                  // Local library results
                  manualRequestResults.map((track: any) => (
                    <div
                      key={track.id}
                      className="search-result"
                      onClick={() => addManualRequestLocal(track.id)}
                    >
                      {renderSearchResultText(track, track.disc_id ? { text: track.disc_id } : undefined)}
                      <button
                        className="control-btn primary"
                        style={{
                          padding: '6px 10px',
                          fontSize: '13px',
                          minWidth: '40px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          addManualRequestLocal(track.id);
                        }}
                        disabled={busy}
                        aria-label="Add to queue"
                        title="Add to queue"
                      >
                        {busy ? '…' : <MaterialIcon name="add" style={{ fontSize: 16 }} />}
                      </button>
                    </div>
                  ))
                ) : (
                  // External results
                  manualRequestResults.map((track: any, idx: number) => (
                    <div
                      key={track.url || idx}
                      className="search-result"
                      onClick={() => addManualRequestExternal(track)}
                    >
                      {renderSearchResultText(track, track.brand ? { text: track.brand, brand: true } : undefined)}
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {allowDownloads && (
                          <button
                            className={`control-btn search-result-action${downloadingTrack === track.url ? '' : ' success'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadVideo(track.url, track.title, track.artist, track.brand);
                            }}
                            disabled={busy || downloadingTrack === track.url}
                            aria-label={downloadingTrack === track.url ? 'Downloading to local library' : 'Download to local library'}
                            title="Download to local library"
                          >
                            <MaterialIcon name={downloadingTrack === track.url ? 'hourglass_top' : 'download'} style={{ fontSize: 16 }} />
                          </button>
                        )}
                        <button
                          className="control-btn primary search-result-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            addManualRequestExternal(track);
                          }}
                          disabled={busy}
                          aria-label="Add to queue"
                          title="Add to queue"
                        >
                          {busy ? '…' : <MaterialIcon name="add" style={{ fontSize: 16 }} />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </>
      )}

      <button
        className="control-btn"
        style={{
          width: '100%',
          background: 'transparent',
          border: '2px solid var(--color-border)'
        }}
        onClick={resetManualRequestModal}
      >
        Cancel
      </button>
    </div>
    </>
  )
}
