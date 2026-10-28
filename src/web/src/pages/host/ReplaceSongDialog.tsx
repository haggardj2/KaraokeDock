import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import MaterialIcon from '../../components/MaterialIcon'
import { KARAOKE_NERDS_SEARCH_DELAY_MS, LOCAL_SEARCH_DELAY_MS, fetchVideoTitle, renderSearchResultText } from './songSearch'

export type ReplaceSongTarget = { queueId: number; title: string | null; artist: string | null }

// Swap a queued (or playing) song for a local track, a Karaoke Nerds result or a video URL.
export default function ReplaceSongDialog({
  song,
  headers,
  busy,
  setBusy,
  localLibraryEnabled,
  externalLibraryEnabled,
  allowDownloads,
  downloadingTrack,
  downloadVideo,
  setCurrentTime,
  refreshQueueViews,
  onClose,
}: {
  song: ReplaceSongTarget
  headers: Record<string, string>
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  localLibraryEnabled: boolean
  externalLibraryEnabled: boolean
  allowDownloads: boolean
  downloadingTrack: string | null
  downloadVideo: (url: string, title: string, artist: string, brand?: string, discId?: string) => void | Promise<void>
  setCurrentTime: Dispatch<SetStateAction<number>>
  refreshQueueViews: () => Promise<void>
  onClose: () => void
}) {
  const auth = useAuth()
  const replacingId = song.queueId
  // The search starts from the current song's title so similar versions show up straight away.
  const [searchQuery, setSearchQuery] = useState(song.title || '')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [replaceSearchMode, setReplaceSearchMode] = useState<'local' | 'karaoke-nerds' | 'url'>('local')
  const [replaceUrl, setReplaceUrl] = useState('')
  const [replaceTitle, setReplaceTitle] = useState(song.title || '')
  const [replaceArtist, setReplaceArtist] = useState(song.artist || '')
  const [replaceDiscId, setReplaceDiscId] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    const searchDelay = replaceSearchMode === 'local' ? LOCAL_SEARCH_DELAY_MS : KARAOKE_NERDS_SEARCH_DELAY_MS
    searchTimeoutRef.current = setTimeout(() => searchSongs(searchQuery), searchDelay)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, replaceSearchMode])

  // Auto-fetch video title when URL is entered in replace mode
  useEffect(() => {
    if (replaceSearchMode === 'url' && replaceUrl.trim() && !replaceTitle) {
      const timer = setTimeout(async () => {
        const title = await fetchVideoTitle(replaceUrl)
        setReplaceTitle(title)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [replaceUrl, replaceSearchMode, replaceTitle])


  // Closing unmounts the dialog, which also clears the search and URL fields.
  function closeReplaceModal() {
    onClose()
  }

  async function searchSongs(query: string) {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      if (replaceSearchMode === 'local') {
        const results = await api(`/api/search?q=${encodeURIComponent(query)}`)
        setSearchResults(results || [])
      } else {
        const results = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(query)}`)
        setSearchResults(results || [])
      }
    } catch {
      setSearchResults([])
    }
  }

  async function replaceSong(queueId: number, newTrackId: number) {
    if (!auth.sessionToken || !auth.canHost) return

    setBusy(true)
    try {
      const result = await api('/api/queue/replace', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: queueId, trackId: newTrackId })
      })

      if (result.wasPlaying) setCurrentTime(0)
      closeReplaceModal()
    } finally {
      setBusy(false)
      await refreshQueueViews()
    }
  }

  async function replaceSongWithKaraokeNerds(queueId: number, track: { title: string; artist: string; url: string; brand?: string }) {
    if (! auth.sessionToken || !auth.canHost) return

    setBusy(true)
    try {
      const result = await api('/api/queue/replace', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: queueId,
          external: {
            title: track.title,
            artist: track.artist,
            url: track.url,
            source: 'karaoke-nerds',
            brand: track.brand || null,
          },
        })
      })

      if (result.wasPlaying) setCurrentTime(0)
      closeReplaceModal()
    } finally {
      setBusy(false)
      await refreshQueueViews()
    }
  }

  async function replaceSongWithUrl(queueId: number, url: string, title: string, artist: string) {
    if (!auth.sessionToken || !auth.canHost) return

    setBusy(true)
    try {
      const result = await api('/api/queue/replace', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: queueId,
          external: {
            title: title || 'Video',
            artist: artist || 'Unknown',
            url,
            source: 'url',
          },
        })
      })

      if (result.wasPlaying) setCurrentTime(0)
      closeReplaceModal()
    } finally {
      setBusy(false)
      await refreshQueueViews()
    }
  }

  return (
    <>
    <div className="modal-backdrop" onClick={closeReplaceModal} />
    <div className="modal">
      <div className="modal-header">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 24 }}>contract_edit</span>
          Replace Song
        </h3>
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
          onClick={closeReplaceModal}
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      {/* Search Mode Toggle - Updated to not clear search */}
      <div className="search-mode-toggle">
        {localLibraryEnabled && (
          <button
            className={`mode-button ${replaceSearchMode === 'local' ? 'active' : ''}`}
            onClick={() => setReplaceSearchMode('local')}
          >
            <MaterialIcon name="library_music" className="mode-icon" style={{ fontSize: 20, marginRight: 6 }} />
            Local Library
          </button>
        )}

        {externalLibraryEnabled && (
          <button
            className={`mode-button ${replaceSearchMode === 'karaoke-nerds' ? 'active karaoke-nerds' : ''}`}
            onClick={() => setReplaceSearchMode('karaoke-nerds')}
          >
            <img
              src="https://karaokenerds.com/Content/Icons/favicon.ico"
              alt="Karaoke Nerds"
              className="mode-icon"
              style={{ width: "20px", height: "20px", marginRight: "6px" }}
            />
            Karaoke Nerds
          </button>
        )}

        <button
          className={`mode-button ${replaceSearchMode === 'url' ? 'active' : ''}`}
          onClick={() => setReplaceSearchMode('url')}
        >
          <MaterialIcon name="link" style={{ fontSize: 18, marginRight: 6 }} /> URL
        </button>
      </div>

      {/* Search or URL Input */}
      {replaceSearchMode === 'url' ? (
        <>
          <div className="form-group">
            <label className="form-label">Video URL</label>
            <input
              className="form-input"
              placeholder="Enter YouTube or video URL..."
              value={replaceUrl}
              onChange={e => setReplaceUrl(e.target.value)}
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
              value={replaceTitle}
              onChange={e => setReplaceTitle(e.target.value)}
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
              value={replaceArtist}
              onChange={e => setReplaceArtist(e.target.value)}
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
              value={replaceDiscId}
              onChange={e => setReplaceDiscId(e.target.value)}
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
            onClick={() => replaceSongWithUrl(replacingId, replaceUrl, replaceTitle, replaceArtist)}
            disabled={busy || !replaceUrl.trim() || !replaceTitle.trim()}
          >
            {busy ? (
              <>
                <span className="loading-spinner"></span> Replacing...
              </>
            ) : (
              'Replace with URL'
            )}
          </button>

          {allowDownloads && (
            <button
              className="control-btn success"
              style={{ width: '100%', marginBottom: '16px' }}
              onClick={() => downloadVideo(replaceUrl, replaceTitle, replaceArtist, undefined, replaceDiscId)} // brand=undefined, discId from user input
              disabled={busy || !replaceUrl.trim() || !replaceTitle.trim() || downloadingTrack === replaceUrl}
            >
              {downloadingTrack === replaceUrl ? (
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
            placeholder={replaceSearchMode === 'local' ? "Search local library..." : "Search Karaoke Nerds..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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
            {searchResults.length === 0 ?  (
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
                {searchQuery ? (
                  <>
                    <MaterialIcon name="search" style={{ fontSize: 24, marginBottom: 12, opacity: 0.5 }} />
                    <div style={{ fontSize: '14px' }}>
                      {replaceSearchMode === 'local' ? 'No local results found' : 'No Karaoke Nerds results found'}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                      Try a different search term
                    </div>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="music_note" style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: '14px' }}>
                  Start typing to search {replaceSearchMode === 'local' ? 'local library' : 'Karaoke Nerds'}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {replaceSearchMode === 'local' ? (
              // Local library results
              searchResults. map((track: any) => (
                <div
                  key={track.id}
                  className="search-result"
                  onClick={() => replaceSong(replacingId, track. id)}
                >
                  {renderSearchResultText(track, track.disc_id ? { text: track.disc_id } : undefined)}
                  <button
                    className="control-btn primary search-result-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      replaceSong(replacingId, track.id);
                    }}
                    disabled={busy}
                    aria-label={`Replace with ${track.title || 'this song'}`}
                    title="Replace with this song"
                  >
                    <MaterialIcon name="swap_horiz" />
                  </button>
                </div>
              ))
            ) : (
              // KaraokeNerds results
              searchResults.map((track: any, idx: number) => (
                <div
                  key={track.url || idx}
                  className="search-result"
                  onClick={() => replaceSongWithKaraokeNerds(replacingId, track)}
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
                        <MaterialIcon name={downloadingTrack === track.url ? 'hourglass_top' : 'download'} />
                      </button>
                    )}
                    <button
                      className="control-btn primary search-result-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        replaceSongWithKaraokeNerds(replacingId, track);
                      }}
                      disabled={busy}
                      aria-label={`Replace with ${track.title || 'this song'}`}
                      title="Replace with this song"
                    >
                      <MaterialIcon name="swap_horiz" />
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
        onClick={closeReplaceModal}
      >
        Cancel
      </button>
    </div>
    </>
  )
}
