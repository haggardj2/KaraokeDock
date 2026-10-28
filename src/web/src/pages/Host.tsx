// web/src/pages/Host.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { api, API_BASE, getWsUrl } from '../api'
import { useAuth } from '../auth-context'
import { parseBooleanSetting } from '../utils/settings'
import SingerAvatar, { type SingerProfile, type ProfileCrop } from '../components/SingerAvatar'
import ProfileDialog from '../components/ProfileDialog'
import ProfileImageEditor from '../components/ProfileImageEditor'
import QueueDragHandle from '../components/QueueDragHandle'
import ScrollingText from '../components/ScrollingText'
import { attachTouchQueueReorder } from '../touch-queue-reorder'
import { matchesBreakTrack, optionalPlaylistId, samePlaylistOrder, type BreakTrack } from '../break-playlist'
import type { OverlaySettings } from '../components/QueueOverlay'
import { THEMES, applyTheme, clearTheme, isThemeId, type ThemeId } from '../theme'
import { useStaffTheme } from '../useStaffTheme'
import MaterialIcon, { renderStatusMessage } from '../components/MaterialIcon'
import { downloadJsonFile, readJsonFile, safeHistoryFilename } from '../utils/jsonFiles'
import {
  DEFAULT_PLAYER_BACKGROUND_SETTINGS,
  PLAYER_BACKGROUND_IMAGE_MAX_BYTES,
  PLAYER_BACKGROUND_IMAGE_TYPES,
  PLAYER_BACKGROUND_SLIDESHOW_MAX_INTERVAL_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MAX_TRANSITION_DURATION_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MIN_INTERVAL_SECONDS,
  PLAYER_BACKGROUND_SLIDESHOW_MIN_TRANSITION_DURATION_SECONDS,
  getApiAssetUrl,
  isPlayerBackgroundLibraryImage,
  normalizePlayerBackgroundSettings,
  type PlayerBackgroundLibraryImage,
  type PlayerBackgroundMode,
  type PlayerBackgroundSettings,
  type PlayerBackgroundSlideshowImage,
  type PlayerBackgroundTransitionStyle,
} from '../playerBackground'
import { AppBarContent } from '../appBarSlot'
import './Host.css'
import AccountDialog from './host/AccountDialog'
import HistoryManagerDialog from './host/HistoryManagerDialog'
import SingerDialog from './host/SingerDialog'
import ReplaceSongDialog, { type ReplaceSongTarget } from './host/ReplaceSongDialog'
import AddSongDialog, { type AddSongPreset } from './host/AddSongDialog'
import { useBreakMusic } from './host/useBreakMusic'
import { usePlayerSettings } from './host/usePlayerSettings'
import PlayerSettingsDialog from './host/PlayerSettingsDialog'
import BreakMusicManagerDialog from './host/BreakMusicManagerDialog'
import { formatRequestedAt, formatTime, formatTimeAgo } from './host/format'
import { renderDiscIdTag } from './host/renderDiscIdTag'
import { KARAOKE_NERDS_SEARCH_DELAY_MS, LOCAL_SEARCH_DELAY_MS, fetchVideoTitle, renderSearchResultText } from './host/songSearch'
import { getKdSingerAvatarUrl, getKdSingerDisplayName } from './host/singerHistoryFile'
import type {
  ActiveRotation,
  ArchivedSinger,
  BreakColumnKey,
  BreakColumnVisibility,
  BreakColumnWidths,
  BreakPlaylist,
  BreakSortDirection,
  BreakSortState,
  OidcPublicConfig,
  QueueSinger,
  QueueSong,
  QueueState,
  Row,
  SingerHistory,
  SingerHistoryKdFile,
  SingerHistoryKdSinger,
  SingerHistorySong,
} from './host/types'
import { DEFAULT_PLAYER_PLAYBACK_STATE, normalizePlayerPlaybackState, isSingerPaused, singerPlaybackAction, getSingerDisplaySong, type PlayerPlaybackState } from '../playerPlayback'

// --- Nested queue state types ---

const HOST_TOP_COLLAPSED_STORAGE_KEY = 'host.topCardCollapsed'

function getInitialHostTopCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(HOST_TOP_COLLAPSED_STORAGE_KEY) === 'true'
}

