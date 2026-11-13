import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// The top app bar leaves a slot for the current page's title and actions, so Host and
// Admin can put their header into the bar instead of drawing a second row below it.
let slot: HTMLElement | null = null
const listeners = new Set<() => void>()

export function setAppBarSlot(element: HTMLElement | null) {
  if (slot === element) return
  slot = element
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useAppBarSlot() {
  return useSyncExternalStore(subscribe, () => slot, () => null)
}

export function AppBarContent({ children }: { children: ReactNode }) {
  const target = useAppBarSlot()
  return target ? createPortal(children, target) : null
}
