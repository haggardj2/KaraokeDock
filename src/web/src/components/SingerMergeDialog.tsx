import { useEffect, useId, useState, type FormEvent } from 'react'
import { api } from '../api'
import { describeSingerLogin, parseSingerMergeCandidates, type SingerMergeCandidate, type SingerMergeCandidates } from '../singer-merge'
import ProfileDialog from './ProfileDialog'
import './SingerMergeDialog.css'

const EMPTY: SingerMergeCandidates = { singers: [], hasMore: false }

/** Debounced singer search against one of the guest-merge endpoints; `path` null pauses it. */
function useSingerSearch(path: string | null, query: string, headers: Record<string, string>) {
  const [results, setResults] = useState<SingerMergeCandidates>(EMPTY)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setResults(EMPTY)
    setError('')
    if (!path) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      api(`${path}?${new URLSearchParams({ q: query.trim() })}`, { headers, signal: controller.signal })
        .then((response: unknown) => {
          if (!controller.signal.aborted) setResults(parseSingerMergeCandidates(response))
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load singers.')
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [path, query, headers, attempt])

  return { results, loading, error, retry: () => setAttempt((value) => value + 1) }
}

function SingerOption({ singer, name, checked, onSelect }: {
  singer: SingerMergeCandidate
  name: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className={`singer-merge-option${checked ? ' selected' : ''}`}>
      <input type="radio" name={name} value={singer.singerId} checked={checked} onChange={onSelect} />
      <span>
        <strong>{singer.displayName}</strong>
        <span className="singer-merge-detail">{singer.status} / {singer.historyCount} saved request{singer.historyCount === 1 ? '' : 's'}</span>
        {singer.accountLogins.length
          ? singer.accountLogins.map((login) => <span className="singer-merge-detail" key={login.userId}>{describeSingerLogin(login)}</span>)
          : <span className="singer-merge-detail">Guest profile (no login)</span>}
      </span>
    </label>
  )
}

/**
 * Host: merges a guest profile (someone who joined by name) into a singer that has a
 * login, e.g. after that person signed in with Google or Facebook. The login's singer is kept.
 * Opened from a singer, that singer is preselected on whichever side it belongs.
 */
export default function SingerMergeDialog({ singer, headers, onClose, onMerged }: {
  singer: { singerId: string; displayName: string }
  headers: Record<string, string>
  onClose: () => void
  onMerged: (sourceName: string, targetName: string) => void
}) {
  const targetSearchId = useId()
  const sourceSearchId = useId()
  const [targetQuery, setTargetQuery] = useState(singer.displayName)
  const [sourceQuery, setSourceQuery] = useState('')
  // 'target' until the opened singer is found among signed-in singers; 'source' if it is a guest.
  const [preselect, setPreselect] = useState<'target' | 'source' | null>('target')
  const [target, setTarget] = useState<SingerMergeCandidate | null>(null)
  const [sourceId, setSourceId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState('')

  const targets = useSingerSearch(target ? null : '/api/singers/guest-merge/targets', targetQuery, headers)
  const sources = useSingerSearch(
    target ? `/api/singers/${encodeURIComponent(target.singerId)}/guest-merge-sources` : null, sourceQuery, headers,
  )
  const source = sources.results.singers.find((singer) => singer.singerId === sourceId)

  useEffect(() => {
    setSourceId('')
    setConfirmed(false)
  }, [target, sourceQuery])

  useEffect(() => {
    if (preselect !== 'target' || targets.loading || targets.error) return
    const match = targets.results.singers.find((candidate) => candidate.singerId === singer.singerId)
    if (match) {
      setTarget(match)
      setPreselect(null)
    } else {
      // A guest: find the signed-in singer first, then it is picked as the guest to merge in.
      setTargetQuery('')
      setPreselect('source')
    }
  }, [preselect, targets.loading, targets.error, targets.results, singer.singerId])

  useEffect(() => {
    if (preselect !== 'source' || !target || sources.loading) return
    if (sources.results.singers.some((candidate) => candidate.singerId === singer.singerId)) {
      setSourceId(singer.singerId)
      setPreselect(null)
    }
  }, [preselect, target, sources.loading, sources.results, singer.singerId])

  function chooseTarget(next: SingerMergeCandidate) {
    setTarget(next)
    setMergeError('')
    if (preselect === 'source') setSourceQuery(singer.displayName)
  }

  async function merge(event: FormEvent) {
    event.preventDefault()
    if (merging) return
    if (!target || !source || !confirmed) {
      setMergeError('Select both singers and confirm that they are the same person.')
      return
    }
    setMerging(true)
    setMergeError('')
    try {
      await api(`/api/singers/${encodeURIComponent(target.singerId)}/guest-merge`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.singerId }),
      })
      onMerged(source.displayName, target.displayName)
    } catch (error) {
      setMergeError(error instanceof Error ? error.message : 'Could not merge singers.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <ProfileDialog title="Merge Guest Singer into Login" className="singer-merge-dialog"
      onClose={merging ? undefined : onClose}>
      <form className="singer-merge-form" onSubmit={(event) => void merge(event)}>
        <p>Use this when someone first joined by name and later signed in (Google, Facebook, SSO or password).
          Their guest queue and history move to the signed-in singer.</p>
        <p className="singer-merge-help">The signed-in singer's name and picture are kept and the guest profile is removed.
          Logins and their permissions do not change.</p>

        {!target ? (
          <>
            {preselect === 'source' && (
              <p className="singer-merge-help"><strong>{singer.displayName}</strong> is a guest profile.
                Pick the signed-in singer it belongs to.</p>
            )}
            <label htmlFor={targetSearchId}>1. Find the signed-in singer to keep</label>
            <input id={targetSearchId} type="search" placeholder="Search singer name or login username"
              value={targetQuery} autoFocus autoComplete="off" maxLength={200}
              onChange={(event) => setTargetQuery(event.target.value)} />
            {targets.loading ? <p role="status">Loading singers...</p> : targets.error ? (
              <div role="alert">
                <p className="profile-error">{targets.error}</p>
                <button type="button" onClick={targets.retry}>Retry</button>
              </div>
            ) : (
              <fieldset className="singer-merge-options">
                <legend>Signed-in singer</legend>
                {targets.results.singers.map((singer) => (
                  <SingerOption key={singer.singerId} singer={singer} name="merge-target" checked={false}
                    onSelect={() => chooseTarget(singer)} />
                ))}
                {targets.results.singers.length === 0 && <p>No signed-in singers match. They need to sign in once first.</p>}
              </fieldset>
            )}
            {targets.results.hasMore && <p className="singer-merge-help">Showing the first 50 matches. Refine your search.</p>}
          </>
        ) : (
          <>
            <div className="singer-merge-kept">
              <span>Keeping <strong>{target.displayName}</strong>
                {target.accountLogins.map((login) => <span className="singer-merge-detail" key={login.userId}>{describeSingerLogin(login)}</span>)}
              </span>
              <button type="button" disabled={merging} onClick={() => { setTarget(null); setSourceQuery(''); setMergeError('') }}>Change</button>
            </div>
            <label htmlFor={sourceSearchId}>2. Find the guest profile to merge in</label>
            <input id={sourceSearchId} type="search" placeholder="Search guest singer name"
              value={sourceQuery} autoFocus autoComplete="off" maxLength={200} disabled={merging}
              onChange={(event) => { setSourceQuery(event.target.value); setMergeError('') }} />
            <p className="singer-merge-help">Includes archived guests and guests with no queued songs.</p>
            {sources.loading ? <p role="status">Loading guest singers...</p> : sources.error ? (
              <div role="alert">
                <p className="profile-error">{sources.error}</p>
                <button type="button" onClick={sources.retry}>Retry</button>
              </div>
            ) : (
              <fieldset className="singer-merge-options" disabled={merging}>
                <legend>Guest profile</legend>
                {sources.results.singers.map((singer) => (
                  <SingerOption key={singer.singerId} singer={singer} name="merge-source"
                    checked={sourceId === singer.singerId}
                    onSelect={() => { setSourceId(singer.singerId); setConfirmed(false); setMergeError('') }} />
                ))}
                {sources.results.singers.length === 0 && <p>No guest singers match. Try another name.</p>}
              </fieldset>
            )}
            {sources.results.hasMore && <p className="singer-merge-help">Showing the first 50 matches. Refine your search.</p>}
          </>
        )}

        {target && source && (
          <label className="singer-merge-confirm">
            <input type="checkbox" checked={confirmed} disabled={merging}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I have confirmed that guest <strong>{source.displayName}</strong> and <strong>{target.displayName}</strong> are
              the same person. This merge cannot be undone automatically.</span>
          </label>
        )}
        {mergeError && <p className="profile-error" role="alert">{mergeError}</p>}
        <div className="singer-merge-actions">
          <button type="button" onClick={onClose} disabled={merging}>Cancel</button>
          <button type="submit" disabled={merging || !target || !source || !confirmed}>
            {merging ? 'Merging...' : 'Merge guest into login'}
          </button>
        </div>
      </form>
    </ProfileDialog>
  )
}
