import React, { useEffect, useState, createContext, useContext } from 'react'
import { api } from './api'
import { clearStoredSessionToken, readStoredSessionToken, writeStoredSessionToken } from './session-token'

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

  const isAdmin = role === 'admin'

  const setSessionToken = (token: string) => {
    setSessionTokenState(token)
    writeStoredSessionToken(token)
  }

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
    api('/api/auth/validate', {
      headers: { 'x-session-token': sessionTokenState }
    })
      .then((result) => {
        if (cancelled) return
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
          setSessionTokenState('')
          clearStoredSessionToken()
          setIsLoggedIn(false)
          setRole('user')
          clearProfile()
        }
      })
      .catch(() => {
        if (cancelled) return
        setSessionTokenState('')
        clearStoredSessionToken()
        setIsLoggedIn(false)
        setRole('user')
        clearProfile()
      })

    return () => {
      cancelled = true
    }
  }, [sessionTokenState])

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-session-token': sessionTokenState }
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setSessionToken('')
      clearStoredSessionToken()
      setIsLoggedIn(false)
      setIsDefaultPassword(false)
      setRole('user')
      clearProfile()
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
      handleLogout
    }}>
      {children}
    </AuthContext.Provider>
  )
}
