import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetting, withTransaction } from './db.js';
import {
  defaultSocialConfig, getSocialConfig, maskSocialConfig, normalizeSocialFrontendUrl,
  saveSocialConfig, SOCIAL_CONFIG_KEY, socialProviderAvailable, validateSocialConfig,
} from './socialAuthConfig.js';

vi.mock('./db.js', () => ({ getSetting: vi.fn(), withTransaction: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('WEB_APP_URL', '');
  vi.stubEnv('STATION_MODE', 'false');
  vi.mocked(getSetting).mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe('optional social configuration', () => {
  it('defaults to disabled, empty credentials and no available provider', async () => {
    const config = await getSocialConfig();
    expect(config).toEqual({
      enabled: false, frontendUrl: '', operatorName: '', contactEmail: '',
      google: { enabled: false, clientId: '', clientSecret: '', redirectUri: '' },
      facebook: { enabled: false, clientId: '', clientSecret: '', redirectUri: '' },
    });
    expect(socialProviderAvailable(config, 'google')).toBe(false);
    expect(getSetting).toHaveBeenCalledWith(SOCIAL_CONFIG_KEY);
  });

  it('uses only a valid WEB_APP_URL origin by default', () => {
    vi.stubEnv('WEB_APP_URL', 'https://karaoke.example/');
    expect(defaultSocialConfig().frontendUrl).toBe('https://karaoke.example');
    vi.stubEnv('WEB_APP_URL', 'https://karaoke.example/path');
    expect(defaultSocialConfig().frontendUrl).toBe('');
    vi.stubEnv('WEB_APP_URL', 'http://localhost:5173');
    expect(defaultSocialConfig().frontendUrl).toBe('http://localhost:5173');
  });

  it.each([
    'https://host.example/path', 'https://user:password@host.example',
    'http://host.example', '//host.example', 'javascript:alert(1)',
    'https://host.example/?next=/admin', 'https://host.example/#fragment',
    'http://localhost.attacker.example',
  ])('rejects unsafe frontend origin %s', (value) => {
    expect(() => normalizeSocialFrontendUrl(value)).toThrow();
  });

  it('supports separate localhost API/web origins and requires complete enabled credentials', () => {
    const config = validateSocialConfig({
      ...defaultSocialConfig(), enabled: true, frontendUrl: 'http://localhost:5173/',
      google: {
        enabled: true, clientId: 'google-id', clientSecret: 'secret',
        redirectUri: 'http://localhost:5174/api/auth/social/google/callback',
      },
    }, defaultSocialConfig());
    expect(config.frontendUrl).toBe('http://localhost:5173');
    expect(socialProviderAvailable(config, 'google')).toBe(true);
    expect(socialProviderAvailable(config, 'facebook')).toBe(false);
    expect(socialProviderAvailable({ ...config, enabled: false }, 'google')).toBe(false);
    expect(socialProviderAvailable({ ...config, frontendUrl: '' }, 'google')).toBe(false);
    for (const key of ['clientId', 'clientSecret', 'redirectUri'] as const) {
      expect(socialProviderAvailable({ ...config, google: { ...config.google, [key]: '' } }, 'google')).toBe(false);
    }
    vi.stubEnv('STATION_MODE', 'true');
    expect(socialProviderAvailable(config, 'google')).toBe(false);
  });

  it.each([
    'https://api.example/api/auth/social/facebook/callback',
    'https://api.example/api/auth/social/google/callback/',
    'https://api.example/api/auth/social/google/callback?extra=yes',
    'http://api.example/api/auth/social/google/callback',
  ])('requires the exact provider callback path for %s', (redirectUri) => {
    const current = defaultSocialConfig();
    expect(() => validateSocialConfig({ ...current, google: { ...current.google, redirectUri } }, current)).toThrow();
  });

  it('retains omitted/masked secrets, clears explicit empty secrets and never returns them', () => {
    const current = defaultSocialConfig();
    current.google.clientSecret = 'stored-secret';
    current.facebook.clientSecret = 'facebook-secret';
    const body = { ...current, google: { ...current.google, clientSecret: undefined }, facebook: { ...current.facebook, clientSecret: '' } };
    expect(validateSocialConfig(body, current)).toMatchObject({
      google: { clientSecret: 'stored-secret' }, facebook: { clientSecret: '' },
    });
    const masked = maskSocialConfig(current);
    expect(JSON.stringify(masked)).not.toContain('stored-secret');
    expect(masked.google.clientSecret).toBe('***');
    expect(validateSocialConfig(masked, current).google.clientSecret).toBe('stored-secret');
    expect(current.google.clientSecret).toBe('stored-secret');
  });

  it.each([null, [], {}, { enabled: 'true', frontendUrl: '' }])('rejects incomplete/invalid settings %j', (value) => {
    expect(() => validateSocialConfig(value, defaultSocialConfig())).toThrow();
  });

  it('writes the entire settings object atomically after locking, preserving the current secret', async () => {
    const current = defaultSocialConfig();
    current.google.clientSecret = 'saved';
    const clientQuery = vi.fn(async (sql: string) => ({
      rows: sql.startsWith('SELECT value') ? [{ value: current }] : [],
    }));
    vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ query: clientQuery } as any));
    const saved = await saveSocialConfig({ ...current, google: { ...current.google, clientSecret: undefined } });
    expect(saved.google.clientSecret).toBe('saved');
    expect(clientQuery.mock.calls[0][0]).toContain('pg_advisory_xact_lock');
    expect(clientQuery).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO settings'), [SOCIAL_CONFIG_KEY, JSON.stringify(saved)]);
  });

  it('normalizes public contact details without requiring social login to be enabled', async () => {
    const config = validateSocialConfig({
      ...defaultSocialConfig(), operatorName: '  Example Venue  ', contactEmail: ' privacy@example.com ',
    }, defaultSocialConfig());
    expect(config).toMatchObject({ enabled: false, operatorName: 'Example Venue', contactEmail: 'privacy@example.com' });
    vi.mocked(getSetting).mockResolvedValue(config);
    expect(await getSocialConfig()).toMatchObject({ operatorName: 'Example Venue', contactEmail: 'privacy@example.com' });
  });

  it('keeps contact details when an older settings client omits them and supplies defaults for older records', async () => {
    const current = { ...defaultSocialConfig(), operatorName: 'Venue', contactEmail: 'privacy@example.com' };
    const { operatorName: _operatorName, contactEmail: _contactEmail, ...legacy } = current;
    expect(validateSocialConfig(legacy, current)).toMatchObject({
      operatorName: 'Venue', contactEmail: 'privacy@example.com',
    });
    vi.mocked(getSetting).mockResolvedValue(legacy);
    expect(await getSocialConfig()).toMatchObject({ operatorName: '', contactEmail: '' });
  });

  it.each([
    { operatorName: 123 }, { operatorName: 'a'.repeat(161) }, { operatorName: 'Venue\nInjected' },
    { contactEmail: 123 }, { contactEmail: 'not-an-email' }, { contactEmail: 'privacy@example.com\nBcc:other@example.com' },
    { contactEmail: 'a'.repeat(250) + '@example.com' },
  ])('rejects invalid public contact settings %j', (fields) => {
    expect(() => validateSocialConfig({ ...defaultSocialConfig(), ...fields }, defaultSocialConfig())).toThrow();
  });
});
