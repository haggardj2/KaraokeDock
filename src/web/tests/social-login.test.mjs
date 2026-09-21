import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  exchangeSocialLogin,
  startSocialLogin,
  takeSocialLoginCallback,
  visibleSocialProviders,
} from '../src/social-login.ts'
import { readStoredSessionToken, writeStoredSessionToken } from '../src/session-token.ts'

const PROOF_KEY = 'karaoke-social-login-proof'
function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

describe('singer social sign-in', () => {
  const originalWindow = globalThis.window
  let storage
  let historyCalls
  beforeEach(() => {
    storage = createStorage()
    historyCalls = []
    globalThis.window = {
      sessionStorage: storage,
      localStorage: createStorage(),
      location: { href: 'https://karaoke.example/?keep=value' },
      history: {
        state: { key: 'existing-router-state' },
        replaceState: (...args) => historyCalls.push(args),
      },
    }
  })
  afterEach(() => {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  })
  const googleStart = async () => ({ authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=provider-state' })
  const session = {
    ok: true, sessionToken: 'singer-session', role: 'user',
    username: 'social-user', displayName: 'Singer Name', picture: 'https://images.example/avatar.jpg',
  }

  it('leaves disabled/default prompts unchanged and respects each provider toggle', () => {
    assert.deepEqual(visibleSocialProviders(null), [])
    assert.deepEqual(visibleSocialProviders({ enabled: false, providers: { google: true, facebook: true } }), [])
    assert.deepEqual(visibleSocialProviders({ enabled: true, providers: { google: false, facebook: false } }), [])
    assert.deepEqual(visibleSocialProviders({ enabled: true, providers: { google: true, facebook: false } }), ['google'])
    assert.deepEqual(visibleSocialProviders({ enabled: true, providers: { google: false, facebook: true } }), ['facebook'])
    assert.deepEqual(visibleSocialProviders({ enabled: true, providers: { google: true, facebook: true } }), ['google', 'facebook'])
  })

  it('binds sign-in to a per-tab random verifier, sending only its SHA-256 challenge', async () => {
    let requestBody
    const url = await startSocialLogin('google', async (path, options) => {
      assert.equal(path, '/api/auth/social/google/start')
      assert.equal(options.method, 'POST')
      requestBody = JSON.parse(options.body)
      return googleStart()
    })
    const proof = JSON.parse(storage.getItem(PROOF_KEY))
    assert.match(proof.codeVerifier, /^[A-Za-z0-9_-]{43}$/)
    assert.deepEqual(requestBody, { codeChallenge: createHash('sha256').update(proof.codeVerifier).digest('base64url') })
    assert.ok(url.startsWith('https://accounts.google.com/'))
    assert.equal(window.localStorage.getItem(PROOF_KEY), null)
    await startSocialLogin('google', googleStart)
    assert.notEqual(JSON.parse(storage.getItem(PROOF_KEY)).codeVerifier, proof.codeVerifier)
  })

  it('opens the selected Facebook service without sending a singer name or identity', async () => {
    const url = await startSocialLogin('facebook', async (path, options) => {
      assert.equal(path, '/api/auth/social/facebook/start')
      assert.deepEqual(Object.keys(JSON.parse(options.body)), ['codeChallenge'])
      return { authorizationUrl: 'https://www.facebook.com/v25.0/dialog/oauth?state=abc' }
    })
    assert.equal(new URL(url).hostname, 'www.facebook.com')
  })

  it('rejects an unsafe or wrong-provider authorization URL and discards the attempt', async () => {
    for (const authorizationUrl of ['javascript:alert(1)', 'http://accounts.google.com/auth',
      'https://accounts.google.com.evil.example/', 'https://www.facebook.com/', 'https://user@accounts.google.com/']) {
      await assert.rejects(startSocialLogin('google', async () => ({ authorizationUrl })), /invalid redirect/)
      assert.equal(storage.getItem(PROOF_KEY), null)
    }
  })

  it('surfaces failed start requests and clears the proof', async () => {
    await assert.rejects(startSocialLogin('google', async () => { throw new Error('Provider is disabled') }), /disabled/)
    assert.equal(storage.getItem(PROOF_KEY), null)
  })

  it('removes callback codes immediately while preserving other URL and router state', () => {
    window.location.href = 'https://karaoke.example/requests?keep=value&social_code=one-time#section'
    assert.deepEqual(takeSocialLoginCallback(), { code: 'one-time', error: '' })
    assert.deepEqual(historyCalls, [[{ key: 'existing-router-state' }, '', '/requests?keep=value#section']])
  })

  it('leaves a normal page load untouched', () => {
    assert.equal(takeSocialLoginCallback(), null)
    assert.deepEqual(historyCalls, [])
  })

  it('handles provider cancellation without retaining the proof or decoding errors twice', async () => {
    await startSocialLogin('google', googleStart)
    window.location.href = 'https://karaoke.example/?social_error=Access+denied%3A+100%25'
    assert.deepEqual(takeSocialLoginCallback(), { code: '', error: 'Access denied: 100%' })
    assert.equal(storage.getItem(PROOF_KEY), null)
  })

  it('exchanges once and returns a standard session usable across request-page tabs', async () => {
    await startSocialLogin('google', googleStart)
    const proof = JSON.parse(storage.getItem(PROOF_KEY))
    const result = await exchangeSocialLogin('exchange-code', async (path, options) => {
      assert.equal(path, '/api/auth/social/exchange')
      assert.deepEqual(JSON.parse(options.body), { code: 'exchange-code', codeVerifier: proof.codeVerifier })
      return session
    })
    assert.equal(result.displayName, 'Singer Name')
    assert.equal(result.picture, session.picture)
    assert.equal(storage.getItem(PROOF_KEY), null)
    writeStoredSessionToken(result.sessionToken)
    window.sessionStorage = createStorage()
    assert.equal(readStoredSessionToken(), 'singer-session')
    await assert.rejects(exchangeSocialLogin('exchange-code', async () => session), /same browser tab/)
  })

  it('rejects missing, expired, future-dated, or malformed browser proofs before exchanging', async () => {
    let called = false
    const request = async () => { called = true; return session }
    await assert.rejects(exchangeSocialLogin('code', request), /same browser tab/)
    for (const proof of [
      { codeVerifier: 'a'.repeat(43), createdAt: Date.now() - 600_001 },
      { codeVerifier: 'a'.repeat(43), createdAt: Date.now() + 60_000 },
      { codeVerifier: '', createdAt: Date.now() },
    ]) {
      storage.setItem(PROOF_KEY, JSON.stringify(proof))
      await assert.rejects(exchangeSocialLogin('code', request), /expired/)
    }
    assert.equal(called, false)
  })

  it('accepts the server-authorized admin session for an explicitly linked social login', async () => {
    await startSocialLogin('google', googleStart)
    const result = await exchangeSocialLogin('code', async () => ({ ...session, role: 'admin', username: 'oidc-host' }))
    assert.equal(result.role, 'admin')
    assert.equal(result.username, 'oidc-host')
  })

  it('does not accept an invalid session or an unknown role', async () => {
    for (const invalid of [{}, { ...session, sessionToken: '' }, { ...session, role: 'owner' }, { ...session, displayName: '' }]) {
      await startSocialLogin('google', googleStart)
      await assert.rejects(exchangeSocialLogin('code', async () => invalid), /invalid session/)
      assert.equal(storage.getItem(PROOF_KEY), null)
    }
  })

  it('surfaces exchange failures and requires a fresh attempt', async () => {
    await startSocialLogin('google', googleStart)
    await assert.rejects(exchangeSocialLogin('code', async () => { throw new Error('Account disabled') }), /disabled/)
    assert.equal(storage.getItem(PROOF_KEY), null)
  })
})
