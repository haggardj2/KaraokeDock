import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react'
import { api } from './api'
import { readStoredSessionToken, subscribeToStoredSessionToken, writeStoredSessionToken } from './session-token'

type AuthProfile = {
  username: string
  displayName: string
  picture: string
}

const AUTH_PROFILE_STORAGE_KEY = 'authProfile'

function emptyProfile(): AuthProfile {
  return { username: '', displayName: '', picture: '' }
}

function readStoredAuthProfile(): AuthProfile {
  if (typeof window === 'undefined') return emptyProfile()

  try {
    const stored = window.localStorage.getItem(AUTH_PROFILE_STORAGE_KEY)
    if (!stored) return emptyProfile()
    const parsed = JSON.parse(stored) as Partial<AuthProfile>
    return {
      username: typeof parsed.username === 'string' ? parsed.username : '',
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
      picture: typeof parsed.picture === 'string' ? parsed.picture : ''
    }
  } catch {
    return emptyProfile()
  }
}

function writeStoredAuthProfile(profile: AuthProfile) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

function clearStoredAuthProfile() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY)
}

// Authentication context to share login state across pages
type AuthContextType = {
  isLoggedIn: boolean
  sessionToken: string
  setSessionToken: (token: string) => void
  setIsLoggedIn: (loggedIn: boolean) => void
  isDefaultPassword: boolean
  setIsDefaultPassword: (isDefault: boolean) => void
  role: string
  setRole: (role: string) => void
  isAdmin: boolean
  profile: AuthProfile
  setProfile: (profile: Partial<AuthProfile>) => void
  clearProfile: () => void
  handleLogout: () => Promise<void>
  sessionError: string
  retrySessionValidation: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionTokenState, setSessionTokenState] = useState(() => readStoredSessionToken())
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isDefaultPassword, setIsDefaultPassword] = useState(false)
  const [role, setRole] = useState('user')
  const [profile, setProfileState] = useState<AuthProfile>(() => readStoredAuthProfile())
  const [sessionError, setSessionError] = useState('')
  const [validationAttempt, setValidationAttempt] = useState(0)
  const currentToken = useRef(sessionTokenState)

  const isAdmin = role === 'admin'

  const adoptSessionToken = useCallback((token: string) => {
    if (currentToken.current === token) return
    currentToken.current = token
    setSessionTokenState(token)
    setIsLoggedIn(false)
    setIsDefaultPassword(false)
    setRole('user')
    setProfileState(emptyProfile())
    setSessionError('')
    if (!token) clearStoredAuthProfile()
  }, [])

  const setSessionToken = useCallback((token: string) => {
    writeStoredSessionToken(token)
    adoptSessionToken(token)
  }, [adoptSessionToken])

  const retrySessionValidation = useCallback(() => setValidationAttempt((attempt) => attempt + 1), [])

  useEffect(() => {
    const unsubscribe = subscribeToStoredSessionToken(adoptSessionToken)
    const refreshSession = () => adoptSessionToken(readStoredSessionToken())
    refreshSession()
    window.addEventListener('focus', refreshSession)
    window.addEventListener('pageshow', refreshSession)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', refreshSession)
      window.removeEventListener('pageshow', refreshSession)
    }
  }, [adoptSessionToken])

  const setProfile = (nextProfile: Partial<AuthProfile>) => {
    setProfileState((current) => {
      const profile = { ...current, ...nextProfile }
      writeStoredAuthProfile(profile)
      return profile
    })
  }

  const clearProfile = () => {
    setProfileState(emptyProfile())
    clearStoredAuthProfile()
  }

  useEffect(() => {
    if (!sessionTokenState) return

    let cancelled = false
    setSessionError('')
    const isCurrentSession = () => !cancelled && currentToken.current === sessionTokenState &&
      readStoredSessionToken() === sessionTokenState
    api('/api/auth/validate', {
      headers: { 'x-session-token': sessionTokenState }
    })
      .then((result) => {
        if (!isCurrentSession()) return
        if (result.valid) {
          setIsLoggedIn(true)
          setRole(result.role || 'user')
          const profile = {
            username: result.username || '',
            displayName: result.displayName || '',
            picture: result.picture || ''
          }
          setProfileState(profile)
          writeStoredAuthProfile(profile)
        } else {
          setSessionToken('')
        }
      })
      .catch((error) => {
        if (!isCurrentSession()) return
        console.error('Could not validate sign-in session:', error)
        setIsLoggedIn(false)
        setRole('user')
        setSessionError('Could not verify your sign-in. Check your connection and retry.')
      })

    return () => {
      cancelled = true
    }
  }, [sessionTokenState, validationAttempt, setSessionToken])

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-session-token': sessionTokenState }
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      if (readStoredSessionToken() === sessionTokenState) setSessionToken('')
    }
  }

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      sessionToken: sessionTokenState,
      setSessionToken,
      setIsLoggedIn,
      isDefaultPassword,
      setIsDefaultPassword,
      role,
      setRole,
      isAdmin,
      profile,
      setProfile,
      clearProfile,
      handleLogout,
      sessionError,
      retrySessionValidation
    }}>
      {children}
    </AuthContext.Provider>
  )
}
