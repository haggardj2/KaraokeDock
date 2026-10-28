// web/src/pages/Host.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { api, getWsUrl } from '../api'
import { useAuth } from '../auth-context'
import { parseBooleanSetting } from '../utils/settings'
import { applyTheme, clearTheme } from '../theme'
import { useStaffTheme } from '../useStaffTheme'
import MaterialIcon, { renderStatusMessage } from '../components/MaterialIcon'
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
import HostLogin from './host/HostLogin'
import BreakMusicPanel from './host/BreakMusicPanel'
import RotationPanel from './host/RotationPanel'
import TransportBar from './host/TransportBar'
import { useHostLogin } from './host/useHostLogin'
import { useSingerRotation } from './host/useSingerRotation'
import type {
  QueueState,
  Row,
  SingerHistory,
} from './host/types'
import { DEFAULT_PLAYER_PLAYBACK_STATE, normalizePlayerPlaybackState, isSingerPaused, singerPlaybackAction, type PlayerPlaybackState } from '../playerPlayback'

export default function Host() {
  const auth = useAuth()
  const [queue, setQueue] = useState<Row[]>([])
  const [playerState, setPlayerState] = useState(DEFAULT_PLAYER_PLAYBACK_STATE)
  const playerStateRef = useRef(DEFAULT_PLAYER_PLAYBACK_STATE)
  const queueRefreshRef = useRef(0)
  const [banner, setBanner] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoPlayDelay, setAutoPlayDelay] = useState(5)
  const [currentTime, setCurrentTime] = useState(0)
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [replacingSong, setReplacingSong] = useState<ReplaceSongTarget | null>(null)
  const [showPlayerWindowControl, setShowPlayerWindowControl] = useState(false)
  const [showAccountManagement, setShowAccountManagement] = useState(false)
  const [themeId] = useStaffTheme()

  // Manual request modal state
  const [showManualRequest, setShowManualRequest] = useState(false)
  const [manualRequestPreset, setManualRequestPreset] = useState<AddSongPreset | null>(null)

  // Library availability settings
  const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true)
  const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true)

  // Download settings
  const [allowDownloads, setAllowDownloads] = useState(true)
  const [downloadingTrack, setDownloadingTrack] = useState<string | null>(null)

  // Nested singer queue state
  const [queueState, setQueueState] = useState<QueueState | null>(null)
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null)
  const [selectedSingerHistory, setSelectedSingerHistory] = useState<SingerHistory | null>(null)
  const [singerModalOpen, setSingerModalOpen] = useState(false)
  const [singerModalLoading, setSingerModalLoading] = useState(false)
  const [historyManagerOpen, setHistoryManagerOpen] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const wsHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationSetForSongRef = useRef<boolean>(false)

  const headers = useMemo(() => ({ 'x-session-token': auth.sessionToken, 'Content-Type': 'application/json' }), [auth.sessionToken])
  const breakMusic = useBreakMusic({ headers, setBanner })
  const { showBreakPlaylistModal, breakVolumeSaveTimeoutRef, loadBreakMusicState } = breakMusic
  const playerSettings = usePlayerSettings({ headers, refreshQueue, refreshQueueState })
  const login = useHostLogin({ setBusy, setBanner })
  const rotation = useSingerRotation({ queueState, headers, busy, setBusy, setBanner, refreshQueueState })
  const { savingQueueOrder, setSavingQueueOrder, queueOrderSavingRef } = rotation
  const {
    applyPlayerBackgroundSettings,
  } = playerSettings

  useEffect(() => {
    refreshQueue()
    refreshQueueState()

    return () => {
      if (breakVolumeSaveTimeoutRef.current) clearTimeout(breakVolumeSaveTimeoutRef.current)
    }
  }, [])

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

  function applyPlayerState(value: Partial<PlayerPlaybackState>) {
    const state = normalizePlayerPlaybackState(value, playerStateRef.current)
    playerStateRef.current = state
    setPlayerState(state)
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

  // Reset the progress display when the playing song changes. Autoplay runs on the server
  // (via /player/timing), so the Host page only monitors and controls playback.
  useEffect(() => {
    // Reset state whenever the currently playing song ID changes (including when it goes to null)
    // This effect only triggers when currentPlaying?.id changes, not on every re-render
    setCurrentTime(isSingerPaused(playerStateRef.current, currentPlaying?.id) ? playerStateRef.current.positionSec : 0)
    setActualDuration(null)
    durationSetForSongRef.current = false  // Reset the ref so duration can be set for new song

    if (currentPlaying) {
      console.log('Now playing:', currentPlaying.title)
    }
  }, [currentPlaying?.id, currentPlaying?.track_id])

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

  async function playTop() {
    if (!auth.sessionToken || !auth.canHost) return
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

  async function next() {
    if (!auth.sessionToken || !auth.canHost) return
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
      setCurrentTime(0)

      await api('/api/player/stop', { method: 'POST', headers })
    } finally {
      setBusy(false)
      await refreshQueue()
    }
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
          <HostLogin login={login} busy={busy} />
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
                <BreakMusicPanel breakMusic={breakMusic} busy={busy} />
              </aside>

              <main className="host-main">
                <RotationPanel
                  queueState={queueState}
                  queue={queue}
                  busy={busy}
                  rotation={rotation}
                  openSingerModal={openSingerModal}
                />
              </main>
            </div>

            <TransportBar
              currentPlaying={currentPlaying}
              singerPaused={singerPaused}
              playbackAction={playbackAction}
              playbackLabel={playbackLabel}
              currentTime={currentTime}
              estimatedDuration={estimatedDuration}
              progressPercent={progressPercent}
              autoPlay={autoPlay}
              autoPlayDelay={autoPlayDelay}
              busy={busy}
              renderReplaceButton={renderReplaceButton}
              onStop={stop}
              onPlay={playTop}
              onNext={next}
              onRefresh={refreshQueue}
              onClearAll={clearAll}
            />

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
