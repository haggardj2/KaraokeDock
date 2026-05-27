import React, { useEffect, useMemo, useRef, useState } from 'react'

type QueueItem = {
  id: number | string
  artist?: string
  title?: string
  requested_by?: string | null
  status?: string
}

export type OverlaySettings = {
  visible: boolean
  height: number // Height in pixels (40-150)
  qrSize: number // QR code size in pixels (40-150)
  customMessage: string // Custom message from host
  showRoller: boolean // Whether to show the scrolling ticker/roller
  showQrCode: boolean // Whether to show the QR code
  hideSingerQueue: boolean // Whether to hide the songs the singer has queued (show singer name only)
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  visible: true,
  height: 90,
  qrSize: 60,
  customMessage: '',
  showRoller: true,
  showQrCode: true,
  hideSingerQueue: false
}

export default function QueueOverlay({
  now,
  upNext,
  settings = DEFAULT_OVERLAY_SETTINGS
}: {
  now?: QueueItem | null
  upNext: QueueItem[]
  settings?: OverlaySettings
}) {
  // Don't render if not visible
  if (!settings.visible) {
    return null
  }
  // Build ticker text parts
  const parts = useMemo(() => {
    const items: string[] = []

    const fmt = (q: QueueItem) => {
      if (settings.hideSingerQueue) {
        return q.requested_by ? `${q.requested_by}` : 'Anonymous'
      }
      return `${q.artist || 'Unknown'} — ${q.title}${q.requested_by ? `  (requested by ${q.requested_by})` : ''}`
    }

    if (now) items.push(`NOW: ${fmt(now)}`)
    if (upNext?.length) {
      items.push(
        `UP NEXT: ` +
          upNext
            .map(fmt)
            .join('  •  ')
      )
    }
    return items
  }, [now, upNext])

  const text = parts.length ? parts.join('   •   ') : 'Waiting for next singer…'

  // Measure width to compute a smooth speed (px/sec)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(30) // fallback

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    // Width of one copy of the content
    const inner = el.querySelector('.ticker-copy') as HTMLElement | null
    if (!inner) return
    const w = inner.scrollWidth
    // Tune speed here (lower = faster). ~120 px/sec feels good for long strings.
    const pxPerSec = 120
    const d = Math.max(12, Math.ceil((w + window.innerWidth) / pxPerSec))
    setDuration(d)
  }, [text])

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        // leave space for the QR at bottom-left (approx 140px incl. padding)
        padding: '10px 16px 10px 160px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(8,8,10,0.85) 45%, rgba(8,8,10,0.92) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        color: '#e5e7eb',
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, "Noto Sans"',
        zIndex: 25
      }}
    >
      <style>{`
        .ticker {
          position: relative;
          width: 100%;
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%);
          white-space: nowrap;
          user-select: none;
        }
        .ticker-track {
          display: inline-flex;
          will-change: transform;
          gap: 64px; /* space between copies */
          padding-block: 2px;
          align-items: center;
        }
        .ticker-copy {
          display: inline-block;
          white-space: nowrap;
          font-weight: 700;
          letter-spacing: .2px;
          font-size: clamp(14px, 1.8vw, 20px);
          color: #e5e7eb;
        }
        .pill-now {
          display:inline-block; margin-right:10px; padding:2px 8px; border-radius:999px;
          font-size: 12px; font-weight:800; color:#111; background:#fde047;
        }
        .pill-next {
          display:inline-block; margin:0 10px 0 22px; padding:2px 8px; border-radius:999px;
          font-size: 12px; font-weight:800; color:#bfdbfe; background:rgba(29,78,216,.2); border:1px solid rgba(147,197,253,.25);
        }
      `}</style>

      <div className="ticker" ref={scrollerRef}>
        <div
          className="ticker-track"
          style={{
            animation: `ticker-move linear ${duration}s infinite`
          }}
        >
          {/* two copies for seamless loop */}
          <div className="ticker-copy">{renderRichText(text)}</div>
          <div className="ticker-copy" aria-hidden>{renderRichText(text)}</div>
        </div>
      </div>

      <style>{`
        @keyframes ticker-move {
          from { transform: translateX(0%); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

/** Render pills inline when keywords are present */
function renderRichText(s: string) {
  // Replace leading NOW:/UP NEXT: labels with styled pills for readability
  // We only style the first occurrences to avoid over-highlighting.
  const firstNow = s.indexOf('NOW:')
  const firstNext = s.indexOf('UP NEXT:')
  const parts: React.ReactNode[] = []

  let i = 0
  while (i < s.length) {
    if (i === firstNow) {
      parts.push(<span className="pill-now" key={`now-${i}`}>NOW</span>)
      i += 'NOW:'.length + 1 // skip colon + space
      continue
    }
    if (i === firstNext) {
      parts.push(<span className="pill-next" key={`next-${i}`}>UP NEXT</span>)
      i += 'UP NEXT:'.length + 1
      continue
    }
    // normal text
    const nextSpecial = [firstNow, firstNext].filter(x => x > i).sort((a,b)=>a-b)[0] ?? s.length
    parts.push(<span key={i}>{s.slice(i, nextSpecial)}</span>)
    i = nextSpecial
  }
  return <>{parts}</>
}
