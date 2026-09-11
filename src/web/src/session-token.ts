const SESSION_TOKEN_KEY = 'sessionToken'

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readStoredSessionToken(): string {
  const storage = getStorage()
  if (!storage) return ''

  const sharedToken = storage.getItem(SESSION_TOKEN_KEY)
  const sessionToken = sharedToken ?? window.sessionStorage.getItem(SESSION_TOKEN_KEY) ?? ''
  if (sharedToken === null && sessionToken) {
    storage.setItem(SESSION_TOKEN_KEY, sessionToken)
  }
  window.sessionStorage.removeItem(SESSION_TOKEN_KEY)
  return sessionToken
}

export function writeStoredSessionToken(token: string) {
  const storage = getStorage()
  if (!storage) return

  // Keep an empty shared value after logout so old tab-local tokens cannot revive it.
  storage.setItem(SESSION_TOKEN_KEY, token)
  window.sessionStorage.removeItem(SESSION_TOKEN_KEY)
}

export function clearStoredSessionToken() {
  writeStoredSessionToken('')
}

export function subscribeToStoredSessionToken(onChange: (token: string) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  function onStorage(event: StorageEvent) {
    if (event.storageArea !== window.localStorage ||
        (event.key !== SESSION_TOKEN_KEY && event.key !== null)) return
    const token = window.localStorage.getItem(SESSION_TOKEN_KEY) ?? ''
    writeStoredSessionToken(token)
    onChange(token)
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
