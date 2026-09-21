import { queueDragTarget, startQueueDragScroll } from './queue-drag'

type Options = {
  attribute: 'data-singer-drag-id' | 'data-song-drag-id'
  isEnabled: () => boolean
  onStart: (id: string) => void
  onTarget: (id: string | null) => void
  onEnd: () => void
  onDrop: (sourceId: string, targetId: string) => void
}

export function attachTouchQueueReorder(container: HTMLElement, options: Options): () => void {
  let gesture: {
    identifier: number; sourceId: string; row: HTMLElement; wasDraggable: boolean
    x: number; y: number; startX: number; startY: number; active: boolean; moved: boolean
  } | null = null
  let hold: ReturnType<typeof setTimeout> | undefined
  let stopScroll: (() => void) | undefined

  function cancel() {
    clearTimeout(hold)
    stopScroll?.()
    stopScroll = undefined
    const previous = gesture
    gesture = null
    if (previous) {
      previous.row.draggable = previous.wasDraggable
      if (previous.active) options.onEnd()
    }
  }

  function start(event: TouchEvent) {
    if (event.touches.length !== 1 || !options.isEnabled()) { cancel(); return }
    const element = event.target
    if (!(element instanceof Element) || element.closest('button, a, input, select, textarea, [role="button"]')) return
    const row = element.closest<HTMLElement>(`[${options.attribute}]`)
    const sourceId = row?.getAttribute(options.attribute)
    if (!row || !sourceId || !container.contains(row)) return
    cancel()
    const touch = event.touches[0]
    gesture = {
      identifier: touch.identifier, sourceId, row, wasDraggable: row.draggable,
      x: touch.clientX, y: touch.clientY, startX: touch.clientX, startY: touch.clientY,
      active: false, moved: false,
    }
    // Native HTML dragging can cancel touch gestures before they reach the save handler.
    row.draggable = false
    hold = setTimeout(() => {
      if (!gesture || !options.isEnabled()) { cancel(); return }
      gesture.active = true
      options.onStart(sourceId)
      stopScroll = startQueueDragScroll(row, () => gesture?.moved ? gesture : null, (x, y) => {
        options.onTarget(queueDragTarget(options.attribute, x, y))
      })
    }, 300)
  }

  function move(event: TouchEvent) {
    const current = gesture
    if (!current) return
    if (event.touches.length !== 1 || !options.isEnabled()) { cancel(); return }
    const touch = Array.from(event.touches).find(touch => touch.identifier === current.identifier)
    if (!touch) return
    current.x = touch.clientX
    current.y = touch.clientY
    const moved = Math.hypot(current.x - current.startX, current.y - current.startY) >= 8
    if (!current.active) {
      if (moved) cancel()
      return
    }
    if (!event.cancelable) { cancel(); return }
    event.preventDefault()
    current.moved ||= moved
    if (current.moved) options.onTarget(queueDragTarget(options.attribute, current.x, current.y))
  }

  function end(event: TouchEvent) {
    const current = gesture
    if (!current) return
    const touch = Array.from(event.changedTouches).find(touch => touch.identifier === current.identifier)
    if (!touch) return
    const targetId = current.active && current.moved && options.isEnabled()
      ? queueDragTarget(options.attribute, touch.clientX, touch.clientY) : null
    if (current.active && event.cancelable) event.preventDefault()
    cancel()
    if (targetId && targetId !== current.sourceId) options.onDrop(current.sourceId, targetId)
  }

  function preventNativeDrag(event: Event) {
    if (gesture) event.preventDefault()
  }
  container.addEventListener('touchstart', start, { passive: true })
  container.addEventListener('touchmove', move, { passive: false })
  container.addEventListener('touchend', end, { passive: false })
  container.addEventListener('touchcancel', cancel)
  container.addEventListener('contextmenu', preventNativeDrag)
  container.addEventListener('dragstart', preventNativeDrag)
  return () => {
    cancel()
    container.removeEventListener('touchstart', start)
    container.removeEventListener('touchmove', move)
    container.removeEventListener('touchend', end)
    container.removeEventListener('touchcancel', cancel)
    container.removeEventListener('contextmenu', preventNativeDrag)
    container.removeEventListener('dragstart', preventNativeDrag)
  }
}
