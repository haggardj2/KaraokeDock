// web/src/pages/Host.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { API_BASE, api, wsUrl } from '../api'

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
}

// Search delay constants
const LOCAL_SEARCH_DELAY_MS = 300
const KARAOKE_NERDS_SEARCH_DELAY_MS = 500

export default function Host() {
  const [queue, setQueue] = useState<Row[]>([])
  const [adminToken, setToken] = useState(localStorage.getItem('adminToken') || '')
  const [banner, setBanner] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false) // Will be loaded from server
  const [autoPlayDelay, setAutoPlayDelay] = useState(5) // Will be loaded from server (seconds between songs)
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
  const [showPlayerWindowControl, setShowPlayerWindowControl] = useState(false) // Changed to popup modal
  
  const esRef = useRef<EventSource | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>()
  const songTimerRef = useRef<ReturnType<typeof setInterval> | undefined>()
  const autoPlayDelayRef = useRef<number>(autoPlayDelay) // Use ref to avoid timer reset
  const autoPlayEnabledRef = useRef<boolean>(autoPlay)
  const lastWebSocketUpdateRef = useRef<number>(0)
  const explicitStopRef = useRef<boolean>(false)
  const autoPlayScheduledRef = useRef<boolean>(false) // Track if autoplay timer is already scheduled

  const headers = useMemo(() => ({ 'x-admin-token': adminToken, 'Content-Type': 'application/json' }), [adminToken])

  // Update refs when state changes
  useEffect(() => {
    autoPlayDelayRef.current = autoPlayDelay
  }, [autoPlayDelay])

  useEffect(() => {
    autoPlayEnabledRef.current = autoPlay
    // When autoplay is enabled, clear the explicit stop flag so autoplay can work
    if (autoPlay) {
      explicitStopRef.current = false
    }
  }, [autoPlay])

  // Update autoplay settings on server when changed locally
  async function updateAutoPlaySettings(enabled: boolean, delay: number) {
    if (!adminToken) return
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
      .catch(() => {
        // Use defaults on error
      })
  }, [])

  // Fetch initial overlay settings
  useEffect(() => {
    api('/api/overlay/settings')
      .then((settings: { visible: boolean; height: number; qrSize: number; customMessage: string }) => {
        setOverlayVisible(settings.visible)
        setOverlayHeight(settings.height)
        setQrSize(settings.qrSize)
        setCustomMessage(settings.customMessage || '')
      })
      .catch(() => {
        // Use defaults on error
      })
  }, [])

  // Update overlay settings
  async function updateOverlaySettings(visible: boolean, height: number, qrSizeVal: number, message?: string) {
    if (!adminToken) return
    try {
      await api('/api/overlay/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ visible, height, qrSize: qrSizeVal, customMessage: message ?? customMessage })
      })
    } catch (err) {
      console.error('Failed to update overlay settings:', err)
    }
  }

  // WebSocket for real-time updates
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
              refreshQueue()
            } else if (msg.type === 'player.timing') {
              // Update actual timing from Player
              if (typeof msg.currentTime === 'number') {
                setCurrentTime(msg.currentTime)
                lastWebSocketUpdateRef.current = Date.now()
              }
              if (typeof msg.duration === 'number') {
                setActualDuration(msg.duration)
              }
            } else if (msg.type === 'autoplay.settings') {
              // Update autoplay settings from another client
              if (typeof msg.enabled === 'boolean') {
                setAutoPlay(msg.enabled)
              }
              if (typeof msg.delay === 'number') {
                setAutoPlayDelay(msg.delay)
              }
            }
          } catch {}
        }
        
        wsRef.current.onclose = () => {
          wsRef.current = null
          setTimeout(connectWs, 1000)
        }
      } catch {
        setTimeout(connectWs, 1500)
      }
    }
    
    connectWs()
    return () => { wsRef.current?.close() }
  }, [])

  useEffect(() => {
    document.documentElement.style.colorScheme = 'dark';
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#0b0b0e';
    document.body.style.color = '#e5e7eb';

    refreshQueue()

    // Live scan banners
    const es = new EventSource(`${API_BASE}/api/scan/events`)
    esRef.current = es
    es.addEventListener('scan_start', () => setBanner('Scanning libraries…'))
    es.addEventListener('scan_progress', (evt: any) => {
      try {
        const data = JSON.parse(evt.data || '{}')
        if (data?.state === 'scanning') setBanner(`Scanning library #${data.libraryId}…`)
        if (data?.state === 'done') setBanner(`Scanned library #${data.libraryId}`)
        if (data?.state === 'error') setBanner(`Scan error on library #${data.libraryId}: ${data.error}`)
      } catch {}
    })
    es.addEventListener('scan_done', async () => {
      setBanner('Scan finished ✔')
      setTimeout(() => setBanner(''), 3000)
    })
    es.onerror = () => {}

    return () => {
      esRef.current?.close()
      document.documentElement.style.colorScheme = ''
      document.body.style.background = prevBg
      document.body.style.color = prevColor
    }
  }, [])

  useEffect(() => {
    if (adminToken) localStorage.setItem('adminToken', adminToken)
  }, [adminToken])

  // Monitor current playing song
  const currentPlaying = useMemo(() => {
    return queue.find(r => r.status === 'playing')
  }, [queue])

  // Reset timing state when no song is playing
  useEffect(() => {
    if (!currentPlaying) {
      setCurrentTime(0)
      setActualDuration(null)
      lastWebSocketUpdateRef.current = 0
    }
  }, [currentPlaying])

  // Play next song (used by autoplay)
  const playNextSong = useCallback(async () => {
    if (!adminToken) return
    
    const nextQueued = queue.find(r => r.status === 'queued')
    if (!nextQueued) return
    
    console.log('Autoplay: Playing next song:', nextQueued.title)
    
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
  }, [adminToken, headers, queue])