export default function Host() {
  const auth = useAuth()
  const [queue, setQueue] = useState<Row[]>([])
  const [playerState, setPlayerState] = useState(DEFAULT_PLAYER_PLAYBACK_STATE)
  const playerStateRef = useRef(DEFAULT_PLAYER_PLAYBACK_STATE)
  const queueRefreshRef = useRef(0)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [oidcConfig, setOidcConfig] = useState<OidcPublicConfig | null>(null)
  const [banner, setBanner] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoPlayDelay, setAutoPlayDelay] = useState(5)
  const [currentTime, setCurrentTime] = useState(0)
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [replacingSong, setReplacingSong] = useState<ReplaceSongTarget | null>(null)
  const [draggedItem, setDraggedItem] = useState<Row | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [showPlayerWindowControl, setShowPlayerWindowControl] = useState(false)
  const [showAccountManagement, setShowAccountManagement] = useState(false)
  const [hostTopCollapsed, setHostTopCollapsed] = useState(() => getInitialHostTopCollapsed())
  const [themeId] = useStaffTheme()
  const [showHostMenu, setShowHostMenu] = useState(false)

  // Manual request modal state
  const [showManualRequest, setShowManualRequest] = useState(false)
  const [manualRequestPreset, setManualRequestPreset] = useState<AddSongPreset | null>(null)

  // Library availability settings
  const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true)
  const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true)

  // Download settings
  const [allowDownloads, setAllowDownloads] = useState(true)
  const [downloadingTrack, setDownloadingTrack] = useState<string | null>(null)

  // Rotation settings

  // Nested singer queue state
  const [queueState, setQueueState] = useState<QueueState | null>(null)
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null)
  const [selectedSingerHistory, setSelectedSingerHistory] = useState<SingerHistory | null>(null)
  const [singerModalOpen, setSingerModalOpen] = useState(false)
  const [singerModalLoading, setSingerModalLoading] = useState(false)
  const [singerDraggedId, setSingerDraggedId] = useState<string | null>(null)
  const [singerDragOverId, setSingerDragOverId] = useState<string | null>(null)
  const [savingQueueOrder, setSavingQueueOrder] = useState(false)
  const queueOrderSavingRef = useRef(false)
  const singerQueueTouchRef = useRef<HTMLDivElement>(null)
  const [historyManagerOpen, setHistoryManagerOpen] = useState(false)
  // Merge singer state
  // Add song to queue from singer modal — delegates to showManualRequest with singer pre-filled

  const wsRef = useRef<WebSocket | null>(null)
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const songTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoPlayDelayRef = useRef<number>(autoPlayDelay)
  const autoPlayEnabledRef = useRef<boolean>(autoPlay)
  const lastWebSocketUpdateRef = useRef<number>(0)
  const explicitStopRef = useRef<boolean>(false)
  const autoPlayScheduledRef = useRef<boolean>(false)
  const wsHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationSetForSongRef = useRef<boolean>(false)

  const headers = useMemo(() => ({ 'x-session-token': auth.sessionToken, 'Content-Type': 'application/json' }), [auth.sessionToken])
  const breakMusic = useBreakMusic({ headers, setBanner })
  const {
    breakMusicPaused,
    breakMusicTrack,
    breakMusicRemainingSec,
    showBreakPlaylistModal,
    breakPlaylistTrackIds,
    breakVolumeSaveTimeoutRef,
    loadBreakMusicState,
    controlBreakMusic,
    openBreakMusicManager,
    activeBreakPlaylistName,
  } = breakMusic
  const playerSettings = usePlayerSettings({ headers, refreshQueue, refreshQueueState })
  const {
    applyPlayerBackgroundSettings,
  } = playerSettings

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oidcCode = params.get('oidc_code')
    const oidcError = params.get('oidc_error')

    if (oidcCode) {
      api('/api/auth/oidc/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: oidcCode })
      })
        .then((result) => {
          auth.setSessionToken(result.sessionToken)
          auth.setIsLoggedIn(true)
          auth.setRole(result.role || 'user')
          auth.setProfile({
            username: result.username || '',
            displayName: result.displayName || '',
            picture: result.picture || ''
          })
          window.history.replaceState({}, '', window.location.pathname)
        })
        .catch((err) => {
          setLoginError(`SSO login failed: ${String(err?.message || 'Unable to complete login')}`)
          window.history.replaceState({}, '', window.location.pathname)
        })
    } else if (oidcError) {
      setLoginError(`SSO login failed: ${decodeURIComponent(oidcError)}`)
      window.history.replaceState({}, '', window.location.pathname)
    }

    refreshQueue()
    refreshQueueState()
    api('/api/auth/oidc/config')
      .then((cfg) => setOidcConfig(cfg))
      .catch(() => {})

    return () => {
      if (breakVolumeSaveTimeoutRef.current) clearTimeout(breakVolumeSaveTimeoutRef.current)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setBusy(true)

    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      })

      if (result.ok && result.sessionToken) {
        auth.setSessionToken(result.sessionToken)
        auth.setIsLoggedIn(true)
        auth.setRole(result.role || 'user')
        setLoginPassword('')
        auth.setIsDefaultPassword(result.isDefaultPassword || false)
        auth.setProfile({
          username: result.username || '',
          displayName: result.displayName || '',
          picture: result.picture || ''
        })

        if (result.isDefaultPassword) {
          setBanner('⚠️ You are using the default password. Please change it in Account Settings.')
        }
      } else {
        setLoginError('Invalid password')
      }
    } catch (err) {
      setLoginError('Login failed.  Please try again.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const handleShowAccountManagement = () => {
      setShowAccountManagement(true)
    }
    window.addEventListener('showAccountManagement', handleShowAccountManagement)
    return () => {
      window.removeEventListener('showAccountManagement', handleShowAccountManagement)
    }
  }, [])

  // Load library availability settings
  useEffect(() => {
    async function loadSettings() {
      // Only load settings if authenticated
      if (!auth.sessionToken || !auth.canHost) {
        return;
      }

      try {
        const settings = await api('/api/host/settings', { headers });
        const localEnabled = parseBooleanSetting(settings['libraries.local_enabled']);
        const externalEnabled = parseBooleanSetting(settings['libraries.external_enabled']);
        const downloadsAllowed = parseBooleanSetting(settings['ytdlp.allow_downloads']);

        setLocalLibraryEnabled(localEnabled);
        setExternalLibraryEnabled(externalEnabled);
        setAllowDownloads(downloadsAllowed);

      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }

    loadSettings();
    loadBreakMusicState();
  }, [auth.sessionToken, auth.canHost, headers])

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  useEffect(() => clearTheme, [])

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(HOST_TOP_COLLAPSED_STORAGE_KEY, String(hostTopCollapsed))
  }, [hostTopCollapsed])

  // Update refs when state changes
  useEffect(() => {
    autoPlayDelayRef.current = autoPlayDelay
  }, [autoPlayDelay])

  useEffect(() => {
    autoPlayEnabledRef.current = autoPlay
    if (autoPlay) {
      explicitStopRef.current = false
    }
  }, [autoPlay])

  function applyPlayerState(value: Partial<PlayerPlaybackState>) {
    const state = normalizePlayerPlaybackState(value, playerStateRef.current)
    playerStateRef.current = state
    setPlayerState(state)
    explicitStopRef.current = state.manualStop
    if (state.paused) setCurrentTime(state.positionSec)
  }

  async function refreshQueue() {
    const revision = ++queueRefreshRef.current
    const [q, state] = await Promise.all([
      api('/api/queue'),
      api('/api/player/state'),
    ])
    if (revision !== queueRefreshRef.current) return
    applyPlayerState(state)
    setQueue(q || [])
  }

  async function refreshQueueState() {
    try {
      const state = await api('/api/queue/state')
      setQueueState(state || null)
    } catch (err) {
      console.error('Failed to load queue state:', err)
    }
  }

  async function openSingerModal(singerId: string) {
    setSelectedSingerId(singerId)
    setSingerModalOpen(true)
    setSingerModalLoading(true)
    setSelectedSingerHistory(null)
    try {
      const history = await api(`/api/singers/${singerId}/history`, { headers })
      setSelectedSingerHistory(history || null)
    } catch (err) {
      console.error('Failed to load singer history:', err)
    } finally {
      setSingerModalLoading(false)
    }
  }

  function closeSingerModal() {
    setSingerModalOpen(false)
    setSelectedSingerId(null)
    setSelectedSingerHistory(null)
  }

  function openHistoryManager() {
    setHistoryManagerOpen(true)
  }

  async function searchSongsForSinger(q: string) {
    // No longer used — singer add-song uses the manual request modal
  }

  async function addSongForSinger(_trackId: number) {
    // No longer used
  }

  async function moveSinger(singerId: string, direction: 'up' | 'down') {
    if (!auth.sessionToken || !auth.canHost || !queueState?.activeRotation) return
    const rotationId = queueState.activeRotation.id
    const singers = queueState.queueOrder
    const idx = singers.findIndex(s => s.singerId === singerId)
    if (idx < 0) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= singers.length) return
    // Swap positions
    const currentPos = singers[idx].rotationPosition ?? idx + 1
    const targetPos = singers[targetIdx].rotationPosition ?? targetIdx + 1
    try {
      await api(`/api/rotations/${rotationId}/singers/${singerId}/position`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ position: targetPos }),
      })
      await api(`/api/rotations/${rotationId}/singers/${singers[targetIdx].singerId}/position`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ position: currentPos }),
      })
      await refreshQueueState()
    } catch (err) {
      console.error('Failed to move singer:', err)
    }
  }

  function handleSingerDragStart(singerId: string) {
    setSingerDraggedId(singerId)
  }

  const touchQueueCallbacks = useRef<{
    enabled: () => boolean
    singerDrop: (source: string, target: string) => void
  }>({
    enabled: () => false,
    singerDrop: (_source: string, _target: string) => {},
  })
  touchQueueCallbacks.current = {
    enabled: () => auth.canHost && !busy && !queueOrderSavingRef.current,
    singerDrop: (source, target) => { void reorderSingers(source, target) },
  }
  const hasSingerQueue = Boolean(queueState?.queueOrder.length)
  useEffect(() => {
    if (!singerQueueTouchRef.current) return
    return attachTouchQueueReorder(singerQueueTouchRef.current, {
      attribute: 'data-singer-drag-id',
      isEnabled: () => touchQueueCallbacks.current.enabled(),
      onStart: setSingerDraggedId, onTarget: setSingerDragOverId,
      onEnd: () => { setSingerDraggedId(null); setSingerDragOverId(null) },
      onDrop: (source, target) => touchQueueCallbacks.current.singerDrop(source, target),
    })
  }, [auth.canHost, hasSingerQueue])

  function handleSingerDragEnd() {
    setSingerDraggedId(null)
    setSingerDragOverId(null)
  }

  function handleSingerDragOver(e: React.DragEvent, singerId: string) {
    e.preventDefault()
    setSingerDragOverId(singerId)
  }

  async function handleSingerDrop(e: React.DragEvent, targetSingerId: string) {
    e.preventDefault()
    if (singerDraggedId) await reorderSingers(singerDraggedId, targetSingerId)
  }

  async function reorderSingers(sourceSingerId: string, targetSingerId: string) {
    setSingerDragOverId(null)
    if (sourceSingerId === targetSingerId || queueOrderSavingRef.current) {
      setSingerDraggedId(null)
      return
    }
    if (!auth.sessionToken || !auth.canHost || !queueState?.activeRotation) {
      setSingerDraggedId(null)
      return
    }
    const rotationId = queueState.activeRotation.id
    const singers = [...queueState.queueOrder].sort((a, b) => {
      const aIsSinging = getSingerDisplaySong(a)?.status === 'playing'
      const bIsSinging = getSingerDisplaySong(b)?.status === 'playing'
      if (aIsSinging && !bIsSinging) return -1
      if (!aIsSinging && bIsSinging) return 1
      return 0
    })
    const fromIdx = singers.findIndex(s => s.singerId === sourceSingerId)
    const toIdx = singers.findIndex(s => s.singerId === targetSingerId)
    if (fromIdx < 0 || toIdx < 0) {
      setSingerDraggedId(null)
      return
    }
    // Build new order
    const reordered = [...singers]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    queueOrderSavingRef.current = true
    setSavingQueueOrder(true)
    try {
      await api(`/api/rotations/${rotationId}/singers/reorder`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ orderedSingerIds: reordered.map(s => s.singerId) }),
      })
      await refreshQueueState()
    } catch (err) {
      console.error('Failed to reorder singers:', err)
      setBanner('Could not update singer order. Please try again.')
    } finally {
      queueOrderSavingRef.current = false
      setSavingQueueOrder(false)
      setSingerDraggedId(null)
    }
  }

  function openReplaceSong(song: { queueId?: number; id?: number; title?: string | null; artist?: string | null }) {
    const queueId = song.queueId ?? song.id
    if (queueId == null) return
    setReplacingSong({ queueId, title: song.title ?? null, artist: song.artist ?? null })
  }
  function renderReplaceButton(song: { queueId?: number; id?: number; title?: string | null; artist?: string | null }, label = 'Replace song') {
    return (
      <button
        className="control-btn"
        type="button"
        title={label}
        aria-label={label}
        disabled={busy}
        onClick={() => openReplaceSong(song)}
        style={{ padding: '6px 10px', fontSize: 13, lineHeight: 1 }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: 18, display: 'block' }}>
          contract_edit
        </span>
      </button>
    )
  }

  async function refreshQueueViews() {
    await refreshQueue()
    await refreshQueueState()
    if (selectedSingerId) {
      try {
        const history = await api(`/api/singers/${selectedSingerId}/history`, { headers })
        setSelectedSingerHistory(history || null)
      } catch (err) {
        console.error('Failed to reload singer history:', err)
      }
    }
  }

  useEffect(() => {
    api('/api/autoplay/settings')
      .then((settings: { enabled: boolean; delay: number }) => {
        setAutoPlay(settings.enabled)
        setAutoPlayDelay(settings.delay)
      })
      .catch(() => {})
  }, [])

  // WebSocket for real-time updates - FIXED to auto-refresh queue
  useEffect(() => {
    function connectWs() {
      try {
        wsRef.current = new WebSocket(getWsUrl(auth.sessionToken || undefined))

        wsRef.current.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data)
            if (msg.type === 'queue.updated' ||
                msg.type === 'player.updated' ||
                msg.type === 'player.play' ||
                msg.type === 'player.next' ||
                msg.type === 'player.pause' ||
                msg.type === 'player.resume' ||
                msg.type === 'player.stop') {
              if (msg.type === 'player.pause' || msg.type === 'player.resume') {
                applyPlayerState(msg)
              }
              refreshQueue() // Auto-refresh queue on updates
              refreshQueueState()
            } else if (msg.type === 'break_music.updated') {
              loadBreakMusicState()
            } else if (msg.type === 'player.youtube_fallback') {
              const fallbackMessage =
                typeof msg.message === 'string' && msg.message.trim()
                  ? msg.message
                  : 'YouTube fallback status updated.'
              setBanner(fallbackMessage)
              if (msg.status !== 'downloading') {
                setTimeout(() => setBanner(''), 5000)
              }
            } else if (msg.type === 'player.timing') {
              if (playerStateRef.current.paused ||
                  (msg.queueId != null && String(msg.queueId) !== String(playerStateRef.current.queueId))) return
              if (typeof msg.currentTime === 'number') {
                setCurrentTime(msg.currentTime)
                lastWebSocketUpdateRef.current = Date.now()
              }
              // Handle duration updates - allow updating if:
              // 1. Duration hasn't been set yet, OR
              // 2. New duration is significantly different (>10% change)
              // This allows correcting initial incorrect durations (e.g., fragmented CDG streams)
              // while preventing small fluctuations from causing updates
              if (typeof msg.duration === 'number' &&
                  !isNaN(msg.duration) && isFinite(msg.duration) && msg.duration > 0) {

                if (!durationSetForSongRef.current) {
                  // First duration update for this song
                  durationSetForSongRef.current = true
                  setActualDuration(msg.duration)
                } else {
                  // Duration already set - only update if significantly different
                  setActualDuration((prevDuration) => {
                    if (prevDuration === null || prevDuration === 0) {
                      return msg.duration
                    }

                    // Calculate percentage difference
                    const percentDiff = Math.abs(msg.duration - prevDuration) / prevDuration

                    // Update if difference is > 10% (allows correcting wrong initial durations)
                    if (percentDiff > 0.1) {
                      console.log(`Duration updated from ${prevDuration}s to ${msg.duration}s (${(percentDiff * 100).toFixed(1)}% change)`)
                      return msg.duration
                    }

                    return prevDuration
                  })
                }
              }
            } else if (msg.type === 'autoplay.settings') {
              if (typeof msg.enabled === 'boolean') {
                setAutoPlay(msg.enabled)
              }
              if (typeof msg.delay === 'number') {
                setAutoPlayDelay(msg.delay)
              }
            } else if (msg.type === 'player.background.settings') {
              applyPlayerBackgroundSettings(msg)
            }
          } catch {}
        }

        wsRef.current.onclose = () => {
          console.log('WebSocket closed, reconnecting...')
          wsRef.current = null
          // Clear heartbeat timer
          if (wsHeartbeatRef.current) {
            clearInterval(wsHeartbeatRef.current)
            wsHeartbeatRef.current = null
          }
          setTimeout(connectWs, 1000)
        }

        wsRef.current.onerror = (err) => {
          console.error('WebSocket error:', err)
        }

        wsRef.current.onopen = () => {
          console.log('WebSocket connected')
          refreshQueue()
          loadBreakMusicState()
          // Start heartbeat - send a message every 45 seconds to keep connection alive
          // This is in addition to server's ping/pong mechanism
          wsHeartbeatRef.current = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              // Send a lightweight heartbeat message
              wsRef.current.send(JSON.stringify({ type: 'heartbeat' }))
            }
          }, 45000)
        }
      } catch {
        setTimeout(connectWs, 1500)
      }
    }

    connectWs()
    return () => {
      if (wsHeartbeatRef.current) {
        clearInterval(wsHeartbeatRef.current)
      }
      wsRef.current?.close()
    }
  }, [auth.sessionToken])

  const currentPlaying = useMemo(() => {
    return queue.find(r => r.status === 'playing')
  }, [queue])
  const singerPaused = isSingerPaused(playerState, currentPlaying?.id)
  const playbackAction = singerPlaybackAction(playerState, currentPlaying?.id)
  const playbackLabel = playbackAction === 'pause' ? 'Pause singer' : playbackAction === 'resume' ? 'Resume singer' : 'Play'

  const playNextSong = useCallback(async () => {
    if (! auth.sessionToken || !auth.canHost) return

    const nextQueued = queue.find(r => r.status === 'queued')
    if (! nextQueued) return

    console.log('Autoplay: Playing next song:', nextQueued. title)

    setBusy(true)
    try {
      await api('/api/player/play', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: nextQueued.id })
      })
    } catch (err) {
      console.error('Autoplay failed:', err)
    } finally {
      setBusy(false)
      await refreshQueue()
    }
  }, [auth.sessionToken, headers, queue, auth.canHost])

  // Song timer management - DISABLED: Server now handles autoplay via /player/timing endpoint
  // This ensures autoplay works even when Host page is not open
  // The Host page now serves as a monitor and manual control interface only
  useEffect(() => {
    // Reset state whenever the currently playing song ID changes (including when it goes to null)
    // This effect only triggers when currentPlaying?.id changes, not on every re-render
    setCurrentTime(isSingerPaused(playerStateRef.current, currentPlaying?.id) ? playerStateRef.current.positionSec : 0)
    setActualDuration(null)
    durationSetForSongRef.current = false  // Reset the ref so duration can be set for new song
    lastWebSocketUpdateRef.current = 0

    if (currentPlaying) {
      console.log('Now playing:', currentPlaying.title)
    }
  }, [currentPlaying?.id, currentPlaying?.track_id])

  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
      }
      if (songTimerRef.current) {
        clearInterval(songTimerRef.current)
      }
    }
  }, [])

  // Search for replacement songs - FIXED to handle both local and karaoke-nerds
  // Manual request search functionality
  // Add manual request to queue - Local track
  // Add manual request to queue - External (Karaoke Nerds) track
  // Fetch video title from URL
  // Replace song with custom URL
  // Add manual request to queue - Manual URL
  // Download video from external source
  async function downloadVideo(url: string, title: string, artist: string, brand?: string, discId?: string) {
    if (!auth.sessionToken || !auth.canHost) return
    if (!allowDownloads) {
      alert('Downloads are disabled')
      return
    }

    const trackKey = `${url}`
    setDownloadingTrack(trackKey)
    setBusy(true)

    try {
      const response = await api('/api/host/download', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          title,
          artist,
          brand: brand || null,
          discId: discId || null
        })
      })

      if (response.ok) {
        setBanner(`✔ Downloaded: ${artist} - ${title}`)
        setTimeout(() => setBanner(''), 5000)
      } else {
        setBanner(`⚠️ Download failed: ${response.error || 'Unknown error'}`)
        setTimeout(() => setBanner(''), 5000)
      }
    } catch (err: any) {
      console.error('Download failed:', err)
      setBanner(`⚠️ Download failed: ${err.message || 'Unknown error'}`)
      setTimeout(() => setBanner(''), 5000)
    } finally {
      setBusy(false)
      setDownloadingTrack(null)
    }
  }

