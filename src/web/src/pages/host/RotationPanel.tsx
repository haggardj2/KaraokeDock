import MaterialIcon from '../../components/MaterialIcon'
import QueueDragHandle from '../../components/QueueDragHandle'
import ScrollingText from '../../components/ScrollingText'
import SingerAvatar from '../../components/SingerAvatar'
import { getSingerDisplaySong } from '../../playerPlayback'
import { formatTimeAgo } from './format'
import { renderDiscIdTag } from './renderDiscIdTag'
import type { QueueSong, QueueState, Row } from './types'
import type { SingerRotationState } from './useSingerRotation'

// The Rotation card: each singer with their next (or current) song, stats and actions,
// reorderable by dragging the avatar. Falls back to a flat list when rotation data is missing.
export default function RotationPanel({
  queueState,
  queue,
  busy,
  rotation,
  openSingerModal,
}: {
  queueState: QueueState | null
  queue: Row[]
  busy: boolean
  rotation: SingerRotationState
  openSingerModal: (singerId: string) => void
}) {
  const {
    singerDraggedId,
    singerDragOverId,
    setSingerDragOverId,
    savingQueueOrder,
    singerQueueTouchRef,
    handleSingerDragStart,
    handleSingerDragEnd,
    handleSingerDragOver,
    handleSingerDrop,
    reorderSingers,
    removeSingerFromRotation,
  } = rotation

  return (
    <section className="host-panel singer-queue-card" aria-labelledby="host-rotation-title">
      <div className="singer-queue-header">
        <h2 id="host-rotation-title">Rotation</h2>
        {Boolean(queueState?.queueOrder.length) && (
          <span className="host-muted host-small">Drag an avatar or hold a singer to reorder.</span>
        )}
      </div>

      {(!queueState || queueState.queueOrder.length === 0) ? (
        <div className="host-empty-state">
          <MaterialIcon name="music_note" />
          <div>No singers in queue</div>
          <div className="host-small">Songs added from the Requests page will appear here automatically</div>
        </div>
      ) : (
        <div ref={singerQueueTouchRef} className="singer-queue-list">
          {(() => {
            // Single-pass: tag each singer with isSinging, then sort current singer first
            type TaggedSinger = typeof queueState.queueOrder[number] & { isSinging: boolean; displaySong: QueueSong | null }
            const tagged: TaggedSinger[] = queueState.queueOrder.map(s => {
              const displaySong = getSingerDisplaySong(s)
              return { ...s, displaySong, isSinging: displaySong?.status === 'playing' }
            })
            const sorted = [...tagged].sort((a, b) => {
              if (a.isSinging && !b.isSinging) return -1
              if (!a.isSinging && b.isSinging) return 1
              return 0
            })
            return sorted.map((singer, idx) => {
              const { isSinging, displaySong } = singer
              const entryClass = [
                'singer-queue-entry',
                isSinging && 'is-singing',
                singerDragOverId === singer.singerId && 'is-drag-over',
                singerDraggedId === singer.singerId && 'is-dragging',
              ].filter(Boolean).join(' ')
              return (
            <div
              key={singer.singerId}
              className={entryClass}
              data-singer-drag-id={singer.singerId}
              draggable={!savingQueueOrder}
              onDragStart={() => handleSingerDragStart(singer.singerId)}
              onDragEnd={handleSingerDragEnd}
              onDragOver={e => handleSingerDragOver(e, singer.singerId)}
              onDragLeave={() => setSingerDragOverId(null)}
              onDrop={e => handleSingerDrop(e, singer.singerId)}
            >
              <div className="singer-queue-row">
                {/* Avatar doubles as the drag handle */}
                <QueueDragHandle id={singer.singerId} attribute="data-singer-drag-id"
                  label={`Reorder ${singer.displayName}, position ${idx + 1}`}
                  disabled={busy || savingQueueOrder || !queueState.activeRotation}
                  onStart={() => handleSingerDragStart(singer.singerId)}
                  onTarget={setSingerDragOverId} onEnd={handleSingerDragEnd}
                  onDrop={(sourceId, targetId) => void reorderSingers(sourceId, targetId)}>
                  <SingerAvatar name={singer.displayName} profile={singer.profile} size="var(--singer-avatar-size)" />
                  {isSinging && (
                    <span className="singer-queue-mic" aria-hidden="true">
                      <MaterialIcon name="mic_external_on" />
                    </span>
                  )}
                </QueueDragHandle>

                {/* Singer info */}
                <div className="singer-queue-info">
                  <div className="singer-queue-name">
                    <ScrollingText className="singer-queue-name-text" label={singer.displayName}>{singer.displayName}</ScrollingText>
                    {isSinging && <span className="singer-queue-badge">Now Singing</span>}
                  </div>
                  <div className="singer-queue-song">
                    {displaySong
                      ? <ScrollingText label={`${isSinging ? 'Singing' : 'Next'}: ${displaySong.title || 'Unknown'} — ${displaySong.artist || 'Unknown'}${displaySong.discId ? ` (${displaySong.discId})` : ''}`}>
                          <strong className="singer-queue-song-prefix">{isSinging ? 'Singing:' : 'Next:'} </strong>
                          {displaySong.title || 'Unknown'} — {displaySong.artist || 'Unknown'}{renderDiscIdTag(displaySong.discId)}
                        </ScrollingText>
                      : <span style={{ opacity: 0.6 }}>No queued song</span>
                    }
                  </div>
                  <div className="singer-queue-stats">
                    <span title="Queued songs" aria-label={`${singer.queuedSongsCount} queued songs`}><MaterialIcon name="music_note" />{singer.queuedSongsCount}</span>
                    <span title="Songs sung" aria-label={`${singer.totalSongsSung} songs sung`}><MaterialIcon name="check_circle" />{singer.totalSongsSung}</span>
                    {singer.lastSangAt && <span className="singer-queue-last-sang" title="Last sang"><MaterialIcon name="schedule" />{formatTimeAgo(singer.lastSangAt)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="singer-queue-actions">
                  <button
                    className="control-btn ghost"
                    title="View singer queue and history"
                    aria-label={`View ${singer.displayName}'s queue and history`}
                    onClick={() => openSingerModal(singer.singerId)}
                  >
                    <MaterialIcon name="visibility" />
                  </button>
                  <button
                    className="control-btn ghost danger-text"
                    title="Remove singer from rotation"
                    aria-label={`Remove ${singer.displayName} from rotation`}
                    disabled={busy}
                    onClick={() => removeSingerFromRotation(singer.singerId)}
                  >
                    <MaterialIcon name="close" />
                  </button>
                </div>
              </div>
            </div>
              )
            })
          })()}
        </div>
      )}

      {/* Flat queue fallback — shown when queueState is not available */}
      {!queueState && queue.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="host-muted host-small" style={{ marginBottom: 8 }}>
            (Flat queue — singer grouping unavailable)
          </div>
          {queue.map(item => (
            <div
              key={item.id}
              className={`queue-item ${item.status === 'playing' ? 'playing' : ''}`}
            >
              <span style={{ fontWeight: 600 }}>{item.requested_by}</span>
              {' — '}
              {item.title}{renderDiscIdTag(item.disc_id)} by {item.artist}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
