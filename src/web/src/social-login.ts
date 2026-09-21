export const SOCIAL_PROVIDERS = ['google', 'facebook'] as const
export type SocialProvider = typeof SOCIAL_PROVIDERS[number]
export const SOCIAL_PROVIDER_NAMES = { google: 'Google', facebook: 'Facebook' }

export type SocialPublicConfig = {
  enabled: boolean
  providers: Record<SocialProvider, boolean>
}

export type SocialProviderSettings = {
  enabled: boolean
  clientId: string
  clientSecret: string
  redirectUri: string
}

export type SocialSettings = {
  enabled: boolean
  frontendUrl: string
  operatorName: string
  contactEmail: string
  google: SocialProviderSettings
  facebook: SocialProviderSettings
}

type SocialSession = {
  sessionToken: string
  role: 'user' | 'admin'
  username: string
  displayName: string
  picture: string
}

type RequestApi = (path: string, init?: RequestInit) => Promise<unknown>
const PROOF_KEY = 'karaoke-social-login-proof'
const PROOF_MAX_AGE_MS = 10 * 60 * 1000
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export function visibleSocialProviders(config: SocialPublicConfig | null): SocialProvider[] {
  return config?.enabled === true
    ? SOCIAL_PROVIDERS.filter((provider) => config.providers[provider] === true)
    : []
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function startSocialLogin(provider: SocialProvider, request: RequestApi): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Social sign-in requires HTTPS (or localhost for development). Open the secure request-page URL.')
  }
  const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
  window.sessionStorage.setItem(PROOF_KEY, JSON.stringify({ codeVerifier, createdAt: Date.now() }))
  try {
    const result = await request(`/api/auth/social/${provider}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeChallenge: base64url(new Uint8Array(digest)) }),
    })
    if (!isRecord(result) || typeof result.authorizationUrl !== 'string') {
      throw new Error('Could not start social sign-in. Please try again.')
    }
    const url = new URL(result.authorizationUrl)
    const expectedHost = provider === 'google' ? 'accounts.google.com' : 'www.facebook.com'
    if (url.protocol !== 'https:' || url.hostname !== expectedHost || url.username || url.password) {
      throw new Error('The sign-in service returned an invalid redirect.')
    }
    return url.href
  } catch (error) {
    window.sessionStorage.removeItem(PROOF_KEY)
    throw error
  }
}

export function takeSocialLoginCallback(): { code: string; error: string } | null {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('social_code') && !url.searchParams.has('social_error')) return null
  const code = url.searchParams.get('social_code') || ''
  const error = url.searchParams.get('social_error') || ''
  url.searchParams.delete('social_code')
  url.searchParams.delete('social_error')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  if (error || !code) window.sessionStorage.removeItem(PROOF_KEY)
  return { code, error: error || (!code ? 'Missing social sign-in response. Please try again.' : '') }
}

export async function exchangeSocialLogin(code: string, request: RequestApi): Promise<SocialSession> {
  const stored = window.sessionStorage.getItem(PROOF_KEY)
  window.sessionStorage.removeItem(PROOF_KEY)
  if (!stored) throw new Error('Sign-in must finish in the same browser tab where it started. Please try again.')
  const proof: unknown = JSON.parse(stored)
  if (!isRecord(proof) || typeof proof.codeVerifier !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(proof.codeVerifier) || typeof proof.createdAt !== 'number' ||
      Date.now() - proof.createdAt > PROOF_MAX_AGE_MS || proof.createdAt > Date.now()) {
    throw new Error('Your sign-in attempt expired. Please try again.')
  }
  const result = await request('/api/auth/social/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, codeVerifier: proof.codeVerifier }),
  })
  if (!isRecord(result) || typeof result.sessionToken !== 'string' || !result.sessionToken ||
      (result.role !== 'user' && result.role !== 'admin') || typeof result.username !== 'string' ||
      typeof result.displayName !== 'string' || !result.displayName.trim()) {
    throw new Error('The sign-in service returned an invalid session. Please try again.')
  }
  return {
    sessionToken: result.sessionToken,
    role: result.role,
    username: result.username,
    displayName: result.displayName,
    picture: typeof result.picture === 'string' ? result.picture : '',
  }
}
