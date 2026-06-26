import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, createContext, useContext } from 'react';
import { api } from './api';
import { clearStoredSessionToken, readStoredSessionToken, writeStoredSessionToken } from './session-token';
const AUTH_PROFILE_STORAGE_KEY = 'authProfile';
function emptyProfile() {
    return { username: '', displayName: '', picture: '' };
}
function readStoredAuthProfile() {
    if (typeof window === 'undefined')
        return emptyProfile();
    try {
        const stored = window.localStorage.getItem(AUTH_PROFILE_STORAGE_KEY);
        if (!stored)
            return emptyProfile();
        const parsed = JSON.parse(stored);
        return {
            username: typeof parsed.username === 'string' ? parsed.username : '',
            displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
            picture: typeof parsed.picture === 'string' ? parsed.picture : ''
        };
    }
    catch {
        return emptyProfile();
    }
}
function writeStoredAuthProfile(profile) {
    if (typeof window === 'undefined')
        return;
    window.localStorage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}
function clearStoredAuthProfile() {
    if (typeof window === 'undefined')
        return;
    window.localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY);
}
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
    const [profile, setProfileState] = useState(() => readStoredAuthProfile());
    const isAdmin = role === 'admin';
    const setSessionToken = (token) => {
        setSessionTokenState(token);
        writeStoredSessionToken(token);
    };
    const setProfile = (nextProfile) => {
        setProfileState((current) => {
            const profile = { ...current, ...nextProfile };
            writeStoredAuthProfile(profile);
            return profile;
        });
    };
    const clearProfile = () => {
        setProfileState(emptyProfile());
        clearStoredAuthProfile();
    };
    useEffect(() => {
        if (!sessionTokenState)
            return;
        let cancelled = false;
        api('/api/auth/validate', {
            headers: { 'x-session-token': sessionTokenState }
        })
            .then((result) => {
            if (cancelled)
                return;
            if (result.valid) {
                setIsLoggedIn(true);
                setRole(result.role || 'user');
                const profile = {
                    username: result.username || '',
                    displayName: result.displayName || '',
                    picture: result.picture || ''
                };
                setProfileState(profile);
                writeStoredAuthProfile(profile);
            }
            else {
                setSessionTokenState('');
                clearStoredSessionToken();
                setIsLoggedIn(false);
                setRole('user');
                clearProfile();
            }
        })
            .catch(() => {
            if (cancelled)
                return;
            setSessionTokenState('');
            clearStoredSessionToken();
            setIsLoggedIn(false);
            setRole('user');
            clearProfile();
        });
        return () => {
            cancelled = true;
        };
    }, [sessionTokenState]);
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
