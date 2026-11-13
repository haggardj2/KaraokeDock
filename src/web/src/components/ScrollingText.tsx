import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './ScrollingText.css'

// Single-line text that scrolls sideways when it doesn't fit, instead of wrapping or being cut off.
// `auto` scrolls on its own; `hover` only scrolls on hover/focus, for long lists where many rows would move at once.
export default function ScrollingText({ children, label, className = '', mode = 'auto' }: {
  children: ReactNode
  label: string
  className?: string
  mode?: 'auto' | 'hover'
}) {
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
  const classes = ['scrolling-text', mode === 'hover' && 'scrolling-text-hover', overflow > 0 && 'overflows', className]
    .filter(Boolean).join(' ')
  return (
    <div ref={viewport} className={classes}
      title={label} aria-label={label} tabIndex={overflow > 0 ? 0 : undefined}
      style={{ '--scroll-distance': `${-overflow}px`, '--scroll-duration': `${Math.max(8, overflow / 25 + 4)}s` } as CSSProperties}>
      <span ref={content} className="scrolling-text-content" key={label}>{children}</span>
    </div>
  )
}
