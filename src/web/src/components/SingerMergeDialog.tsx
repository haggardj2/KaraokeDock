import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api'
import { describeSingerLogin, parseSingerMergeCandidates, type SingerMergeCandidates } from '../singer-merge'
import ProfileDialog from './ProfileDialog'
import './SingerMergeDialog.css'

export default function SingerMergeDialog({ targetId, targetName, sessionToken, onClose, onMerged }: {
  targetId: string
  targetName: string
  sessionToken: string
  onClose: () => void
  onMerged: (sourceName: string) => void
}) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SingerMergeCandidates>({ singers: [], hasMore: false })
  const [selectedId, setSelectedId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [mergeError, setMergeError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [merging, setMerging] = useState(false)
  const headers = useMemo(() => ({ 'x-session-token': sessionToken }), [sessionToken])
  const selected = results.singers.find((singer) => singer.singerId === selectedId)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    setResults({ singers: [], hasMore: false })
    setSelectedId('')
    setConfirmed(false)
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query.trim() })
      api(`/api/singers/${encodeURIComponent(targetId)}/merge-candidates?${params}`, { headers, signal: controller.signal })
        .then((response: unknown) => {
          if (!controller.signal.aborted) setResults(parseSingerMergeCandidates(response))
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setLoadError(error instanceof Error ? error.message : 'Could not load singers.')
          }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query, targetId, headers, attempt])

  async function merge(event: FormEvent) {
    event.preventDefault()
    if (merging) return
    if (!selected || !confirmed) {
      setMergeError('Select a singer and confirm that both profiles belong to the same person.')
      return
    }
    setMerging(true)
    setMergeError('')
    try {
      await api(`/api/singers/${encodeURIComponent(targetId)}/merge`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: selected.singerId }),
      })
      onMerged(selected.displayName)
    } catch (error) {
      setMergeError(error instanceof Error ? error.message : 'Could not merge singers.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <ProfileDialog title="Merge Singer and Logins" className="singer-merge-dialog"
      onClose={merging ? undefined : onClose}>
      <form className="singer-merge-form" onSubmit={(event) => void merge(event)}>
        <p>Keep <strong>{targetName}</strong> and merge another singer's queue, history, and linked sign-ins into this profile.</p>
        <p className="singer-merge-help">The source singer is removed. The kept singer's name and existing picture remain.
          Login accounts retain their own permissions; social sign-in does not gain host or admin access.
          A guest profile becomes account-protected when linked to a login.</p>
        <label htmlFor={searchId}>Find a singer to merge</label>
        <input id={searchId} type="search" placeholder="Search any stored singer or login username"
          value={query} autoFocus disabled={merging} autoComplete="off"
          onChange={(event) => { setQuery(event.target.value); setMergeError('') }} />
        <p className="singer-merge-help">Search includes archived singers and profiles with no queued songs.</p>
        {loading ? <p role="status">Loading singers...</p> : loadError ? (
          <div role="alert">
            <p className="profile-error">{loadError}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
          </div>
        ) : (
          <>
            <fieldset className="singer-merge-options" disabled={merging}>
              <legend>Source singer</legend>
              {results.singers.filter((singer) => singer.singerId !== targetId).map((singer) => (
                <label key={singer.singerId} className={`singer-merge-option${selectedId === singer.singerId ? ' selected' : ''}`}>
                  <input type="radio" name="merge-source" value={singer.singerId}
                    checked={selectedId === singer.singerId}
                    onChange={() => { setSelectedId(singer.singerId); setConfirmed(false); setMergeError('') }} />
                  <span>
                    <strong>{singer.displayName}</strong>
                    <span className="singer-merge-detail">{singer.status} / {singer.historyCount} saved request{singer.historyCount === 1 ? '' : 's'}</span>
                    {singer.accountLogins.length
                      ? singer.accountLogins.map((login) => <span className="singer-merge-detail" key={login.userId}>{describeSingerLogin(login)}</span>)
                      : <span className="singer-merge-detail">Guest profile (no login account)</span>}
                  </span>
                </label>
              ))}
              {results.singers.length === 0 && <p>No other singers match. Try another name or username.</p>}
            </fieldset>
            {results.hasMore && <p className="singer-merge-help">Showing the first 50 matches. Refine your search to find another singer.</p>}
          </>
        )}
        {selected && (
          <label className="singer-merge-confirm">
            <input type="checkbox" checked={confirmed} disabled={merging}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I have confirmed that <strong>{selected.displayName}</strong> and <strong>{targetName}</strong> belong
              to the same person. All linked sign-ins will access the combined singer data. This merge cannot be undone automatically.</span>
          </label>
        )}
        {mergeError && <p className="profile-error" role="alert">{mergeError}</p>}
        <div className="singer-merge-actions">
          <button type="button" onClick={onClose} disabled={merging}>Cancel</button>
          <button type="submit" disabled={merging || loading || !selected || !confirmed}>
            {merging ? 'Merging...' : 'Merge singer and logins'}
          </button>
        </div>
      </form>
    </ProfileDialog>
  )
}
