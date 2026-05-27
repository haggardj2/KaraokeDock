const SESSION_TOKEN_KEY = 'sessionToken';
function getStorage() {
    if (typeof window === 'undefined')
        return null;
    return window.sessionStorage;
}
export function readStoredSessionToken() {
    const storage = getStorage();
    if (!storage)
        return '';
    const sessionToken = storage.getItem(SESSION_TOKEN_KEY) || window.localStorage.getItem(SESSION_TOKEN_KEY) || '';
    if (sessionToken) {
        storage.setItem(SESSION_TOKEN_KEY, sessionToken);
    }
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    return sessionToken;
}
export function writeStoredSessionToken(token) {
    const storage = getStorage();
    if (!storage)
        return;
    if (token) {
        storage.setItem(SESSION_TOKEN_KEY, token);
    }
    else {
        storage.removeItem(SESSION_TOKEN_KEY);
    }
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
}
export function clearStoredSessionToken() {
    const storage = getStorage();
    storage?.removeItem(SESSION_TOKEN_KEY);
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
}
