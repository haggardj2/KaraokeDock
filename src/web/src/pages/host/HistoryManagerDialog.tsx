import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import MaterialIcon from '../../components/MaterialIcon'
import SingerAvatar from '../../components/SingerAvatar'
import { downloadJsonFile, readJsonFile, safeHistoryFilename } from '../../utils/jsonFiles'
import { formatTimeAgo } from './format'
import { getKdSingerAvatarUrl, getKdSingerDisplayName } from './singerHistoryFile'
import type { ArchivedSinger, QueueState, SingerHistory, SingerHistoryKdFile } from './types'

// Export, import and restore singer history (KaraokeDock .kd files).
export default function HistoryManagerDialog({
  headers,
  busy,
  setBusy,
  setBanner,
  queueState,
  selectedSingerId,
  setSelectedSingerHistory,
  refreshQueueState,
  openSingerModal,
  onClose,
}: {
  headers: Record<string, string>
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  setBanner: Dispatch<SetStateAction<string>>
  queueState: QueueState | null
  selectedSingerId: string | null
  setSelectedSingerHistory: Dispatch<SetStateAction<SingerHistory | null>>
  refreshQueueState: () => Promise<void>
  openSingerModal: (singerId: string) => void | Promise<void>
  onClose: () => void
}) {
  const auth = useAuth()
  const [historyManagerMode, setHistoryManagerMode] = useState<'menu' | 'export' | 'import' | 'archived'>('menu')
  // Every singer currently in the queue starts out selected for export.
  const [historyExportSelectedSingerIds, setHistoryExportSelectedSingerIds] = useState<Set<string>>(
    () => new Set((queueState?.queueOrder ?? []).map((singer) => singer.singerId)),
  )
  const [pendingHistoryImportData, setPendingHistoryImportData] = useState<SingerHistoryKdFile | null>(null)
  const [historyImportSelectedIndexes, setHistoryImportSelectedIndexes] = useState<Set<number>>(new Set())
  const [archivedSingers, setArchivedSingers] = useState<ArchivedSinger[]>([])
  const [archivedSingersLoading, setArchivedSingersLoading] = useState(false)
  const hostHistoryImportInputRef = useRef<HTMLInputElement | null>(null)

  // Closing unmounts the dialog, which also clears its selections and pending import.
  function closeHistoryManager() {
    onClose()
  }

  async function loadArchivedSingers() {
    if (!auth.sessionToken || !auth.canHost) return
    setHistoryManagerMode('archived')
    setArchivedSingersLoading(true)
    try {
      const singers = await api('/api/singers/archived', { headers })
      setArchivedSingers(Array.isArray(singers) ? singers : [])
    } catch (err) {
      console.error('Failed to load stored singers:', err)
      setBanner('⚠️ Could not load stored singers')
      setTimeout(() => setBanner(''), 5000)
    } finally {
      setArchivedSingersLoading(false)
    }
  }

  async function restoreArchivedSinger(singerId: string) {
    if (!auth.sessionToken || !auth.canHost) return
    setBusy(true)
    try {
      await api(`/api/singers/${singerId}/restore`, { method: 'POST', headers })
      await Promise.all([refreshQueueState(), loadArchivedSingers()])
      setBanner('✔ Singer restored to the rotation')
      setTimeout(() => setBanner(''), 4000)
    } catch (err) {
      console.error('Failed to restore singer:', err)
      setBanner('⚠️ Could not restore singer')
      setTimeout(() => setBanner(''), 5000)
    } finally {
      setBusy(false)
    }
  }

  async function deleteStoredSinger(singer: ArchivedSinger) {
    if (!auth.sessionToken || !auth.canHost) return
    if (!confirm(`Permanently delete ${singer.displayName}, including all history and their profile image? This cannot be undone.`)) return
    setBusy(true)
    try {
      await api(`/api/singers/${singer.singerId}`, { method: 'DELETE', headers })
      await loadArchivedSingers()
      setBanner(`✔ ${singer.displayName} was permanently deleted`)
      setTimeout(() => setBanner(''), 4000)
    } catch (err) {
      console.error('Failed to delete singer:', err)
      setBanner('⚠️ Could not delete singer')
      setTimeout(() => setBanner(''), 5000)
    } finally {
      setBusy(false)
    }
  }

  async function exportAllSingerHistory() {
    if (!auth.sessionToken || !auth.canHost) return
    try {
      const data = await api('/api/history/export-all', { headers })
      downloadJsonFile(`karaokedock-singer-history-${new Date().toISOString().slice(0, 10)}.kd`, data)
      setBanner('✔ All singer history exported')
      setTimeout(() => setBanner(''), 4000)
      closeHistoryManager()
    } catch (err) {
      console.error('Failed to export all singer history:', err)
      setBanner('⚠️ Could not export singer history')
      setTimeout(() => setBanner(''), 5000)
    }
  }

  async function exportSelectedSingerHistory() {
    if (!auth.sessionToken || !auth.canHost) return
    const singerIds = Array.from(historyExportSelectedSingerIds)
    if (singerIds.length === 0) {
      setBanner('⚠️ Select at least one singer to export')
      setTimeout(() => setBanner(''), 4000)
      return
    }
    try {
      const data = await api('/api/history/export', {
        method: 'POST',
        headers,
        body: JSON.stringify({ singerIds }),
      })
      const filename = singerIds.length === 1
        ? safeHistoryFilename((queueState?.queueOrder ?? []).find((singer) => singer.singerId === singerIds[0])?.displayName || 'singer-history')
        : `karaokedock-selected-singer-history-${new Date().toISOString().slice(0, 10)}.kd`
      downloadJsonFile(filename, data)
      setBanner(`✔ Exported ${singerIds.length} singer${singerIds.length === 1 ? '' : 's'}`)
      setTimeout(() => setBanner(''), 4000)
      closeHistoryManager()
    } catch (err) {
      console.error('Failed to export singer history:', err)
      setBanner('⚠️ Could not export singer history')
      setTimeout(() => setBanner(''), 5000)
    }
  }

  async function loadHistoryImportFile(file: File | null | undefined) {
    if (!file) return
    try {
      const data = await readJsonFile(file) as SingerHistoryKdFile
      const singers = Array.isArray(data?.singers) ? data.singers : []
      setPendingHistoryImportData(data)
      setHistoryImportSelectedIndexes(new Set(singers.map((_: unknown, index: number) => index)))
    } catch (err) {
      console.error('Failed to read singer history file:', err)
      setBanner('⚠️ Could not read .kd file')
      setTimeout(() => setBanner(''), 5000)
      if (hostHistoryImportInputRef.current) hostHistoryImportInputRef.current.value = ''
    }
  }

  async function importPendingHostSingerHistory(importAll: boolean) {
    if (!auth.sessionToken || !auth.canHost || !pendingHistoryImportData) return
    const sourceSingers = Array.isArray(pendingHistoryImportData.singers) ? pendingHistoryImportData.singers : []
    const selectedSingers = sourceSingers.filter((_: unknown, index: number) => historyImportSelectedIndexes.has(index))
    const data = importAll
      ? pendingHistoryImportData
      : { ...pendingHistoryImportData, singers: selectedSingers }
    if (!importAll && selectedSingers.length === 0) {
      setBanner('⚠️ Select at least one singer to import')
      setTimeout(() => setBanner(''), 4000)
      return
    }
    try {
      let imported = 0
      let skipped = 0
      for (const singer of data.singers ?? []) {
        const result = await api('/api/history/import', {
          method: 'POST',
          headers,
          body: JSON.stringify({ data: { ...data, singers: [singer] } }),
        })
        imported += Number(result.imported ?? 0)
        skipped += Number(result.skipped ?? 0)
      }
      await refreshQueueState()
      if (selectedSingerId) {
        const history = await api(`/api/singers/${selectedSingerId}/history`, { headers })
        setSelectedSingerHistory(history || null)
      }
      setBanner(`✔ Imported ${imported} history song${imported === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}`)
      setTimeout(() => setBanner(''), 4000)
      closeHistoryManager()
    } catch (err) {
      console.error('Failed to import singer history:', err)
      setBanner('⚠️ Could not import singer history')
      setTimeout(() => setBanner(''), 5000)
    } finally {
      if (hostHistoryImportInputRef.current) hostHistoryImportInputRef.current.value = ''
    }
  }

  return (
    <>
    <div className="modal-backdrop" onClick={closeHistoryManager} />
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="history-manager-title" style={{ maxWidth: 560 }}>
      <div className="modal-header">
        <h3 id="history-manager-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-rounded" aria-hidden="true">manage_history</span>
          Singer History
        </h3>
        <button
          className="control-btn"
          style={{ width: 40, height: 40, padding: 0 }}
          onClick={closeHistoryManager}
          aria-label="Close singer history manager"
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      {historyManagerMode === 'menu' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <button
            className="control-btn primary"
            type="button"
            disabled={busy}
            onClick={() => setHistoryManagerMode('export')}
            style={{ justifyContent: 'center', padding: '14px 18px' }}
          >
            Export Singer History
          </button>
          <button
            className="control-btn"
            type="button"
            disabled={busy}
            onClick={() => setHistoryManagerMode('import')}
            style={{ justifyContent: 'center', padding: '14px 18px' }}
          >
            Import Singer History
          </button>
          <button
            className="control-btn"
            type="button"
            disabled={busy}
            onClick={() => void loadArchivedSingers()}
            style={{ justifyContent: 'center', padding: '14px 18px' }}
          >
            Find Stored Singers
          </button>
        </div>
      )}

      {historyManagerMode === 'export' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Choose active singers to export, or export all singer history.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="control-btn primary"
              type="button"
              disabled={busy}
              onClick={() => void exportAllSingerHistory()}
            >
              Export All Singers
            </button>
            <button
              className="control-btn"
              type="button"
              disabled={busy || historyExportSelectedSingerIds.size === 0}
              onClick={() => void exportSelectedSingerHistory()}
            >
              Export Selected
            </button>
            <button
              className="control-btn"
              type="button"
              disabled={busy}
              onClick={() => setHistoryExportSelectedSingerIds(new Set((queueState?.queueOrder ?? []).map((singer) => singer.singerId)))}
            >
              Select All Active
            </button>
          </div>

          {(queueState?.queueOrder.length ?? 0) === 0 ? (
            <div style={{ color: 'var(--color-text-secondary)', padding: 16, textAlign: 'center' }}>
              No active singers to choose from. Use Export All Singers to export stored history.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {(queueState?.queueOrder ?? []).map((singer) => (
                <label
                  key={singer.singerId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={historyExportSelectedSingerIds.has(singer.singerId)}
                    onChange={(event) => {
                      setHistoryExportSelectedSingerIds((prev) => {
                        const next = new Set(prev)
                        if (event.currentTarget.checked) next.add(singer.singerId)
                        else next.delete(singer.singerId)
                        return next
                      })
                    }}
                  />
                  <SingerAvatar name={singer.displayName} profile={singer.profile} size={32} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{singer.displayName}</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                    {singer.totalSongsSung} sang
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {historyManagerMode === 'import' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <input
            ref={hostHistoryImportInputRef}
            type="file"
            accept=".kd,application/json"
            style={{ display: 'none' }}
            onChange={(event) => void loadHistoryImportFile(event.currentTarget.files?.[0])}
          />
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Upload a KaraokeDock history file, then choose whether to import every singer or selected singers.
          </div>
          <button
            className="control-btn primary"
            type="button"
            disabled={busy}
            onClick={() => hostHistoryImportInputRef.current?.click()}
            style={{ justifyContent: 'center', padding: '12px 16px' }}
          >
            Upload .kd File
          </button>

          {pendingHistoryImportData && (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Import all singers from this file?</strong>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  Found {(pendingHistoryImportData.singers ?? []).length} singer{(pendingHistoryImportData.singers ?? []).length === 1 ? '' : 's'}.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="control-btn primary"
                    type="button"
                    disabled={busy || (pendingHistoryImportData.singers ?? []).length === 0}
                    onClick={() => void importPendingHostSingerHistory(true)}
                  >
                    Yes, Import All
                  </button>
                  <button
                    className="control-btn"
                    type="button"
                    disabled={busy || historyImportSelectedIndexes.size === 0}
                    onClick={() => void importPendingHostSingerHistory(false)}
                  >
                    Import Selected
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {(pendingHistoryImportData.singers ?? []).map((singer, index) => (
                  <label
                    key={`${getKdSingerDisplayName(singer, index)}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={historyImportSelectedIndexes.has(index)}
                      onChange={(event) => {
                        setHistoryImportSelectedIndexes((prev) => {
                          const next = new Set(prev)
                          if (event.currentTarget.checked) next.add(index)
                          else next.delete(index)
                          return next
                        })
                      }}
                    />
                    <SingerAvatar name={getKdSingerDisplayName(singer, index)} size={32} profile={{
                      imageUrl: getKdSingerAvatarUrl(singer),
                      focusX: singer.singer?.profile?.focusX ?? 50,
                      focusY: singer.singer?.profile?.focusY ?? 50,
                      crop: singer.singer?.profile?.crop,
                    }} />
                    <span style={{ flex: 1, fontWeight: 600 }}>{getKdSingerDisplayName(singer, index)}</span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {singer.songs?.length ?? 0} songs
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {historyManagerMode === 'archived' && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="control-btn" type="button" onClick={() => setHistoryManagerMode('menu')}>
                  <MaterialIcon name="arrow_back" /> Back
                </button>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  Singers removed from the active rotation keep their history and profile here.
                </div>
              </div>
              {archivedSingersLoading ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)' }}>Loading…</div>
              ) : archivedSingers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)' }}>
                  No stored singers outside the active rotation.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                  {archivedSingers.map((singer) => (
                    <div
                      key={singer.singerId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-secondary)',
                      }}
                    >
                      <SingerAvatar name={singer.displayName} profile={singer.profile} />
                      <button
                        type="button"
                        onClick={() => {
                          closeHistoryManager()
                          void openSingerModal(singer.singerId)
                        }}
                        style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                      >
                        <div style={{ fontWeight: 700 }}>{singer.displayName}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                          {singer.historyCount} history item{singer.historyCount === 1 ? '' : 's'}
                          {singer.lastSangAt ? ` • ${formatTimeAgo(singer.lastSangAt)}` : ''}
                        </div>
                      </button>
                      <button
                        className="control-btn"
                        type="button"
                        disabled={busy}
                        title="Restore singer to rotation"
                        onClick={() => void restoreArchivedSinger(singer.singerId)}
                      >
                        <MaterialIcon name="restore" />
                      </button>
                      <button
                        className="control-btn danger"
                        type="button"
                        disabled={busy}
                        title="Permanently delete singer"
                        onClick={() => void deleteStoredSinger(singer)}
                      >
                        <MaterialIcon name="delete_forever" />
                      </button>
                    </div>
                  ))}
                </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
