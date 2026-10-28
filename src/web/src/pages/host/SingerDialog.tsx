import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type ReactNode, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import MaterialIcon from '../../components/MaterialIcon'
import ProfileDialog from '../../components/ProfileDialog'
import ProfileImageEditor from '../../components/ProfileImageEditor'
import QueueDragHandle from '../../components/QueueDragHandle'
import ScrollingText from '../../components/ScrollingText'
import SingerAvatar, { type ProfileCrop } from '../../components/SingerAvatar'
import { attachTouchQueueReorder } from '../../touch-queue-reorder'
import { formatRequestedAt, formatTimeAgo } from './format'
import { renderDiscIdTag } from './renderDiscIdTag'
import type { QueueState, SingerHistory } from './types'

// One singer's queue and history: reorder, restore, remove, rename and set their picture.
export default function SingerDialog({
  headers,
  busy,
  setBusy,
  setBanner,
  queueState,
  selectedSingerId,
  selectedSingerHistory,
  setSelectedSingerHistory,
  singerModalLoading,
  refreshQueueState,
  savingQueueOrder,
  setSavingQueueOrder,
  queueOrderSavingRef,
  renderReplaceButton,
  onAddSong,
  onClose,
}: {
  headers: Record<string, string>
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  setBanner: Dispatch<SetStateAction<string>>
  queueState: QueueState | null
  selectedSingerId: string | null
  selectedSingerHistory: SingerHistory | null
  setSelectedSingerHistory: Dispatch<SetStateAction<SingerHistory | null>>
  singerModalLoading: boolean
  refreshQueueState: () => Promise<void>
  savingQueueOrder: boolean
  setSavingQueueOrder: Dispatch<SetStateAction<boolean>>
  queueOrderSavingRef: MutableRefObject<boolean>
  renderReplaceButton: (song: { queueId?: number; id?: number; title?: string | null; artist?: string | null }, label?: string) => ReactNode
  onAddSong: (singerId: string | null, displayName: string) => void
  onClose: () => void
}) {
  const auth = useAuth()
  const [singerImageEditorOpen, setSingerImageEditorOpen] = useState(false)
  const [renameSingerDialogOpen, setRenameSingerDialogOpen] = useState(false)
  const [editingSingerName, setEditingSingerName] = useState('')
  const [savingSingerName, setSavingSingerName] = useState(false)
  const [modalSongDraggedId, setModalSongDraggedId] = useState<number | null>(null)
  const [modalSongDragOverId, setModalSongDragOverId] = useState<number | null>(null)
  const songQueueTouchRef = useRef<HTMLTableSectionElement>(null)

  // Touch drag-to-reorder for this singer's queued songs (mouse dragging uses QueueDragHandle).
  const touchCallbacks = useRef<{ enabled: () => boolean; drop: (source: string, target: string) => void }>({
    enabled: () => false,
    drop: () => {},
  })
  touchCallbacks.current = {
    enabled: () => auth.canHost && !busy && !queueOrderSavingRef.current,
    drop: (source, target) => { void handleModalSongDrop(Number(target), Number(source)) },
  }
  const hasSongQueue = Boolean(selectedSingerHistory?.queuedSongs.length)
  useEffect(() => {
    if (!songQueueTouchRef.current) return
    return attachTouchQueueReorder(songQueueTouchRef.current, {
      attribute: 'data-song-drag-id',
      isEnabled: () => touchCallbacks.current.enabled(),
      onStart: id => setModalSongDraggedId(Number(id)),
      onTarget: id => setModalSongDragOverId(id === null ? null : Number(id)),
      onEnd: () => { setModalSongDraggedId(null); setModalSongDragOverId(null) },
      onDrop: (source, target) => touchCallbacks.current.drop(source, target),
    })
  }, [singerModalLoading, hasSongQueue])

  async function saveSingerProfileImage(crop: ProfileCrop, image?: Blob) {
    if (!selectedSingerId || !auth.sessionToken || !auth.canHost) throw new Error('Select a singer and sign in as host.')
    const singerId = selectedSingerId
    if (image) {
      const result = await api(`/api/singers/${selectedSingerId}/profile/image`, {
        method: 'POST',
        headers: { 'x-session-token': auth.sessionToken, 'Content-Type': image.type },
        body: image,
      })
      setSelectedSingerHistory((current) => current?.singer.id === singerId
        ? { ...current, singer: { ...current.singer, profile: result.profile } }
        : current)
    }
    const result = await api(`/api/singers/${singerId}/profile/focus`, {
      method: 'PATCH', headers, body: JSON.stringify({ crop, focusX: 50, focusY: 50 }),
    })
    setSelectedSingerHistory((current) => current?.singer.id === singerId
      ? { ...current, singer: { ...current.singer, profile: result.profile } } : current)
    await refreshQueueState()
  }

  async function removeSingerProfileImage() {
    if (!selectedSingerId || !auth.sessionToken || !auth.canHost) throw new Error('Select a singer and sign in as host.')
    const singerId = selectedSingerId
    const result = await api(`/api/singers/${singerId}/profile/image`, {
      method: 'DELETE', headers,
    })
    setSelectedSingerHistory((current) => current?.singer.id === singerId
      ? { ...current, singer: { ...current.singer, profile: result.profile } } : current)
    await refreshQueueState()
  }

  function openRenameSingerDialog() {
    if (!selectedSingerHistory) return
    setEditingSingerName(selectedSingerHistory.singer.displayName)
    setRenameSingerDialogOpen(true)
  }

  function closeRenameSingerDialog() {
    setRenameSingerDialogOpen(false)
    setEditingSingerName(selectedSingerHistory?.singer.displayName ?? '')
  }

  async function renameSingerFromModal() {
    if (!auth.sessionToken || !auth.canHost || !selectedSingerId) return
    const nextName = editingSingerName.trim()
    if (!nextName) {
      setBanner('⚠️ Singer name is required')
      setTimeout(() => setBanner(''), 4000)
      return
    }
    setSavingSingerName(true)
    try {
      await api(`/api/singers/${selectedSingerId}/rename`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ displayName: nextName }),
      })
      await refreshQueueState()
      const history = await api(`/api/singers/${selectedSingerId}/history`, { headers })
      setSelectedSingerHistory(history || null)
      setEditingSingerName(history?.singer?.displayName || nextName)
      setRenameSingerDialogOpen(false)
      setBanner(`✔ Singer renamed to ${nextName}`)
      setTimeout(() => setBanner(''), 4000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename singer'
      setBanner(`⚠️ ${message}`)
      setTimeout(() => setBanner(''), 5000)
    } finally {
      setSavingSingerName(false)
    }
  }

  async function handleModalSongDrop(targetQueueId: number, sourceQueueId = modalSongDraggedId) {
    setModalSongDragOverId(null)
    if (!sourceQueueId || sourceQueueId === targetQueueId || !selectedSingerId || queueOrderSavingRef.current) {
      setModalSongDraggedId(null)
      return
    }
    if (!auth.sessionToken || !auth.canHost || !selectedSingerHistory) {
      setModalSongDraggedId(null)
      return
    }
    const songs = selectedSingerHistory.queuedSongs.filter(s => s.status === 'queued')
    const fromIdx = songs.findIndex(s => s.queueId === sourceQueueId)
    const toIdx = songs.findIndex(s => s.queueId === targetQueueId)
    if (fromIdx < 0 || toIdx < 0) { setModalSongDraggedId(null); return }
    const reordered = [...songs]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    queueOrderSavingRef.current = true
    setSavingQueueOrder(true)
    try {
      await api(`/api/singers/${selectedSingerId}/song-order`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ queueIds: reordered.map(s => s.queueId) }),
      })
      await refreshQueueState()
      const history = await api(`/api/singers/${selectedSingerId}/history`, { headers })
      setSelectedSingerHistory(history || null)
    } catch (err) {
      console.error('Failed to reorder singer queue:', err)
      setBanner('Could not update song order. Please try again.')
    } finally {
      queueOrderSavingRef.current = false
      setSavingQueueOrder(false)
      setModalSongDraggedId(null)
    }
  }

  async function restoreSongToQueue(queueId: number) {
    if (!auth.sessionToken || !auth.canHost) return
    setBusy(true)
    try {
      await api(`/api/queue/${queueId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'queued' }),
      })
      await refreshQueueState()
      // Reload singer history if a modal is open
      if (selectedSingerId) {
        const history = await api(`/api/singers/${selectedSingerId}/history`, { headers })
        setSelectedSingerHistory(history || null)
      }
    } catch (err) {
      console.error('Failed to restore song to queue:', err)
    } finally {
      setBusy(false)
    }
  }

  async function removeSongFromQueue(queueId: number) {
    if (!auth.sessionToken || !auth.canHost) return
    setBusy(true)
    try {
      await api(`/api/queue/${queueId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'removed' }),
      })
      await refreshQueueState()
      // Reload singer history if a modal is open
      if (selectedSingerId) {
        const history = await api(`/api/singers/${selectedSingerId}/history`, { headers })
        setSelectedSingerHistory(history || null)
      }
    } catch (err) {
      console.error('Failed to remove song from queue:', err)
    } finally {
      setBusy(false)
    }
  }

  async function deleteSongFromHistory(queueId: number) {
    if (!auth.sessionToken || !auth.canHost) return
    if (!confirm('Remove this track from singer history?')) return
    setBusy(true)
    try {
      await api('/api/queue/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: queueId }),
      })
      await refreshQueueState()
      if (selectedSingerId) {
        const history = await api(`/api/singers/${selectedSingerId}/history`, { headers })
        setSelectedSingerHistory(history || null)
      }
    } catch (err) {
      console.error('Failed to delete history song:', err)
    } finally {
      setBusy(false)
    }
  }

  function canReplaceQueueSong(song: { status?: string | null }) {
    return song.status === 'queued' || song.status === 'playing'
  }

  return (
    <>
    <div className="modal-backdrop" onClick={onClose} />
    <div className="modal" style={{ maxWidth: 600 }}>
      <div className="modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <h3 style={{ margin: 0 }}>
            <MaterialIcon name="mic_external_on" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />
            {selectedSingerHistory?.singer.displayName ?? (queueState?.queueOrder.find(s => s.singerId === selectedSingerId)?.displayName ?? 'Singer')} — Queue &amp; History
          </h3>
          {selectedSingerHistory && (
            <button
              className="control-btn"
              type="button"
              title="Edit singer name"
              aria-label="Edit singer name"
              style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }}
              onClick={openRenameSingerDialog}
            >
              <MaterialIcon name="edit" />
            </button>
          )}
          {selectedSingerHistory && (
            <button
              className="control-btn"
              type="button"
              title="Add a song to this singer's queue"
              aria-label="Add song to queue"
              style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }}
              onClick={() => onAddSong(selectedSingerId, selectedSingerHistory.singer.displayName)}
            >
              <MaterialIcon name="add" />
            </button>
          )}
        </div>
        <button
          className="control-btn"
          style={{ width: 40, height: 40, padding: 0 }}
          onClick={onClose}
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      {singerModalLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-secondary)' }}>
          Loading…
        </div>
      ) : selectedSingerHistory ? (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {singerImageEditorOpen && (
            <ProfileDialog title={`Profile Picture: ${selectedSingerHistory.singer.displayName}`} onClose={() => setSingerImageEditorOpen(false)}>
              <ProfileImageEditor key={selectedSingerHistory.singer.id}
                name={selectedSingerHistory.singer.displayName} profile={selectedSingerHistory.singer.profile}
                onSave={saveSingerProfileImage} onRemove={removeSingerProfileImage}
                onCancel={() => setSingerImageEditorOpen(false)} />
            </ProfileDialog>
          )}
          <div style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            padding: 14,
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            background: 'var(--color-bg-secondary)',
            flexWrap: 'wrap',
          }}>
            <SingerAvatar name={selectedSingerHistory.singer.displayName} profile={selectedSingerHistory.singer.profile} size={80} />
            <button className="control-btn" type="button" disabled={busy} onClick={() => setSingerImageEditorOpen(true)}>
              Manage Profile Picture
            </button>
          </div>

          {/* Singer stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span className="stat-pill"><MaterialIcon name="music_note" style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 3 }} />{selectedSingerHistory.singer.totalSongsSung} songs sung</span>
            {selectedSingerHistory.singer.lastSangAt && (
              <span className="stat-pill"><MaterialIcon name="schedule" style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 3 }} />Last: {formatTimeAgo(selectedSingerHistory.singer.lastSangAt)}</span>
            )}
            <span className="stat-pill" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
              {selectedSingerHistory.singer.status}
            </span>
          </div>

          {/* Queued Songs */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>
              Queue ({selectedSingerHistory.queuedSongs.length})
              {selectedSingerHistory.queuedSongs.filter(s => s.status === 'queued').length > 1 && (
                <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 8, opacity: 0.7 }}>drag to reorder</span>
              )}
            </div>
            {selectedSingerHistory.queuedSongs.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 0', opacity: 0.7 }}>
                No songs queued
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody ref={songQueueTouchRef}>
                  {(() => {
                    const queuedOnly = selectedSingerHistory.queuedSongs.filter(s => s.status === 'queued')
                    const queuedIdxMap = new Map(queuedOnly.map((s, idx) => [s.queueId, idx]))
                    return selectedSingerHistory.queuedSongs.map((song, i) => {
                    const isDraggable = song.status === 'queued'
                    const queuedIdx = queuedIdxMap.get(song.queueId) ?? -1
                    return (
                      <tr
                        key={song.queueId}
                        data-song-drag-id={isDraggable ? String(song.queueId) : undefined}
                        draggable={isDraggable && !savingQueueOrder}
                        onDragStart={() => isDraggable && setModalSongDraggedId(song.queueId)}
                        onDragEnd={() => setModalSongDraggedId(null)}
                        onDragOver={e => { if (isDraggable) { e.preventDefault(); setModalSongDragOverId(song.queueId) } }}
                        onDragLeave={() => setModalSongDragOverId(null)}
                        onDrop={() => handleModalSongDrop(song.queueId)}
                        style={{
                          background: modalSongDragOverId === song.queueId ? 'var(--color-accent-soft)' : 'var(--color-bg-secondary)',
                          opacity: modalSongDraggedId === song.queueId ? 0.4 : 1,
                          cursor: isDraggable ? 'grab' : 'default',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '8px 10px', width: 32, textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
                          <QueueDragHandle id={String(song.queueId)} attribute="data-song-drag-id"
                            label={`Reorder ${song.title || 'song'}`}
                            disabled={!isDraggable || busy || savingQueueOrder}
                            onStart={() => setModalSongDraggedId(song.queueId)}
                            onTarget={(id) => setModalSongDragOverId(id === null ? null : Number(id))}
                            onEnd={() => { setModalSongDraggedId(null); setModalSongDragOverId(null) }}
                            onDrop={(sourceId, targetId) => void handleModalSongDrop(Number(targetId), Number(sourceId))}
                            style={{
                            background: 'var(--color-accent)',
                            color: 'var(--color-on-accent)',
                            borderRadius: 6,
                            width: 22,
                            height: 22,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                          }}>{i + 1}</QueueDragHandle>
                        </td>
                        <td className="singer-song-cell" style={{ padding: '8px 6px', borderBottom: '1px solid var(--color-border)' }}>
                          <ScrollingText className="singer-song-title" label={song.title || 'Unknown'}>{song.title || 'Unknown'}</ScrollingText>
                          <div className="singer-song-meta">
                            <ScrollingText label={song.artist || 'Unknown'}>{song.artist || 'Unknown'}</ScrollingText>{renderDiscIdTag(song.discId)}
                          </div>
                          {song.requestedAt && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              Requested at: {formatRequestedAt(song.requestedAt)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border)' }}>
                          {song.keyAdjustment !== 0 && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }} title="Key adjustment">
                              <MaterialIcon name="music_note" style={{ fontSize: 12, verticalAlign: 'text-bottom', marginRight: 2 }} />{song.keyAdjustment > 0 ? '+' : ''}{song.keyAdjustment}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 100,
                            fontSize: 11,
                            background: song.status === 'playing' ? 'var(--color-success-soft)' : 'var(--color-accent-soft)',
                            color: song.status === 'playing' ? 'var(--color-success)' : 'var(--color-accent)',
                          }} title={song.status === 'playing' ? 'Playing' : 'Queued'}>
                            <MaterialIcon name={song.status === 'playing' ? 'play_arrow' : 'music_note'} style={{ fontSize: 14 }} />
                          </span>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center', width: 80, borderBottom: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            {canReplaceQueueSong(song) && renderReplaceButton(song)}
                          {song.status === 'queued' && (
                            <button
                              onClick={() => removeSongFromQueue(song.queueId)}
                              title="Remove song from queue"
                              style={{
                                background: 'var(--color-danger-soft)',
                                color: 'var(--color-danger)',
                                border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
                                borderRadius: 6,
                                cursor: 'pointer',
                                padding: '4px 8px',
                                fontSize: 13,
                                lineHeight: 1,
                              }}>
                              <MaterialIcon name="close" style={{ fontSize: 14 }} />
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                  })()}
                </tbody>
              </table>
            )}
          </div>

          {/* Sang History */}
          {selectedSingerHistory.completedSongs.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>
                Sang History ({selectedSingerHistory.completedSongs.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {selectedSingerHistory.completedSongs.map(song => (
                    <tr key={song.queueId} style={{
                      background: 'var(--color-bg-secondary)',
                    }}>
                      <td className="singer-song-cell" style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
                        <ScrollingText className="singer-song-title" label={song.title || 'Unknown'}>{song.title || 'Unknown'}</ScrollingText>
                        <div className="singer-song-meta">
                          <ScrollingText label={song.artist || 'Unknown'}>{song.artist || 'Unknown'}</ScrollingText>{renderDiscIdTag(song.discId)}
                        </div>
                        {song.requestedAt && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                            Requested at: {formatRequestedAt(song.requestedAt)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border)' }}>
                        {song.completedAt && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }} title={`Completed ${formatTimeAgo(song.completedAt)}`}>
                            <MaterialIcon name="schedule" style={{ fontSize: 12, verticalAlign: 'text-bottom', marginRight: 2 }} />{formatTimeAgo(song.completedAt)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', width: 36, borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 11,
                          background: 'var(--color-success-soft)',
                          color: 'var(--color-success)',
                        }} title="Completed"><MaterialIcon name="check_circle" style={{ fontSize: 14 }} /></span>
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', width: 80, borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="control-btn"
                          style={{ fontSize: 14, padding: '4px 8px', lineHeight: 1 }}
                          disabled={busy}
                          onClick={() => restoreSongToQueue(song.queueId)}
                          title="Return this song to the queue"
                        >
                          <MaterialIcon name="keyboard_return" />
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Skipped / Removed Songs */}
          {(selectedSingerHistory.skippedSongs.length > 0 || selectedSingerHistory.removedSongs.length > 0) && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>
                Skipped / Removed
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, opacity: 0.7 }}>
                <tbody>
                  {[...selectedSingerHistory.skippedSongs, ...selectedSingerHistory.removedSongs].map(song => (
                    <tr key={song.queueId} style={{
                      background: 'var(--color-bg-secondary)',
                    }}>
                      <td className="singer-song-cell" style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
                        <ScrollingText className="singer-song-title" label={song.title || 'Unknown'}>{song.title || 'Unknown'}</ScrollingText>
                        <div className="singer-song-meta">
                          <ScrollingText label={song.artist || 'Unknown'}>{song.artist || 'Unknown'}</ScrollingText>{renderDiscIdTag(song.discId)}
                        </div>
                        {song.requestedAt && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                            Requested at: {formatRequestedAt(song.requestedAt)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', width: 36, borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 100,
                          fontSize: 11,
                          background: 'var(--color-danger-soft)',
                          color: 'var(--color-danger)',
                        }} title={song.status === 'skipped' ? 'Skipped' : 'Removed'}>
                          <MaterialIcon name={song.status === 'skipped' ? 'skip_next' : 'close'} style={{ fontSize: 14 }} />
                        </span>
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', width: 80, borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="control-btn danger"
                          style={{ fontSize: 13, padding: '4px 8px', lineHeight: 1 }}
                          disabled={busy}
                          onClick={() => deleteSongFromHistory(song.queueId)}
                          title="Remove this track from singer history"
                        >
                          <MaterialIcon name="close" />
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedSingerHistory.completedSongs.length === 0 &&
           selectedSingerHistory.skippedSongs.length === 0 &&
           selectedSingerHistory.removedSongs.length === 0 && (
            <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '10px 0' }}>
              No sang history on record for this singer.
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px 0' }}>
          Could not load singer history.
        </div>
      )}
    </div>
    {renameSingerDialogOpen && selectedSingerHistory && (
      <>
        <div className="modal-backdrop" onClick={closeRenameSingerDialog} />
        <div className="modal" style={{ maxWidth: 460, zIndex: 1001 }}>
          <div className="modal-header">
            <h3 style={{ margin: 0 }}><MaterialIcon name="edit" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Edit Singer Name</h3>
            <button
              className="control-btn"
              style={{ width: 40, height: 40, padding: 0 }}
              onClick={closeRenameSingerDialog}
            >
              <MaterialIcon name="close" />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label" style={{ marginBottom: 6 }}>Singer Name</label>
              <input
                className="form-input"
                value={editingSingerName}
                onChange={e => setEditingSingerName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void renameSingerFromModal()
                  }
                }}
                placeholder="Enter singer name"
                autoFocus
                disabled={savingSingerName}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="control-btn"
                type="button"
                onClick={closeRenameSingerDialog}
                disabled={savingSingerName}
              >
                Cancel
              </button>
              <button
                className="control-btn primary"
                type="button"
                onClick={() => void renameSingerFromModal()}
                disabled={savingSingerName || editingSingerName.trim() === selectedSingerHistory.singer.displayName}
              >
                {savingSingerName ? 'Saving…' : 'Update Name'}
              </button>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  )
}
