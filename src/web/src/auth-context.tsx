import React, { useState, createContext, useContext } from 'react'
import { api } from './api'

type AuthProfile = {
  username: string
  displayName: string
  picture: string
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
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('sessionToken') || '')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isDefaultPassword, setIsDefaultPassword] = useState(false)
  const [role, setRole] = useState('user')
  const [profile, setProfileState] = useState<AuthProfile>({ username: '', displayName: '', picture: '' })

  const isAdmin = role === 'admin'

  const setProfile = (nextProfile: Partial<AuthProfile>) => {
    setProfileState((current) => ({ ...current, ...nextProfile }))
  }

  const clearProfile = () => {
    setProfileState({ username: '', displayName: '', picture: '' })
  }

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-session-token': sessionToken }
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setSessionToken('')
      localStorage.removeItem('sessionToken')
      setIsLoggedIn(false)
      setIsDefaultPassword(false)
      setRole('user')
      clearProfile()
    }
  }

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      sessionToken,
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
