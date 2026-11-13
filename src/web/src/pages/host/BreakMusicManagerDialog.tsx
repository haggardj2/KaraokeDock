import { useEffect, useRef, useState } from 'react'
import MaterialIcon from '../../components/MaterialIcon'
import ScrollingText from '../../components/ScrollingText'
import type { BreakColumnKey } from './types'
import type { BreakMusic } from './useBreakMusic'

const COLUMN_LABELS: Record<BreakColumnKey, string> = { song: 'Song', artist: 'Artist', genre: 'Genre', length: 'Length', path: 'Path' }

// Break music library and playlist editor: browse tracks, build and save playlists, change what's running.
// Desktop shows the library and playlist side by side; phones switch between them with tabs.
export default function BreakMusicManagerDialog({ breakMusic }: { breakMusic: BreakMusic }) {
  const {
    breakSearchQuery,
    setBreakSearchQuery,
    breakLibraryTracks,
    breakLibraryTotal,
    breakLibraryLoading,
    breakManagerTab,
    setBreakManagerTab,
    loadMoreBreakLibrary,
    loadBreakMusicLibrary,
    breakPlaylistTrackIdSet,
    breakPlaylistTracks,
    setBreakDraggedTrackId,
    breakDraggedPlaylistIndex,
    setBreakDraggedPlaylistIndex,
    breakColumns,
    breakPlaylists,
    activeBreakPlaylistId,
    selectedBreakPlaylistId,
    setSelectedBreakPlaylistId,
    breakPlaylistName,
    setBreakPlaylistName,
    breakDraftMode,
    setBreakDraftDirty,
    breakManagerBusy,
    breakSyncPending,
    breakManagerError,
    breakManagerNotice,
    breakSort,
    showBreakColumnMenu,
    setShowBreakColumnMenu,
    breakLibraryPanePercent,
    breakPlaylistTracksRef,
    breakColumnMenuRef,
    breakManagerLayoutRef,
    refreshBreakMusicManager,
    newBreakPlaylist,
    editRunningBreakPlaylist,
    saveBreakPlaylist,
    loadBreakPlaylist,
    deleteBreakPlaylist,
    setBreakPlaylistTracksAndSync,
    addBreakTrackToPlaylist,
    removeBreakTrackFromPlaylist,
    clearBreakPlaylist,
    addAllBreakTracksToPlaylist,
    shuffleBreakPlaylist,
    playBreakTrackNext,
    moveBreakTrackInPlaylist,
    moveBreakTrackToPlaylistIndex,
    breakPlaylistDurationMs,
    currentBreakPlaylistRowIndex,
    activeBreakPlaylistName,
    formatDurationMs,
    toggleBreakColumn,
    breakColumnEnabled,
    startBreakColumnResize,
    toggleBreakSort,
    buildBreakGridTemplate,
    canDropOnBreakPlaylist,
    getBreakDraggedTrackId,
    startBreakPaneResize,
    closeBreakMusicManager,
  } = breakMusic

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const libraryListRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef(loadMoreBreakLibrary)
  loadMoreRef.current = loadMoreBreakLibrary

  // Close the playlist menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Load the next page when the end of the library list scrolls into view.
  useEffect(() => {
    const root = libraryListRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current() },
      { root, rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [breakManagerTab])

  const selectedId = selectedBreakPlaylistId ? Number(selectedBreakPlaylistId) : null
  const canLoadSelected = selectedId !== null && (breakDraftMode || selectedId !== activeBreakPlaylistId)
  const hasMore = breakLibraryTracks.length < breakLibraryTotal
  const query = breakSearchQuery.trim()

  function runMenuAction(action: () => void | Promise<void>) {
    setMenuOpen(false)
    void action()
  }

  const sortIcon = (column: BreakColumnKey) => breakSort.column === column && (
    <MaterialIcon name={breakSort.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'} style={{ fontSize: 18, verticalAlign: 'text-bottom' }} />
  )

  const libraryPanel = (
    <div className={`break-manager-panel break-library-panel${breakManagerTab === 'library' ? ' is-active-tab' : ''}`}
      style={{ flex: `0 0 ${breakLibraryPanePercent}%` }}>
      <div className="break-library-tools">
        <div className="break-search">
          <MaterialIcon name="search" className="break-search-icon" />
          <input
            className="search-input"
            type="search"
            aria-label="Search break music"
            placeholder={breakLibraryTotal && !query ? `Search ${breakLibraryTotal.toLocaleString()} tracks…` : 'Search title, artist, genre or folder…'}
            value={breakSearchQuery}
            onChange={(e) => setBreakSearchQuery(e.target.value)}
          />
        </div>
        <div className="break-columns-menu" ref={breakColumnMenuRef}>
          <button className="control-btn" type="button" aria-expanded={showBreakColumnMenu}
            onClick={() => setShowBreakColumnMenu((prev) => !prev)}>
            <MaterialIcon name="view_column" />
            <span>Columns</span>
          </button>
          {showBreakColumnMenu && (
            <div className="break-columns-popover">
              {(Object.keys(COLUMN_LABELS) as BreakColumnKey[]).map((column) => (
                <label key={column}>
                  <input type="checkbox" checked={breakColumns[column]} onChange={() => toggleBreakColumn(column)} />
                  {COLUMN_LABELS[column]}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="break-library-summary">
        <span role="status">
          {breakLibraryLoading && breakLibraryTracks.length === 0
            ? 'Loading…'
            : `${breakLibraryTotal.toLocaleString()} ${breakLibraryTotal === 1 ? 'track' : 'tracks'}${query ? ` matching "${query}"` : ''}`}
        </span>
        <button className="control-btn ghost" type="button" disabled={breakLibraryTotal === 0 || breakManagerBusy}
          onClick={() => void addAllBreakTracksToPlaylist()}>
          <MaterialIcon name="playlist_add" />
          <span>{query ? 'Add all matching' : 'Add all'}</span>
        </button>
      </div>

      <div className="break-manager-card break-library-list" ref={libraryListRef}>
        <div className="break-library-header" style={{ gridTemplateColumns: buildBreakGridTemplate() }}>
          <span aria-hidden="true" />
          {(Object.keys(COLUMN_LABELS) as BreakColumnKey[]).filter(breakColumnEnabled).map((column) => (
            <div key={column} className="break-table-header-cell">
              <button className="break-table-header-sort" type="button" onClick={() => toggleBreakSort(column)}>
                {COLUMN_LABELS[column]}{sortIcon(column)}
              </button>
              <div className="break-table-header-resizer" onMouseDown={(event) => startBreakColumnResize(column, event)} />
            </div>
          ))}
        </div>
        {breakLibraryTracks.map((track) => {
          const added = breakPlaylistTrackIdSet.has(track.id)
          return (
            <div
              key={track.id}
              className="break-library-row"
              draggable
              onDragStart={(ev) => {
                ev.dataTransfer.setData('text/plain', String(track.id))
                setBreakDraggedPlaylistIndex(null)
                setBreakDraggedTrackId(track.id)
              }}
              onDragEnd={() => setBreakDraggedTrackId(null)}
              style={{ gridTemplateColumns: buildBreakGridTemplate() }}
            >
              <button
                className={`break-add-button${added ? ' is-added' : ''}`}
                type="button"
                title={added ? 'In the playlist (add again)' : 'Add to playlist'}
                aria-label={`${added ? 'Add again' : 'Add'}: ${track.title}`}
                disabled={breakManagerBusy}
                onClick={() => addBreakTrackToPlaylist(track)}
              >
                <MaterialIcon name={added ? 'check' : 'add'} />
              </button>
              {/* Phones: title with artist and length underneath. */}
              <div className="break-lib-text">
                <span className="break-lib-title">{track.title}</span>
                <span className="break-lib-meta">{track.artist || 'Unknown Artist'} · {formatDurationMs(track.duration_ms)}</span>
              </div>
              {breakColumnEnabled('song') && <ScrollingText mode="hover" className="break-lib-cell" label={track.title}>{track.title}</ScrollingText>}
              {breakColumnEnabled('artist') && <ScrollingText mode="hover" className="break-lib-cell" label={track.artist || '—'}>{track.artist || '—'}</ScrollingText>}
              {breakColumnEnabled('genre') && <ScrollingText mode="hover" className="break-lib-cell" label={track.genre || '—'}>{track.genre || '—'}</ScrollingText>}
              {breakColumnEnabled('length') && <span className="break-lib-cell">{formatDurationMs(track.duration_ms)}</span>}
              {breakColumnEnabled('path') && <ScrollingText mode="hover" className="break-lib-cell" label={track.file_path}>{track.file_path}</ScrollingText>}
            </div>
          )
        })}
        <div ref={sentinelRef} className="break-library-sentinel" aria-hidden="true" />
        {breakLibraryLoading && breakLibraryTracks.length > 0 && <div className="break-list-message">Loading more…</div>}
        {!breakLibraryLoading && breakLibraryTracks.length === 0 && (
          <div className="break-list-message">{query ? 'No tracks match your search.' : 'No break music yet. Add a break music folder in Admin and scan it.'}</div>
        )}
        {!breakLibraryLoading && hasMore && (
          <button className="control-btn ghost break-load-more" type="button" onClick={() => loadMoreBreakLibrary()}>Load more</button>
        )}
      </div>
    </div>
  )

  const playlistPanel = (
    <div className={`break-manager-panel break-playlist-panel${breakManagerTab === 'playlist' ? ' is-active-tab' : ''}`}
      style={{ flex: `1 1 ${100 - breakLibraryPanePercent}%` }}>
      <div className="break-playlist-head">
        <input
          className="form-input break-playlist-name"
          aria-label="Playlist name"
          placeholder={breakDraftMode ? 'Name this playlist' : 'Name to save as'}
          value={breakPlaylistName}
          disabled={breakManagerBusy}
          onChange={(event) => { setBreakPlaylistName(event.target.value); setBreakDraftDirty(true) }}
        />
        <button className="control-btn primary" type="button" disabled={breakPlaylistTracks.length === 0 || breakManagerBusy}
          onClick={() => void saveBreakPlaylist()}>
          <MaterialIcon name="save" />
          <span>Save</span>
        </button>
      </div>
      <div className="break-playlist-summary">
        <span>{breakPlaylistTracks.length.toLocaleString()} {breakPlaylistTracks.length === 1 ? 'track' : 'tracks'} · {formatDurationMs(breakPlaylistDurationMs)}</span>
        <span>
          {breakDraftMode ? 'Draft: playback unchanged' : activeBreakPlaylistName ? <>Playing <strong>{activeBreakPlaylistName}</strong></> : 'Running playlist'}
        </span>
      </div>
      <div
        className="break-manager-card break-playlist-list"
        onDragOver={(ev) => {
          if (!canDropOnBreakPlaylist(ev)) return
          ev.preventDefault()
          ev.stopPropagation()
        }}
        onDrop={(ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          if (breakDraggedPlaylistIndex !== null) {
            const playlist = breakPlaylistTracksRef.current
            if (breakDraggedPlaylistIndex < 0 || breakDraggedPlaylistIndex >= playlist.length) return
            moveBreakTrackToPlaylistIndex(breakDraggedPlaylistIndex, playlist.length - 1)
            setBreakDraggedPlaylistIndex(null)
            return
          }
          const trackId = getBreakDraggedTrackId(ev)
          if (!trackId) return
          const track = breakLibraryTracks.find((t) => t.id === trackId)
          if (track) addBreakTrackToPlaylist(track)
          setBreakDraggedTrackId(null)
        }}
      >
        {breakPlaylistTracks.map((track, index) => {
          const isCurrent = currentBreakPlaylistRowIndex >= 0 && index === currentBreakPlaylistRowIndex
          const isNext = currentBreakPlaylistRowIndex >= 0 ? index === currentBreakPlaylistRowIndex + 1 : index === 0
          return (
            <div
              key={`${track.id}-${index}`}
              className={`break-playlist-row ${breakDraggedPlaylistIndex === index ? 'dragging' : ''} ${isCurrent ? 'current' : ''}`}
              draggable={!isCurrent && !breakManagerBusy}
              onDragStart={() => {
                setBreakDraggedTrackId(null)
                setBreakDraggedPlaylistIndex(index)
              }}
              onDragEnd={() => setBreakDraggedPlaylistIndex(null)}
              onDragOver={(ev) => {
                if (breakDraggedPlaylistIndex === null) return
                ev.preventDefault()
              }}
              onDrop={(ev) => {
                ev.preventDefault()
                ev.stopPropagation()
                if (breakDraggedPlaylistIndex !== null) {
                  moveBreakTrackToPlaylistIndex(breakDraggedPlaylistIndex, index)
                  setBreakDraggedPlaylistIndex(null)
                  return
                }
                const trackId = getBreakDraggedTrackId(ev)
                if (!trackId) return
                const draggedTrack = breakLibraryTracks.find((t) => t.id === trackId)
                if (!draggedTrack) return
                const next = [...breakPlaylistTracksRef.current]
                next.splice(isCurrent ? index + 1 : index, 0, draggedTrack)
                setBreakPlaylistTracksAndSync(next)
                setBreakDraggedTrackId(null)
              }}
            >
              <span className="break-drag-handle" title={isCurrent ? 'The current song stays at the top' : 'Drag to reorder'}>
                <MaterialIcon name={isCurrent ? 'graphic_eq' : 'drag_indicator'} />
              </span>
              <div className="break-playlist-text">
                <div className="break-playlist-title-row">
                  <ScrollingText mode="hover" className="break-playlist-title" label={track.title}>{track.title}</ScrollingText>
                  {isCurrent && <span className="break-now-playing">Now playing</span>}
                </div>
                <div className="break-playlist-meta">{track.artist || 'Unknown Artist'} · {formatDurationMs(track.duration_ms)}</div>
              </div>
              <div className="break-playlist-actions">
                {!isCurrent && !isNext && (
                  <button className="break-row-button" type="button" title="Play next" aria-label={`Play next: ${track.title}`}
                    disabled={breakManagerBusy} onClick={() => playBreakTrackNext(index)}>
                    <MaterialIcon name="queue_play_next" />
                  </button>
                )}
                <button className="break-row-button break-move" type="button" title="Move up" aria-label={`Move up: ${track.title}`}
                  disabled={breakManagerBusy || isCurrent || index === 0 || (currentBreakPlaylistRowIndex === 0 && index === 1)}
                  onClick={() => moveBreakTrackInPlaylist(index, -1)}>
                  <MaterialIcon name="keyboard_arrow_up" />
                </button>
                <button className="break-row-button break-move" type="button" title="Move down" aria-label={`Move down: ${track.title}`}
                  disabled={breakManagerBusy || isCurrent || index === breakPlaylistTracks.length - 1}
                  onClick={() => moveBreakTrackInPlaylist(index, 1)}>
                  <MaterialIcon name="keyboard_arrow_down" />
                </button>
                <button className="break-row-button is-danger" type="button" title="Remove" aria-label={`Remove: ${track.title}`}
                  disabled={breakManagerBusy} onClick={() => removeBreakTrackFromPlaylist(index)}>
                  <MaterialIcon name="close" />
                </button>
              </div>
            </div>
          )
        })}
        {breakPlaylistTracks.length === 0 && (
          <div className="break-list-message">
            The playlist is empty. Add tracks from the library{' '}
            <button className="break-inline-link" type="button" onClick={() => setBreakManagerTab('library')}>here</button>.
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
    <div className="modal-backdrop" onClick={closeBreakMusicManager} />
    <div className="modal break-manager-modal" role="dialog" aria-modal="true" aria-labelledby="break-manager-title">
      <div className="modal-header">
        <h3 id="break-manager-title"><MaterialIcon name="music_note" />Break music</h3>
        <button className="break-close" type="button" title="Close" aria-label="Close" onClick={closeBreakMusicManager}>
          <MaterialIcon name="close" />
        </button>
      </div>

      <div className="break-manager-body">
        <div className="break-playlist-bar">
          <select
            className="form-input"
            value={selectedBreakPlaylistId}
            aria-label="Saved playlists"
            disabled={breakManagerBusy}
            onChange={(e) => setSelectedBreakPlaylistId(e.target.value)}
          >
            <option value="">{breakDraftMode ? 'New playlist (draft)' : 'Saved playlists…'}</option>
            {breakPlaylists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}{playlist.id === activeBreakPlaylistId && !breakDraftMode ? ' (playing)' : ''}
              </option>
            ))}
          </select>
          <button className="control-btn" type="button" disabled={!canLoadSelected || breakManagerBusy}
            title="Play the selected playlist during breaks" onClick={() => selectedId !== null && void loadBreakPlaylist(selectedId)}>
            <MaterialIcon name="play_arrow" />
            <span className="break-btn-label">Load</span>
          </button>
          <div className="break-menu" ref={menuRef}>
            <button className="control-btn" type="button" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Playlist actions"
              onClick={() => setMenuOpen((open) => !open)}>
              <MaterialIcon name="more_vert" />
            </button>
            {menuOpen && (
              <div className="break-menu-popover" role="menu">
                <button role="menuitem" type="button" disabled={breakManagerBusy} onClick={() => runMenuAction(newBreakPlaylist)}>
                  <MaterialIcon name="playlist_add" />New playlist
                </button>
                {breakDraftMode && (
                  <button role="menuitem" type="button" disabled={breakManagerBusy} onClick={() => runMenuAction(editRunningBreakPlaylist)}>
                    <MaterialIcon name="edit" />Edit the running playlist
                  </button>
                )}
                <button role="menuitem" type="button" disabled={breakPlaylistTracks.length < 2 || breakManagerBusy} onClick={() => runMenuAction(shuffleBreakPlaylist)}>
                  <MaterialIcon name="shuffle" />Shuffle
                </button>
                <button role="menuitem" type="button" disabled={breakPlaylistTracks.length === 0 || breakManagerBusy} onClick={() => runMenuAction(clearBreakPlaylist)}>
                  <MaterialIcon name="clear_all" />{breakDraftMode ? 'Clear draft' : 'Clear running playlist'}
                </button>
                <button role="menuitem" type="button" disabled={breakManagerBusy}
                  onClick={() => runMenuAction(async () => { await refreshBreakMusicManager(); await loadBreakMusicLibrary(true) })}>
                  <MaterialIcon name="refresh" />Refresh
                </button>
                <button role="menuitem" type="button" className="is-danger" disabled={selectedId === null || breakManagerBusy}
                  onClick={() => runMenuAction(async () => { if (selectedId !== null) await deleteBreakPlaylist(selectedId) })}>
                  <MaterialIcon name="delete" />Delete saved playlist
                </button>
              </div>
            )}
          </div>
        </div>

        {breakManagerError && <p className="break-message is-error" role="alert">{breakManagerError}</p>}
        {breakManagerNotice && <p className="break-message" role="status">{breakManagerNotice}</p>}
        {(breakManagerBusy || breakSyncPending > 0) && (
          <p className="break-message" role="status">{breakManagerBusy ? 'Working…' : 'Updating the running playlist…'}</p>
        )}

        <div className="break-manager-tabs" role="tablist" aria-label="Break music views">
          <button role="tab" type="button" aria-selected={breakManagerTab === 'playlist'} onClick={() => setBreakManagerTab('playlist')}>
            <MaterialIcon name="queue_music" />Playlist <span className="break-tab-count">{breakPlaylistTracks.length.toLocaleString()}</span>
          </button>
          <button role="tab" type="button" aria-selected={breakManagerTab === 'library'} onClick={() => setBreakManagerTab('library')}>
            <MaterialIcon name="library_music" />Library <span className="break-tab-count">{breakLibraryTotal.toLocaleString()}</span>
          </button>
        </div>

        <div className="break-manager-layout" ref={breakManagerLayoutRef}>
          {libraryPanel}
          <div className="break-manager-splitter" onMouseDown={startBreakPaneResize} />
          {playlistPanel}
        </div>
      </div>
    </div>
    </>
  )
}
