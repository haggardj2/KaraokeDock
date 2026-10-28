import { useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import MaterialIcon from '../../components/MaterialIcon'

// Change the signed-in host's username or password.
export default function AccountDialog({ headers, busy, setBusy, setBanner, onClose }: {
  headers: Record<string, string>
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  setBanner: Dispatch<SetStateAction<string>>
  onClose: () => void
}) {
  const auth = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingUsername, setChangingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernamePassword, setUsernamePassword] = useState('')
  const [usernameError, setUsernameError] = useState('')

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long')
      return
    }

    setBusy(true)
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ currentPassword, newPassword })
      })

      setBanner('Password changed successfully')
      setChangingPassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
      auth.setIsDefaultPassword(false)
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password')
    } finally {
      setBusy(false)
    }
  }

  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault()
    setUsernameError('')

    if (!newUsername.trim() || newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters long')
      return
    }

    if (!usernamePassword) {
      setUsernameError('Please enter your current password to confirm')
      return
    }

    const trimmedUsername = newUsername.trim()

    setBusy(true)
    try {
      await api('/api/auth/change-username', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          newUsername: trimmedUsername,
          currentPassword: usernamePassword
        }),
      })

      setBanner('Username changed successfully')
      setChangingUsername(false)
      setNewUsername('')
      setUsernamePassword('')
      setUsernameError('')
      auth.setProfile({ username: trimmedUsername, displayName: trimmedUsername })
    } catch (err: any) {
      setUsernameError(err?.message || 'Failed to change username')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
    <div className="modal-backdrop" onClick={() => onClose()} />
    <div className="modal" style={{ maxWidth: 560 }}>
      <div className="modal-header">
        <h3 style={{ margin: 0 }}><MaterialIcon name="lock" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Account Settings</h3>
        <button
          className="control-btn"
          style={{ width: 40, height: 40, padding: 0 }}
          onClick={() => onClose()}
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      {auth.isDefaultPassword && (
        <div className="banner" style={{ marginBottom: 16 }}>
          <MaterialIcon name="warning" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />
          You are using the default password. Please change it for security.
        </div>
      )}

      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20, fontSize: 14 }}>
        Change your username and password.
      </p>

      {!changingUsername && !changingPassword && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <button
            className="control-btn"
            style={{ minWidth: 180, justifyContent: 'center', flex: 1 }}
            onClick={() => setChangingUsername(true)}
          >
            <MaterialIcon name="person" /> Change Username
          </button>
          <button
            className="control-btn"
            style={{ minWidth: 180, justifyContent: 'center', flex: 1 }}
            onClick={() => setChangingPassword(true)}
          >
            <MaterialIcon name="lock" /> Change Password
          </button>
        </div>
      )}

      {changingUsername && (
        <form
          onSubmit={handleChangeUsername}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--color-bg-secondary)',
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            marginBottom: 20,
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">New Username</label>
            <input
              className="form-input"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username (min 3 characters)"
              autoComplete="username"
              required
              minLength={3}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Current Password (to confirm)</label>
            <input
              className="form-input"
              type="password"
              value={usernamePassword}
              onChange={(e) => setUsernamePassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />
          </div>
          {usernameError && <div className="error-msg" style={{ marginBottom: 0 }}>{usernameError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="control-btn success" type="submit" disabled={busy}>
              <MaterialIcon name="check" /> Change Username
            </button>
            <button
              type="button"
              className="control-btn"
              onClick={() => {
                setChangingUsername(false)
                setNewUsername('')
                setUsernamePassword('')
                setUsernameError('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {changingPassword && (
        <form
          onSubmit={handleChangePassword}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--color-bg-secondary)',
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Current Password</label>
            <input
              className="form-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">New Password</label>
            <input
              className="form-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
            />
          </div>
          {passwordError && <div className="error-msg" style={{ marginBottom: 0 }}>{passwordError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="control-btn success" type="submit" disabled={busy}>
              <MaterialIcon name="check" /> Change Password
            </button>
            <button
              type="button"
              className="control-btn"
              onClick={() => {
                setChangingPassword(false)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setPasswordError('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
    </>
  )
}
