import { getSetting, withTransaction } from './db.js';
import { logger } from './logger.js';

export const SOCIAL_CONFIG_KEY = 'social.config';
export const SOCIAL_PROVIDERS = ['google', 'facebook'] as const;
export type SocialProvider = typeof SOCIAL_PROVIDERS[number];
export type SocialProviderConfig = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};
export type SocialConfig = {
  enabled: boolean;
  frontendUrl: string;
  operatorName: string;
  contactEmail: string;
  google: SocialProviderConfig;
  facebook: SocialProviderConfig;
};

export class SocialAuthError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function isSocialProvider(value: unknown): value is SocialProvider {
  return value === 'google' || value === 'facebook';
}

function safeUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SocialAuthError('Use an absolute HTTPS URL (HTTP is allowed only on localhost)');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
      || url.username || url.password || url.href.includes('?') || url.href.includes('#')) {
    throw new SocialAuthError('Use an absolute HTTPS URL without credentials, query, or fragment (HTTP is allowed only on localhost)');
  }
  return url;
}

export function normalizeSocialFrontendUrl(value: string): string {
  if (!value.trim()) return '';
  const url = safeUrl(value.trim());
  if (url.pathname !== '/') throw new SocialAuthError('Frontend URL must be an origin without a path');
  return url.origin;
}

function normalizeRedirectUri(value: string, provider: SocialProvider): string {
  if (!value.trim()) return '';
  const url = safeUrl(value.trim());
  if (url.pathname !== `/api/auth/social/${provider}/callback`) {
    throw new SocialAuthError(`Redirect URI must end with /api/auth/social/${provider}/callback`);
  }
  return url.href;
}

function normalizeContactEmail(value: string): string {
  const email = value.trim();
  if (email && (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))) {
    throw new SocialAuthError('Provide a valid public contact email address');
  }
  return email;
}

export function defaultSocialConfig(): SocialConfig {
  let frontendUrl = '';
  try {
    frontendUrl = normalizeSocialFrontendUrl(process.env.WEB_APP_URL || '');
  } catch (error) {
    if (!(error instanceof SocialAuthError)) throw error;
    logger.warn('[social] WEB_APP_URL is not a valid social login origin; configure the public request-page origin in Admin.');
  }
  const provider = (): SocialProviderConfig => ({ enabled: false, clientId: '', clientSecret: '', redirectUri: '' });
  return { enabled: false, frontendUrl, operatorName: '', contactEmail: '', google: provider(), facebook: provider() };
}

function readConfig(value: unknown): SocialConfig {
  const defaults = defaultSocialConfig();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const stored = value as Partial<SocialConfig>;
  const config = { ...defaults, enabled: stored.enabled === true };
  config.operatorName = typeof stored.operatorName === 'string' ? stored.operatorName.trim().slice(0, 160) : '';
  if (typeof stored.contactEmail === 'string') {
    try {
      config.contactEmail = normalizeContactEmail(stored.contactEmail);
    } catch (error) {
      if (!(error instanceof SocialAuthError)) throw error;
      logger.warn('[legal] Invalid stored public contact email; correct it in Admin.');
    }
  }
  if (typeof stored.frontendUrl === 'string') {
    try {
      config.frontendUrl = normalizeSocialFrontendUrl(stored.frontendUrl);
    } catch (error) {
      if (!(error instanceof SocialAuthError)) throw error;
      logger.warn('[social] Invalid stored public origin; social sign-in is unavailable until corrected in Admin.');
      config.frontendUrl = '';
    }
  }
  for (const provider of SOCIAL_PROVIDERS) {
    const item = stored[provider];
    config[provider] = {
      enabled: item?.enabled === true,
      clientId: typeof item?.clientId === 'string' ? item.clientId.trim() : '',
      clientSecret: typeof item?.clientSecret === 'string' ? item.clientSecret : '',
      redirectUri: '',
    };
    try {
      config[provider].redirectUri = normalizeRedirectUri(typeof item?.redirectUri === 'string' ? item.redirectUri : '', provider);
    } catch (error) {
      if (!(error instanceof SocialAuthError)) throw error;
      logger.warn(`[social] Invalid stored ${provider} callback URL; this provider is unavailable until corrected in Admin.`);
    }
  }
  return config;
}

export async function getSocialConfig(): Promise<SocialConfig> {
  return readConfig(await getSetting(SOCIAL_CONFIG_KEY));
}

export function maskSocialConfig(config: SocialConfig): SocialConfig {
  return {
    ...config,
    google: { ...config.google, clientSecret: config.google.clientSecret ? '***' : '' },
    facebook: { ...config.facebook, clientSecret: config.facebook.clientSecret ? '***' : '' },
  };
}

export function socialProviderAvailable(config: SocialConfig, provider: SocialProvider): boolean {
  const item = config[provider];
  return process.env.STATION_MODE !== 'true' && config.enabled && item.enabled
    && Boolean(config.frontendUrl && item.clientId && item.clientSecret.trim() && item.redirectUri);
}

export function validateSocialConfig(value: unknown, current: SocialConfig): SocialConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SocialAuthError('Social configuration is required');
  const body = value as SocialConfig;
  if (typeof body.enabled !== 'boolean' || typeof body.frontendUrl !== 'string') {
    throw new SocialAuthError('enabled and frontendUrl are required');
  }
  const config: SocialConfig = { ...current, enabled: body.enabled, frontendUrl: normalizeSocialFrontendUrl(body.frontendUrl) };
  if (body.operatorName !== undefined) {
    if (typeof body.operatorName !== 'string' || body.operatorName.length > 160 || /[\u0000-\u001f\u007f]/.test(body.operatorName)) {
      throw new SocialAuthError('Public operator name must be text of at most 160 characters without control characters');
    }
    config.operatorName = body.operatorName.trim();
  }
  if (body.contactEmail !== undefined) {
    if (typeof body.contactEmail !== 'string') throw new SocialAuthError('Public contact email must be text');
    config.contactEmail = normalizeContactEmail(body.contactEmail);
  }
  for (const provider of SOCIAL_PROVIDERS) {
    const item = body[provider];
    if (!item || typeof item.enabled !== 'boolean' || typeof item.clientId !== 'string'
        || typeof item.redirectUri !== 'string'
        || (item.clientSecret !== undefined && typeof item.clientSecret !== 'string')) {
      throw new SocialAuthError(`Complete ${provider} configuration is required`);
    }
    if (item.clientId.length > 2048 || (item.clientSecret?.length ?? 0) > 4096 || item.redirectUri.length > 2048) {
      throw new SocialAuthError('Provider configuration is too long');
    }
    config[provider] = {
      enabled: item.enabled,
      clientId: item.clientId.trim(),
      clientSecret: item.clientSecret === undefined || item.clientSecret === '***'
        ? current[provider].clientSecret : item.clientSecret,
      redirectUri: normalizeRedirectUri(item.redirectUri, provider),
    };
  }
  return config;
}

export async function saveSocialConfig(value: unknown): Promise<SocialConfig> {
  return withTransaction(async (client) => {
    // Serialize read/modify/write so omitted secrets survive concurrent administrator saves.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [SOCIAL_CONFIG_KEY]);
    const existing = await client.query('SELECT value FROM settings WHERE key = $1', [SOCIAL_CONFIG_KEY]);
    const config = validateSocialConfig(value, readConfig(existing.rows[0]?.value));
    await client.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [SOCIAL_CONFIG_KEY, JSON.stringify(config)],
    );
    return config;
  });
}
