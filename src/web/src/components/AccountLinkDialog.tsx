import { useEffect, useId, useState, type FormEvent } from 'react'
import { api } from '../api'
import ProfileDialog from './ProfileDialog'
import './SingerMergeDialog.css'

type Candidate = {
  id: number
  username: string
  displayName: string
  provider: 'google' | 'facebook'
  isActive: boolean
}

export default function AccountLinkDialog({ userId, targetName, role, sessionToken, onClose, onLinked }: {
  userId: number
  targetName: string
  role: 'admin' | 'user'
  sessionToken: string
  onClose: () => void
  onLinked: (sourceName: string) => void
}) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<Candidate[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const selected = users.find(user => user.id === selectedId)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setUsers([])
    setSelectedId(null)
    setConfirmed(false)
    const timer = window.setTimeout(() => {
      api(`/api/admin/users/${userId}/link-candidates?${new URLSearchParams({ q: query.trim() })}`, {
        headers: { 'x-session-token': sessionToken }, signal: controller.signal,
      }).then((result: { users: Candidate[]; hasMore: boolean }) => {
        if (!controller.signal.aborted) {
          setUsers(result.users)
          setHasMore(result.hasMore)
        }
      }).catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load social logins.')
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [userId, sessionToken, query, attempt])

  async function link(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!selected?.isActive || !confirmed) {
      setError('Select an active social login and confirm account ownership and permissions.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api(`/api/admin/users/${userId}/link`, {
        method: 'POST', headers: { 'x-session-token': sessionToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUserId: selected.id }),
      })
      onLinked(selected.displayName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link the social login.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProfileDialog title="Merge Social Login into Account" className="singer-merge-dialog" onClose={busy ? undefined : onClose}>
      <form className="singer-merge-form" onSubmit={event => void link(event)}>
        <p>Keep <strong>{targetName}</strong> and connect a Google or Facebook login to this account. Queue and history are combined, including profiles that were previously merged.</p>
        <p><strong>The social login will receive this account's {role} permissions{role === 'admin' ? ', including Host and Admin access' : ''}.</strong> The kept profile name and picture remain. Existing social sessions are signed out; sign in again after linking.</p>
        <label htmlFor={searchId}>Find a social login</label>
        <input id={searchId} type="search" autoFocus autoComplete="off" maxLength={200}
          placeholder="Search name, username, Google, or Facebook" value={query} disabled={busy}
          onChange={event => setQuery(event.target.value)} />
        {loading ? <p role="status">Loading social logins...</p> : (
          <fieldset className="singer-merge-options" disabled={busy}>
            <legend>Social login to connect</legend>
            {users.map(user => (
              <label key={user.id} className={`singer-merge-option${selectedId === user.id ? ' selected' : ''}`}>
                <input type="radio" name="account-link-source" checked={selectedId === user.id} disabled={!user.isActive}
                  onChange={() => { setSelectedId(user.id); setConfirmed(false) }} />
                <span><strong>{user.displayName}</strong>
                  <span className="singer-merge-detail">{user.provider === 'google' ? 'Google' : 'Facebook'}: {user.username}{user.isActive ? '' : ' (disabled)'}</span>
                </span>
              </label>
            ))}
            {!users.length && !error && <p>No unlinked social logins found. Sign in with the social provider once first. Already linked logins appear beneath their account in User Manager.</p>}
          </fieldset>
        )}
        {hasMore && <p>Showing the first 50 matches. Refine your search.</p>}
        {selected && <label className="singer-merge-confirm">
          <input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />
          <span>I confirm that {selected.displayName} and {targetName} are the same person and authorize this social login to use the account's <strong>{role} permissions</strong>. This merge cannot be undone automatically.</span>
        </label>}
        {error && <div role="alert"><p className="profile-error">{error}</p>
          {!busy && <button type="button" onClick={() => setAttempt(value => value + 1)}>Reload logins</button>}
        </div>}
        <div className="singer-merge-actions">
          <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy || loading || !selected?.isActive || !confirmed}>{busy ? 'Linking...' : 'Merge and link login'}</button>
        </div>
      </form>
    </ProfileDialog>
  )
}
