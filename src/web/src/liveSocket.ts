// A WebSocket that stays connected. Besides reconnecting after a close, it notices a connection
// that has gone quiet without closing (a TV whose Wi-Fi dozed, a dropped NAT mapping) and
// replaces it. The server answers each heartbeat, so silence for staleMs means the link is dead.

type LiveSocketOptions = {
  url: () => string
  onMessage: (message: any) => void
  /** Called on every (re)connect: reload state that may have changed while disconnected. */
  onOpen?: () => void
  heartbeatMs?: number
  staleMs?: number
  reconnectMs?: number
  WebSocketImpl?: typeof WebSocket
  now?: () => number
}

const OPEN = 1

export function connectLiveSocket({
  url,
  onMessage,
  onOpen,
  heartbeatMs = 15_000,
  staleMs = 40_000,
  reconnectMs = 1_000,
  WebSocketImpl = WebSocket,
  now = Date.now,
}: LiveSocketOptions): () => void {
  let socket: WebSocket | null = null
  let disposed = false
  let lastHeard = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const detach = (ws: WebSocket) => {
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
    try { ws.close() } catch { /* already closed */ }
  }

  const scheduleConnect = (delay = reconnectMs) => {
    if (disposed || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      open()
    }, delay)
  }

  const open = () => {
    if (disposed) return
    let ws: WebSocket
    try {
      ws = new WebSocketImpl(url())
    } catch {
      scheduleConnect()
      return
    }
    socket = ws
    lastHeard = now()
    ws.onopen = () => {
      lastHeard = now()
      onOpen?.()
    }
    ws.onmessage = (event) => {
      lastHeard = now()
      let message: any
      try {
        message = JSON.parse(String(event.data))
      } catch {
        return
      }
      if (message?.type !== 'heartbeat') onMessage(message)
    }
    ws.onclose = () => {
      if (socket !== ws) return
      socket = null
      scheduleConnect()
    }
    ws.onerror = () => { /* a close follows */ }
  }

  // Replace a connection that is open in name only (or stuck connecting).
  const restart = () => {
    if (socket) detach(socket)
    socket = null
    scheduleConnect(0)
  }

  const heartbeat = setInterval(() => {
    if (!socket) return
    if (now() - lastHeard > staleMs) {
      restart()
      return
    }
    if (socket.readyState === OPEN) socket.send(JSON.stringify({ type: 'heartbeat' }))
  }, heartbeatMs)

  // Coming back online or to the foreground: check the link now instead of at the next beat.
  const checkNow = () => {
    if (!socket) return
    if (socket.readyState === OPEN) socket.send(JSON.stringify({ type: 'heartbeat' }))
    else if (now() - lastHeard > reconnectMs * 5) restart()
  }
  const onVisible = () => { if (document.visibilityState === 'visible') checkNow() }
  if (typeof window !== 'undefined') window.addEventListener('online', checkNow)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)

  open()

  return () => {
    disposed = true
    clearInterval(heartbeat)
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (typeof window !== 'undefined') window.removeEventListener('online', checkNow)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
    if (socket) detach(socket)
    socket = null
  }
}