// Song timer management - uses actual timing from Player when available
useEffect(() => {
  // Clear existing timer
  if (songTimerRef.current) {
    clearInterval(songTimerRef.current)
    songTimerRef.current = undefined
  }

  // Tolerance for song completion (in seconds)
  const SONG_END_TOLERANCE = 1

  if (currentPlaying) {
    console.log('Now playing:', currentPlaying.title)
    
    // Clear stop flag when a song starts playing
    explicitStopRef.current = false
    
    // Reset actual duration when song changes
    setActualDuration(null)
    
    // Use a fallback timer that checks for song completion
    // The actual currentTime will be updated via WebSocket from Player
    songTimerRef.current = setInterval(() => {
      // Get duration from various sources in priority order:
      // 1. Actual duration from Player (most accurate)
      // 2. Database duration_ms (extracted during scan)
      // 3. Default fallback (210 seconds = 3.5 minutes)
      const durationSeconds = actualDuration 
        ? actualDuration
        : (currentPlaying.duration_ms ? currentPlaying.duration_ms / 1000 : 210)
      
      // Check if song has finished based on actual or emulated time
      if (currentTime >= durationSeconds - SONG_END_TOLERANCE) {
        console.log('Song finished:', currentPlaying.title, `(${currentTime}s / ${durationSeconds}s)`)
        
        if (songTimerRef.current) {
          clearInterval(songTimerRef.current)
          songTimerRef.current = undefined
        }
        
        // Remove finished song from queue
        api('/api/queue/delete', { 
          method: 'POST', 
          headers, 
          body: JSON.stringify({ id: currentPlaying.id }) 
        }).then(() => {
          // Reset timing state
          setCurrentTime(0)
          setActualDuration(null)
          lastWebSocketUpdateRef.current = 0
          refreshQueue()
          
          // If autoplay is enabled and we haven't explicitly stopped
          if (autoPlayEnabledRef.current && !explicitStopRef.current) {
            const delay = autoPlayDelayRef.current
            console.log(`Autoplay: Waiting ${delay}s before next song`)
            
            if (autoPlayTimerRef.current) {
              clearTimeout(autoPlayTimerRef.current)
            }
            
            // Mark that autoplay is scheduled so the "no song playing" branch doesn't trigger again
            autoPlayScheduledRef.current = true
            
            autoPlayTimerRef.current = setTimeout(() => {
              autoPlayScheduledRef.current = false
              if (!explicitStopRef.current) { // Double-check before playing
                playNextSong()
              }
            }, delay * 1000)
          }
        })
      }
    }, 1000)
    
  } else {
    // No song playing - reset timing state
    setCurrentTime(0)
    setActualDuration(null)
    lastWebSocketUpdateRef.current = 0
    
    // Only trigger autoplay if:
    // 1. Autoplay is enabled
    // 2. We haven't explicitly stopped
    // 3. There are songs in the queue
    // 4. Autoplay hasn't already been scheduled (e.g., from song completion handler)
    if (autoPlayEnabledRef.current && 
        !explicitStopRef.current && 
        !autoPlayScheduledRef.current &&
        queue.some(r => r.status === 'queued')) {
      console.log('No song playing, autoplay enabled, starting next song...')
      
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
      }
      
      // Use the configured delay even for initial autoplay
      const delay = autoPlayDelayRef.current
      autoPlayScheduledRef.current = true
      
      autoPlayTimerRef.current = setTimeout(() => {
        autoPlayScheduledRef.current = false
        if (!explicitStopRef.current) {
          console.log('Starting autoplay...')
          playNextSong()
        }
      }, delay * 1000)
    }
  }
  
  return () => {
    if (songTimerRef.current) {
      clearInterval(songTimerRef.current)
    }
  }
}, [currentPlaying?.id, headers, queue.length, playNextSong, currentTime, actualDuration, adminToken])

  // Clean up timers on unmount
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

  // Search for replacement songs
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
        // Search KaraokeNerds
        const results = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(query)}`)
        setSearchResults(results || [])
      }
    } catch {
      setSearchResults([])
    }
  }

  useEffect(() => {
    const searchDelay = replaceSearchMode === 'local' ? LOCAL_SEARCH_DELAY_MS : KARAOKE_NERDS_SEARCH_DELAY_MS
    const timer = setTimeout(() => searchSongs(searchQuery), searchDelay)
    return () => clearTimeout(timer)
  }, [searchQuery, replaceSearchMode])

  // Replace a queued song with a local track
  async function replaceSong(queueId: number, newTrackId: number) {
    if (!adminToken) return alert('Set Admin token first')
    
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

  // Replace a queued song with a KaraokeNerds track
  async function replaceSongWithKaraokeNerds(queueId: number, track: { title: string; artist: string; url: string }) {
    if (!adminToken) return alert('Set Admin token first')
    
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

  // Format time display
  function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Drag and drop handlers
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
    
    if (!draggedItem || !adminToken || draggedItem.position === targetPosition) {
      setDraggedItem(null)
      return
    }
    
    setBusy(true)
    try {
      await api('/api/queue/reorder', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ 
          id: draggedItem.id, 
          newPosition: targetPosition 
        }) 
      })
    } finally { 
      setBusy(false)
      setDraggedItem(null)
      await refreshQueue()
    }
  }

  // ------ Controls ------
  async function playTop() {
    if (!adminToken) return alert('Set Admin token first')
    explicitStopRef.current = false // Clear stop flag when manually playing
    setBusy(true)
    try { 
      await api('/api/player/play', { method:'POST', headers })
    } finally { 
      setBusy(false)
      await refreshQueue()
    }
  }

  async function playThis(id: number) {
    if (!adminToken) return alert('Set Admin token first')
    explicitStopRef.current = false // Clear stop flag when manually playing
    setBusy(true)
    try { await api('/api/player/play', { method:'POST', headers, body: JSON.stringify({ id }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function next() {
    if (!adminToken) return alert('Set Admin token first')
    explicitStopRef.current = false // Clear stop flag when manually advancing
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
    if (!adminToken) return alert('Set Admin token first')
    setBusy(true)
    
    try {
      // Set flag to prevent autoplay from restarting
      explicitStopRef.current = true
      autoPlayScheduledRef.current = false
      
      // Clear any pending autoplay timers
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = undefined
      }
      
      // Clear the song timer
      if (songTimerRef.current) {
        clearInterval(songTimerRef.current)
        songTimerRef.current = undefined
      }
      
      // Reset the current time
      setCurrentTime(0)
      lastWebSocketUpdateRef.current = 0
      
      // Stop the player on the backend
      await api('/api/player/stop', { method: 'POST', headers })
    } finally {
      setBusy(false)
      await refreshQueue()
    }
  }

  async function rename(id: number, requestedBy: string) {
    if (!adminToken) return alert('Set Admin token first')
    setBusy(true)
    try { await api('/api/queue/rename', { method:'POST', headers, body: JSON.stringify({ id, requestedBy }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function remove(id: number) {
    if (!adminToken) return alert('Set Admin token first')
    setBusy(true)
    try { await api('/api/queue/delete', { method:'POST', headers, body: JSON.stringify({ id }) }) }
    finally { setBusy(false); await refreshQueue() }
  }

  async function clearAll() {
    if (!adminToken) return alert('Set Admin token first')
    if (!confirm('Clear the entire queue?')) return
    setBusy(true)
    try { await api('/api/queue/clear', { method:'POST', headers }) }
    finally { setBusy(false); await refreshQueue() }
  }

  // Calculate duration for display - prefer actual duration from Player
  const estimatedDuration = actualDuration 
    ? actualDuration
    : (currentPlaying?.duration_ms 
      ? currentPlaying.duration_ms / 1000
      : 210) // 3.5 minutes default

  return (
    <div className="host-container" style={{padding:16, maxWidth:1400, margin:'0 auto', fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'}}>
      <style>{`
        .host-container { padding: 16px; }
        .card { background: rgba(17,20,24,.75); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:16px; backdrop-filter: blur(4px); margin-bottom: 12px; }
        .btn { appearance:none; border:1px solid rgba(255,255,255,.12); border-radius:8px; padding:6px 10px; font-weight:600; cursor:pointer; background:#1d4ed8; color:#e5e7eb; transition: all 0.2s; font-size: 12px; white-space: nowrap; }
        .btn:hover:not(:disabled) { background:#2563eb; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn.warn { background:#b91c1c; }
        .btn.ghost { background:transparent; border-color: rgba(255,255,255,.2); }
        .btn.sm { padding:4px 8px; font-size: 11px; }
        .btn.success { background:#059669; }
        .btn.compact { padding:5px 8px; font-size: 11px; }
        .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .muted { opacity:.8; font-size:12px; color:#cbd5e1; }
        .input { border:1px solid rgba(255,255,255,.14); border-radius:8px; padding:8px 10px; background:#0f141a; color:#e5e7eb; outline:none; font-size: 13px; }
        .input:focus { border-color: rgba(59,130,246,.5); }
        .pill { padding:3px 8px; border-radius:999px; background:#111827; border:1px solid rgba(255,255,255,.08); display:inline-block; font-size: 11px; }
        .banner { position:sticky; top:0; z-index:10; margin-bottom:12px; padding:10px 12px; border:1px solid rgba(255,255,255,.12); border-radius:10px; background:#0b3b0f; color:#d1fae5; }
        .player-bar { background: linear-gradient(90deg, #059669 0%, #10b981 100%); height: 4px; border-radius: 2px; transition: width 1s linear; }
        .toggle { position: relative; display: inline-block; width: 44px; height: 22px; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #374151; transition: .4s; border-radius: 34px; }
        .toggle .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 4px; bottom: 4px; background: white; transition: .4s; border-radius: 50%; }
        .toggle input:checked + .slider { background: #059669; }
        .toggle input:checked + .slider:before { transform: translateX(22px); }
        .toggle.toggle-sm { width: 36px; height: 18px; }
        .toggle.toggle-sm .slider:before { height: 12px; width: 12px; left: 3px; bottom: 3px; }
        .toggle.toggle-sm input:checked + .slider:before { transform: translateX(18px); }
        .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #111827; border: 1px solid rgba(255,255,255,.2); border-radius: 12px; padding: 20px; z-index: 1000; max-height: 80vh; overflow-y: auto; min-width: 500px; }
        .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 999; }
        .drag-handle { cursor: move; padding: 4px; color: rgba(255,255,255,0.4); user-select: none; }
        .drag-handle:hover { color: rgba(255,255,255,0.6); }
        .dragging { opacity: 0.5; }
        .drag-over { background: rgba(59,130,246,0.2) !important; }
        .section-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 4px 0; }
        .section-header:hover { opacity: 0.9; }
        .control-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .control-label { font-size: 11px; color: rgba(229,231,235,.7); }
        
        /* Queue table - card-based mobile layout */
        .queue-table { width: 100%; border-collapse: collapse; }
        .queue-table th, .queue-table td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,.08); text-align: left; font-size: 13px; }
        .queue-table th { font-weight: 600; color: rgba(229,231,235,.8); font-size: 11px; text-transform: uppercase; }
        .queue-row { transition: background 0.2s; }
        .queue-row:hover { background: rgba(255,255,255,.03); }
        .queue-actions { display: flex; gap: 4px; justify-content: flex-end; flex-wrap: wrap; }
        
        /* Mobile responsive improvements - remove border spacing to maximize space */
        @media (max-width: 768px) {
          .host-container { padding: 8px; }
          .card { padding: 12px; border-radius: 8px; margin-bottom: 8px; }
          .control-group { gap: 6px; }
          .btn { padding: 8px 10px; font-size: 12px; }
          .btn.compact { padding: 6px 8px; }
          
          /* Hide less important columns on mobile */
          .queue-table .hide-mobile { display: none; }
          .queue-table th, .queue-table td { padding: 6px 4px; font-size: 12px; }
          
          .modal { min-width: auto; width: 95%; padding: 16px; }
        }
        
        @media (max-width: 480px) {
          .host-container { padding: 4px; }
          .card { padding: 10px; margin-bottom: 6px; border-left: none; border-right: none; border-radius: 0; }
          .queue-table th, .queue-table td { padding: 4px 3px; font-size: 11px; }
          .queue-table th { font-size: 9px; }
          .btn { padding: 6px 8px; font-size: 11px; }
          .btn.compact { padding: 5px 6px; font-size: 10px; }
          .btn.sm { padding: 4px 6px; font-size: 10px; }
          .pill { padding: 2px 6px; font-size: 9px; }
          .input { padding: 6px 8px; font-size: 12px; }
          .queue-actions { gap: 2px; }
          .banner { border-radius: 0; margin-left: -4px; margin-right: -4px; }
        }
      `}</style>

      {banner && <div className="banner">{banner}</div>}

      {/* Player Status Card - Stacked layout: Requested By, Song, Artist, Timeline */}
      {currentPlaying && (
        <div className="card" style={{ background: 'rgba(5,150,105,.15)', borderColor: 'rgba(16,185,129,.3)' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#10b981' }}>🎤 Now Playing</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {currentPlaying.requested_by && (
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                <strong style={{ color: '#a7f3d0' }}>Requested By:</strong> {currentPlaying.requested_by}
              </div>
            )}
            <div style={{ fontSize: 14 }}>
              <strong style={{ color: '#a7f3d0' }}>Song:</strong> {currentPlaying.title || 'Unknown'}
            </div>
            <div style={{ fontSize: 14 }}>
              <strong style={{ color: '#a7f3d0' }}>Artist:</strong> {currentPlaying.artist || 'Unknown'}
            </div>
            {/* Timeline - contained within box */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, minWidth: 40 }}>{formatTime(currentTime)}</span>
              <div style={{ flex: '1 1 100px', maxWidth: '100%', height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div 
                  className="player-bar" 
                  style={{ 
                    width: `${estimatedDuration > 0 ? Math.min(100, (currentTime / estimatedDuration) * 100) : 0}%` 
                  }} 
                />
              </div>
              <span style={{ fontSize: 12, minWidth: 40 }}>{formatTime(estimatedDuration)}</span>
              <span style={{ fontSize: 11, opacity: 0.6 }}>
                (-{formatTime(Math.max(0, estimatedDuration - currentTime))})
              </span>
            </div>
          </div>
          {autoPlay && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
              🔄 Auto-play enabled • {autoPlayDelay}s delay between songs
            </div>
          )}
        </div>
      )}

      {/* Player Controls Card - Compact buttons with autoplay toggle and player window control button */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input 
            className="input" 
            placeholder="Admin token" 
            type="password"
            value={adminToken} 
            onChange={e => setToken(e.target.value)} 
            style={{ width: 140, flex: '0 0 auto' }}
          />
          
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn compact success" onClick={playTop} disabled={!adminToken || busy}>
              ▶ Play
            </button>
            <button className="btn compact" onClick={next} disabled={!adminToken || busy}>
              ⏭ Next
            </button>
            <button className="btn compact warn" onClick={stop} disabled={!adminToken || busy}>
              ⏹ Stop
            </button>
            <button className="btn compact ghost" onClick={refreshQueue} disabled={busy}>
              🔄
            </button>
            <button className="btn compact warn" onClick={clearAll} disabled={!adminToken || busy}>
              🗑 Clear
            </button>
            
            {/* Autoplay toggle inline with controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,.1)' }}>
              <span style={{ fontSize: 10, color: 'rgba(229,231,235,.7)' }}>Auto</span>
              <label className="toggle toggle-sm">
                <input 
                  type="checkbox" 
                  checked={autoPlay} 
                  onChange={e => {
                    const newEnabled = e.target.checked
                    setAutoPlay(newEnabled)
                    updateAutoPlaySettings(newEnabled, autoPlayDelay)
                  }}
                  disabled={!adminToken}
                />
                <span className="slider"></span>
              </label>
            </div>
            
            {/* Player Window Control button */}
            <button 
              className="btn compact ghost" 
              onClick={() => setShowPlayerWindowControl(true)} 
              disabled={!adminToken}
              title="Player Window Settings"
            >
              🎛️
            </button>
            
            {busy && <span className="muted">Working…</span>}
          </div>
        </div>
        
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="pill" style={{ background: 'rgba(34,197,94,.2)', borderColor: 'rgba(34,197,94,.3)' }}>
            Queue: {queue.filter(r => r.status === 'queued').length}
          </div>
          <div className="pill">Total: {queue.length}</div>
          {autoPlay && (
            <div className="pill" style={{ background: 'rgba(59,130,246,.2)', borderColor: 'rgba(59,130,246,.3)' }}>
              Auto-play • {autoPlayDelay}s
            </div>
          )}
        </div>
      </div>

      {/* Player Window Control Modal */}
      {showPlayerWindowControl && (
        <>
          <div className="modal-backdrop" onClick={() => setShowPlayerWindowControl(false)} />
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>🎛️ Player Window Control</h3>
              <button 
                className="btn sm ghost" 
                onClick={() => setShowPlayerWindowControl(false)}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Auto-play settings */}
              <div>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Auto-play Settings</div>
                <div className="control-group">
                  <span className="control-label">Auto-play:</span>
                  <label className="toggle">
                    <input 
                      type="checkbox" 
                      checked={autoPlay} 
                      onChange={e => {
                        const newEnabled = e.target.checked
                        setAutoPlay(newEnabled)
                        updateAutoPlaySettings(newEnabled, autoPlayDelay)
                      }}
                      disabled={!adminToken}
                    />
                    <span className="slider"></span>
                  </label>
                  {autoPlay && (
                    <>
                      <span className="control-label">Delay:</span>
                      <input 
                        type="number" 
                        className="input" 
                        value={autoPlayDelay} 
                        onChange={e => {
                          const newDelay = Math.max(0, Math.min(60, parseInt(e.target.value) || 0))
                          setAutoPlayDelay(newDelay)
                        }}
                        onBlur={() => updateAutoPlaySettings(autoPlay, autoPlayDelay)}
                        style={{ width: 50 }}
                        min="0"
                        max="60"
                        disabled={!adminToken}
                      />
                      <span className="control-label">sec</span>
                    </>
                  )}
                </div>
              </div>

              {/* Overlay settings */}
              <div>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Overlay Settings</div>
                <div className="control-group">
                  <span className="control-label">Overlay:</span>
                  <label className="toggle">
                    <input 
                      type="checkbox" 
                      checked={overlayVisible} 
                      onChange={e => {
                        const newVisible = e.target.checked
                        setOverlayVisible(newVisible)
                        updateOverlaySettings(newVisible, overlayHeight, qrSize)
                      }}
                      disabled={!adminToken}
                    />
                    <span className="slider"></span>
                  </label>
                  {overlayVisible && (
                    <>
                      <span className="control-label">Size:</span>
                      <input 
                        type="range" 
                        value={overlayHeight} 
                        onChange={e => setOverlayHeight(parseInt(e.target.value))}
                        onMouseUp={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                        onTouchEnd={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                        style={{ width: 60 }}
                        min="40"
                        max="150"
                        disabled={!adminToken}
                      />
                      <span className="control-label" style={{ minWidth: 35 }}>{overlayHeight}px</span>
                      <span className="control-label">QR:</span>
                      <input 
                        type="range" 
                        value={qrSize} 
                        onChange={e => setQrSize(parseInt(e.target.value))}
                        onMouseUp={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                        onTouchEnd={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                        style={{ width: 60 }}
                        min="40"
                        max="150"
                        disabled={!adminToken}
                      />
                      <span className="control-label" style={{ minWidth: 35 }}>{qrSize}px</span>
                    </>
                  )}
                </div>
              </div>

              {/* Custom message */}
              {overlayVisible && (
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Custom Message</div>
                  <div className="control-group">
                    <input 
                      type="text"
                      className="input"
                      placeholder="Custom message..."
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      onBlur={() => updateOverlaySettings(overlayVisible, overlayHeight, qrSize)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          updateOverlaySettings(overlayVisible, overlayHeight, qrSize)
                        }
                      }}
                      style={{ flex: 1 }}
                      disabled={!adminToken}
                    />
                    {customMessage && (
                      <button 
                        className="btn sm ghost"
                        onClick={() => {
                          setCustomMessage('')
                          updateOverlaySettings(overlayVisible, overlayHeight, qrSize, '')
                        }}
                        disabled={!adminToken}
                        title="Clear message"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="btn ghost" onClick={() => setShowPlayerWindowControl(false)}>
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Queue Table Card */}
      <div className="card">
        <table className="queue-table">
          <thead>
            <tr>
              <th style={{ width: 25 }}></th>
              <th style={{ width: 35 }}>#</th>
              <th>Title</th>
              <th className="hide-mobile">Artist</th>
              <th className="hide-mobile" style={{ width: 80 }}>Disc ID</th>
              <th className="hide-mobile" style={{ width: 50 }}>Len</th>
              <th style={{ width: 100 }}>Singer</th>
              <th style={{ width: 60 }}>Status</th>
              <th style={{ textAlign: 'right', width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((r) => (
              <tr 
                key={r.id} 
                className={`queue-row ${dragOverPosition === r.position ? 'drag-over' : ''}`}
                style={{
                  background: r.status === 'playing' ? 'rgba(34,197,94,.12)' : 
                             r.status === 'done' ? 'rgba(100,100,100,.08)' : 'transparent',
                  opacity: draggedItem?.id === r.id ? 0.5 : (r.status === 'done' ? 0.6 : 1)
                }}
                onDragOver={(e) => handleDragOver(e, r.position)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, r.position)}
              >
                <td>
                  {r.status === 'queued' && (
                    <span 
                      className="drag-handle"
                      draggable
                      onDragStart={(e) => handleDragStart(e, r)}
                      title="Drag to reorder"
                    >
                      ⋮⋮
                    </span>
                  )}
                </td>
                <td>
                  <span className="pill">{r.position}</span>
                </td>
                <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title || '—'}
                </td>
                <td className="hide-mobile" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist || '—'}</td>
                <td className="hide-mobile" style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.7 }}>
                  {r.disc_id || '—'}
                </td>
                <td className="hide-mobile" style={{ fontSize: 11, opacity: 0.7 }}>
                  {r.duration_ms ? formatTime(r.duration_ms / 1000) : '3:30'}
                </td>
                <td>
                  <InlineEdit
                    value={r.requested_by || ''}
                    disabled={!adminToken || busy}
                    onSave={(val) => rename(r.id, val)}
                  />
                </td>
                <td>
                  <span className="pill" style={{
                    background: r.status === 'playing' ? 'rgba(34,197,94,.2)' : 
                               r.status === 'done' ? 'rgba(100,100,100,.2)' : 'rgba(59,130,246,.2)',
                    borderColor: r.status === 'playing' ? 'rgba(34,197,94,.3)' : 
                                r.status === 'done' ? 'rgba(100,100,100,.3)' : 'rgba(59,130,246,.3)'
                  }}>
                    {r.status === 'playing' ? '▶' : r.status === 'done' ? '✓' : '◯'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="queue-actions">
                    {r.status === 'queued' && (
                      <>
                        <button className="btn sm" onClick={() => playThis(r.id)} disabled={!adminToken || busy}>
                          ▶
                        </button>
                        <button className="btn sm ghost" onClick={() => setReplacingId(r.id)} disabled={!adminToken || busy} title="Replace">
                          🔄
                        </button>
                      </>
                    )}
                    <button className="btn sm warn" onClick={() => remove(r.id)} disabled={!adminToken || busy}>
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!queue.length && (
              <tr><td colSpan={9} style={{ opacity: .8, textAlign: 'center', padding: 30 }}>
                No items in queue. Songs added from the Requests page will appear here instantly.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Replace Song Modal */}
      {replacingId !== null && (
        <>
          <div className="modal-backdrop" onClick={() => { setReplacingId(null); setSearchQuery(''); setSearchResults([]); setReplaceSearchMode('local') }} />
          <div className="modal">
            <h3 style={{ marginTop: 0 }}>Replace Song</h3>
            
            {/* Search mode toggle */}
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <button 
                className={`btn sm ${replaceSearchMode === 'local' ? 'success' : 'ghost'}`}
                onClick={() => { setReplaceSearchMode('local'); setSearchResults([]) }}
              >
                📚 Local Library
              </button>
              <button 
                className={`btn sm ${replaceSearchMode === 'karaoke-nerds' ? 'success' : 'ghost'}`}
                style={replaceSearchMode === 'karaoke-nerds' ? { background: '#7c3aed' } : {}}
                onClick={() => { setReplaceSearchMode('karaoke-nerds'); setSearchResults([]) }}
              >
                🌐 Karaoke Nerds
              </button>
            </div>
            
            <input
              className="input"
              placeholder={replaceSearchMode === 'local' ? "Search local library..." : "Search Karaoke Nerds..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              style={{ width: '100%', marginBottom: 12 }}
            />
            
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {replaceSearchMode === 'local' ? (
                // Local library results
                searchResults.map((track: any) => (
                  <div
                    key={track.id}
                    style={{
                      padding: 8,
                      borderBottom: '1px solid rgba(255,255,255,.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => replaceSong(replacingId, track.id)}
                  >
                    <div>
                      <strong>{track.title}</strong> - {track.artist || 'Unknown'}
                      {track.disc_id && (
                        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.6 }}>
                          [{track.disc_id}]
                        </span>
                      )}
                    </div>
                    <button className="btn sm">Select</button>
                  </div>
                ))
              ) : (
                // KaraokeNerds results
                searchResults.map((track: any, idx: number) => (
                  <div
                    key={track.url || idx}
                    style={{
                      padding: 8,
                      borderBottom: '1px solid rgba(255,255,255,.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => replaceSongWithKaraokeNerds(replacingId, track)}
                  >
                    <div>
                      <strong>{track.title}</strong> - {track.artist || 'Unknown'}
                      {track.brand && (
                        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.6 }}>
                          [{track.brand}]
                        </span>
                      )}
                    </div>
                    <button className="btn sm" style={{ background: '#7c3aed' }}>Select</button>
                  </div>
                ))
              )}
              
              {searchQuery && !searchResults.length && (
                <div style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>
                  No results found{replaceSearchMode === 'karaoke-nerds' ? ' on Karaoke Nerds' : ''}
                </div>
              )}
            </div>
            
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button 
                className="btn ghost" 
                onClick={() => { setReplacingId(null); setSearchQuery(''); setSearchResults([]); setReplaceSearchMode('local') }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// --- Inline edit helper ---
function InlineEdit({ value, onSave, disabled }: { value: string; onSave: (v: string) => void; disabled?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])

  if (!editing) {
    return (
      <span 
        onClick={() => !disabled && setEditing(true)} 
        style={{ 
          cursor: disabled ? 'default' : 'pointer',
          padding: '4px 8px',
          borderRadius: 4,
          transition: 'background 0.2s'
        }}
        onMouseEnter={e => !disabled && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.05)')}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        {value || <span style={{ opacity: .6 }}>Click to set</span>}
      </span>
    )
  }
  
  return (
    <input
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); if (val !== value) onSave(val) }}
      onKeyDown={(e) => { 
        if (e.key === 'Enter') { 
          (e.target as HTMLInputElement).blur() 
        } else if (e.key === 'Escape') {
          setVal(value)
          setEditing(false)
        }
      }}
      className="input"
      style={{ width: '100%' }}
      disabled={disabled}
    />
  )
}