import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from './auth-context';
import { api } from './api';
import Player from './pages/Player';
import Requests from './pages/Requests';
import Host from './pages/Host';
import Admin from './pages/Admin';
import { writeStoredSessionToken } from './session-token';
const ACCOUNT_AVATAR_BACKGROUND = '#111827';
function Nav() {
    const location = useLocation();
    const auth = useAuth();
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    // Update page title based on route
    useEffect(() => {
        const titles = {
            '/': 'Request - Web Karaoke',
            '/requests': 'Request - Web Karaoke',
            '/player': 'Player - Web Karaoke',
            '/host': 'Host - Web Karaoke',
            '/admin': 'Admin - Web Karaoke'
        };
        document.title = titles[location.pathname] || 'Web Karaoke';
    }, [location.pathname]);
    // Handle OIDC login redirects on the admin page.
    useEffect(() => {
        if (location.pathname !== '/admin')
            return;
        const params = new URLSearchParams(location.search);
        const oidcCode = params.get('oidc_code');
        if (oidcCode) {
            api('/api/auth/oidc/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: oidcCode }),
            })
                .then((result) => {
                auth.setSessionToken(result.sessionToken);
                writeStoredSessionToken(result.sessionToken);
                auth.setIsLoggedIn(true);
                auth.setRole(result.role || 'user');
                auth.setProfile({
                    username: result.username || '',
                    displayName: result.displayName || '',
                    picture: result.picture || '',
                });
                window.history.replaceState({}, '', window.location.pathname);
            })
                .catch((err) => {
                const message = encodeURIComponent(String(err?.message || 'SSO login failed'));
                window.location.replace(`${window.location.pathname}?oidc_error=${message}`);
            });
        }
    }, [location.pathname, location.search]);
    // Show auth button only on Host and Admin pages
    const showAuthButton = location.pathname === '/host' || location.pathname === '/admin';
    const showAccountSettingsOption = location.pathname === '/admin' || location.pathname === '/host';
    const avatarLabel = auth.profile.displayName || auth.profile.username || 'Account';
    const avatarInitial = avatarLabel.trim().charAt(0).toUpperCase() || '👤';
    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [auth.profile.picture]);
    return (_jsxs("nav", { style: {
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
        }, children: [_jsxs("div", { style: { display: 'flex', gap: 16, alignItems: 'center' }, children: [_jsx(Link, { to: "/player", style: {
                            color: location.pathname === '/player' ? '#6366f1' : '#a1a1aa',
                            textDecoration: 'none',
                            fontWeight: 500,
                            transition: 'color 0.3s ease'
                        }, children: "Player" }), _jsx(Link, { to: "/requests", style: {
                            color: location.pathname === '/requests' || location.pathname === '/' ? '#6366f1' : '#a1a1aa',
                            textDecoration: 'none',
                            fontWeight: 500,
                            transition: 'color 0.3s ease'
                        }, children: "Request" }), _jsx(Link, { to: "/host", style: {
                            color: location.pathname === '/host' ? '#6366f1' : '#a1a1aa',
                            textDecoration: 'none',
                            fontWeight: 500,
                            transition: 'color 0.3s ease'
                        }, children: "Host" }), _jsx(Link, { to: "/admin", style: {
                            color: location.pathname === '/admin' ? '#6366f1' : '#a1a1aa',
                            textDecoration: 'none',
                            fontWeight: 500,
                            transition: 'color 0.3s ease'
                        }, children: "Admin" })] }), showAuthButton && auth.isLoggedIn && (_jsxs("div", { style: { position: 'relative' }, children: [_jsx("button", { onClick: () => setShowAccountMenu(!showAccountMenu), style: {
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: auth.profile.picture && !avatarLoadFailed ? ACCOUNT_AVATAR_BACKGROUND : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            color: 'white',
                            fontSize: 18,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            boxShadow: 'none'
                        }, title: avatarLabel, children: auth.profile.picture && !avatarLoadFailed ? (_jsx("img", { src: auth.profile.picture, alt: avatarLabel, referrerPolicy: "no-referrer", onError: () => setAvatarLoadFailed(true), style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' } })) : (avatarInitial) }), showAccountMenu && (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 98
                                }, onClick: () => setShowAccountMenu(false) }), _jsxs("div", { style: {
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
                                }, children: [_jsxs("div", { style: {
                                            padding: '10px 12px',
                                            color: '#ffffff',
                                            fontSize: 13,
                                            lineHeight: 1.4
                                        }, children: [_jsx("div", { style: { fontWeight: 600 }, children: avatarLabel }), auth.profile.displayName && auth.profile.username && auth.profile.displayName !== auth.profile.username && (_jsx("div", { style: { color: '#a1a1aa' }, children: auth.profile.username }))] }), _jsx("div", { style: {
                                            height: 1,
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            margin: '6px 0'
                                        } }), showAccountSettingsOption && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => {
                                                    setShowAccountMenu(false);
                                                    // Trigger account management - will be handled by Admin page
                                                    const event = new CustomEvent('showAccountManagement');
                                                    window.dispatchEvent(event);
                                                }, style: {
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
                                                }, onMouseEnter: (e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)', onMouseLeave: (e) => e.currentTarget.style.background = 'transparent', children: [_jsx("span", { children: "\uD83D\uDD10" }), " Account Settings"] }), _jsx("div", { style: {
                                                    height: 1,
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    margin: '6px 0'
                                                } })] })), _jsxs("button", { onClick: () => {
                                            setShowAccountMenu(false);
                                            auth.handleLogout();
                                        }, style: {
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
                                        }, onMouseEnter: (e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)', onMouseLeave: (e) => e.currentTarget.style.background = 'transparent', children: [_jsx("span", { children: "\uD83D\uDEAA" }), " Logout"] })] })] }))] }))] }));
}
function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(AuthProvider, { children: [_jsx(Nav, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Requests, {}) }), _jsx(Route, { path: "/player", element: _jsx(Player, {}) }), _jsx(Route, { path: "/requests", element: _jsx(Requests, {}) }), _jsx(Route, { path: "/host", element: _jsx(Host, {}) }), _jsx(Route, { path: "/admin", element: _jsx(Admin, {}) })] })] }) }));
}
const root = createRoot(document.getElementById('root'));
root.render(_jsx(App, {}));
