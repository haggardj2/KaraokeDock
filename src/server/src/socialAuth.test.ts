import { createHash, createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as oidc from 'openid-client';
import {
  exchangeSocialProviderCode, FACEBOOK_GRAPH_VERSION, SOCIAL_EXCHANGE_TTL_MS, SOCIAL_STATE_TTL_MS,
  SocialAuthStore, socialAuthorizationUrl, socialConfigFingerprint, validCodeChallenge, validExchangeProof,
  type SocialState,
} from './socialAuth.js';
import { defaultSocialConfig } from './socialAuthConfig.js';
import { socialPicture } from './socialIdentity.js';

vi.mock('openid-client', () => ({
  discovery: vi.fn(), ClientSecretPost: vi.fn(),
  enableNonRepudiationChecks: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(async (value: string) => createHash('sha256').update(value).digest('base64url')),
  buildAuthorizationUrl: vi.fn(), authorizationCodeGrant: vi.fn(), fetchUserInfo: vi.fn(),
}));
const verifier = 'b'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const config = defaultSocialConfig();
config.enabled = true;
config.frontendUrl = 'https://web.example';
for (const provider of ['google', 'facebook'] as const) {
  config[provider] = {
    enabled: true, clientId: `${provider}-client`, clientSecret: `${provider}-secret`,
    redirectUri: `https://api.example/api/auth/social/${provider}/callback`,
  };
}
const entry: SocialState = {
  provider: 'google', codeChallenge: challenge, fingerprint: socialConfigFingerprint(config, 'google'),
  frontendUrl: config.frontendUrl, redirectUri: config.google.redirectUri,
  nonce: 'independent-nonce', googleVerifier: 'server-verifier', createdAt: 0,
};
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('browser proof and bounded one-time stores', () => {
  it('accepts only canonical S256 browser challenges and verifies browser proofs', () => {
    expect(validCodeChallenge(challenge)).toBe(true);
    expect(validExchangeProof(verifier, challenge)).toBe(true);
    for (const value of [null, {}, 'a', 'x'.repeat(129), ' '.repeat(43)]) {
      expect(validExchangeProof(value, challenge)).toBe(false);
      expect(validCodeChallenge(value)).toBe(false);
    }
    expect(validExchangeProof('c'.repeat(43), challenge)).toBe(false);
    expect(validCodeChallenge(`${challenge.slice(0, -1)}!`)).toBe(false);
  });

  it('binds state to the provider, expires it and consumes it exactly once', () => {
    let now = 100;
    const store = new SocialAuthStore(() => now);
    const state = store.addState(entry);
    expect(store.takeState(state, 'facebook')).toBeUndefined();
    expect(store.takeState(state, 'google')).toMatchObject({ codeChallenge: challenge });
    expect(store.takeState(state, 'google')).toBeUndefined();
    const expired = store.addState(entry);
    now += SOCIAL_STATE_TTL_MS;
    expect(store.takeState(expired, 'google')).toBeUndefined();
  });

  it('binds exchange to the initiating browser, prevents replay and checks expiry on every read', () => {
    let now = 0;
    const store = new SocialAuthStore(() => now);
    const code = store.addExchange({ provider: 'google', userId: 12, codeChallenge: challenge, fingerprint: 'config' });
    expect(store.takeExchange(code, 'wrong'.repeat(10))).toBeUndefined();
    expect(store.takeExchange(code, verifier)).toMatchObject({ userId: 12 });
    expect(store.takeExchange(code, verifier)).toBeUndefined();
    const expired = store.addExchange({ provider: 'facebook', userId: 13, codeChallenge: challenge, fingerprint: 'config' });
    now += SOCIAL_EXCHANGE_TTL_MS;
    expect(store.takeExchange(expired, verifier)).toBeUndefined();
  });

  it('limits unexpired entries, reclaims expired entries and clears pending logins on settings changes', () => {
    let now = 0;
    const store = new SocialAuthStore(() => now);
    for (let i = 0; i < 1000; i++) store.addState(entry);
    expect(() => store.addState(entry)).toThrow('Too many');
    now += SOCIAL_STATE_TTL_MS;
    const state = store.addState(entry);
    store.clear();
    expect(store.takeState(state, 'google')).toBeUndefined();
  });
});

describe('minimal social provider adapters', () => {
  it('uses fixed Google issuer, openid profile only, and independent PKCE/state/nonce', async () => {
    const google = {} as oidc.Configuration;
    vi.mocked(oidc.discovery).mockResolvedValue(google);
    vi.mocked(oidc.calculatePKCECodeChallenge).mockResolvedValue('server-challenge');
    vi.mocked(oidc.buildAuthorizationUrl).mockReturnValue(new URL('https://accounts.google.com/auth'));
    await socialAuthorizationUrl(config, 'google', 'server-state', entry);
    expect(oidc.discovery).toHaveBeenCalledWith(new URL('https://accounts.google.com'), 'google-client',
      expect.objectContaining({ client_secret: 'google-secret' }), undefined,
      { timeout: 10, execute: [oidc.enableNonRepudiationChecks] });
    expect(oidc.buildAuthorizationUrl).toHaveBeenCalledWith(google, {
      redirect_uri: config.google.redirectUri, scope: 'openid profile', state: 'server-state',
      nonce: 'independent-nonce', code_challenge: 'server-challenge', code_challenge_method: 'S256',
    });
    expect(oidc.calculatePKCECodeChallenge).toHaveBeenCalledWith('server-verifier');
  });

  it('validates Google issuer/audience/signature through openid-client and expects nonce/state/PKCE', async () => {
    const google = {} as oidc.Configuration;
    vi.mocked(oidc.discovery).mockResolvedValue(google);
    vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({
      access_token: 'not-persisted', claims: () => ({
        sub: 'google-subject', name: 'Singer', picture: 'https://images.example/photo', email: 'not-persisted@example.com',
      }),
    } as any);
    const profile = await exchangeSocialProviderCode(config, 'google', 'state', entry, '/api/auth/social/google/callback?code=authorization-code&state=state');
    expect(profile).toEqual({ subject: 'google-subject', name: 'Singer', picture: 'https://images.example/photo' });
    expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(google,
      new URL(`${config.google.redirectUri}?code=authorization-code&state=state`),
      { expectedState: 'state', expectedNonce: entry.nonce, pkceCodeVerifier: entry.googleVerifier, idTokenExpected: true },
      { redirect_uri: config.google.redirectUri });
    expect(oidc.fetchUserInfo).not.toHaveBeenCalled();
  });

  it('fetches missing Google profile fields using the already validated subject, not email', async () => {
    const google = {} as oidc.Configuration;
    vi.mocked(oidc.discovery).mockResolvedValue(google);
    vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({ access_token: 'token', claims: () => ({ sub: 'subject' }) } as any);
    vi.mocked(oidc.fetchUserInfo).mockResolvedValue({ sub: 'subject', name: 'Profile Singer', picture: 'https://images.example/profile' });
    expect(await exchangeSocialProviderCode(config, 'google', 'state', entry, '/callback?state=state&code=code'))
      .toEqual({ subject: 'subject', name: 'Profile Singer', picture: 'https://images.example/profile' });
    expect(oidc.fetchUserInfo).toHaveBeenCalledWith(google, 'token', 'subject');
  });

  it('uses only public_profile for Facebook and keeps client secrets out of authorization URLs', async () => {
    expect(FACEBOOK_GRAPH_VERSION).toBe('v25.0');
    const url = new URL(await socialAuthorizationUrl(config, 'facebook', 'facebook-state', {
      ...entry, provider: 'facebook', redirectUri: config.facebook.redirectUri,
    }));
    expect(url.origin).toBe('https://www.facebook.com');
    expect(url.pathname).toBe(`/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`);
    expect(url.searchParams.get('scope')).toBe('public_profile');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('facebook-state');
    expect(url.href).not.toContain('secret');
  });

  it('exchanges Facebook codes server-side and requests only id,name,picture with appsecret_proof', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'private-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'facebook-subject', name: 'Same Singer', picture: { data: { url: 'https://images.example/fb' } },
        email: 'discard@example.com', friends: ['discard'],
      })));
    vi.stubGlobal('fetch', fetchMock);
    const profile = await exchangeSocialProviderCode(config, 'facebook', 'state',
      { ...entry, provider: 'facebook', redirectUri: config.facebook.redirectUri }, '/callback?state=state&code=code');
    expect(profile).toEqual({ subject: 'facebook-subject', name: 'Same Singer', picture: 'https://images.example/fb' });
    const [tokenUrl, tokenOptions] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`);
    expect(tokenOptions.method).toBe('POST');
    expect(tokenOptions.body.get('client_secret')).toBe('facebook-secret');
    const [profileUrl, profileOptions] = fetchMock.mock.calls[1];
    expect(profileUrl.searchParams.get('fields')).toBe('id,name,picture');
    expect(profileUrl.searchParams.get('appsecret_proof')).toBe(createHmac('sha256', 'facebook-secret').update('private-token').digest('hex'));
    expect(profileUrl.href).not.toContain('private-token');
    expect(profileOptions.headers).toEqual({ Authorization: 'Bearer private-token' });
    expect(profileOptions.redirect).toBe('error');
  });

  it.each(['state=wrong&code=code', 'state=state&code=code&state=state', 'state=state&error=denied', 'state=state&code=one&code=two'])(
    'rejects missing/ambiguous/denied callbacks before any provider exchange: %s', async (query) => {
      await expect(exchangeSocialProviderCode(config, 'google', 'state', entry, `/callback?${query}`)).rejects.toThrow('sign-in failed');
      expect(oidc.authorizationCodeGrant).not.toHaveBeenCalled();
    },
  );

  it.each(['http://images.example/photo', 'data:image/png;base64,AAAA', 'https://user:password@images.example', 'https://images.example/?access_token=secret'])(
    'does not persist unsafe pictures %s', (picture) => expect(socialPicture(picture)).toBeNull(),
  );
});
