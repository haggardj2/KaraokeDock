import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { queueDragTarget, startQueueDragScroll } from '../queue-drag'

export default function QueueDragHandle({ id, attribute, label, disabled, children, style, onStart, onTarget, onEnd, onDrop }: {
  id: string
  attribute: 'data-singer-drag-id' | 'data-song-drag-id'
  label: string
  disabled?: boolean
  children: ReactNode
  style?: CSSProperties
  onStart: () => void
  onTarget: (id: string | null) => void
  onEnd: () => void
  onDrop: (sourceId: string, targetId: string) => void
}) {
  const drag = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null)
  const stopScroll = useRef<(() => void) | null>(null)
  const callbacks = useRef({ onTarget, onEnd })
  callbacks.current = { onTarget, onEnd }

  function cancel() {
    drag.current = null
    stopScroll.current?.()
    stopScroll.current = null
    callbacks.current.onEnd()
  }

  useEffect(() => () => {
    stopScroll.current?.()
  }, [])
  useEffect(() => { if (disabled && drag.current) cancel() }, [disabled])

  function targetAt(x: number, y: number) {
    return queueDragTarget(attribute, x, y)
  }

  function begin(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || event.button !== 0 || !event.isPrimary || drag.current) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, moved: false,
    }
    onStart()
    stopScroll.current = startQueueDragScroll(event.currentTarget, () => drag.current?.moved ? drag.current : null,
      (x, y) => callbacks.current.onTarget(targetAt(x, y)))
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    current.x = event.clientX
    current.y = event.clientY
    current.moved ||= Math.hypot(current.x - current.startX, current.y - current.startY) >= 6
    if (current.moved) onTarget(targetAt(current.x, current.y))
  }

  function finish(event: PointerEvent<HTMLButtonElement>, commit: boolean) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    const target = commit && current.moved ? targetAt(event.clientX, event.clientY) : null
    cancel()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (target && target !== id) onDrop(id, target)
  }

  return (
    <button type="button" className="queue-drag-handle" aria-label={label}
      title={`${label}. Drag to reorder, or use the up and down arrow keys.`}
      disabled={disabled} draggable={false}
      style={{ ...style, touchAction: 'none', userSelect: 'none', cursor: disabled ? 'default' : 'grab', padding: 0, border: 0 }}
      onDragStart={(event) => { event.preventDefault(); event.stopPropagation() }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={begin} onPointerMove={move}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
      onLostPointerCapture={(event) => finish(event, false)}
      onKeyDown={(event) => {
        if (disabled || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
        event.preventDefault()
        const ids = Array.from(document.querySelectorAll(`[${attribute}]`), (row) => row.getAttribute(attribute))
        const index = ids.indexOf(id)
        const target = ids[index + (event.key === 'ArrowUp' ? -1 : 1)]
        if (index >= 0 && target) onDrop(id, target)
      }}>
      {children}
    </button>
  )
}
