import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE, api, wsUrl } from '../api'
import type { OverlaySettings } from '../components/QueueOverlay'

type QItem = {
  id: number | string
  artist?: string
  title?: string
  requested_by?: string | null
  status?: 'queued' | 'playing' | 'finished' | string
  kind?: 'mp4' | 'cdgmp3' | string
  file_mp4?: string
  file_mp3?: string
  file_cdg?: string
  path?: string
  external_url?: string
  source?: string
  duration_ms?: number | null
}

// Helper function to extract YouTube video ID from URL
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /^([a-zA-Z0-9_-]{11})$/  // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

export default function Player() {
  const [queue, setQueue] = useState<QItem[]>([])
  const [now, setNow] = useState<QItem | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isYouTube, setIsYouTube] = useState(false)
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>({ visible: true, height: 90, qrSize: 60, customMessage: '' })
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoPlayDelay, setAutoPlayDelay] = useState(5)
  const [countdown, setCountdown] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>()
  const youtubePlayerRef = useRef<YT.Player | null>(null)
  const youtubeTimerRef = useRef<ReturnType<typeof setInterval>>()
  const countdownTimerRef = useRef<ReturnType<typeof setInterval>>()

  // Force dark theme
  useEffect(() => {
    const prevBg = document.body.style.background
    const prevColor = document.body.style.color
    const prevScheme = document.documentElement.style.colorScheme
    document.documentElement.style.colorScheme = 'dark'
    document.body.style.background = '#000'
    document.body.style.color = '#e5e7eb'
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'

    const els: HTMLElement[] = Array.from(
      document.querySelectorAll('nav, header, .top-shortcuts')
    ) as HTMLElement[]
    els.forEach(e => (e.style.display = 'none'))

    // Load YouTube IFrame API
    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    return () => {
      document.documentElement.style.colorScheme = prevScheme
      document.body.style.background = prevBg
      document.body.style.color = prevColor
      document.body.style.margin = ''
      document.body.style.overflow = ''
      els.forEach(e => (e.style.display = ''))
    }
  }, [])

  // Handle mouse movement for controls visibility
  const handleMouseMove = () => {
    setShowControls(true)
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current)
    }
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current)
      }
    }
  }, [])

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  // Handle play button click
  const handlePlayClick = async () => {
    const v = videoRef.current
    if (!v) return
    
    try {
      await v.play()
      setNeedsUserInteraction(false)
      setIsPlaying(true)
    } catch (err) {
      console.error('Play failed:', err)
    }
  }

  // Fetch queue + determine current
  async function refresh() {
    const q: QItem[] = await api('/api/queue')
    setQueue(q)
    const cur = q.find(x => x.status === 'playing') || null
    setNow(prev => {
      // No change: nothing was playing, nothing is playing now
      if (!prev && !cur) return null
      // Song started: nothing was playing, now something is playing
      if (!prev && cur) return cur
      // Song stopped: something was playing, now nothing is playing
      if (prev && !cur) return null
      // Song changed: different song is now playing
      if (prev && cur && String(prev.id) !== String(cur.id)) return cur
      // Same song is still playing - don't update to avoid triggering re-renders
      // that could restart the video
      return prev
    })
  }

  useEffect(() => { refresh() }, [])

  // Fetch initial overlay settings
  useEffect(() => {
    api('/api/overlay/settings')
      .then((settings: OverlaySettings) => {
        setOverlaySettings(settings)
      })
      .catch(() => {
        // Use defaults on error
      })
  }, [])

  // Fetch initial autoplay settings
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

  // WebSocket live updates
  useEffect(() => {
    function connect() {
      try {
        wsRef.current = new WebSocket(wsUrl)
        wsRef.current.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data)
            if (
              msg.type === 'library.scanned' ||
              msg.type === 'queue.updated' ||
              msg.type === 'player.updated' ||
              msg.type === 'player.play' ||
              msg.type === 'player.next' ||
              msg.type === 'player.stop'
            ) {
              refresh()
            }
            // Handle overlay settings updates
            if (msg.type === 'overlay.settings') {
              setOverlaySettings({
                visible: msg.visible ?? true,
                height: msg.height ?? 90,
                qrSize: msg.qrSize ?? 60,
                customMessage: msg.customMessage ?? ''
              })
            }
            // Handle autoplay settings updates
            if (msg.type === 'autoplay.settings') {
              if (typeof msg.enabled === 'boolean') {
                setAutoPlay(msg.enabled)
              }
              if (typeof msg.delay === 'number') {
                setAutoPlayDelay(msg.delay)
              }
            }
          } catch { /* ignore */ }
        }
        wsRef.current.onclose = () => {
          wsRef.current = null
          setTimeout(connect, 1000)
        }
      } catch {
        setTimeout(connect, 1500)
      }
    }
    connect()
    return () => { wsRef.current?.close() }
  }, [])

  // Determine YouTube state based on current song (moved out of useMemo to avoid side effects)
  useEffect(() => {
    if (!now) {
      setIsYouTube(false);
      setYoutubeVideoId(null);
      return;
    }
    
    // Handle external URLs (e.g., from Karaoke Nerds)
    if (now.external_url) {
      const videoId = getYouTubeVideoId(now.external_url);
      if (videoId) {
        setIsYouTube(true);
        setYoutubeVideoId(videoId);
      } else {
        setIsYouTube(false);
        setYoutubeVideoId(null);
      }
    } else {
      setIsYouTube(false);
      setYoutubeVideoId(null);
    }
  }, [now?.id, now?.external_url])

  // Build the media URL - pure computation, no side effects
  const mediaSrc = useMemo(() => {
    if (!now) return ''
    
    // Handle external URLs (e.g., from Karaoke Nerds)
    if (now.external_url) {
      // Check if it's a YouTube URL - return empty string as we'll use iframe instead
      const videoId = getYouTubeVideoId(now.external_url);
      if (videoId) {
        return '';
      }
      // For non-YouTube external URLs, use video element
      return now.external_url
    }
    
    // Handle MP4 files
    if (now.kind === 'mp4' && now.file_mp4) {
      return `${API_BASE}/media/mp4stream?path=${encodeURIComponent(now.file_mp4)}`
    }
    
    // Handle CDG+MP3 files
    if (now.kind === 'cdgmp3' && now.file_cdg && now.file_mp3) {
      const isFromZip = now.file_cdg.startsWith('zip://') || now.file_mp3.startsWith('zip://')
      
      let url = `${API_BASE}/media/cdgmp4?`
      
      if (isFromZip) {
        const parseCdgPath = now.file_cdg.replace('zip://', '').split('#')
        const parseMp3Path = now.file_mp3.replace('zip://', '').split('#')
        
        const zipFile = parseCdgPath[0]
        const cdgEntry = parseCdgPath[1]
        const mp3Entry = parseMp3Path[1]
        
        url += `file=${encodeURIComponent(zipFile)}&`
        url += `cdg=${encodeURIComponent(cdgEntry || '')}&`
        url += `mp3=${encodeURIComponent(mp3Entry || '')}`
      } else {
        url += `cdg=${encodeURIComponent(now.file_cdg)}&`
        url += `mp3=${encodeURIComponent(now.file_mp3)}`
      }
      
      return url
    }
    
    return ''
  }, [now?.id, now?.external_url, now?.kind, now?.file_mp4, now?.file_cdg, now?.file_mp3])

  // Load video when mediaSrc changes or YouTube video changes
  useEffect(() => {
    // Reset states when source changes
    setNeedsUserInteraction(false)
    setIsPlaying(false)
    
    // Handle YouTube videos
    if (isYouTube && youtubeVideoId) {
      // YouTube iframe will autoplay via URL parameter
      setIsPlaying(true)
      return
    }
    
    // Handle regular video element
    const v = videoRef.current
    if (!v || !mediaSrc) return
    
    v.src = mediaSrc
    v.load()
    
    // Try to play automatically
    const playVideo = async () => {
      try {
        // Try with muted first (usually works)
        v.muted = true
        await v.play()
        // If successful, unmute
        v.muted = false
        setIsPlaying(true)
      } catch (err) {
        // If even muted play fails, we need user interaction
        v.muted = false
        setNeedsUserInteraction(true)
      }
    }
    
    playVideo()
  }, [mediaSrc, isYouTube, youtubeVideoId])

  // Helper function to send timing updates
  const sendTimingUpdate = useCallback((currentTime: number, duration: number, queueId: number | string) => {
    if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
      api('/api/player/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTime,
          duration,
          queueId
        })
      }).catch(err => {
        console.error('Failed to send timing update:', err)
      })
    }
  }, [])

  // Monitor video play/pause state and handle video end
  useEffect(() => {
    const v = videoRef.current
    if (!v || !now) return
    
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      
      // Send final timing update when video ends
      // Get duration from video element or database
      let duration = v.duration
      if (!duration || isNaN(duration) || !isFinite(duration)) {
        if (now.duration_ms) {
          duration = now.duration_ms / 1000
        }
      }
      
      // Send currentTime = duration to ensure Host detects song completion
      if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
        console.log('Video ended, sending final timing update:', duration)
        sendTimingUpdate(duration, duration, now.id)
      }
    }
    
    v.addEventListener('play', handlePlay)
    v.addEventListener('pause', handlePause)
    v.addEventListener('ended', handleEnded)
    
    return () => {
      v.removeEventListener('play', handlePlay)
      v.removeEventListener('pause', handlePause)
      v.removeEventListener('ended', handleEnded)
    }
  }, [now, sendTimingUpdate])

  // Report timing updates to server for Host page (regular videos only)
  useEffect(() => {
    if (!now) return
    
    // YouTube timing is handled separately via YouTube IFrame API
    if (isYouTube) return
    
    const v = videoRef.current
    if (!v) return
    
    // Send timing updates every 1 second
    const intervalId = setInterval(() => {
      const currentTime = v.currentTime || 0
      
      // Try to get duration from video element first
      let duration = v.duration
      
      // If video element can't provide duration (e.g., for CDG streams),
      // use the duration from database (extracted during scan)
      if (!duration || isNaN(duration) || !isFinite(duration)) {
        if (now.duration_ms) {
          duration = now.duration_ms / 1000 // Convert ms to seconds
        }
      }
      
      // Send timing update
      sendTimingUpdate(currentTime, duration, now.id)
    }, 1000)
    
    return () => clearInterval(intervalId)
  }, [now, isYouTube, sendTimingUpdate])

  // Report YouTube timing updates using IFrame API
  useEffect(() => {
    if (!now || !isYouTube || !youtubeVideoId) return
    
    // Create a unique player container ID
    const playerId = 'youtube-player-' + youtubeVideoId
    const IFRAME_READY_TIMEOUT = 100
    const INIT_DELAY = 500
    
    // Initialize YouTube player when API is ready
    const initPlayer = () => {
      const YT = (window as any).YT
      if (!YT || !YT.Player) {
        setTimeout(initPlayer, IFRAME_READY_TIMEOUT)
        return
      }
      
      // Clean up existing timer
      if (youtubeTimerRef.current) {
        clearInterval(youtubeTimerRef.current)
      }
      
      // Create player instance (reusing existing iframe if possible)
      try {
        youtubePlayerRef.current = new YT.Player(playerId, {
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready')
              
              // Unmute the player after it's ready (video starts muted for autoplay to work)
              try {
                event.target.unMute()
                event.target.setVolume(100)
                console.log('YouTube player unmuted')
              } catch (err) {
                console.error('Error unmuting YouTube player:', err)
              }
              
              // Start timing updates
              youtubeTimerRef.current = setInterval(() => {
                try {
                  const currentTime = event.target.getCurrentTime()
                  const duration = event.target.getDuration()
                  
                  if (duration && currentTime !== undefined) {
                    // Send timing to server using helper function
                    sendTimingUpdate(currentTime, duration, now.id)
                  }
                } catch (err) {
                  console.error('Error getting YouTube timing:', err)
                }
              }, 1000)
            },
            onStateChange: (event: any) => {
              // YT.PlayerState.PLAYING = 1
              if (event.data === 1) {
                // Ensure video is unmuted when playing starts
                try {
                  if (event.target.isMuted()) {
                    event.target.unMute()
                    event.target.setVolume(100)
                    console.log('YouTube player unmuted on play')
                  }
                } catch (err) {
                  console.error('Error unmuting YouTube player on play:', err)
                }
              }
              // YT.PlayerState.ENDED = 0
              if (event.data === 0) {
                console.log('YouTube video ended, sending final timing update')
                try {
                  const duration = event.target.getDuration()
                  if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
                    // Send final timing update with currentTime = duration
                    sendTimingUpdate(duration, duration, now.id)
                  }
                } catch (err) {
                  console.error('Error sending final YouTube timing:', err)
                }
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data)
            }
          }
        })
      } catch (err) {
        console.error('Failed to initialize YouTube player:', err)
      }
    }
    
    // Wait for iframe to be rendered in the DOM
    setTimeout(initPlayer, INIT_DELAY)
    
    return () => {
      if (youtubeTimerRef.current) {
        clearInterval(youtubeTimerRef.current)
      }
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy()
        } catch {}
        youtubePlayerRef.current = null
      }
    }
  }, [now, isYouTube, youtubeVideoId, sendTimingUpdate])

  // Get next up singers
  const upNext = queue
    .filter(q => q.status === 'queued')
    .sort((a, b) => queue.indexOf(a) - queue.indexOf(b))

  // Countdown timer for autoplay when no song is playing but queue has items
  useEffect(() => {
    // Clear existing countdown timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = undefined
    }
    
    // Only show countdown if:
    // 1. No song is currently playing
    // 2. Autoplay is enabled
    // 3. There are songs in the queue
    if (!now && autoPlay && upNext.length > 0) {
      // Initialize countdown to autoplay delay
      setCountdown(autoPlayDelay)
      
      // Start countdown timer
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 0) {
            // Keep showing 0 until song starts (host controls actual autoplay)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setCountdown(null)
    }
    
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [now, autoPlay, autoPlayDelay, upNext.length])

  // Build ticker text with current singer and queue
  const tickerText = useMemo(() => {
    // If nothing is playing
    if (!now) {
      if (upNext.length === 0) {
        // Show custom message at end if set, otherwise waiting message
        if (overlaySettings.customMessage) {
          return `🎵 Waiting for singers... Add your song from the request page! 📢 ${overlaySettings.customMessage}     🎵     🎵 Waiting for singers... Add your song from the request page! 📢 ${overlaySettings.customMessage}     🎵     `
        }
        return '🎵 Waiting for singers... Add your song from the request page! 🎵     🎵 Waiting for singers... Add your song from the request page! 🎵     '
      }
      
      // Show upcoming queue when nothing is playing
      const queueText = upNext.slice(0, 5).map((item, idx) => {
        const singer = item.requested_by || 'Anonymous'
        return `${idx + 1}. ${singer}`
      }).join(' • ')
      
      // Add countdown info if autoplay is enabled
      const countdownInfo = autoPlay && countdown !== null 
        ? `⏱️ Starting in ${countdown}s... ` 
        : ''
      
      // Add custom message at the end if set
      const fullText = overlaySettings.customMessage
        ? `${countdownInfo}🎤 QUEUE: ${queueText} 📢 ${overlaySettings.customMessage}`
        : `${countdownInfo}🎤 QUEUE: ${queueText}`
      return `${fullText}     🎵     ${fullText}     🎵     `
    }
    
    // Current singer is playing - always show what song is playing
    const songInfo = `${now.artist || 'Unknown'} — ${now.title || 'Unknown'}`
    const current = now.requested_by 
      ? `🎤 NOW SINGING: ${now.requested_by} — ${songInfo}`
      : `🎤 NOW PLAYING: ${songInfo}`
    
    // Build queue list
    const queueText = upNext.slice(0, 5).map((item, idx) => {
      const singer = item.requested_by || 'Anonymous'
      return `${idx + 1}. ${singer}`
    }).join(' • ')
    
    // Combine with proper spacing, adding custom message at the end if set
    let fullText = queueText 
      ? `${current} ⭐ UP NEXT: ${queueText}`
      : current
    
    // Add custom message at the end if set
    if (overlaySettings.customMessage) {
      fullText += ` 📢 ${overlaySettings.customMessage}`
    }
    
    // Repeat for smooth scrolling with divider
    return `${fullText}     🎵     ${fullText}     🎵     `
  }, [now, upNext, overlaySettings.customMessage, autoPlay, countdown])

  // Render the overlay (shown always, unless visibility is false)
  const renderOverlay = () => {
    if (!overlaySettings.visible) {
      return null
    }
    
    // Calculate scale factor based on height (default 90px = 1.0 scale)
    const scaleFactor = overlaySettings.height / 90
    const tickerHeight = Math.round(40 * scaleFactor)
    const tickerFontSize = Math.round(16 * scaleFactor)
    const padding = Math.round(15 * scaleFactor)
    const gap = Math.round(15 * scaleFactor)
    const qrPadding = Math.round(5 * scaleFactor)
    const borderRadius = Math.round(8 * scaleFactor)
    
    // QR size is controlled separately
    const qrSizeValue = overlaySettings.qrSize
    
    return (
      <div 
        className="controls-overlay"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${overlaySettings.height}px`,
          background: 'transparent',
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-end',
          padding: `${padding}px`,
          gap: `${gap}px`,
          opacity: 1
        }}
      >
        {/* QR Code */}
        <div style={{
          width: `${qrSizeValue}px`,
          height: `${qrSizeValue}px`,
          background: 'white',
          borderRadius: `${borderRadius}px`,
          padding: `${qrPadding}px`,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <img 
            src={`${API_BASE}/api/qr`}
            alt="QR"
            style={{ 
              width: '100%', 
              height: '100%',
              imageRendering: 'crisp-edges'
            }}
            onError={(e) => { 
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>

        {/* Ticker container - takes full remaining width */}
        <div style={{
          flex: 1,
          height: `${tickerHeight}px`,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'transparent',
          borderRadius: `${borderRadius}px`,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: `${padding}px`,
          paddingRight: `${padding}px`
        }}>
          <div className="ticker-text" style={{
            fontSize: `${tickerFontSize}px`,
            fontWeight: 600,
            color: '#fff',
            textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
            letterSpacing: '0.5px'
          }}>
            {tickerText}
          </div>
        </div>

        {/* Fullscreen button - only rendered when controls are shown to avoid gap */}
        {showControls && (
          <button
            onClick={toggleFullscreen}
            style={{
              flexShrink: 0,
              padding: `${Math.round(10 * scaleFactor)}px ${Math.round(20 * scaleFactor)}px`,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: `${borderRadius}px`,
              color: 'white',
              cursor: 'pointer',
              fontSize: `${Math.round(14 * scaleFactor)}px`,
              fontWeight: 500,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isFullscreen ? '⊗ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        )}
      </div>
    )
  }

  // When nothing is playing, show waiting screen with ticker
  if (!now) {
    return (
      <>
        <style>{`
          @keyframes ticker-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          
          .ticker-text {
            display: inline-block;
            white-space: nowrap;
            animation: ticker-scroll 30s linear infinite;
          }
          
          .controls-overlay {
            transition: opacity 0.3s ease-in-out;
          }
        `}</style>
        
        <div 
          ref={containerRef} 
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setShowControls(true)}
          style={{
            position: 'relative',
            height: '100vh',
            width: '100vw',
            background: '#000',
            color: '#e5e7eb',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            cursor: showControls ? 'default' : 'none'
          }}
        >
          {/* Show different content based on whether there are queued singers */}
          {upNext.length > 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px'
            }}>
              {/* Countdown timer when autoplay is enabled */}
              {autoPlay && countdown !== null && (
                <div style={{
                  fontSize: 'clamp(20px, 4vw, 36px)',
                  color: '#10b981',
                  fontWeight: 600
                }}>
                  ⏱️ Starting in {countdown}s...
                </div>
              )}
              
              {/* Up next heading */}
              <h2 style={{ 
                fontSize: 'clamp(24px, 4vw, 48px)',
                margin: 0,
                color: '#a7f3d0'
              }}>
                🎤 Up Next
              </h2>
              
              {/* Show next singers (up to 4) */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                width: '100%',
                maxWidth: '600px'
              }}>
                {upNext.slice(0, 4).map((item, idx) => (
                  <div 
                    key={item.id} 
                    style={{
                      background: idx === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${idx === 0 ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '12px',
                      padding: '16px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <span style={{
                      fontSize: 'clamp(24px, 3vw, 36px)',
                      fontWeight: 700,
                      color: idx === 0 ? '#10b981' : 'rgba(255,255,255,0.5)',
                      minWidth: '40px'
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 'clamp(18px, 2.5vw, 28px)', 
                        fontWeight: 600,
                        color: idx === 0 ? '#fff' : 'rgba(255,255,255,0.8)'
                      }}>
                        {item.requested_by || 'Anonymous'}
                      </div>
                      <div style={{ 
                        fontSize: 'clamp(14px, 2vw, 20px)', 
                        opacity: 0.7,
                        marginTop: '4px'
                      }}>
                        {item.title || 'Unknown'} - {item.artist || 'Unknown'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Show if there are more singers in queue */}
              {upNext.length > 4 && (
                <div style={{ 
                  fontSize: 'clamp(14px, 2vw, 20px)', 
                  opacity: 0.6 
                }}>
                  +{upNext.length - 4} more in queue
                </div>
              )}
            </div>
          ) : (
            <h1 style={{ 
              fontSize: 'clamp(28px, 5vw, 56px)', 
              letterSpacing: 1,
              textAlign: 'center',
              padding: '20px'
            }}>
              Waiting for singers...
            </h1>
          )}
          
          {/* Always show the overlay with ticker */}
          {renderOverlay()}
        </div>
      </>
    )
  }

  // Playing screen
  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .ticker-text {
          display: inline-block;
          white-space: nowrap;
          animation: ticker-scroll 30s linear infinite;
        }
        
        .controls-overlay {
          transition: opacity 0.3s ease-in-out;
        }
        
        .play-button-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 100;
          background: rgba(0,0,0,0.7);
          border-radius: 50%;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        
        .play-button-overlay:hover {
          transform: translate(-50%, -50%) scale(1.1);
          background: rgba(0,0,0,0.8);
        }
        
        .play-icon {
          width: 0;
          height: 0;
          border-left: 40px solid white;
          border-top: 25px solid transparent;
          border-bottom: 25px solid transparent;
          margin-left: 10px;
        }
      `}</style>

      <div 
        ref={containerRef} 
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setShowControls(true)}
        style={{
          position: 'relative',
          height: '100vh',
          width: '100vw',
          background: '#000',
          color: '#e5e7eb',
          overflow: 'hidden',
          cursor: showControls ? 'default' : 'none'
        }}
      >
        {/* YouTube iframe for YouTube videos */}
        {isYouTube && youtubeVideoId ? (
          <iframe
            id={`youtube-player-${youtubeVideoId}`}
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&fs=1&playsinline=1&enablejsapi=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              zIndex: 1
            }}
          />
        ) : (
          // Video element for local and non-YouTube videos
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              zIndex: 1
            }}
          />
        )}

        {/* Play button overlay when autoplay is blocked (only for video element) */}
        {!isYouTube && needsUserInteraction && !isPlaying && (
          <div className="play-button-overlay" onClick={handlePlayClick}>
            <div className="play-icon" />
          </div>
        )}

        {/* Always show the overlay with ticker */}
        {renderOverlay()}
      </div>
    </>
  )
}