import MaterialIcon from '../../components/MaterialIcon'
import ScrollingText from '../../components/ScrollingText'
import type { BreakColumnKey } from './types'
import type { BreakMusic } from './useBreakMusic'

// Break music library and playlist editor: browse tracks, build and save playlists, change what's running.
export default function BreakMusicManagerDialog({ breakMusic }: { breakMusic: BreakMusic }) {
  const {
    breakSearchQuery,
    setBreakSearchQuery,
    breakLibraryTracks,
    breakPlaylistTracks,
    setBreakDraggedTrackId,
    breakDraggedPlaylistIndex,
    setBreakDraggedPlaylistIndex,
    breakColumns,
    breakPlaylists,
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
    setBreakPlaylistTracksAndSync,
    addBreakTrackToPlaylist,
    removeBreakTrackFromPlaylist,
    clearBreakPlaylist,
    addAllBreakTracksToPlaylist,
    shuffleBreakPlaylist,
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
    sortedFilteredBreakLibraryTracks,
    buildBreakGridTemplate,
    canDropOnBreakPlaylist,
    getBreakDraggedTrackId,
    startBreakPaneResize,
    closeBreakMusicManager,
  } = breakMusic

  return (
    <>
    <div className="modal-backdrop" onClick={closeBreakMusicManager} />
    <div className="modal break-manager-modal">
      <div className="modal-header">
        <h3 style={{ margin: 0 }}><MaterialIcon name="music_note" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Manage Break Music</h3>
        <button
          title="Close"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 20,
            width: 36,
            height: 36,
            borderRadius: 8,
            flexShrink: 0,
          }}
          onClick={closeBreakMusicManager}
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      <div className="break-manager-body">
        {breakManagerError && <p role="alert" style={{ color: 'var(--color-danger)', margin: '0 0 12px' }}>{breakManagerError}</p>}
        {breakManagerNotice && <p role="status" style={{ color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>{breakManagerNotice}</p>}
        {(breakManagerBusy || breakSyncPending > 0) && (
          <p role="status" style={{ margin: '0 0 12px', fontSize: 13 }}>
            {breakManagerBusy ? 'Loading or saving playlist...' : 'Updating running playlist...'}
          </p>
        )}
        <div className="break-manager-toolbar">
          <label className="form-label" style={{ marginBottom: 6 }}>Saved Playlists</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="form-input"
              value={selectedBreakPlaylistId}
              aria-label="Saved playlists"
              disabled={breakManagerBusy}
              onChange={(e) => setSelectedBreakPlaylistId(e.target.value)}
              style={{ flex: 1, minWidth: 0, marginBottom: 0, padding: '10px 12px', fontSize: 13 }}
            >
              <option value="">Select a playlist</option>
              {breakPlaylists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
            <button
              className="control-btn"
              type="button"
              title="Load selected playlist for break playback"
              aria-label="Load selected playlist for playback"
              onClick={() => selectedBreakPlaylistId && loadBreakPlaylist(Number(selectedBreakPlaylistId))}
              disabled={!selectedBreakPlaylistId || breakManagerBusy}
              style={{ padding: '10px 12px', minWidth: 44, flexShrink: 0 }}
            >
              <MaterialIcon name="download" />
            </button>
            <button
              className="control-btn"
              type="button"
              title="Save playlist"
              aria-label="Save playlist"
              disabled={breakPlaylistTracks.length === 0 || breakManagerBusy}
              onClick={saveBreakPlaylist}
              style={{ padding: '10px 12px', flexShrink: 0 }}
            >
              <MaterialIcon name="save" />
            </button>
            <button
              className="control-btn"
              type="button"
              title="Shuffle playlist"
              disabled={breakPlaylistTracks.length < 2 || breakManagerBusy}
              onClick={shuffleBreakPlaylist}
              style={{ padding: '10px 12px', flexShrink: 0 }}
            >
              <MaterialIcon name="shuffle" />
            </button>
            <button
              className="control-btn"
              type="button"
              title={breakDraftMode ? 'Clear draft' : 'Clear running playlist'}
              disabled={breakPlaylistTracks.length === 0 || breakManagerBusy}
              onClick={clearBreakPlaylist}
              style={{ padding: '10px 12px', flexShrink: 0 }}
            >
              <MaterialIcon name="delete" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            <button className="control-btn" type="button" disabled={breakManagerBusy} onClick={() => void refreshBreakMusicManager()}>
              Refresh
            </button>
            <button className="control-btn" type="button" disabled={breakManagerBusy} onClick={newBreakPlaylist}>
              New playlist
            </button>
            {breakDraftMode && (
              <button className="control-btn" type="button" disabled={breakManagerBusy} onClick={() => void editRunningBreakPlaylist()}>
                Edit running playlist
              </button>
            )}
            <label style={{ flex: '1 1 180px', fontSize: 13 }}>
              Playlist name
              <input className="form-input" aria-label="Playlist name" placeholder="Name to save"
                value={breakPlaylistName} disabled={breakManagerBusy}
                onChange={event => { setBreakPlaylistName(event.target.value); setBreakDraftDirty(true) }}
                style={{ marginBottom: 0, marginTop: 4 }} />
            </label>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, margin: '10px 0 0' }}>
            {breakDraftMode
              ? 'Editing a separate draft. Save it, then Load it when you want to replace playback.'
              : 'Editing the running playlist. Changes apply immediately; Save keeps a named copy. New playlist leaves playback alone.'}
          </p>
        </div>

        <div className="break-manager-layout" ref={breakManagerLayoutRef}>
          <div className="break-manager-panel" style={{ flex: `0 0 ${breakLibraryPanePercent}%` }}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Search Break Music</label>
              <input
                className="search-input"
                placeholder="Search title, artist, genre, or folder path..."
                value={breakSearchQuery}
                onChange={(e) => setBreakSearchQuery(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div className="form-group" style={{ marginTop: 0, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Search Table</label>
                <div style={{ position: 'relative' }} ref={breakColumnMenuRef}>
                  <button
                    className="control-btn"
                    type="button"
                    onClick={() => setShowBreakColumnMenu((prev) => !prev)}
                    style={{ padding: '8px 10px', fontSize: 12 }}
                  >
                    <MaterialIcon name="view_column" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />Columns
                  </button>
                  {showBreakColumnMenu && (
                    <div className="break-columns-popover">
                      {(['song', 'artist', 'genre', 'length', 'path'] as BreakColumnKey[]).map((column) => (
                        <label key={column} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={breakColumns[column]}
                            onChange={() => toggleBreakColumn(column)}
                          />
                          {column[0].toUpperCase() + column.slice(1)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="break-manager-card" style={{ flex: 1, overflow: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: buildBreakGridTemplate(),
                  gap: 8,
                  padding: '8px 10px',
                  fontSize: 12,
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600
                }}
              >
                <span style={{ textAlign: 'center' }}>
                  <button
                    title="Add all visible tracks to playlist"
                    onClick={addAllBreakTracksToPlaylist}
                    disabled={sortedFilteredBreakLibraryTracks.length === 0}
                    style={{ border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0 }}
                  >
                    <MaterialIcon name="playlist_add" style={{ fontSize: 15, verticalAlign: 'text-bottom', marginRight: 3 }} />All
                  </button>
                </span>
                {breakColumnEnabled('song') && (
                  <div className="break-table-header-cell">
                    <button className="break-table-header-sort" onClick={() => toggleBreakSort('song')}>
                      Song{breakSort.column === 'song' && <MaterialIcon name={breakSort.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'} style={{ fontSize: 18, verticalAlign: 'text-bottom' }} />}
                    </button>
                    <div className="break-table-header-resizer" onMouseDown={(event) => startBreakColumnResize('song', event)} />
                  </div>
                )}
                {breakColumnEnabled('artist') && (
                  <div className="break-table-header-cell">
                    <button className="break-table-header-sort" onClick={() => toggleBreakSort('artist')}>
                      Artist{breakSort.column === 'artist' && <MaterialIcon name={breakSort.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'} style={{ fontSize: 18, verticalAlign: 'text-bottom' }} />}
                    </button>
                    <div className="break-table-header-resizer" onMouseDown={(event) => startBreakColumnResize('artist', event)} />
                  </div>
                )}
                {breakColumnEnabled('genre') && (
                  <div className="break-table-header-cell">
                    <button className="break-table-header-sort" onClick={() => toggleBreakSort('genre')}>
                      Genre{breakSort.column === 'genre' && <MaterialIcon name={breakSort.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'} style={{ fontSize: 18, verticalAlign: 'text-bottom' }} />}
                    </button>
                    <div className="break-table-header-resizer" onMouseDown={(event) => startBreakColumnResize('genre', event)} />
                  </div>
                )}
                {breakColumnEnabled('length') && (
                  <div className="break-table-header-cell">
                    <button className="break-table-header-sort" onClick={() => toggleBreakSort('length')}>
                      Length{breakSort.column === 'length' && <MaterialIcon name={breakSort.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'} style={{ fontSize: 18, verticalAlign: 'text-bottom' }} />}
                    </button>
                    <div className="break-table-header-resizer" onMouseDown={(event) => startBreakColumnResize('length', event)} />
                  </div>
                )}
                {breakColumnEnabled('path') && (
                  <div className="break-table-header-cell">
                    <button className="break-table-header-sort" onClick={() => toggleBreakSort('path')}>
                      Path{breakSort.column === 'path' && <MaterialIcon name={breakSort.direction === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down'} style={{ fontSize: 18, verticalAlign: 'text-bottom' }} />}
                    </button>
                    <div className="break-table-header-resizer" onMouseDown={(event) => startBreakColumnResize('path', event)} />
                  </div>
                )}
              </div>
              {sortedFilteredBreakLibraryTracks.map((track) => (
                <div
                  key={track.id}
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData('text/plain', String(track.id))
                    setBreakDraggedPlaylistIndex(null)
                    setBreakDraggedTrackId(track.id)
                  }}
                  onDragEnd={() => setBreakDraggedTrackId(null)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: buildBreakGridTemplate(),
                    gap: 8,
                    padding: '8px 10px',
                    fontSize: 13,
                    borderBottom: '1px solid var(--color-border)',
                    alignItems: 'center',
                    cursor: 'grab'
                  }}
                >
                  <button
                    title="Add to playlist"
                    onClick={() => addBreakTrackToPlaylist(track)}
                    style={{ border: 'none', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 16 }}
                  >
                    <MaterialIcon name="add" style={{ fontSize: 18 }} />
                  </button>
                  {breakColumnEnabled('song') && <ScrollingText mode="hover" label={track.title}>{track.title}</ScrollingText>}
                  {breakColumnEnabled('artist') && <ScrollingText mode="hover" label={track.artist || '—'}>{track.artist || '—'}</ScrollingText>}
                  {breakColumnEnabled('genre') && <ScrollingText mode="hover" label={track.genre || '—'}>{track.genre || '—'}</ScrollingText>}
                  {breakColumnEnabled('length') && <span>{formatDurationMs(track.duration_ms)}</span>}
                  {breakColumnEnabled('path') && (
                    <ScrollingText mode="hover" label={track.file_path}>{track.file_path}</ScrollingText>
                  )}
                </div>
              ))}
              {sortedFilteredBreakLibraryTracks.length === 0 && (
                <div style={{ padding: 16, color: 'var(--color-text-secondary)' }}>No tracks found</div>
              )}
            </div>
          </div>

          <div className="break-manager-splitter" onMouseDown={startBreakPaneResize} />

          <div className="break-manager-panel" style={{ flex: `1 1 ${100 - breakLibraryPanePercent}%` }}>
            <div
              className="break-manager-card"
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
              style={{ flex: 1, overflow: 'auto' }}
            >
              {!breakDraftMode && activeBreakPlaylistName && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Loaded playlist: <strong style={{ color: 'var(--color-text-primary)' }}>{activeBreakPlaylistName}</strong>
                </div>
              )}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>Playlist Tracks ({breakPlaylistTracks.length})</span>
                <span>Total {formatDurationMs(breakPlaylistDurationMs)}</span>
              </div>
              {breakPlaylistTracks.map((track, index) => {
                const isCurrent = currentBreakPlaylistRowIndex >= 0 && index === currentBreakPlaylistRowIndex
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
                    <span
                      title={isCurrent ? 'Currently playing song stays at the top' : 'Drag to reorder playlist'}
                      style={{ color: 'var(--color-text-secondary)', cursor: isCurrent ? 'default' : 'grab', fontSize: 16, textAlign: 'center' }}
                    >
                      <MaterialIcon name="drag_indicator" style={{ fontSize: 18 }} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ScrollingText mode="hover" className="break-playlist-title" label={track.title}>{track.title}</ScrollingText>
                        {isCurrent && (
                          <span style={{ fontSize: 11, border: '1px solid var(--color-border-focus)', borderRadius: 999, padding: '1px 8px', color: 'var(--color-accent-hover)' }}>
                            Now Playing
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {track.artist || 'Unknown Artist'} • {formatDurationMs(track.duration_ms)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button title="Move up" disabled={breakManagerBusy || isCurrent || index === 0 || (currentBreakPlaylistRowIndex === 0 && index === 1)} onClick={() => moveBreakTrackInPlaylist(index, -1)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}><MaterialIcon name="keyboard_arrow_up" style={{ fontSize: 18 }} /></button>
                      <button title="Move down" disabled={breakManagerBusy || isCurrent || index === breakPlaylistTracks.length - 1} onClick={() => moveBreakTrackInPlaylist(index, 1)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}><MaterialIcon name="keyboard_arrow_down" style={{ fontSize: 18 }} /></button>
                      <button title="Remove from playlist" disabled={breakManagerBusy} onClick={() => removeBreakTrackFromPlaylist(index)} style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}><MaterialIcon name="delete" style={{ fontSize: 18 }} /></button>
                    </div>
                  </div>
                )
              })}
              {breakPlaylistTracks.length === 0 && (
                <div style={{ padding: 14, color: 'var(--color-text-secondary)' }}>
                  Drag tracks from the library table here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
