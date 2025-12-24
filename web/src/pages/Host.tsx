// web/src/pages/Host.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { api, wsUrl } from '../api'
import { useAuth } from '../auth-context'

type Row = {
  id: number
  track_id: number
  requested_by: string | null
  status: 'queued' | 'playing' | 'done'
  position: number
  title: string | null
  artist: string | null
  disc_id?: string | null
  kind: 'mp4' | 'cdgmp3' | 'zip' | 'mp3'
  duration_ms?: number | null
  key_adjustment?: number
}

const LOCAL_SEARCH_DELAY_MS = 300
const KARAOKE_NERDS_SEARCH_DELAY_MS = 500

export default function Host() {
  const auth = useAuth()
  const [queue, setQueue] = useState<Row[]>([])
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [banner, setBanner] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoPlayDelay, setAutoPlayDelay] = useState(5)
  const [downloadsEnabled, setDownloadsEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [replacingId, setReplacingId] = useState<number | null>(null)
  const [replaceSearchMode, setReplaceSearchMode] = useState<'local' | 'karaoke-nerds'>('local')
  const [draggedItem, setDraggedItem] = useState<Row | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [overlayHeight, setOverlayHeight] = useState(90)
  const [qrSize, setQrSize] = useState(60)
  const [customMessage, setCustomMessage] = useState('')
  const [showPlayerWindowControl, setShowPlayerWindowControl] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>()
  const songTimerRef = useRef<ReturnType<typeof setInterval> | undefined>()
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const autoPlayDelayRef = useRef<number>(autoPlayDelay)
  const autoPlayEnabledRef = useRef<boolean>(autoPlay)
  const lastWebSocketUpdateRef = useRef<number>(0)
  const explicitStopRef = useRef<boolean>(false)
  const autoPlayScheduledRef = useRef<boolean>(false)
  const wsHeartbeatRef = useRef<ReturnType<typeof setInterval>>()
  const durationSetForSongRef = useRef<boolean>(false)

  const headers = useMemo(() => ({ 'x-session-token': auth.sessionToken, 'Content-Type': 'application/json' }), [auth.sessionToken])

  useEffect(() => {
    document. documentElement.style.cssText = `
      --color-bg-primary: #0a0a0f;
      --color-bg-secondary: #16161d;
      --color-bg-card: #1d1d27;
      --color-bg-hover: #252533;
      --color-accent: #6366f1;
      --color-accent-hover: #7c7ff3;
      --color-success: #10b981;
      --color-warning: #f59e0b;
      --color-danger: #ef4444;
      --color-text-primary: #ffffff;
      --color-text-secondary: #a1a1aa;
      --color-text-muted: #71717a;
      --color-border: rgba(255, 255, 255, 0.08);
      --color-border-focus: rgba(99, 102, 241, 0.5);
    `;
    
    document.body.style.cssText = `
      background: linear-gradient(135deg, #0a0a0f 0%, #16161d 100%);
      color: #ffffff;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    `;

    refreshQueue()

    return () => {
      document.documentElement.style.cssText = ''
      document.body.style.cssText = ''
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
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
        localStorage.setItem('sessionToken', result.sessionToken)
        auth.setIsLoggedIn(true)
        setLoginPassword('')
        auth.setIsDefaultPassword(result.isDefaultPassword || false)
        
        if (result.isDefaultPassword) {
          setBanner('⚠️ You are using the default password. Please change it in Admin settings.')
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
  
  // Validate session on mount
  useEffect(() => {
    async function validateSession() {
      if (!auth.sessionToken) {
        auth.setIsLoggedIn(false)
        return
      }
      
      try {
        const result = await api('/api/auth/validate', {
          headers: { 'x-session-token': auth.sessionToken }
        })
        
        if (result.valid) {
          auth.setIsLoggedIn(true)
        } else {
          auth.setIsLoggedIn(false)
          auth.setSessionToken('')
          localStorage.removeItem('sessionToken')
        }
      } catch (err) {
        auth.setIsLoggedIn(false)
        auth.setSessionToken('')
        localStorage.removeItem('sessionToken')
      }
    }
    
    validateSession()
  }, [auth.sessionToken])

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

  async function updateAutoPlaySettings(enabled: boolean, delay: number) {
    if (! auth.sessionToken || ! auth.isLoggedIn) return
    try {
      await api('/api/autoplay/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ enabled, delay })
      })
    } catch (err) {
      console.error('Failed to update autoplay settings:', err)
    }
  }

  async function refreshQueue() {
    const q = await api('/api/queue')
    setQueue(q || [])
  }

  // Fetch initial autoplay settings from server
  useEffect(() => {
    api('/api/autoplay/settings')
      .then((settings: { enabled: boolean; delay: number }) => {
        setAutoPlay(settings.enabled)
        setAutoPlayDelay(settings.delay)
      })
      .catch(() => {})
  }, [])

  // Fetch initial overlay settings
  useEffect(() => {
    api('/api/overlay/settings')
      .then((settings: { visible: boolean; height: number; qrSize: number; customMessage: string }) => {
        setOverlayVisible(settings.visible)
        setOverlayHeight(settings.height)
        setQrSize(settings. qrSize)
        setCustomMessage(settings.customMessage || '')
      })
      .catch(() => {})
  }, [])

  // Fetch initial downloads settings
  useEffect(() => {
    api('/api/downloads/settings')
      .then((settings: { enabled: boolean }) => {
        setDownloadsEnabled(settings.enabled)
        // If downloads are disabled and we're in karaoke-nerds mode, switch to local
        if (!settings.enabled && replaceSearchMode === 'karaoke-nerds') {
          setReplaceSearchMode('local')
        }
      })
      .catch((err) => {
        console.error('Failed to fetch downloads settings:', err)
      })
  }, [])

  async function updateDownloadsSettings(enabled: boolean) {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    try {
      await api('/api/downloads/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ enabled })
      })
    } catch (err) {
      console.error('Failed to update downloads settings:', err)
    }
  }

  async function updateOverlaySettings(visible: boolean, height: number, qrSizeVal: number, message?: string) {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    try {
      await api('/api/overlay/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ visible, height, qrSize: qrSizeVal, customMessage: message ??  customMessage })
      })
    } catch (err) {
      console.error('Failed to update overlay settings:', err)
    }
  }

  // WebSocket for real-time updates - FIXED to auto-refresh queue
  useEffect(() => {
    function connectWs() {
      try {
        wsRef.current = new WebSocket(wsUrl)
        
        wsRef.current.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data)
            if (msg.type === 'queue.updated' || 
                msg.type === 'player.updated' ||
                msg.type === 'player.play' ||
                msg.type === 'player.next' ||
                msg.type === 'player.stop') {
              refreshQueue() // Auto-refresh queue on updates
            } else if (msg.type === 'player.timing') {
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
            } else if (msg.type === 'downloads.settings') {
              if (typeof msg.enabled === 'boolean') {
                setDownloadsEnabled(msg.enabled)
                // If downloads are disabled and we're in karaoke-nerds mode, switch to local
                if (!msg.enabled) {
                  setReplaceSearchMode('local')
                }
              }
            }
          } catch {}
        }
        
        wsRef.current.onclose = () => {
          console.log('WebSocket closed, reconnecting...')
          wsRef.current = null
          // Clear heartbeat timer
          if (wsHeartbeatRef.current) {
            clearInterval(wsHeartbeatRef.current)
            wsHeartbeatRef.current = undefined
          }
          setTimeout(connectWs, 1000)
        }
        
        wsRef.current.onerror = (err) => {
          console.error('WebSocket error:', err)
        }
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected')
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
  }, [])

  const currentPlaying = useMemo(() => {
    return queue.find(r => r.status === 'playing')
  }, [queue])

  const playNextSong = useCallback(async () => {
    if (! auth.sessionToken || !auth.isLoggedIn) return
    
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
  }, [auth.sessionToken, headers, queue, auth.isLoggedIn])

  // Song timer management - DISABLED: Server now handles autoplay via /player/timing endpoint
  // This ensures autoplay works even when Host page is not open
  // The Host page now serves as a monitor and manual control interface only
  useEffect(() => {
    // Reset state whenever the currently playing song ID changes (including when it goes to null)
    // This effect only triggers when currentPlaying?.id changes, not on every re-render
    setCurrentTime(0)
    setActualDuration(null)
    durationSetForSongRef.current = false  // Reset the ref so duration can be set for new song
    lastWebSocketUpdateRef.current = 0
    
    if (currentPlaying) {
      console.log('Now playing:', currentPlaying.title)
    }
  }, [currentPlaying?.id])

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

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef. current)
    }
    
    const searchDelay = replaceSearchMode === 'local' ? LOCAL_SEARCH_DELAY_MS : KARAOKE_NERDS_SEARCH_DELAY_MS
    searchTimeoutRef.current = setTimeout(() => searchSongs(searchQuery), searchDelay)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef. current)
      }
    }
  }, [searchQuery, replaceSearchMode])

  async function replaceSong(queueId: number, newTrackId: number) {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    
    const queueItem = queue.find(r => r.id === queueId)
    if (!queueItem) return
    
    setBusy(true)
    try {
      await api('/api/queue/delete', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ id: queueId }) 
      })
      
      await api('/api/queue', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ 
          trackId: newTrackId,
          requestedBy: queueItem.requested_by
        }) 
      })
      
      setReplacingId(null)
      setSearchQuery('')
      setSearchResults([])
      setReplaceSearchMode('local')
    } finally { 
      setBusy(false)
      await refreshQueue()
    }
  }

  async function replaceSongWithKaraokeNerds(queueId: number, track: { title: string; artist: string; url: string }) {
    if (! auth.sessionToken || !auth.isLoggedIn) return
    
    const queueItem = queue.find(r => r.id === queueId)
    if (!queueItem) return
    
    setBusy(true)
    try {
      await api('/api/queue/delete', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ id: queueId }) 
      })
      
      await api('/api/karaoke-nerds/add', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          title: track.title,
          artist: track.artist,
          url: track.url,
          requestedBy: queueItem.requested_by
        }) 
      })
      
      setReplacingId(null)
      setSearchQuery('')
      setSearchResults([])
      setReplaceSearchMode('local')
    } finally { 
      setBusy(false)
      await refreshQueue()
    }
  }

  function formatTime(seconds: number): string {
    if (! seconds || ! isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
    
    if (!draggedItem || !auth.sessionToken || !auth.isLoggedIn || draggedItem.position === targetPosition) {
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

  // FIXED: Play button to work properly - plays top of queue if nothing playing
  async function playTop() {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    explicitStopRef.current = false
    setBusy(true)
    try { 
      await api('/api/player/play', { method:'POST', headers })
    } finally { 
      setBusy(false)
      await refreshQueue()
    }
  }

  async function playThis(id: number) {
    if (! auth.sessionToken || !auth.isLoggedIn) return
    explicitStopRef.current = false
    setBusy(true)
    try { await api('/api/player/play', { method:'POST', headers, body: JSON.stringify({ id }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function next() {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    explicitStopRef. current = false
    setBusy(true)
    try { 
      const current = queue.find(r => r.status === 'playing')
      if (current) {
        await api('/api/queue/delete', { 
          method: 'POST', 
          headers, 
          body: JSON.stringify({ id: current.id }) 
        })
      }
      await api('/api/player/play', { method:'POST', headers })
    } finally { 
      setBusy(false)
      await refreshQueue()
    }
  }

  async function stop() {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    setBusy(true)
    
    try {
      explicitStopRef.current = true
      autoPlayScheduledRef.current = false
      
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = undefined
      }
      
      if (songTimerRef.current) {
        clearInterval(songTimerRef.current)
        songTimerRef.current = undefined
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
    if (!auth.sessionToken || !auth.isLoggedIn) return
    setBusy(true)
    try { await api('/api/queue/rename', { method:'POST', headers, body: JSON.stringify({ id, requestedBy }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function updateKey(id: number, keyAdjustment: number) {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    setBusy(true)
    try { await api('/api/queue/update-key', { method:'POST', headers, body: JSON.stringify({ id, keyAdjustment }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function remove(id: number) {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    setBusy(true)
    try { await api('/api/queue/delete', { method:'POST', headers, body: JSON.stringify({ id }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function clearAll() {
    if (!auth.sessionToken || !auth.isLoggedIn) return
    if (! confirm('Clear the entire queue?')) return
    setBusy(true)
    try { await api('/api/queue/clear', { method:'POST', headers }) }
    finally { setBusy(false); await refreshQueue() }
  }

  const estimatedDuration = actualDuration 
    ? actualDuration
    : (currentPlaying?.duration_ms 
      ? currentPlaying.duration_ms / 1000
      : 210)

  return (
    <div className="host-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes progressPulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .host-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          animation: fadeInUp 0.5s ease;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease;
        }

        .header-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #6366f1 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          animation: fadeInUp 0.6s ease backwards;
          overflow: hidden;
        }

        .status-bar {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          padding: 14px 20px;
          margin-bottom: 20px;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        .now-playing {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          position: relative;
          overflow: hidden;
          }

        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          overflow: hidden;
          margin-top: 12px;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #6366f1);
          border-radius: 100px;
          transition: width 1s linear;
          position: relative;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s ease infinite;
        }
          
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .controls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 12px;
        }

        .controls-grid .control-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          line-height: 1;
        }

        .controls-grid .control-btn span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }


        .control-btn {
          padding: 14px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 14px;
          color: var(--color-text-primary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0. 3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .control-btn:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-btn. primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
        }

        .control-btn. danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          color: white;
        }

        . control-btn.success {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: white;
        }

        .toggle-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toggle {
          position: relative;
          width: 48px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-bg-hover);
          transition: 0.4s;
          border-radius: 100px;
        }

        . toggle-slider::before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        . toggle input:checked + .toggle-slider {
          background: var(--color-success);
        }

        .toggle input:checked + .toggle-slider::before {
          transform: translateX(24px);
        }

        .queue-item {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          cursor: move;
        }

        .queue-item:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateX(4px);
        }

        . queue-item.playing {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border-color: rgba(16, 185, 129, 0.3);
        }

        .queue-item. drag-over {
          background: rgba(99, 102, 241, 0.2);
          border-color: var(--color-accent);
        }

        .queue-item-singer,
        .queue-item-title,
        .queue-item-artist {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }


        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          z-index: 999;
        }

        /* Queue item actions: desktop buttons vs mobile context menu */
        .queue-item-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .queue-item-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }

        .queue-item-singer {
          font-size: 0.9rem;
          font-weight: 600;
          opacity: 0.95;
          margin-bottom: 2px;
        }

        .queue-item-title {
          font-size: 1.05rem;
          font-weight: 500;
          opacity: 0.9;
          line-height: 1.2;
        }

        .queue-item-artist {
          font-size: 0.85rem;
          font-weight: 400;
          opacity: 0.7;
          margin-top: 2px;
        }

        .queue-item.playing .queue-item-title {
          color: #a5b4fc;
          font-weight: 600;
        }


        .queue-item-actions.mobile {
          display: none;
        }

        .mobile-actions-menu {
          position: relative;
        }

        .mobile-actions-menu > summary {
          list-style: none;
        }
        .mobile-actions-menu > summary::-webkit-details-marker {
          display: none;
        }

        .mobile-actions-dropdown {
          position: absolute;
          right: 0;
          bottom: calc(100% + 12px);
          display: flex;
          gap: 8px;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          z-index: 50;
        }

        @media (max-width: 640px) {
          .queue-item-actions.desktop {
            display: none;
          }
          .queue-item-actions.mobile {
            display: flex;
            justify-content: flex-end;
          }
        }

        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          z-index: 1000;
          max-width: 600px;
          width: 90%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .search-mode-toggle {
          display: flex;
          flex-direction: row;
          gap: 8px;
          background: transparent;
          padding: 0;
          margin-bottom: 20px;
        }

        .mode-button {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid var(--color-border);
        }

        .mode-button.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .mode-button.active. karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        . mode-button:not(.active):hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
          border-color: var(--color-accent);
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 15px;
          outline: none;
          margin-bottom: 16px;
          box-sizing: border-box;
        }

        .search-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .search-results {
          flex: 1;
          overflow-y: auto;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-bg-secondary);
          margin-bottom: 16px;
        }

        .search-result {
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .search-result:hover {
          background: var(--color-bg-hover);
        }

        .search-result:last-child {
          border-bottom: none;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: var(--color-accent);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
        }

        . settings-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--color-border);
        }

        .settings-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .settings-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--color-text-primary);
        }

        .slider-control {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        . slider {
          flex: 1;
          height: 6px;
          background: var(--color-bg-secondary);
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--color-accent);
          cursor: pointer;
          border-radius: 50%;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--color-accent);
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }

        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 12px 16px;
          color: #fca5a5;
          margin-bottom: 16px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        . stat-pill {
          padding: 6px 14px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
            .controls-grid .control-btn .btn-label { display: none !important; }
            .controls-grid .control-btn .btn-icon  { font-size: 20px !important; }
          
          .controls-grid {
            display: flex !important;
            flex-direction: row !important;
            gap: 6px !important;
            grid-template-columns: none !important;
            justify-content: space-between !important;
            align-items: center !important;
          }

          .controls-grid .control-btn {
            width: 44px !important;
            height: 44px !important;
            min-width: 0 !important;
            padding: 0 !important;
            flex: 1 1 0 !important;
            border-radius: 10px;

            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;

            line-height: 1 !important;
          }

          .controls-grid .control-btn > * {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        }


        /* Even smaller screens */
        @media (max-width:  480px) {
          .controls-grid {
            gap:  4px !important;
          }
          
          .controls-grid .control-btn {
            min-width: 40px ! important;
            width: 40px !important;
            height:  40px !important;
          }
          
          .controls-grid .control-btn span {
            font-size: 18px !important;
          }
          
          .modal { width: 95%; padding: 20px; }
        }

        /* Very small screens */
        @media (max-width: 380px) {
          .controls-grid .control-btn {
            min-width: 38px !important;
            width: 38px !important;
            height: 38px !important;
          }
          
          .controls-grid .control-btn span {
            font-size:  16px !important;
          }
        }
        }
      `}</style>

      <div className="container">
        {banner && (
          <div className="banner">{banner}</div>
        )}

        {!auth.isLoggedIn ? (
          <div
            className="card"
            style={{ maxWidth: 400, margin: '100px auto', overflow: 'hidden' }}
          >
            <h1 style={{ textAlign: 'center', marginBottom: 32 }}>
              🎤 Host Login
            </h1>

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
        ) : (
          <>
            <div className="header">
              <h1 className="header-title">Host Panel</h1>
            </div>

            {currentPlaying && (
              <div className="card now-playing">
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h3 style={{marginTop: 0, color: '#10b981'}}>🎤 Now Playing</h3>
                  <div style={{marginBottom: 8, fontSize: 20, fontWeight: 600}}>
                    {currentPlaying.title || 'Unknown Title'}
                  </div>
                  <div style={{marginBottom: 8, color: 'var(--color-text-secondary)', fontSize: 16}}>
                    {currentPlaying.artist || 'Unknown Artist'}
                  </div>
                  {currentPlaying.requested_by && (
                    <div style={{marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8}}>
                      <span>🎵</span>
                      <span>Singer: <strong>{currentPlaying.requested_by}</strong></span>
                    </div>
                  )}
                  
                  {/* Progress bar with time display */}
                  <div style={{marginBottom: 8}}>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${estimatedDuration > 0 ? Math.min(100, (currentTime / estimatedDuration) * 100) : 0}%` 
                        }} 
                      />
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 14, fontWeight: 500}}>
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(estimatedDuration)}</span>
                    </div>
                  </div>
                  
                  {autoPlay && (
                    <div style={{fontSize: 13, opacity: 0.7, marginTop: 12, textAlign: 'center', 
                                padding: '8px', background: 'rgba(16, 185, 129, 0.1)', 
                                borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                      🔄 Auto-play enabled • {autoPlayDelay}s delay
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <div className="controls-grid">
                <button className="control-btn success" onClick={playTop} disabled={busy}>
                  <span className="btn-icon">▶</span>
                  <span className="btn-label">Play</span>
                </button>
                <button className="control-btn primary" onClick={next} disabled={busy}>
                  <span className="btn-icon">⏭</span>
                  <span className="btn-label">Next</span>                  
                </button>
                <button className="control-btn danger" onClick={stop} disabled={busy}>
                  <span className="btn-icon">⏹</span>
                  <span className="btn-label">Stop</span>
                </button>
                <button className="control-btn" onClick={refreshQueue} disabled={busy}>
                  <span className="btn-icon">🔄</span>
                  <span className="btn-label">Refresh</span>
                </button>
                <button className="control-btn danger" onClick={clearAll} disabled={busy}>
                  <span className="btn-icon">🗑</span>
                  <span className="btn-label">Clear All</span>
                </button>
                <button className="control-btn" onClick={() => setShowPlayerWindowControl(true)}>
                  <span className="btn-icon">🎛️</span>
                  <span className="btn-label">Settings</span>
                </button>
              </div>
            </div>

            <div className="card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                <h2 style={{margin: 0}}>🎵 Queue</h2>
                <div style={{display: 'flex', gap: 12}}>
                  <span className="stat-pill">
                    {queue.filter(r => r.status === 'queued').length} queued
                  </span>
                  <span className="stat-pill">
                    {queue. length} total
                  </span>
                </div>
              </div>

              {queue.length === 0 ?  (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🎵</div>
                  <div>No songs in queue</div>
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    Songs added from the Requests page will appear here automatically
                  </div>
                </div>
              ) : (
                queue.map(item => (
                  <div 
                    key={item. id}
                    className={`queue-item ${item.status === 'playing' ? 'playing' : ''} ${dragOverPosition === item.position ? 'drag-over' : ''}`}
                    draggable={item.status === 'queued'}
                    onDragStart={e => item.status === 'queued' && handleDragStart(e, item)}
                    onDragOver={e => handleDragOver(e, item. position)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, item.position)}
                    style={{ opacity: draggedItem?. id === item.id ? 0.5 : 1 }}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'left', flexWrap: 'wrap', gap: 12}}>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
                          {/* position badge */}
                          <span
                            className="queue-item-position"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: 'rgba(99, 102, 241, 0.9)',
                              color: 'white',
                              fontWeight: 700,
                              flex: '0 0 auto',
                              marginTop: 2,
                            }}
                          >
                            {item.position}
                          </span>

                          {/* shared text column (Name, Song, Artist all start here) */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Requested By (bold, no "Singer:" label) */}
                            <div className="queue-item-singer">
                              <InlineEdit
                                value={item.requested_by || ''}
                                disabled={busy}
                                onSave={(val) => rename(item.id, val)}
                              />
                            </div>
                            {/* Song */}
                            <div className="queue-item-title">
                              {item.title || 'Unknown Title'}
                            </div>
                            {/* Artist */}
                            <div className="queue-item-artist">
                              {item.artist || 'Unknown Artist'}
                            </div>
                          </div>
                        </div>
                        {item.key_adjustment !== undefined && item.key_adjustment !== 0 && (
                          <div style={{
                            marginLeft: 44,
                            marginTop: 4,
                            fontSize: 13,
                            color: 'var(--color-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <span>Key: {item.key_adjustment > 0 ? '+' : ''}{item.key_adjustment} semitones</span>
                          </div>
                        )}
                        {item.status === 'playing' && (
                          <span style={{
                            marginLeft: 44,
                            display: 'inline-block',
                            marginTop: 4,
                            padding: '2px 8px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: 100,
                            fontSize: 11,
                            color: '#10b981'
                          }}>
                            ▶ Playing
                          </span>
                        )}
                      </div>
                    <div className="queue-item-actions desktop">
                      {item.status === 'queued' && (
                        <>
                          <button className="control-btn" onClick={() => playThis(item.id)} title="Play this song">
                            ▶
                          </button>
                          <button
                            className="control-btn"
                            onClick={() => {
                              const currentKey = item.key_adjustment || 0
                              const newKey = prompt(
                                `Adjust key (semitones from -6 to +6).\nCurrent: ${currentKey}`,
                                String(currentKey)
                              )
                              if (newKey !== null) {
                                const parsed = parseInt(newKey)
                                if (!isNaN(parsed) && parsed >= -6 && parsed <= 6) {
                                  updateKey(item.id, parsed)
                                } else {
                                  alert('Please enter a number between -6 and 6')
                                }
                              }
                            }}
                            title="Adjust key"
                          >
                            🎹
                          </button>
                          <button className="control-btn" onClick={() => setReplacingId(item.id)} title="Replace song">
                            🔄
                          </button>
                        </>
                      )}
                      <button className="control-btn danger" onClick={() => remove(item.id)} title="Remove">
                        ✕
                      </button>
                    </div>

                    <div className="queue-item-actions mobile">
                      <details className="mobile-actions-menu">
                        <summary className="control-btn" title="Options" aria-label="Options">⋯</summary>
                        <div className="mobile-actions-dropdown">
                          {item.status === 'queued' && (
                            <>
                              <button
                                type="button"
                                className="control-btn"
                                onClick={(e) => { closeDetails(e); playThis(item.id) }}
                                title="Play this song"
                              >
                                ▶
                              </button>
                              <button
                                type="button"
                                className="control-btn"
                                onClick={(e) => {
                                  closeDetails(e)
                                  const currentKey = item.key_adjustment || 0
                                  const newKey = prompt(
                                    `Adjust key (semitones from -6 to +6).\nCurrent: ${currentKey}`,
                                    String(currentKey)
                                  )
                                  if (newKey !== null) {
                                    const parsed = parseInt(newKey)
                                    if (!isNaN(parsed) && parsed >= -6 && parsed <= 6) {
                                      updateKey(item.id, parsed)
                                    } else {
                                      alert('Please enter a number between -6 and 6')
                                    }
                                  }
                                }}
                                title="Adjust key"
                              >
                                🎹
                              </button>
                              <button
                                type="button"
                                className="control-btn"
                                onClick={(e) => { closeDetails(e); setReplacingId(item.id) }}
                                title="Replace song"
                              >
                                🔄
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="control-btn danger"
                            onClick={(e) => { closeDetails(e); remove(item.id) }}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </details>
                    </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Player Settings Modal - FIXED WITH INLINE TOGGLE STYLES */}
            {showPlayerWindowControl && (
              <>
                <div className="modal-backdrop" onClick={() => setShowPlayerWindowControl(false)} />
                <div className="modal">
                  <div className="modal-header">
                    <h3 style={{ margin: 0 }}>🎛️ Player Settings</h3>
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
                      onClick={() => setShowPlayerWindowControl(false)}
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Auto-play Settings */}
                  <div className="settings-section">
                    <div className="settings-title">Auto-play Settings</div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      marginBottom: autoPlay ? '16px' : '0'
                    }}>
                      <span style={{ fontSize: '15px', fontWeight: '500' }}>Auto-play</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Toggle Switch with Inline Styles */}
                        <label style={{ 
                          position: 'relative', 
                          display: 'inline-block', 
                          width: '48px', 
                          height: '24px' 
                        }}>
                          <input 
                            type="checkbox" 
                            checked={autoPlay} 
                            onChange={e => {
                              const newEnabled = e.target.checked
                              setAutoPlay(newEnabled)
                              updateAutoPlaySettings(newEnabled, autoPlayDelay)
                            }}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: autoPlay ? '#10b981' : '#374151',
                            transition: '. 4s',
                            borderRadius: '34px'
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '',
                              height: '16px',
                              width: '16px',
                              left: autoPlay ? '28px' : '4px',
                              bottom: '4px',
                              backgroundColor: 'white',
                              transition: '.4s',
                              borderRadius: '50%'
                            }}></span>
                          </span>
                        </label>
                        <span style={{ 
                          color: autoPlay ? 'var(--color-success)' : 'var(--color-text-secondary)', 
                          fontSize: '14px',
                          fontWeight: '500',
                          minWidth: '60px'
                        }}>
                          {autoPlay ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    
                    {autoPlay && (
                      <div style={{ 
                        padding: '16px', 
                        background: 'var(--color-bg-secondary)', 
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <label className="form-label" style={{ marginBottom: '12px' }}>
                          Delay between songs: <strong>{autoPlayDelay}</strong> seconds
                        </label>
                        <div className="slider-control">
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>0s</span>
                          <input 
                            type="range" 
                            className="slider"
                            value={autoPlayDelay} 
                            onChange={e => {
                              const newDelay = parseInt(e. target.value)
                              setAutoPlayDelay(newDelay)
                            }}
                            onMouseUp={() => updateAutoPlaySettings(autoPlay, autoPlayDelay)}
                            onTouchEnd={() => updateAutoPlaySettings(autoPlay, autoPlayDelay)}
                            min="0"
                            max="60"
                            style={{ margin: '0 12px', flex: 1 }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>60s</span>
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
                            {autoPlayDelay}s
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Downloads Settings */}
                  <div className="settings-section">
                    <div className="settings-title">External Songs Settings</div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 0'
                    }}>
                      <span style={{ fontSize: '15px', fontWeight: '500' }}>Enable External Songs (YouTube)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Toggle Switch with Inline Styles */}
                        <label style={{ 
                          position: 'relative', 
                          display: 'inline-block', 
                          width: '48px', 
                          height: '24px' 
                        }}>
                          <input 
                            type="checkbox" 
                            checked={downloadsEnabled} 
                            onChange={e => {
                              const newEnabled = e.target.checked
                              setDownloadsEnabled(newEnabled)
                              updateDownloadsSettings(newEnabled)
                            }}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: downloadsEnabled ? '#10b981' : '#374151',
                            transition: '.4s',
                            borderRadius: '34px'
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '',
                              height: '16px',
                              width: '16px',
                              left: downloadsEnabled ? '28px' : '4px',
                              bottom: '4px',
                              backgroundColor: 'white',
                              transition: '.4s',
                              borderRadius: '50%'
                            }}></span>
                          </span>
                        </label>
                        <span style={{ 
                          color: downloadsEnabled ? 'var(--color-success)' : 'var(--color-text-secondary)', 
                          fontSize: '14px',
                          fontWeight: '500',
                          minWidth: '60px'
                        }}>
                          {downloadsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <p style={{ 
                      margin: '8px 0 0 0', 
                      fontSize: '13px', 
                      color: 'var(--color-text-secondary)',
                      lineHeight: '1.5'
                    }}>
                      When enabled, allows adding songs from external sources like Karaoke Nerds (YouTube). 
                      When disabled, only local library songs can be added.
                    </p>
                  </div>

                  {/* Overlay Settings */}
                  <div className="settings-section">
                    <div className="settings-title">Overlay Settings</div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      marginBottom: overlayVisible ? '16px' : '0'
                    }}>
                      <span style={{ fontSize: '15px', fontWeight: '500' }}>Show Overlay</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Toggle Switch with Inline Styles */}
                        <label style={{ 
                          position: 'relative', 
                          display: 'inline-block', 
                          width: '48px', 
                          height: '24px' 
                        }}>
                          <input 
                            type="checkbox" 
                            checked={overlayVisible} 
                            onChange={e => {
                              const newVisible = e.target.checked
                              setOverlayVisible(newVisible)
                              updateOverlaySettings(newVisible, overlayHeight, qrSize)
                            }}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: overlayVisible ? '#10b981' : '#374151',
                            transition: '.4s',
                            borderRadius: '34px'
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '',
                              height: '16px',
                              width: '16px',
                              left: overlayVisible ? '28px' : '4px',
                              bottom: '4px',
                              backgroundColor: 'white',
                              transition: '.4s',
                              borderRadius: '50%'
                            }}></span>
                          </span>
                        </label>
                        <span style={{ 
                          color: overlayVisible ? 'var(--color-success)' : 'var(--color-text-secondary)', 
                          fontSize: '14px',
                          fontWeight: '500',
                          minWidth: '60px'
                        }}>
                          {overlayVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                    
                    {overlayVisible && (
                      <div style={{ 
                        padding: '16px', 
                        background: 'var(--color-bg-secondary)', 
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ marginBottom: '20px' }}>
                          <label className="form-label" style={{ marginBottom: '12px' }}>
                            Overlay Height: <strong>{overlayHeight}px</strong>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>40px</span>
                            <input 
                              type="range" 
                              value={overlayHeight} 
                              onChange={e => setOverlayHeight(parseInt(e. target.value))}
                              onMouseUp={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                              onTouchEnd={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                              min="40"
                              max="150"
                              style={{ 
                                flex: 1,
                                height: '6px',
                                background: 'var(--color-bg-primary)',
                                borderRadius: '3px',
                                outline: 'none',
                                WebkitAppearance: 'none'
                              }}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>150px</span>
                            <span style={{ 
                              minWidth: '50px', 
                              textAlign: 'center',
                              padding: '4px 8px',
                              background: 'var(--color-bg-primary)',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}>
                              {overlayHeight}px
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="form-label" style={{ marginBottom: '12px' }}>
                            QR Code Size: <strong>{qrSize}px</strong>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>40px</span>
                            <input 
                              type="range" 
                              value={qrSize} 
                              onChange={e => setQrSize(parseInt(e.target.value))}
                              onMouseUp={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                              onTouchEnd={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                              min="40"
                              max="150"
                              style={{ 
                                flex: 1,
                                height: '6px',
                                background: 'var(--color-bg-primary)',
                                borderRadius: '3px',
                                outline: 'none',
                                WebkitAppearance: 'none'
                              }}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>150px</span>
                            <span style={{ 
                              minWidth: '50px', 
                              textAlign: 'center',
                              padding: '4px 8px',
                              background: 'var(--color-bg-primary)',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}>
                              {qrSize}px
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Message */}
                  {overlayVisible && (
                    <div className="settings-section">
                      <div className="settings-title">Custom Message</div>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="Enter custom message for overlay..."
                        value={customMessage}
                        onChange={e => setCustomMessage(e.target.value)}
                        onBlur={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize, customMessage)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            updateOverlaySettings(overlayVisible, overlayHeight, qrSize, customMessage)
                          }
                        }}
                        style={{ marginBottom: customMessage ? '12px' : '0' }}
                      />
                      {customMessage && (
                        <button 
                          className="control-btn"
                          style={{ 
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            padding: '8px 16px',
                            fontSize: '13px'
                          }}
                          onClick={() => {
                            setCustomMessage('')
                            updateOverlaySettings(overlayVisible, overlayHeight, qrSize, '')
                          }}
                        >
                          Clear Message
                        </button>
                      )}
                    </div>
                  )}
                  
                  <button 
                    className="control-btn primary" 
                    style={{ width: '100%', marginTop: '8px' }}
                    onClick={() => setShowPlayerWindowControl(false)}
                  >
                    Done
                  </button>
                </div>
              </>
            )}

            {/* Replace Song Modal - CLEANED UP */}
            {replacingId !== null && (
              <>
                <div className="modal-backdrop" onClick={() => { setReplacingId(null); setSearchQuery(''); setSearchResults([]) }} />
                <div className="modal">
                  <div className="modal-header">
                    <h3 style={{ margin: 0 }}>🔄 Replace Song</h3>
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
                      onClick={() => { setReplacingId(null); setSearchQuery(''); setSearchResults([]) }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Search Mode Toggle - Updated to not clear search */}
                  {downloadsEnabled && (
                    <div className="search-mode-toggle">
                      <button 
                        className={`mode-button ${replaceSearchMode === 'local' ? 'active' : ''}`}
                        onClick={() => setReplaceSearchMode('local')}
                      >
                        <img
                          src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg"
                          alt="Local Library"
                          className="mode-icon"
                          style={{ width: "20px", height: "20px", marginRight: "6px" }}
                        />
                        Local Library
                      </button>

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
                  </div>
                  )}

                  <input
                    className="search-input"
                    placeholder={downloadsEnabled && replaceSearchMode === 'karaoke-nerds' ? "Search Karaoke Nerds..." : "Search local library..."}
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
                            <div style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.5 }}>🔍</div>
                            <div style={{ fontSize: '14px' }}>
                              {replaceSearchMode === 'local' ? 'No local results found' : 'No Karaoke Nerds results found'}
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                              Try a different search term
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>🎵</div>
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
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {track. title || 'Unknown'}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {track.artist || 'Unknown'}
                                  {track.disc_id && (
                                    <span style={{ 
                                      marginLeft: 8, 
                                      fontSize: 11,
                                      padding: '1px 6px',
                                      background: 'var(--color-bg-primary)',
                                      borderRadius: '4px',
                                      opacity: 0.8
                                    }}>
                                      {track.disc_id}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button 
                                className="control-btn primary" 
                                style={{ 
                                  padding: '6px 14px',
                                  fontSize: '13px',
                                  minWidth: '70px'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  replaceSong(replacingId, track.id);
                                }}
                              >
                                Select
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
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {track.title || 'Unknown'}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {track.artist || 'Unknown'}
                                  {track.brand && (
                                    <span style={{ 
                                      marginLeft: 8,
                                      fontSize: 11,
                                      padding: '1px 6px',
                                      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.2))',
                                      borderRadius: '4px',
                                      color: '#a855f7'
                                    }}>
                                      {track.brand}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button 
                                className="control-btn" 
                                style={{ 
                                  padding: '6px 14px',
                                  fontSize: '13px',
                                  minWidth: '70px',
                                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  replaceSongWithKaraokeNerds(replacingId, track);
                                }}
                              >
                                Select
                              </button>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                  
                  <button 
                    className="control-btn" 
                    style={{ 
                      width: '100%',
                      background: 'transparent',
                      border: '2px solid var(--color-border)'
                    }}
                    onClick={() => { setReplacingId(null); setSearchQuery(''); setSearchResults([]); setReplaceSearchMode('local') }}
                  >
                    Cancel
                  </button>
                </div>
              </>
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