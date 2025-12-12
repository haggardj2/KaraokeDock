import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth, AuthProvider } from './auth-context'
import Player from './pages/Player'
import Requests from './pages/Requests'
import Host from './pages/Host'
import Admin from './pages/Admin'

function Nav() {
  const location = useLocation()
  const auth = useAuth()
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  
  // Update page title based on route
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Request - Web Karaoke',
      '/requests': 'Request - Web Karaoke',
      '/player': 'Player - Web Karaoke',
      '/host': 'Host - Web Karaoke',
      '/admin': 'Admin - Web Karaoke'
    }
    document.title = titles[location.pathname] || 'Web Karaoke'
  }, [location.pathname])
  
  // Show auth button only on Host and Admin pages
  const showAuthButton = location.pathname === '/host' || location.pathname === '/admin'
  const isAdminPage = location.pathname === '/admin'

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #16161d 100%)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link 
          to="/player" 
          style={{
            color: location.pathname === '/player' ? '#6366f1' : '#a1a1aa',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.3s ease'
          }}
        >
          Player
        </Link>
        <Link 
          to="/requests" 
          style={{
            color: location.pathname === '/requests' || location.pathname === '/' ? '#6366f1' : '#a1a1aa',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.3s ease'
          }}
        >
          Request
        </Link>
        <Link 
          to="/host" 
          style={{
            color: location.pathname === '/host' ? '#6366f1' : '#a1a1aa',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.3s ease'
          }}
        >
          Host
        </Link>
        <Link 
          to="/admin" 
          style={{
            color: location.pathname === '/admin' ? '#6366f1' : '#a1a1aa',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.3s ease'
          }}
        >
          Admin
        </Link>
      </div>

      {/* Auth/Account button for Host and Admin pages */}
      {showAuthButton && auth.isLoggedIn && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              color: 'white',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}
            title={isAdminPage ? 'Account' : 'Logout'}
          >
            👤
          </button>

          {/* Dropdown menu for account actions */}
          {showAccountMenu && (
            <>
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 98
                }}
                onClick={() => setShowAccountMenu(false)}
              />
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                background: '#1d1d27',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                padding: 8,
                minWidth: 180,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                zIndex: 99
              }}>
                {isAdminPage && (
                  <>
                    <button
                      onClick={() => {
                        setShowAccountMenu(false)
                        // Trigger account management - will be handled by Admin page
                        const event = new CustomEvent('showAccountManagement')
                        window.dispatchEvent(event)
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>🔐</span> Account Settings
                    </button>
                    <div style={{
                      height: 1,
                      background: 'rgba(255, 255, 255, 0.1)',
                      margin: '6px 0'
                    }} />
                  </>
                )}
                <button
                  onClick={() => {
                    setShowAccountMenu(false)
                    auth.handleLogout()
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Nav />
        <Routes>
          <Route path="/" element={<Requests />} />
          <Route path="/player" element={<Player />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/host" element={<Host />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