function closeDetails(e: React.SyntheticEvent) {
  const el = e.currentTarget as HTMLElement
  const details = el.closest('details') as HTMLDetailsElement | null
  if (details) details.removeAttribute('open')
}
  const handleDragStart = (e: React.DragEvent, item: Row) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverPosition(position)
  }

  const handleDragLeave = () => {
    setDragOverPosition(null)
  }

  const handleDrop = async (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    setDragOverPosition(null)

    if (!draggedItem || !auth.sessionToken || !auth.canHost || draggedItem.position === targetPosition) {
      setDraggedItem(null)
      return
    }

    setBusy(true)
    try {
      await api('/api/queue/reorder', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: draggedItem. id,
          newPosition: targetPosition
        })
      })
    } finally {
      setBusy(false)
      setDraggedItem(null)
      await refreshQueue()
    }
  }

  async function playTop() {
    if (!auth.sessionToken || !auth.canHost) return
    explicitStopRef.current = false
    setBusy(true)
    try {
      if (currentPlaying) {
        const state = await api('/api/player/pause', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            queueId: currentPlaying.id,
            paused: !isSingerPaused(playerStateRef.current, currentPlaying.id),
          }),
        })
        applyPlayerState(state)
      } else {
        await api('/api/player/play', { method:'POST', headers })
      }
    } finally {
      setBusy(false)
      await refreshQueue()
    }
  }

  async function playThis(id: number) {
    if (! auth.sessionToken || !auth.canHost) return
    explicitStopRef.current = false
    setBusy(true)
    try { await api('/api/player/play', { method:'POST', headers, body: JSON.stringify({ id }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function next() {
    if (!auth.sessionToken || !auth.canHost) return
    explicitStopRef. current = false
    setBusy(true)
    try {
      await api('/api/player/next', { method:'POST', headers })
    } finally {
      setBusy(false)
      await refreshQueue()
    }
  }

  async function stop() {
    if (!auth.sessionToken || !auth.canHost) return
    setBusy(true)

    try {
      explicitStopRef.current = true
      autoPlayScheduledRef.current = false

      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }

      if (songTimerRef.current) {
        clearInterval(songTimerRef.current)
        songTimerRef.current = null
      }

      setCurrentTime(0)
      lastWebSocketUpdateRef.current = 0

      await api('/api/player/stop', { method: 'POST', headers })
    } finally {
      setBusy(false)
      await refreshQueue()
    }
  }

  async function rename(id: number, requestedBy: string) {
    if (!auth.sessionToken || !auth.canHost) return
    setBusy(true)
    try { await api('/api/queue/rename', { method:'POST', headers, body: JSON.stringify({ id, requestedBy }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function updateKey(id: number, keyAdjustment: number) {
    if (!auth.sessionToken || !auth.canHost) return
    setBusy(true)
    try { await api('/api/queue/update-key', { method:'POST', headers, body: JSON.stringify({ id, keyAdjustment }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function remove(id: number) {
    if (!auth.sessionToken || !auth.canHost) return
    setBusy(true)
    try { await api('/api/queue/delete', { method:'POST', headers, body: JSON.stringify({ id }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function clearAll() {
    if (!auth.sessionToken || !auth.canHost) return
    if (!confirm('⚠️ Clear ALL queues?\n\nThis will remove all songs from the queue AND remove all singers from the rotation. This cannot be undone.')) return
    setBusy(true)
    try {
      await api('/api/queue/clear', { method:'POST', headers })
      // Also remove all singers from the active rotation in parallel
      if (queueState?.activeRotation) {
        const rotationId = queueState.activeRotation.id
        await Promise.allSettled(
          queueState.queueOrder.map(singer =>
            api(`/api/rotations/${rotationId}/singers/${singer.singerId}`, { method: 'DELETE', headers })
              .catch((err: unknown) => console.error(`Failed to remove singer ${singer.singerId} from rotation:`, err))
          )
        )
      }
    } finally {
      setBusy(false)
      await refreshQueue()
      await refreshQueueState()
    }
  }

  async function removeSingerFromRotation(singerId: string) {
    if (!auth.sessionToken || !auth.canHost) return
    if (!confirm('Remove this singer from the active rotation? Their history and profile will remain available in Singer History.')) return
    setBusy(true)
    try {
      const singer = queueState?.queueOrder.find((entry) => entry.singerId === singerId)
      await Promise.all(
        (singer?.queuedSongs ?? []).map((song) =>
          api(`/api/queue/${song.queueId}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'removed' }),
          }),
        ),
      )
      if (queueState?.activeRotation) {
        const rotationId = queueState.activeRotation.id
        await api(`/api/rotations/${rotationId}/singers/${singerId}`, { method: 'DELETE', headers })
          .catch((err: unknown) => console.error(`Failed to remove singer ${singerId} from rotation:`, err))
      }
      await refreshQueueState()
    } catch (err) {
      console.error('Failed to remove singer:', err)
    } finally {
      setBusy(false)
    }
  }

  const estimatedDuration = actualDuration
    ? actualDuration
    : (currentPlaying?.duration_ms
      ? currentPlaying.duration_ms / 1000
      : 210)
  const progressPercent = currentPlaying && estimatedDuration > 0 ? Math.min(100, (currentTime / estimatedDuration) * 100) : 0
  const queuedSongCount = queueState?.queueOrder.reduce((sum, s) => sum + s.queuedSongsCount, 0) ?? queue.filter(r => r.status === 'queued').length

  return (
    <div className="host-page">

      <AppBarContent>
        <div className="app-bar-title">
          <h1>Host</h1>
          {auth.isLoggedIn && auth.canHost && (
            <div className="app-bar-subtitle">
              <span title="Singers" aria-label={`${queueState?.queueOrder.length ?? 0} singers`}>
                <MaterialIcon name="group" />
                {queueState?.queueOrder.length ?? 0}
              </span>
              <span title="Queued songs" aria-label={`${queuedSongCount} queued songs`}>
                <MaterialIcon name="queue_music" />
                {queuedSongCount}
              </span>
            </div>
          )}
        </div>
      </AppBarContent>

      <div className="container">
        {banner && (
          <div className="banner">{renderStatusMessage(banner)}</div>
        )}

        {!auth.isLoggedIn ? (
          <div
            className="card"
            style={{ maxWidth: 400, margin: '100px auto', overflow: 'hidden' }}
          >
            <h1 style={{ textAlign: 'center', marginBottom: 32 }}>
              <MaterialIcon name="mic_external_on" style={{ fontSize: 30, verticalAlign: 'middle', marginRight: 8 }} />
              Host Login
            </h1>

            {oidcConfig?.passwordLoginEnabled !== false && (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    type="text"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="Enter host username"
                    autoComplete="username"
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter host password"
                    autoComplete="current-password"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {loginError && <div className="error-msg">{loginError}</div>}
                <button
                  className="control-btn primary"
                  type="submit"
                  disabled={busy}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {busy ? (
                    <>
                      <span className="loading-spinner"></span> Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>
            )}
            {loginError && oidcConfig?.passwordLoginEnabled === false && (
              <div className="error-msg">{loginError}</div>
            )}
            {oidcConfig?.passwordLoginEnabled === false && !oidcConfig?.enabled && (
              <div className="error-msg" style={{ marginBottom: 16 }}>
                Username/password login is disabled and SSO is not enabled.
              </div>
            )}
            {oidcConfig?.enabled && (
              <>
                {oidcConfig?.passwordLoginEnabled !== false && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-border-strong)' }} />
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-border-strong)' }} />
                  </div>
                )}
                <a
                  href={`${API_BASE}/api/auth/oidc/login?returnTo=%2Fhost`}
                  className="control-btn primary"
                  style={{
                    width: '100%',
                    textDecoration: 'none',
                  }}
                >
                  {oidcConfig.buttonText}
                </a>
              </>
            )}
            <p
              style={{
                marginTop: 20,
                fontSize: 13,
                textAlign: 'center',
                color: 'var(--color-text-secondary)'
              }}
            >
              Use the credentials configured in Admin settings
            </p>
          </div>
        ) : !auth.canHost ? (
          <div className="card" role="status">
            Host access requires a managed User or Admin account.
            <button type="button" onClick={() => void auth.handleLogout()}>Sign out</button>
          </div>
        ) : (
          <>
            <AppBarContent>
              <div className="app-bar-actions host-bar-actions">
                <button
                  className="control-btn"
                  onClick={openHistoryManager}
                  disabled={busy}
                  title="Manage singer history import/export"
                  aria-label="Manage singer history import/export"
                >
                  <MaterialIcon name="manage_history" />
                </button>
                <button className="control-btn" onClick={() => setShowPlayerWindowControl(true)} title="Settings" aria-label="Settings">
                  <MaterialIcon name="tune" />
                </button>
                <button
                  className="control-btn primary host-add-btn"
                  onClick={() => {
                    setManualRequestPreset(null)
                    setShowManualRequest(true)
                  }}
                  disabled={busy}
                  title="Manually add a song to the queue"
                  aria-label="Add song"
                >
                  <MaterialIcon name="add" />
                  <span className="host-add-label">Add song</span>
                </button>
              </div>
            </AppBarContent>

            <div className="host-layout">
              <aside className="host-aside">
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
              </aside>

              <main className="host-main">
                <section className="host-panel singer-queue-card" aria-labelledby="host-rotation-title">
                  <div className="singer-queue-header">
                    <h2 id="host-rotation-title">Rotation</h2>
                    {Boolean(queueState?.queueOrder.length) && (
                      <span className="host-muted host-small">Drag an avatar or hold a singer to reorder.</span>
                    )}
                  </div>

                  {(!queueState || queueState.queueOrder.length === 0) ? (
                    <div className="host-empty-state">
                      <MaterialIcon name="music_note" />
                      <div>No singers in queue</div>
                      <div className="host-small">Songs added from the Requests page will appear here automatically</div>
                    </div>
                  ) : (
                    <div ref={singerQueueTouchRef} className="singer-queue-list">
                      {(() => {
                        // Single-pass: tag each singer with isSinging, then sort current singer first
                        type TaggedSinger = typeof queueState.queueOrder[number] & { isSinging: boolean; displaySong: QueueSong | null }
                        const tagged: TaggedSinger[] = queueState.queueOrder.map(s => {
                          const displaySong = getSingerDisplaySong(s)
                          return { ...s, displaySong, isSinging: displaySong?.status === 'playing' }
                        })
                        const sorted = [...tagged].sort((a, b) => {
                          if (a.isSinging && !b.isSinging) return -1
                          if (!a.isSinging && b.isSinging) return 1
                          return 0
                        })
                        return sorted.map((singer, idx) => {
                          const { isSinging, displaySong } = singer
                          const entryClass = [
                            'singer-queue-entry',
                            isSinging && 'is-singing',
                            singerDragOverId === singer.singerId && 'is-drag-over',
                            singerDraggedId === singer.singerId && 'is-dragging',
                          ].filter(Boolean).join(' ')
                          return (
                        <div
                          key={singer.singerId}
                          className={entryClass}
                          data-singer-drag-id={singer.singerId}
                          draggable={!savingQueueOrder}
                          onDragStart={() => handleSingerDragStart(singer.singerId)}
                          onDragEnd={handleSingerDragEnd}
                          onDragOver={e => handleSingerDragOver(e, singer.singerId)}
                          onDragLeave={() => setSingerDragOverId(null)}
                          onDrop={e => handleSingerDrop(e, singer.singerId)}
                        >
                          <div className="singer-queue-row">
                            {/* Avatar doubles as the drag handle */}
                            <QueueDragHandle id={singer.singerId} attribute="data-singer-drag-id"
                              label={`Reorder ${singer.displayName}, position ${idx + 1}`}
                              disabled={busy || savingQueueOrder || !queueState.activeRotation}
                              onStart={() => handleSingerDragStart(singer.singerId)}
                              onTarget={setSingerDragOverId} onEnd={handleSingerDragEnd}
                              onDrop={(sourceId, targetId) => void reorderSingers(sourceId, targetId)}>
                              <SingerAvatar name={singer.displayName} profile={singer.profile} size="var(--singer-avatar-size)" />
                              {isSinging && (
                                <span className="singer-queue-mic" aria-hidden="true">
                                  <MaterialIcon name="mic_external_on" />
                                </span>
                              )}
                            </QueueDragHandle>

                            {/* Singer info */}
                            <div className="singer-queue-info">
                              <div className="singer-queue-name">
                                <ScrollingText className="singer-queue-name-text" label={singer.displayName}>{singer.displayName}</ScrollingText>
                                {isSinging && <span className="singer-queue-badge">Now Singing</span>}
                              </div>
                              <div className="singer-queue-song">
                                {displaySong
                                  ? <ScrollingText label={`${isSinging ? 'Singing' : 'Next'}: ${displaySong.title || 'Unknown'} — ${displaySong.artist || 'Unknown'}${displaySong.discId ? ` (${displaySong.discId})` : ''}`}>
                                      <strong className="singer-queue-song-prefix">{isSinging ? 'Singing:' : 'Next:'} </strong>
                                      {displaySong.title || 'Unknown'} — {displaySong.artist || 'Unknown'}{renderDiscIdTag(displaySong.discId)}
                                    </ScrollingText>
                                  : <span style={{ opacity: 0.6 }}>No queued song</span>
                                }
                              </div>
                              <div className="singer-queue-stats">
                                <span title="Queued songs" aria-label={`${singer.queuedSongsCount} queued songs`}><MaterialIcon name="music_note" />{singer.queuedSongsCount}</span>
                                <span title="Songs sung" aria-label={`${singer.totalSongsSung} songs sung`}><MaterialIcon name="check_circle" />{singer.totalSongsSung}</span>
                                {singer.lastSangAt && <span className="singer-queue-last-sang" title="Last sang"><MaterialIcon name="schedule" />{formatTimeAgo(singer.lastSangAt)}</span>}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="singer-queue-actions">
                              <button
                                className="control-btn ghost"
                                title="View singer queue and history"
                                aria-label={`View ${singer.displayName}'s queue and history`}
                                onClick={() => openSingerModal(singer.singerId)}
                              >
                                <MaterialIcon name="visibility" />
                              </button>
                              <button
                                className="control-btn ghost danger-text"
                                title="Remove singer from rotation"
                                aria-label={`Remove ${singer.displayName} from rotation`}
                                disabled={busy}
                                onClick={() => removeSingerFromRotation(singer.singerId)}
                              >
                                <MaterialIcon name="close" />
                              </button>
                            </div>
                          </div>
                        </div>
                          )
                        })
                      })()}
                    </div>
                  )}

                  {/* Flat queue fallback — shown when queueState is not available */}
                  {!queueState && queue.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div className="host-muted host-small" style={{ marginBottom: 8 }}>
                        (Flat queue — singer grouping unavailable)
                      </div>
                      {queue.map(item => (
                        <div
                          key={item.id}
                          className={`queue-item ${item.status === 'playing' ? 'playing' : ''}`}
                        >
                          <span style={{ fontWeight: 600 }}>{item.requested_by}</span>
                          {' — '}
                          {item.title}{renderDiscIdTag(item.disc_id)} by {item.artist}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </main>
            </div>

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
                  <button className="control-btn danger" onClick={stop} disabled={busy} title="Stop" aria-label="Stop">
                    <MaterialIcon name="stop" />
                  </button>
                  <button className="control-btn success host-play-btn" onClick={playTop} disabled={busy} title={playbackLabel} aria-label={playbackLabel}>
                    <MaterialIcon name={playbackAction === 'pause' ? 'pause' : 'play_arrow'} style={singerPaused ? { color: 'var(--color-warning)' } : undefined} />
                  </button>
                  <button className="control-btn primary" onClick={next} disabled={busy} title="Next" aria-label="Next">
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
                    <button className="control-btn ghost" onClick={() => { setShowHostMenu(false); void refreshQueue() }} disabled={busy} title="Refresh" aria-label="Refresh">
                      <MaterialIcon name="refresh" />
                      <span className="host-more-label">Refresh</span>
                    </button>
                    <button className="control-btn ghost danger-text" onClick={() => { setShowHostMenu(false); void clearAll() }} disabled={busy} title="Clear all" aria-label="Clear all">
                      <MaterialIcon name="delete" />
                      <span className="host-more-label">Clear all</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {historyManagerOpen && (
              <HistoryManagerDialog
                headers={headers}
                busy={busy}
                setBusy={setBusy}
                setBanner={setBanner}
                queueState={queueState}
                selectedSingerId={selectedSingerId}
                setSelectedSingerHistory={setSelectedSingerHistory}
                refreshQueueState={refreshQueueState}
                openSingerModal={openSingerModal}
                onClose={() => setHistoryManagerOpen(false)}
              />
            )}

            {singerModalOpen && (
              <SingerDialog
                headers={headers}
                busy={busy}
                setBusy={setBusy}
                setBanner={setBanner}
                queueState={queueState}
                selectedSingerId={selectedSingerId}
                selectedSingerHistory={selectedSingerHistory}
                setSelectedSingerHistory={setSelectedSingerHistory}
                singerModalLoading={singerModalLoading}
                refreshQueueState={refreshQueueState}
                savingQueueOrder={savingQueueOrder}
                setSavingQueueOrder={setSavingQueueOrder}
                queueOrderSavingRef={queueOrderSavingRef}
                renderReplaceButton={renderReplaceButton}
                onAddSong={(singerId, displayName) => {
                  setManualRequestPreset({ singerId, name: displayName })
                  setShowManualRequest(true)
                }}
                onClose={closeSingerModal}
              />
            )}

            {showAccountManagement && (
              <AccountDialog
                headers={headers}
                busy={busy}
                setBusy={setBusy}
                setBanner={setBanner}
                onClose={() => setShowAccountManagement(false)}
              />
            )}

            {showPlayerWindowControl && (
              <PlayerSettingsDialog
                playerSettings={playerSettings}
                breakMusic={breakMusic}
                headers={headers}
                setBanner={setBanner}
                autoPlay={autoPlay}
                setAutoPlay={setAutoPlay}
                autoPlayDelay={autoPlayDelay}
                setAutoPlayDelay={setAutoPlayDelay}
                onClose={() => setShowPlayerWindowControl(false)}
              />
            )}

            {showBreakPlaylistModal && <BreakMusicManagerDialog breakMusic={breakMusic} />}

            {replacingSong && (
              <ReplaceSongDialog
                song={replacingSong}
                headers={headers}
                busy={busy}
                setBusy={setBusy}
                localLibraryEnabled={localLibraryEnabled}
                externalLibraryEnabled={externalLibraryEnabled}
                allowDownloads={allowDownloads}
                downloadingTrack={downloadingTrack}
                downloadVideo={downloadVideo}
                setCurrentTime={setCurrentTime}
                refreshQueueViews={refreshQueueViews}
                onClose={() => setReplacingSong(null)}
              />
            )}

            {showManualRequest && (
              <AddSongDialog
                preset={manualRequestPreset}
                headers={headers}
                busy={busy}
                setBusy={setBusy}
                queueState={queueState}
                localLibraryEnabled={localLibraryEnabled}
                externalLibraryEnabled={externalLibraryEnabled}
                allowDownloads={allowDownloads}
                downloadingTrack={downloadingTrack}
                downloadVideo={downloadVideo}
                refreshQueue={refreshQueue}
                onClose={() => setShowManualRequest(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Inline Edit Helper Component
function InlineEdit({ value, onSave, disabled }: { value: string; onSave: (v: string) => void; disabled?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  useEffect(() => setVal(value), [value])

  if (! editing) {
    return (
      <span
        onClick={() => !disabled && setEditing(true)}
        style={{
          cursor: disabled ? 'default' : 'pointer',
          borderRadius: 4,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: 'var(--color-text-secondary)',
          display: 'inline-block'
        }}
      >
        {value || <span style={{ opacity: 0.6 }}>Click to set</span>}
      </span>
    )
  }

  return (
    <input
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (val !== value) onSave(val)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement). blur()
        } else if (e.key === 'Escape') {
          setVal(value)
          setEditing(false)
        }
      }}
      style={{
        padding: '2px 6px',
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-accent)',
        borderRadius: 4,
        color: 'var(--color-text-primary)',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        minWidth: 100
      }}
      disabled={disabled}
    />
  )
}
