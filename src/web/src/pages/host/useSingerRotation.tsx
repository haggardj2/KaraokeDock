import { useEffect, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import { getSingerDisplaySong } from '../../playerPlayback'
import { attachTouchQueueReorder } from '../../touch-queue-reorder'
import type { QueueState } from './types'

// The singer rotation on the Host page: drag (mouse) and press-and-hold (touch) reordering,
// saving the new order, and removing a singer with their queued songs.
export function useSingerRotation({
  queueState,
  headers,
  busy,
  setBusy,
  setBanner,
  refreshQueueState,
}: {
  queueState: QueueState | null
  headers: Record<string, string>
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  setBanner: Dispatch<SetStateAction<string>>
  refreshQueueState: () => Promise<void>
}) {
  const auth = useAuth()
  const [singerDraggedId, setSingerDraggedId] = useState<string | null>(null)
  const [singerDragOverId, setSingerDragOverId] = useState<string | null>(null)
  const [savingQueueOrder, setSavingQueueOrder] = useState(false)
  const queueOrderSavingRef = useRef(false)
  const singerQueueTouchRef = useRef<HTMLDivElement>(null)

  function handleSingerDragStart(singerId: string) {
    setSingerDraggedId(singerId)
  }

  const touchQueueCallbacks = useRef<{
    enabled: () => boolean
    singerDrop: (source: string, target: string) => void
  }>({
    enabled: () => false,
    singerDrop: (_source: string, _target: string) => {},
  })
  touchQueueCallbacks.current = {
    enabled: () => auth.canHost && !busy && !queueOrderSavingRef.current,
    singerDrop: (source, target) => { void reorderSingers(source, target) },
  }
  const hasSingerQueue = Boolean(queueState?.queueOrder.length)
  useEffect(() => {
    if (!singerQueueTouchRef.current) return
    return attachTouchQueueReorder(singerQueueTouchRef.current, {
      attribute: 'data-singer-drag-id',
      isEnabled: () => touchQueueCallbacks.current.enabled(),
      onStart: setSingerDraggedId, onTarget: setSingerDragOverId,
      onEnd: () => { setSingerDraggedId(null); setSingerDragOverId(null) },
      onDrop: (source, target) => touchQueueCallbacks.current.singerDrop(source, target),
    })
  }, [auth.canHost, hasSingerQueue])

  function handleSingerDragEnd() {
    setSingerDraggedId(null)
    setSingerDragOverId(null)
  }

  function handleSingerDragOver(e: DragEvent, singerId: string) {
    e.preventDefault()
    setSingerDragOverId(singerId)
  }

  async function handleSingerDrop(e: DragEvent, targetSingerId: string) {
    e.preventDefault()
    if (singerDraggedId) await reorderSingers(singerDraggedId, targetSingerId)
  }

  async function reorderSingers(sourceSingerId: string, targetSingerId: string) {
    setSingerDragOverId(null)
    if (sourceSingerId === targetSingerId || queueOrderSavingRef.current) {
      setSingerDraggedId(null)
      return
    }
    if (!auth.sessionToken || !auth.canHost || !queueState?.activeRotation) {
      setSingerDraggedId(null)
      return
    }
    const rotationId = queueState.activeRotation.id
    const singers = [...queueState.queueOrder].sort((a, b) => {
      const aIsSinging = getSingerDisplaySong(a)?.status === 'playing'
      const bIsSinging = getSingerDisplaySong(b)?.status === 'playing'
      if (aIsSinging && !bIsSinging) return -1
      if (!aIsSinging && bIsSinging) return 1
      return 0
    })
    const fromIdx = singers.findIndex(s => s.singerId === sourceSingerId)
    const toIdx = singers.findIndex(s => s.singerId === targetSingerId)
    if (fromIdx < 0 || toIdx < 0) {
      setSingerDraggedId(null)
      return
    }
    // Build new order
    const reordered = [...singers]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    queueOrderSavingRef.current = true
    setSavingQueueOrder(true)
    try {
      await api(`/api/rotations/${rotationId}/singers/reorder`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ orderedSingerIds: reordered.map(s => s.singerId) }),
      })
      await refreshQueueState()
    } catch (err) {
      console.error('Failed to reorder singers:', err)
      setBanner('Could not update singer order. Please try again.')
    } finally {
      queueOrderSavingRef.current = false
      setSavingQueueOrder(false)
      setSingerDraggedId(null)
    }
  }

  async function removeSingerFromRotation(singerId: string) {
    if (!auth.sessionToken || !auth.canHost) return
    if (!confirm('Remove this singer from the active rotation? Their history and profile will remain available in Singer History.')) return
    setBusy(true)
    try {
      const singer = queueState?.queueOrder.find((entry) => entry.singerId === singerId)
      await Promise.all(
        (singer?.queuedSongs ?? []).map((song) =>
          api(`/api/queue/${song.queueId}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'removed' }),
          }),
        ),
      )
      if (queueState?.activeRotation) {
        const rotationId = queueState.activeRotation.id
        await api(`/api/rotations/${rotationId}/singers/${singerId}`, { method: 'DELETE', headers })
          .catch((err: unknown) => console.error(`Failed to remove singer ${singerId} from rotation:`, err))
      }
      await refreshQueueState()
    } catch (err) {
      console.error('Failed to remove singer:', err)
    } finally {
      setBusy(false)
    }
  }

  return {
    singerDraggedId,
    singerDragOverId,
    setSingerDragOverId,
    savingQueueOrder,
    setSavingQueueOrder,
    queueOrderSavingRef,
    singerQueueTouchRef,
    handleSingerDragStart,
    handleSingerDragEnd,
    handleSingerDragOver,
    handleSingerDrop,
    reorderSingers,
    removeSingerFromRotation,
  }
}

export type SingerRotationState = ReturnType<typeof useSingerRotation>
