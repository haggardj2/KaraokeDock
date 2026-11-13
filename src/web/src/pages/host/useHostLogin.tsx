import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth-context'
import type { OidcPublicConfig } from './types'

// Host sign-in: the username/password form state, the SSO (OIDC) options, and finishing an
// SSO sign-in when the page loads with ?oidc_code= or ?oidc_error= in the URL.
export function useHostLogin({
  setBusy,
  setBanner,
}: {
  setBusy: Dispatch<SetStateAction<boolean>>
  setBanner: Dispatch<SetStateAction<string>>
}) {
  const auth = useAuth()
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [oidcConfig, setOidcConfig] = useState<OidcPublicConfig | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oidcCode = params.get('oidc_code')
    const oidcError = params.get('oidc_error')

    if (oidcCode) {
      api('/api/auth/oidc/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: oidcCode })
      })
        .then((result) => {
          auth.setSessionToken(result.sessionToken)
          auth.setIsLoggedIn(true)
          auth.setRole(result.role || 'user')
          auth.setProfile({
            username: result.username || '',
            displayName: result.displayName || '',
            picture: result.picture || ''
          })
          window.history.replaceState({}, '', window.location.pathname)
        })
        .catch((err) => {
          setLoginError(`SSO login failed: ${String(err?.message || 'Unable to complete login')}`)
          window.history.replaceState({}, '', window.location.pathname)
        })
    } else if (oidcError) {
      setLoginError(`SSO login failed: ${decodeURIComponent(oidcError)}`)
      window.history.replaceState({}, '', window.location.pathname)
    }

    api('/api/auth/oidc/config')
      .then((cfg) => setOidcConfig(cfg))
      .catch(() => {})
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setBusy(true)

    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      })

      if (result.ok && result.sessionToken) {
        auth.setSessionToken(result.sessionToken)
        auth.setIsLoggedIn(true)
        auth.setRole(result.role || 'user')
        setLoginPassword('')
        auth.setIsDefaultPassword(result.isDefaultPassword || false)
        auth.setProfile({
          username: result.username || '',
          displayName: result.displayName || '',
          picture: result.picture || ''
        })

        if (result.isDefaultPassword) {
          setBanner('⚠️ You are using the default password. Please change it in Account Settings.')
        }
      } else {
        setLoginError('Invalid password')
      }
    } catch (err) {
      setLoginError('Login failed.  Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return {
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
    oidcConfig,
    handleLogin,
  }
}

export type HostLoginState = ReturnType<typeof useHostLogin>
