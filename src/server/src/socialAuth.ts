import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import * as oidc from 'openid-client';
import { buildOidcGrantCallbackUrl } from './oidcRedirect.js';
import { SocialAuthError, type SocialConfig, type SocialProvider } from './socialAuthConfig.js';
import { socialProfile, type SocialProfile } from './socialIdentity.js';

export const SOCIAL_STATE_TTL_MS = 10 * 60 * 1000;
export const SOCIAL_EXCHANGE_TTL_MS = 2 * 60 * 1000;
export const FACEBOOK_GRAPH_VERSION = 'v25.0';
const MAX_PENDING = 1000;
const GOOGLE_ISSUER = 'https://accounts.google.com';

export type SocialState = {
  provider: SocialProvider;
  codeChallenge: string;
  fingerprint: string;
  frontendUrl: string;
  redirectUri: string;
  googleVerifier?: string;
  nonce?: string;
  createdAt: number;
};
export type SocialExchange = {
  provider: SocialProvider;
  codeChallenge: string;
  fingerprint: string;
  userId: number;
  createdAt: number;
};

export function socialConfigFingerprint(config: SocialConfig, provider: SocialProvider): string {
  return createHash('sha256').update(JSON.stringify([config.frontendUrl, config[provider]])).digest('hex');
}

export function validCodeChallenge(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
    && Buffer.from(value, 'base64url').toString('base64url') === value;
}

export function validExchangeProof(verifier: unknown, challenge: string): boolean {
  if (typeof verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const actual = createHash('sha256').update(verifier).digest('base64url');
  return actual.length === challenge.length && timingSafeEqual(Buffer.from(actual), Buffer.from(challenge));
}

export class SocialAuthStore {
  private readonly states = new Map<string, SocialState>();
  private readonly exchanges = new Map<string, SocialExchange>();

  constructor(private readonly now: () => number = Date.now) {}

  cleanup(): void {
    const now = this.now();
    for (const [key, entry] of this.states) {
      if (now - entry.createdAt >= SOCIAL_STATE_TTL_MS) this.states.delete(key);
    }
    for (const [key, entry] of this.exchanges) {
      if (now - entry.createdAt >= SOCIAL_EXCHANGE_TTL_MS) this.exchanges.delete(key);
    }
  }

  clear(): void {
    this.states.clear();
    this.exchanges.clear();
  }

  addState(entry: Omit<SocialState, 'createdAt'>): string {
    this.cleanup();
    if (this.states.size >= MAX_PENDING) throw new SocialAuthError('Too many pending sign-ins. Please try again later.', 429);
    const state = randomBytes(32).toString('base64url');
    this.states.set(state, { ...entry, createdAt: this.now() });
    return state;
  }

  takeState(state: unknown, provider: SocialProvider): SocialState | undefined {
    this.cleanup();
    if (typeof state !== 'string') return undefined;
    const entry = this.states.get(state);
    if (entry?.provider !== provider) return undefined;
    this.states.delete(state);
    return entry;
  }

  addExchange(entry: Omit<SocialExchange, 'createdAt'>): string {
    this.cleanup();
    if (this.exchanges.size >= MAX_PENDING) throw new SocialAuthError('Too many pending sign-ins. Please try again later.', 429);
    const code = randomBytes(32).toString('base64url');
    this.exchanges.set(code, { ...entry, createdAt: this.now() });
    return code;
  }

  takeExchange(code: unknown, verifier: unknown): SocialExchange | undefined {
    this.cleanup();
    if (typeof code !== 'string') return undefined;
    const entry = this.exchanges.get(code);
    if (!entry || !validExchangeProof(verifier, entry.codeChallenge)) return undefined;
    // Consume synchronously, before any asynchronous database/session operations.
    this.exchanges.delete(code);
    return entry;
  }
}

async function googleConfiguration(config: SocialConfig): Promise<oidc.Configuration> {
  const provider = config.google;
  return oidc.discovery(
    new URL(GOOGLE_ISSUER), provider.clientId,
    { client_secret: provider.clientSecret, redirect_uris: [provider.redirectUri], response_types: ['code'] },
    oidc.ClientSecretPost(provider.clientSecret), { timeout: 10, execute: [oidc.enableNonRepudiationChecks] },
  );
}

export async function socialAuthorizationUrl(
  config: SocialConfig, provider: SocialProvider, state: string, entry: SocialState,
): Promise<string> {
  if (provider === 'google') {
    const google = await googleConfiguration(config);
    return oidc.buildAuthorizationUrl(google, {
      redirect_uri: entry.redirectUri, scope: 'openid profile', state,
      nonce: entry.nonce!,
      code_challenge: await oidc.calculatePKCECodeChallenge(entry.googleVerifier!),
      code_challenge_method: 'S256',
    }).href;
  }
  const url = new URL(`https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`);
  url.search = new URLSearchParams({
    client_id: config.facebook.clientId,
    redirect_uri: entry.redirectUri,
    response_type: 'code',
    scope: 'public_profile',
    state,
  }).toString();
  return url.href;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function facebookJson(url: string | URL, options: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new SocialAuthError('Social sign-in failed', 401);
  const data: unknown = await response.json();
  if (!isRecord(data) || data.error) {
    throw new SocialAuthError('Social sign-in failed', 401);
  }
  return data;
}

export async function exchangeSocialProviderCode(
  config: SocialConfig, provider: SocialProvider, state: string, entry: SocialState, originalUrl: string,
): Promise<SocialProfile> {
  const callback = buildOidcGrantCallbackUrl(entry.redirectUri, originalUrl);
  if (callback.searchParams.getAll('state').length !== 1 || callback.searchParams.get('state') !== state
      || callback.searchParams.has('error') || callback.searchParams.getAll('code').length !== 1
      || !callback.searchParams.get('code')) {
    throw new SocialAuthError('Social sign-in failed', 401);
  }
  if (provider === 'google') {
    const google = await googleConfiguration(config);
    const tokens = await oidc.authorizationCodeGrant(google, callback, {
      expectedState: state,
      expectedNonce: entry.nonce,
      pkceCodeVerifier: entry.googleVerifier,
      idTokenExpected: true,
    }, { redirect_uri: entry.redirectUri });
    const claims = tokens.claims();
    if (!claims?.sub) throw new SocialAuthError('Social sign-in failed', 401);
    const profile = !claims.name || !claims.picture
      ? await oidc.fetchUserInfo(google, tokens.access_token, claims.sub)
      : claims;
    return socialProfile(claims.sub, profile.name, profile.picture, provider);
  }
  const token = await facebookJson(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.facebook.clientId,
      client_secret: config.facebook.clientSecret,
      redirect_uri: entry.redirectUri,
      code: callback.searchParams.get('code')!,
    }),
  });
  if (typeof token.access_token !== 'string' || !token.access_token) throw new SocialAuthError('Social sign-in failed', 401);
  const profileUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me`);
  profileUrl.search = new URLSearchParams({
    fields: 'id,name,picture',
    appsecret_proof: createHmac('sha256', config.facebook.clientSecret).update(token.access_token).digest('hex'),
  }).toString();
  const profile = await facebookJson(profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` } });
  const picture = isRecord(profile.picture) && isRecord(profile.picture.data) ? profile.picture.data.url : undefined;
  return socialProfile(profile.id, profile.name, picture, provider);
}
