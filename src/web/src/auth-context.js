import { jsx as _jsx } from "react/jsx-runtime";
import { useState, createContext, useContext } from 'react';
import { api } from './api';
import { clearStoredSessionToken, readStoredSessionToken, writeStoredSessionToken } from './session-token';
const AuthContext = createContext(null);
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
export function AuthProvider({ children }) {
    const [sessionTokenState, setSessionTokenState] = useState(() => readStoredSessionToken());
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDefaultPassword, setIsDefaultPassword] = useState(false);
    const [role, setRole] = useState('user');
    const [profile, setProfileState] = useState({ username: '', displayName: '', picture: '' });
    const isAdmin = role === 'admin';
    const setSessionToken = (token) => {
        setSessionTokenState(token);
        writeStoredSessionToken(token);
    };
    const setProfile = (nextProfile) => {
        setProfileState((current) => ({ ...current, ...nextProfile }));
    };
    const clearProfile = () => {
        setProfileState({ username: '', displayName: '', picture: '' });
    };
    const handleLogout = async () => {
        try {
            await api('/api/auth/logout', {
                method: 'POST',
                headers: { 'x-session-token': sessionTokenState }
            });
        }
        catch (err) {
            console.error('Logout error:', err);
        }
        finally {
            setSessionToken('');
            clearStoredSessionToken();
            setIsLoggedIn(false);
            setIsDefaultPassword(false);
            setRole('user');
            clearProfile();
        }
    };
    return (_jsx(AuthContext.Provider, { value: {
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
        }, children: children }));
}
