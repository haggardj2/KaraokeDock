import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './QueueSongText.css'

export default function QueueSongText({ children, label }: { children: ReactNode; label: string }) {
  const viewport = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(0)
  useEffect(() => {
    const measure = () => setOverflow(Math.max(0, (content.current?.scrollWidth ?? 0) - (viewport.current?.clientWidth ?? 0)))
    const observer = new ResizeObserver(measure)
    observer.observe(viewport.current!)
    observer.observe(content.current!)
    measure()
    return () => observer.disconnect()
  }, [label])
  return (
    <div ref={viewport} className={`queue-song-text${overflow > 0 ? ' overflows' : ''}`}
      title={label} aria-label={label} tabIndex={overflow > 0 ? 0 : undefined}
      style={{ '--song-scroll-distance': `${-overflow}px`, '--song-scroll-duration': `${Math.max(8, overflow / 25 + 4)}s` } as CSSProperties}>
      <span ref={content} className="queue-song-text-content" key={label}>{children}</span>
    </div>
  )
}
