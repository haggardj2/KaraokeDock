import { API_BASE } from '../../api'
import MaterialIcon from '../../components/MaterialIcon'
import type { HostLoginState } from './useHostLogin'

// The Host sign-in card: username/password form and/or the SSO button, depending on settings.
export default function HostLogin({ login, busy }: { login: HostLoginState; busy: boolean }) {
  const {
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
    oidcConfig,
    handleLogin,
  } = login

  return (
    <div
      className="card"
      style={{ maxWidth: 400, margin: '100px auto', overflow: 'hidden' }}
    >
      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>
        <MaterialIcon name="mic_external_on" style={{ fontSize: 30, verticalAlign: 'middle', marginRight: 8 }} />
        Host Login
      </h1>

      {oidcConfig?.passwordLoginEnabled !== false && (
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={loginUsername}
              onChange={e => setLoginUsername(e.target.value)}
              placeholder="Enter host username"
              autoComplete="username"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              placeholder="Enter host password"
              autoComplete="current-password"
              required
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {loginError && <div className="error-msg">{loginError}</div>}
          <button
            className="control-btn primary"
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {busy ? (
              <>
                <span className="loading-spinner"></span> Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      )}
      {loginError && oidcConfig?.passwordLoginEnabled === false && (
        <div className="error-msg">{loginError}</div>
      )}
      {oidcConfig?.passwordLoginEnabled === false && !oidcConfig?.enabled && (
        <div className="error-msg" style={{ marginBottom: 16 }}>
          Username/password login is disabled and SSO is not enabled.
        </div>
      )}
      {oidcConfig?.enabled && (
        <>
          {oidcConfig?.passwordLoginEnabled !== false && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border-strong)' }} />
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border-strong)' }} />
            </div>
          )}
          <a
            href={`${API_BASE}/api/auth/oidc/login?returnTo=%2Fhost`}
            className="control-btn primary"
            style={{
              width: '100%',
              textDecoration: 'none',
            }}
          >
            {oidcConfig.buttonText}
          </a>
        </>
      )}
      <p
        style={{
          marginTop: 20,
          fontSize: 13,
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}
      >
        Use the credentials configured in Admin settings
      </p>
    </div>
  )
}
