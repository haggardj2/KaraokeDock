import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import { formatTime } from './format'
import { matchesBreakTrack, optionalPlaylistId, samePlaylistOrder, type BreakTrack } from '../../break-playlist'
import type { BreakColumnKey, BreakColumnVisibility, BreakColumnWidths, BreakPlaylist, BreakSortState } from './types'

const DEFAULT_BREAK_COLUMNS: BreakColumnVisibility = {
  song: true,
  artist: true,
  genre: true,
  length: true,
  path: true,
}

const BREAK_COLUMNS_STORAGE_KEY = 'host.breakMusicColumns'

function getInitialBreakColumns(): BreakColumnVisibility {
  if (typeof window === 'undefined') return DEFAULT_BREAK_COLUMNS
  try {
    const raw = window.localStorage.getItem(BREAK_COLUMNS_STORAGE_KEY)
    if (!raw) return DEFAULT_BREAK_COLUMNS
    const parsed = JSON.parse(raw)
    return {
      song: !!parsed?.song,
      artist: !!parsed?.artist,
      genre: !!parsed?.genre,
      length: !!parsed?.length,
      path: !!parsed?.path,
    }
  } catch {
    return DEFAULT_BREAK_COLUMNS
  }
}

// Break music: what's playing between singers, the library and the playlist editor.
// Host's Break Music card, the manager dialog and the Player Settings dialog all read from here.
export function useBreakMusic({ headers, setBanner }: {
  headers: Record<string, string>
  setBanner: Dispatch<SetStateAction<string>>
}) {
  const auth = useAuth()
  const [breakMusicPaused, setBreakMusicPaused] = useState(false)
  const [breakMusicTrack, setBreakMusicTrack] = useState<BreakTrack | null>(null)
  const [breakMusicRemainingSec, setBreakMusicRemainingSec] = useState<number | null>(null)
  const [breakMusicCrossfadeSec, setBreakMusicCrossfadeSec] = useState(3)
  const [breakMusicVolumePercent, setBreakMusicVolumePercent] = useState(100)
  const [breakMusicResumeDelay, setBreakMusicResumeDelay] = useState(2)
  const [breakPauseDuringKaraoke, setBreakPauseDuringKaraoke] = useState(true)
  const [savingBreakPlayback, setSavingBreakPlayback] = useState(false)
  const [showBreakPlaylistModal, setShowBreakPlaylistModal] = useState(false)
  const [breakSearchQuery, setBreakSearchQuery] = useState('')
  const [breakLibraryTracks, setBreakLibraryTracks] = useState<BreakTrack[]>([])
  const [breakPlaylistTracks, setBreakPlaylistTracks] = useState<BreakTrack[]>([])
  const [breakPlaylistTrackIds, setBreakPlaylistTrackIds] = useState<number[]>([])
  const [breakDraggedTrackId, setBreakDraggedTrackId] = useState<number | null>(null)
  const [breakDraggedPlaylistIndex, setBreakDraggedPlaylistIndex] = useState<number | null>(null)
  const [breakColumns, setBreakColumns] = useState<BreakColumnVisibility>(() => getInitialBreakColumns())
  const [breakColumnWidths, setBreakColumnWidths] = useState<BreakColumnWidths>({
    song: 220,
    artist: 180,
    genre: 140,
    length: 96,
    path: 320,
  })
  const [breakPlaylists, setBreakPlaylists] = useState<BreakPlaylist[]>([])
  const [activeBreakPlaylistId, setActiveBreakPlaylistId] = useState<number | null>(null)
  const [selectedBreakPlaylistId, setSelectedBreakPlaylistId] = useState('')
  const [breakPlaylistName, setBreakPlaylistName] = useState('')
  const [breakDraftMode, setBreakDraftMode] = useState(false)
  const [breakDraftDirty, setBreakDraftDirty] = useState(false)
  const [breakManagerBusy, setBreakManagerBusy] = useState(false)
  const [breakSyncPending, setBreakSyncPending] = useState(0)
  const [breakManagerError, setBreakManagerError] = useState('')
  const [breakManagerNotice, setBreakManagerNotice] = useState('')
  const [breakPlaylistIndex, setBreakPlaylistIndex] = useState(0)
  const [breakSort, setBreakSort] = useState<BreakSortState>({ column: 'artist', direction: 'asc' })
  const [showBreakColumnMenu, setShowBreakColumnMenu] = useState(false)
  const [breakLibraryPanePercent, setBreakLibraryPanePercent] = useState(62)
  const breakPlaylistTracksRef = useRef<BreakTrack[]>([])
  const breakColumnMenuRef = useRef<HTMLDivElement | null>(null)
  const breakManagerLayoutRef = useRef<HTMLDivElement | null>(null)
  const breakPlaylistSyncRequestRef = useRef(0)
  const breakSyncChainRef = useRef<Promise<void>>(Promise.resolve())
  const breakManagerBusyRef = useRef(false)
  const breakDraftRef = useRef(false)
  const breakStateRequestRef = useRef(0)
  const breakEditorRequestRef = useRef(0)
  const breakVolumeSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadBreakMusicState() {
    const request = ++breakStateRequestRef.current
    try {
      const state = await api('/api/break-music/state')
      if (request !== breakStateRequestRef.current) return
      const nextPlaylistIndex = Number(state.playlistIndex)
      setBreakMusicPaused(!!state.paused)
      setBreakPauseDuringKaraoke(state.pauseDuringKaraoke !== false)
      setBreakMusicTrack(state.currentTrack || null)
      setBreakMusicRemainingSec(typeof state.remainingSec === 'number' ? state.remainingSec : null)
      setBreakPlaylistTrackIds(Array.isArray(state.playlistTrackIds) ? state.playlistTrackIds : [])
      setBreakPlaylistIndex(Number.isFinite(nextPlaylistIndex) ? nextPlaylistIndex : 0)
      if (typeof state.crossfadeSeconds === 'number') {
        setBreakMusicCrossfadeSec(state.crossfadeSeconds)
      }
      if (typeof state.volumePercent === 'number') {
        setBreakMusicVolumePercent(Math.max(0, Math.min(100, Math.round(state.volumePercent))))
      }
      if (typeof state.resumeDelaySec === 'number') {
        setBreakMusicResumeDelay(Math.max(0, Math.min(30, Math.round(state.resumeDelaySec))))
      }
      setBreakPlaylists(state.playlists || [])
      const nextActivePlaylistId = optionalPlaylistId(state.activePlaylistId)
      setActiveBreakPlaylistId(nextActivePlaylistId)
    } catch (err) {
      console.error('Failed to load break music state:', err)
    }
  }

  async function updateBreakCrossfade(seconds: number) {
    if (!auth.sessionToken || !auth.canHost) return
    await api('/api/break-music/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify({ crossfadeSeconds: seconds }),
    })
  }

  async function updateBreakVolume(volumePercent: number) {
    if (!auth.sessionToken || !auth.canHost) return
    await api('/api/break-music/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify({ volumePercent }),
    })
  }

  async function updateBreakResumeDelay(resumeDelaySec: number) {
    if (!auth.sessionToken || !auth.canHost) return
    await api('/api/break-music/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify({ resumeDelaySec }),
    })
  }

  async function updateBreakPauseDuringKaraoke(pauseDuringKaraoke: boolean) {
    if (!auth.sessionToken || !auth.canHost) return
    setSavingBreakPlayback(true)
    try {
      await api('/api/break-music/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pauseDuringKaraoke }),
      })
      await loadBreakMusicState()
    } catch (err) {
      console.error('Failed to update break music playback:', err)
      setBanner('Unable to save break music playback setting.')
    } finally {
      setSavingBreakPlayback(false)
    }
  }

  function scheduleBreakVolumeUpdate(volumePercent: number) {
    if (breakVolumeSaveTimeoutRef.current) {
      clearTimeout(breakVolumeSaveTimeoutRef.current)
    }
    breakVolumeSaveTimeoutRef.current = setTimeout(() => {
      void updateBreakVolume(volumePercent)
      breakVolumeSaveTimeoutRef.current = null
    }, 160)
  }

  async function controlBreakMusic(action: 'pause' | 'resume' | 'skip' | 'previous') {
    if (!auth.sessionToken || !auth.canHost) return
    await api('/api/break-music/control', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action }),
    })
    await loadBreakMusicState()
  }

  async function loadBreakMusicLibrary(query: string = '') {
    if (!auth.sessionToken || !auth.canHost) {
      console.warn('Cannot load break music library without authentication')
      return [] as BreakTrack[]
    }
    try {
      const result = await api(`/api/break-music/search?q=${encodeURIComponent(query)}`, { headers })
      const tracks = Array.isArray(result) ? result : []
      setBreakLibraryTracks(tracks)
      return tracks
    } catch (error) {
      console.error('Could not load break music library:', error)
      setBreakManagerError(error instanceof Error ? error.message : 'Could not load the break music library.')
      throw error
    }
  }

  function setBreakEditorTracks(tracks: BreakTrack[]) {
    setBreakPlaylistTracks(tracks)
    breakPlaylistTracksRef.current = tracks
  }

  async function hydrateBreakActivePlaylist() {
    const request = ++breakEditorRequestRef.current
    const result: { tracks: BreakTrack[]; activePlaylistId: number | null } = await api('/api/break-music/playlist/active', { headers })
    if (request === breakEditorRequestRef.current && !breakDraftRef.current) {
      setBreakEditorTracks(result.tracks)
    }
    return result
  }

  async function openBreakMusicManager() {
    setShowBreakPlaylistModal(true)
    await refreshBreakMusicManager()
  }

  async function refreshBreakMusicManager() {
    if (breakManagerBusyRef.current) return
    breakManagerBusyRef.current = true
    setBreakManagerBusy(true)
    setBreakManagerError('')
    try {
      await breakSyncChainRef.current
      const [, playlists] = await Promise.all([
        loadBreakMusicLibrary(''),
        api('/api/break-music/playlists', { headers }) as Promise<BreakPlaylist[]>,
      ])
      setBreakPlaylists(playlists)
      if (!breakDraftRef.current) {
        const active = await hydrateBreakActivePlaylist()
        const activeId = optionalPlaylistId(active.activePlaylistId)
        setBreakPlaylistName(previous => previous || playlists.find(playlist => playlist.id === activeId)?.name || '')
        setSelectedBreakPlaylistId(previous => previous || (activeId === null ? '' : String(activeId)))
      }
    } catch (error) {
      setBreakManagerError(error instanceof Error ? error.message : 'Could not refresh break music.')
    } finally {
      breakManagerBusyRef.current = false
      setBreakManagerBusy(false)
    }
  }

  function newBreakPlaylist() {
    if (breakManagerBusyRef.current || (breakDraftDirty && !window.confirm('Discard the unsaved playlist draft?'))) return
    breakEditorRequestRef.current++
    breakDraftRef.current = true
    setBreakDraftMode(true)
    setBreakDraftDirty(false)
    setBreakPlaylistName('')
    setSelectedBreakPlaylistId('')
    setBreakEditorTracks([])
    setBreakManagerError('')
    setBreakManagerNotice('New playlist draft. The running playlist is unchanged.')
  }

  async function editRunningBreakPlaylist() {
    if (breakManagerBusyRef.current || (breakDraftDirty && !window.confirm('Discard the unsaved playlist draft?'))) return
    breakDraftRef.current = false
    setBreakDraftMode(false)
    setBreakDraftDirty(false)
    setBreakPlaylistName('')
    setBreakManagerNotice('')
    await refreshBreakMusicManager()
  }

  async function saveBreakPlaylist() {
    if (!auth.sessionToken || !auth.canHost || breakManagerBusyRef.current) return
    const name = breakPlaylistName.trim()
    if (!name) {
      setBreakManagerError('Enter a playlist name before saving.')
      return
    }
    if (breakPlaylistTracksRef.current.length === 0) {
      setBreakManagerError('Add at least one track before saving.')
      return
    }
    if (breakPlaylists.some(playlist => playlist.name === name) && !window.confirm(`Replace the saved playlist "${name}"?`)) return
    breakManagerBusyRef.current = true
    setBreakManagerBusy(true)
    setBreakManagerError('')
    setBreakManagerNotice('')
    try {
      await breakSyncChainRef.current
      const result: { playlistId: number; warning?: string } = await api('/api/break-music/playlists', {
        method: 'POST', headers,
        body: JSON.stringify({ name, trackIds: breakPlaylistTracksRef.current.map(track => track.id) }),
      })
      breakStateRequestRef.current++
      setBreakPlaylists(previous => [
        { id: result.playlistId, name }, ...previous.filter(playlist => playlist.id !== result.playlistId),
      ])
      setSelectedBreakPlaylistId(String(result.playlistId))
      setBreakDraftDirty(false)
      setBreakManagerNotice(`Saved "${name}".${breakDraftRef.current ? ' Select Load to use it for playback.' : ''}${result.warning ? ` ${result.warning}` : ''}`)
    } catch (error) {
      console.error('Could not save break music playlist:', error)
      setBreakManagerError(error instanceof Error ? error.message : 'Could not save playlist.')
    } finally {
      breakManagerBusyRef.current = false
      setBreakManagerBusy(false)
    }
  }

  async function loadBreakPlaylist(playlistId: number) {
    if (!auth.sessionToken || !auth.canHost || breakManagerBusyRef.current) return
    if (breakDraftDirty && !window.confirm('Discard unsaved playlist edits and load the selected playlist for playback?')) return
    breakManagerBusyRef.current = true
    setBreakManagerBusy(true)
    setBreakManagerError('')
    setBreakManagerNotice('')
    breakEditorRequestRef.current++
    try {
      await breakSyncChainRef.current
      breakStateRequestRef.current++
      const result: { tracks: BreakTrack[]; trackIds: number[]; currentTrack: BreakTrack | null; playlistIndex: number } =
        await api('/api/break-music/playlists/load', {
          method: 'POST', headers, body: JSON.stringify({ playlistId }),
        })
      breakDraftRef.current = false
      setBreakDraftMode(false)
      setBreakDraftDirty(false)
      setBreakEditorTracks(result.tracks)
      setBreakPlaylistTrackIds(result.trackIds)
      setBreakPlaylistIndex(result.playlistIndex)
      setBreakMusicTrack(result.currentTrack)
      setSelectedBreakPlaylistId(String(playlistId))
      setActiveBreakPlaylistId(playlistId)
      const name = breakPlaylists.find(playlist => playlist.id === playlistId)?.name || ''
      setBreakPlaylistName(name)
      setBreakManagerNotice(`Loaded "${name}" for playback.`)
      await loadBreakMusicState()
    } catch (error) {
      console.error('Could not load break music playlist:', error)
      setBreakManagerError(error instanceof Error ? error.message : 'Could not load playlist.')
    } finally {
      breakManagerBusyRef.current = false
      setBreakManagerBusy(false)
    }
  }

  async function syncBreakActivePlaylist(nextTracks: BreakTrack[], requestId: number) {
    try {
      if (!auth.sessionToken || !auth.canHost) throw new Error('Sign in to update the running playlist.')
      breakStateRequestRef.current++
      const result = await api('/api/break-music/playlist/active', {
        method: 'POST',
        headers,
        body: JSON.stringify({ trackIds: nextTracks.map((t) => t.id) }),
      })
      if (requestId !== breakPlaylistSyncRequestRef.current) return
      const nextPlaylistIndex = Number(result?.playlistIndex)
      setBreakPlaylistTrackIds(Array.isArray(result?.trackIds) ? result.trackIds : [])
      setBreakPlaylistIndex(Number.isFinite(nextPlaylistIndex) ? nextPlaylistIndex : 0)
      setBreakMusicTrack(result?.currentTrack || null)
      await loadBreakMusicState()
    } catch (err) {
      console.error('Failed to sync active break playlist:', err)
      if (requestId === breakPlaylistSyncRequestRef.current) {
        setBreakManagerError('Failed to update the running playlist. Your edits are still shown; save them as a named playlist or refresh to reload playback.')
      }
    } finally {
      setBreakSyncPending(count => count - 1)
    }
  }

  function setBreakPlaylistTracksAndSync(nextTracks: BreakTrack[]) {
    if (breakManagerBusyRef.current) return
    breakEditorRequestRef.current++
    setBreakEditorTracks(nextTracks)
    setBreakDraftDirty(true)
    setBreakManagerNotice('')
    if (breakDraftRef.current) return
    const request = ++breakPlaylistSyncRequestRef.current
    setBreakSyncPending(count => count + 1)
    breakSyncChainRef.current = breakSyncChainRef.current.then(() => syncBreakActivePlaylist(nextTracks, request))
  }

  function addBreakTrackToPlaylist(track: BreakTrack) {
    const playlist = breakPlaylistTracksRef.current
    const hasIndexedCurrentTrack =
      !breakDraftRef.current && breakMusicTrack != null &&
      breakPlaylistIndex >= 0 &&
      breakPlaylistIndex < playlist.length &&
      playlist[breakPlaylistIndex]?.id === breakMusicTrack.id
    const insertAt = hasIndexedCurrentTrack ? breakPlaylistIndex + 1 : playlist.length
    const next = [...playlist]
    next.splice(insertAt, 0, track)
    setBreakPlaylistTracksAndSync(next)
  }

  function removeBreakTrackFromPlaylist(index: number) {
    const playlist = breakPlaylistTracksRef.current
    if (index < 0 || index >= playlist.length) return
    const next = playlist.filter((_, i) => i !== index)
    setBreakPlaylistTracksAndSync(next)
  }

  function clearBreakPlaylist() {
    setBreakPlaylistTracksAndSync([])
  }

  function addAllBreakTracksToPlaylist() {
    const toAdd = sortedFilteredBreakLibraryTracks
    if (toAdd.length === 0) return
    const playlist = breakPlaylistTracksRef.current
    const existingIds = new Set(playlist.map((t) => t.id))
    const newTracks = toAdd.filter((t) => !existingIds.has(t.id))
    if (newTracks.length === 0) return
    const hasIndexedCurrentTrack =
      !breakDraftRef.current && breakMusicTrack != null &&
      breakPlaylistIndex >= 0 &&
      breakPlaylistIndex < playlist.length &&
      playlist[breakPlaylistIndex]?.id === breakMusicTrack.id
    const insertAt = hasIndexedCurrentTrack ? breakPlaylistIndex + 1 : playlist.length
    const next = [...playlist]
    next.splice(insertAt, 0, ...newTracks)
    setBreakPlaylistTracksAndSync(next)
  }

  function shuffleBreakPlaylist() {
    const playlist = [...breakPlaylistTracksRef.current]
    if (playlist.length < 2) return
    for (let i = playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playlist[i], playlist[j]] = [playlist[j], playlist[i]]
    }
    // Pin the currently playing track at position 0 so that after it finishes,
    // playback continues through the full new shuffled order from the beginning.
    if (!breakDraftRef.current && breakMusicTrack) {
      const currentIdx = playlist.findIndex((t) => t.id === breakMusicTrack.id)
      if (currentIdx > 0) {
        const [current] = playlist.splice(currentIdx, 1)
        playlist.unshift(current)
      }
    }
    setBreakPlaylistTracksAndSync(playlist)
  }

  function moveBreakTrackInPlaylist(index: number, direction: -1 | 1) {
    const playlist = breakPlaylistTracksRef.current
    const target = index + direction
    if (target < 0 || target >= playlist.length) return
    moveBreakTrackToPlaylistIndex(index, target)
  }

  function moveBreakTrackToPlaylistIndex(fromIndex: number, targetIndex: number) {
    const playlist = breakPlaylistTracksRef.current
    if (
      fromIndex < 0 ||
      fromIndex >= playlist.length ||
      targetIndex < 0 ||
      targetIndex >= playlist.length ||
      fromIndex === targetIndex
    ) {
      return
    }
    if (!breakDraftRef.current && playlist[0]?.id === breakMusicTrack?.id) {
      if (fromIndex === 0) return
      targetIndex = Math.max(1, targetIndex)
    }
    const next = [...playlist]
    const [item] = next.splice(fromIndex, 1)
    next.splice(targetIndex, 0, item)
    setBreakPlaylistTracksAndSync(next)
  }

  const filteredBreakLibraryTracks = useMemo(() => {
    return breakLibraryTracks.filter(track => matchesBreakTrack(track, breakSearchQuery))
  }, [breakLibraryTracks, breakSearchQuery])

  const breakPlaylistDurationMs = useMemo(
    () => breakPlaylistTracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0),
    [breakPlaylistTracks]
  )

  const currentBreakPlaylistRowIndex = useMemo(() => {
    if (breakDraftMode || !breakMusicTrack) return -1
    const indexedTrackId = breakPlaylistTracks[breakPlaylistIndex]?.id
    if (indexedTrackId === breakMusicTrack.id) return breakPlaylistIndex
    return breakPlaylistTracks.findIndex((item) => item.id === breakMusicTrack.id)
  }, [breakDraftMode, breakMusicTrack, breakPlaylistTracks, breakPlaylistIndex])

  const activeBreakPlaylistName = useMemo(() => {
    if (activeBreakPlaylistId == null) return ''
    return breakPlaylists.find((playlist) => playlist.id === activeBreakPlaylistId)?.name || ''
  }, [activeBreakPlaylistId, breakPlaylists])

  useEffect(() => {
    if (!showBreakPlaylistModal || breakDraftMode || breakManagerBusy || breakSyncPending > 0 || breakManagerError) return
    if (samePlaylistOrder(breakPlaylistTracksRef.current, breakPlaylistTrackIds)) return
    void hydrateBreakActivePlaylist().catch(error => {
      setBreakManagerError(error instanceof Error ? error.message : 'Could not load the running playlist.')
    })
    return () => { breakEditorRequestRef.current++ }
  }, [showBreakPlaylistModal, breakDraftMode, breakPlaylistTrackIds, breakManagerBusy, breakSyncPending, breakManagerError, headers])

  useEffect(() => {
    if (!showBreakColumnMenu) return
    const onPointerDown = (event: MouseEvent) => {
      if (!breakColumnMenuRef.current?.contains(event.target as Node)) {
        setShowBreakColumnMenu(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [showBreakColumnMenu])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(BREAK_COLUMNS_STORAGE_KEY, JSON.stringify(breakColumns))
  }, [breakColumns])

  function formatDurationMs(ms: number | null | undefined) {
    if (!ms || ms <= 0) return '—'
    return formatTime(Math.floor(ms / 1000))
  }

  function toggleBreakColumn(column: BreakColumnKey) {
    setBreakColumns((prev) => ({ ...prev, [column]: !prev[column] }))
  }

  function breakColumnEnabled(column: BreakColumnKey) {
    return !!breakColumns[column]
  }

  function updateBreakColumnWidth(column: BreakColumnKey, width: number) {
    setBreakColumnWidths((prev) => ({ ...prev, [column]: width }))
  }

  function getBreakColumnLimits(column: BreakColumnKey) {
    if (column === 'length') return { min: 72, max: 180 }
    if (column === 'path') return { min: 180, max: 640 }
    return { min: 100, max: 420 }
  }

  function startBreakColumnResize(column: BreakColumnKey, event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = breakColumnWidths[column]
    const { min, max } = getBreakColumnLimits(column)
    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const width = Math.min(max, Math.max(min, startWidth + delta))
      updateBreakColumnWidth(column, width)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function toggleBreakSort(column: BreakColumnKey) {
    setBreakSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { column, direction: 'asc' }
    })
  }

  const sortedFilteredBreakLibraryTracks = useMemo(() => {
    const tracks = [...filteredBreakLibraryTracks]
    const directionMultiplier = breakSort.direction === 'asc' ? 1 : -1
    const compareText = (a: string | null | undefined, b: string | null | undefined) =>
      (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' })
    tracks.sort((a, b) => {
      let result = 0
      if (breakSort.column === 'song') result = compareText(a.title, b.title)
      else if (breakSort.column === 'artist') result = compareText(a.artist, b.artist) || compareText(a.title, b.title)
      else if (breakSort.column === 'genre') result = compareText(a.genre, b.genre) || compareText(a.title, b.title)
      else if (breakSort.column === 'length') result = (a.duration_ms || 0) - (b.duration_ms || 0)
      else if (breakSort.column === 'path') result = compareText(a.file_path, b.file_path)
      return result * directionMultiplier
    })
    return tracks
  }, [filteredBreakLibraryTracks, breakSort])

  function buildBreakGridTemplate() {
    const cols: string[] = []
    cols.push('48px')
    if (breakColumnEnabled('song')) cols.push(`minmax(140px, ${breakColumnWidths.song}px)`)
    if (breakColumnEnabled('artist')) cols.push(`minmax(120px, ${breakColumnWidths.artist}px)`)
    if (breakColumnEnabled('genre')) cols.push(`minmax(100px, ${breakColumnWidths.genre}px)`)
    if (breakColumnEnabled('length')) cols.push(`${breakColumnWidths.length}px`)
    if (breakColumnEnabled('path')) cols.push(`minmax(180px, ${breakColumnWidths.path}px)`)
    return cols.join(' ')
  }

  function canDropOnBreakPlaylist(ev: React.DragEvent<HTMLDivElement>) {
    return ev.dataTransfer.types?.includes('text/plain') || breakDraggedTrackId !== null || breakDraggedPlaylistIndex !== null
  }

  function getBreakDraggedTrackId(ev: React.DragEvent<HTMLDivElement>) {
    const raw = ev.dataTransfer.getData('text/plain')
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
    return breakDraggedTrackId
  }

  function startBreakPaneResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    const layout = breakManagerLayoutRef.current
    if (!layout) return
    const bounds = layout.getBoundingClientRect()
    const onMove = (moveEvent: MouseEvent) => {
      const relative = ((moveEvent.clientX - bounds.left) / bounds.width) * 100
      const clamped = Math.max(35, Math.min(80, relative))
      setBreakLibraryPanePercent(clamped)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function closeBreakMusicManager() {
    if (breakManagerBusyRef.current) return
    breakEditorRequestRef.current++
    setShowBreakColumnMenu(false)
    setShowBreakPlaylistModal(false)
  }

  useEffect(() => {
    if (breakMusicPaused || breakMusicRemainingSec == null || breakMusicRemainingSec <= 0) return
    const timer = setInterval(() => {
      setBreakMusicRemainingSec((prev) => (prev == null ? prev : Math.max(0, prev - 1)))
    }, 1000)
    return () => clearInterval(timer)
  }, [breakMusicPaused, breakMusicRemainingSec])

  return {
    breakMusicPaused,
    setBreakMusicPaused,
    breakMusicTrack,
    setBreakMusicTrack,
    breakMusicRemainingSec,
    setBreakMusicRemainingSec,
    breakMusicCrossfadeSec,
    setBreakMusicCrossfadeSec,
    breakMusicVolumePercent,
    setBreakMusicVolumePercent,
    breakMusicResumeDelay,
    setBreakMusicResumeDelay,
    breakPauseDuringKaraoke,
    setBreakPauseDuringKaraoke,
    savingBreakPlayback,
    setSavingBreakPlayback,
    showBreakPlaylistModal,
    setShowBreakPlaylistModal,
    breakSearchQuery,
    setBreakSearchQuery,
    breakLibraryTracks,
    setBreakLibraryTracks,
    breakPlaylistTracks,
    setBreakPlaylistTracks,
    breakPlaylistTrackIds,
    setBreakPlaylistTrackIds,
    breakDraggedTrackId,
    setBreakDraggedTrackId,
    breakDraggedPlaylistIndex,
    setBreakDraggedPlaylistIndex,
    breakColumns,
    setBreakColumns,
    breakColumnWidths,
    setBreakColumnWidths,
    breakPlaylists,
    setBreakPlaylists,
    activeBreakPlaylistId,
    setActiveBreakPlaylistId,
    selectedBreakPlaylistId,
    setSelectedBreakPlaylistId,
    breakPlaylistName,
    setBreakPlaylistName,
    breakDraftMode,
    setBreakDraftMode,
    breakDraftDirty,
    setBreakDraftDirty,
    breakManagerBusy,
    setBreakManagerBusy,
    breakSyncPending,
    setBreakSyncPending,
    breakManagerError,
    setBreakManagerError,
    breakManagerNotice,
    setBreakManagerNotice,
    breakPlaylistIndex,
    setBreakPlaylistIndex,
    breakSort,
    setBreakSort,
    showBreakColumnMenu,
    setShowBreakColumnMenu,
    breakLibraryPanePercent,
    setBreakLibraryPanePercent,
    breakPlaylistTracksRef,
    breakColumnMenuRef,
    breakManagerLayoutRef,
    breakPlaylistSyncRequestRef,
    breakSyncChainRef,
    breakManagerBusyRef,
    breakDraftRef,
    breakStateRequestRef,
    breakEditorRequestRef,
    breakVolumeSaveTimeoutRef,
    loadBreakMusicState,
    updateBreakCrossfade,
    updateBreakVolume,
    updateBreakResumeDelay,
    updateBreakPauseDuringKaraoke,
    scheduleBreakVolumeUpdate,
    controlBreakMusic,
    loadBreakMusicLibrary,
    setBreakEditorTracks,
    hydrateBreakActivePlaylist,
    openBreakMusicManager,
    refreshBreakMusicManager,
    newBreakPlaylist,
    editRunningBreakPlaylist,
    saveBreakPlaylist,
    loadBreakPlaylist,
    syncBreakActivePlaylist,
    setBreakPlaylistTracksAndSync,
    addBreakTrackToPlaylist,
    removeBreakTrackFromPlaylist,
    clearBreakPlaylist,
    addAllBreakTracksToPlaylist,
    shuffleBreakPlaylist,
    moveBreakTrackInPlaylist,
    moveBreakTrackToPlaylistIndex,
    filteredBreakLibraryTracks,
    breakPlaylistDurationMs,
    currentBreakPlaylistRowIndex,
    activeBreakPlaylistName,
    formatDurationMs,
    toggleBreakColumn,
    breakColumnEnabled,
    updateBreakColumnWidth,
    getBreakColumnLimits,
    startBreakColumnResize,
    toggleBreakSort,
    sortedFilteredBreakLibraryTracks,
    buildBreakGridTemplate,
    canDropOnBreakPlaylist,
    getBreakDraggedTrackId,
    startBreakPaneResize,
    closeBreakMusicManager,
  }
}

export type BreakMusic = ReturnType<typeof useBreakMusic>
