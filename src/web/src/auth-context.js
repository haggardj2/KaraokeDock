import { jsx as _jsx } from "react/jsx-runtime";
import { useState, createContext, useContext } from 'react';
import { api } from './api';
const AuthContext = createContext(null);
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
export function AuthProvider({ children }) {
    const [sessionToken, setSessionToken] = useState(localStorage.getItem('sessionToken') || '');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDefaultPassword, setIsDefaultPassword] = useState(false);
    const [role, setRole] = useState('user');
    const [profile, setProfileState] = useState({ username: '', displayName: '', picture: '' });
    const isAdmin = role === 'admin';
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
                headers: { 'x-session-token': sessionToken }
            });
        }
        catch (err) {
            console.error('Logout error:', err);
        }
        finally {
            setSessionToken('');
            localStorage.removeItem('sessionToken');
            setIsLoggedIn(false);
            setIsDefaultPassword(false);
            setRole('user');
            clearProfile();
        }
    };
    return (_jsx(AuthContext.Provider, { value: {
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
        }, children: children }));
}
