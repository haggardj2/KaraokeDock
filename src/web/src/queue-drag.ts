export function queueDragTarget(attribute: string, x: number, y: number): string | null {
  return document.elementFromPoint(x, y)?.closest(`[${attribute}]`)?.getAttribute(attribute) ?? null
}

export function startQueueDragScroll(
  element: HTMLElement,
  getPoint: () => { x: number; y: number } | null,
  onMove: (x: number, y: number) => void,
): () => void {
  let scrollParent = element.parentElement
  while (scrollParent && !/(auto|scroll)/.test(getComputedStyle(scrollParent).overflowY)) {
    scrollParent = scrollParent.parentElement
  }
  const scroll = scrollParent
  let frame: number
  const tick = () => {
    const point = getPoint()
    if (point) {
      const bounds = scroll?.getBoundingClientRect()
      const top = Math.max(0, bounds?.top ?? 0)
      const bottom = Math.min(window.innerHeight, bounds?.bottom ?? window.innerHeight)
      const delta = point.y < top + 48 ? -10 : point.y > bottom - 48 ? 10 : 0
      if (delta) {
        if (scroll) scroll.scrollTop += delta
        else window.scrollBy(0, delta)
      }
      onMove(point.x, point.y)
    }
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}
