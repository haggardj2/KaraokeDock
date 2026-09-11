import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  clearStoredSessionToken,
  readStoredSessionToken,
  subscribeToStoredSessionToken,
  writeStoredSessionToken,
} from '../src/session-token.ts'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  }
}

describe('shared browser sessions', () => {
  let localStorage
  let sessionStorage
  let listeners
  const originalWindow = globalThis.window

  beforeEach(() => {
    localStorage = createStorage()
    sessionStorage = createStorage()
    listeners = new Set()
    globalThis.window = {
      localStorage,
      sessionStorage,
      addEventListener: (type, listener) => { if (type === 'storage') listeners.add(listener) },
      removeEventListener: (type, listener) => { if (type === 'storage') listeners.delete(listener) },
    }
  })

  afterEach(() => {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  })

  const emitStorage = (key, storageArea = localStorage) => {
    for (const listener of listeners) listener({ key, storageArea })
  }

  it('shares a login with a separate tab that has no sessionStorage or opener', () => {
    writeStoredSessionToken('oidc-session')
    globalThis.window.sessionStorage = createStorage()
    assert.equal(readStoredSessionToken(), 'oidc-session')
  })

  it('migrates an existing Host tab-local login without replacing a newer shared login', () => {
    sessionStorage.setItem('sessionToken', 'legacy-session')
    assert.equal(readStoredSessionToken(), 'legacy-session')
    assert.equal(localStorage.getItem('sessionToken'), 'legacy-session')
    assert.equal(sessionStorage.getItem('sessionToken'), null)
    sessionStorage.setItem('sessionToken', 'old-session')
    localStorage.setItem('sessionToken', 'new-session')
    assert.equal(readStoredSessionToken(), 'new-session')
    assert.equal(sessionStorage.getItem('sessionToken'), null)
  })

  it('does not resurrect another tab-local login after logout', () => {
    writeStoredSessionToken('oidc-session')
    clearStoredSessionToken()
    sessionStorage.setItem('sessionToken', 'legacy-session')
    assert.equal(readStoredSessionToken(), '')
    assert.equal(localStorage.getItem('sessionToken'), '')
    assert.equal(sessionStorage.getItem('sessionToken'), null)
  })

  it('notifies existing tabs of login, replacement login, and logout', () => {
    const tokens = []
    const unsubscribe = subscribeToStoredSessionToken((token) => tokens.push(token))
    for (const token of ['first-session', 'second-session', '']) {
      localStorage.setItem('sessionToken', token)
      emitStorage('sessionToken')
    }
    assert.deepEqual(tokens, ['first-session', 'second-session', ''])
    unsubscribe()
    emitStorage('sessionToken')
    assert.equal(tokens.length, 3)
  })

  it('reads the latest token rather than applying an out-of-date storage event', () => {
    const tokens = []
    subscribeToStoredSessionToken((token) => tokens.push(token))
    localStorage.setItem('sessionToken', 'latest-session')
    for (const listener of listeners) listener({ key: 'sessionToken', newValue: 'old-session', storageArea: localStorage })
    assert.deepEqual(tokens, ['latest-session'])
  })

  it('turns cleared shared storage into a logout and drops legacy tab credentials', () => {
    const tokens = []
    subscribeToStoredSessionToken((token) => tokens.push(token))
    sessionStorage.setItem('sessionToken', 'legacy-session')
    localStorage.clear()
    emitStorage(null)
    assert.deepEqual(tokens, [''])
    assert.equal(localStorage.getItem('sessionToken'), '')
    assert.equal(sessionStorage.getItem('sessionToken'), null)
  })

  it('ignores profile changes and per-tab storage events', () => {
    const tokens = []
    subscribeToStoredSessionToken((token) => tokens.push(token))
    emitStorage('authProfile')
    emitStorage('sessionToken', sessionStorage)
    assert.deepEqual(tokens, [])
  })
})
