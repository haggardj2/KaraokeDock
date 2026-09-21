import express from 'express';
import { randomBytes } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { createSession, getUserById } from '../db.js';
import { ensureAuthenticatedSinger } from '../authenticatedSinger.js';
import { logger } from '../logger.js';
import {
  getSocialConfig, isSocialProvider, maskSocialConfig, saveSocialConfig, socialProviderAvailable,
  SocialAuthError, type SocialConfig, type SocialProvider,
} from '../socialAuthConfig.js';
import {
  exchangeSocialProviderCode, SocialAuthStore, socialAuthorizationUrl, socialConfigFingerprint,
  validCodeChallenge, type SocialState,
} from '../socialAuth.js';
import { resolveSocialIdentity } from '../socialIdentity.js';
import { getUserSingerPresentation } from '../singerProfile.js';
import { resolveSocialLoginUser } from '../accountLinks.js';

const SIGN_IN_FAILED = 'Social sign-in failed. Please try again.';

export const socialAuthNoStore: express.RequestHandler = (_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer' });
  next();
};

export function createSocialAuthRouter(
  adminGuard: express.RequestHandler,
  onLogin: () => void,
  store = new SocialAuthStore(),
): express.Router {
  const router = express.Router();
  setInterval(() => store.cleanup(), 60_000).unref();
  router.use(['/auth/social', '/admin/settings/social'], socialAuthNoStore);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 120,
    standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Please try again later.' },
  });
  const requireProvider = async (provider: SocialProvider, fingerprint?: string): Promise<SocialConfig> => {
    const config = await getSocialConfig();
    if (!socialProviderAvailable(config, provider)
        || (fingerprint && socialConfigFingerprint(config, provider) !== fingerprint)) {
      throw new SocialAuthError('Social sign-in is unavailable. Please start again.', 403);
    }
    return config;
  };
  const returnUrl = (frontendUrl: string, parameter: 'social_code' | 'social_error', value: string): string => {
    return `${frontendUrl}/?${new URLSearchParams({ [parameter]: value })}`;
  };

  router.get('/auth/social/config', async (_req, res) => {
    const config = await getSocialConfig();
    res.json({
      enabled: process.env.STATION_MODE !== 'true' && config.enabled,
      providers: {
        google: socialProviderAvailable(config, 'google'),
        facebook: socialProviderAvailable(config, 'facebook'),
      },
    });
  });
  router.get('/admin/settings/social', adminGuard, async (_req, res) => {
    const config = maskSocialConfig(await getSocialConfig());
    res.json(process.env.STATION_MODE === 'true'
      ? { ...config, enabled: false, stationMode: true } : config);
  });
  router.put('/admin/settings/social', adminGuard, async (req, res) => {
    if (process.env.STATION_MODE === 'true') throw new SocialAuthError('Social sign-in is not available in Station mode', 403);
    const config = await saveSocialConfig(req.body);
    store.clear();
    res.json(maskSocialConfig(config));
  });

  router.post('/auth/social/:provider/start', limiter, async (req, res) => {
    const provider = req.params.provider;
    if (!isSocialProvider(provider)) throw new SocialAuthError('Unknown social provider', 404);
    if (!validCodeChallenge(req.body?.codeChallenge)) throw new SocialAuthError('A valid codeChallenge is required');
    const config = await requireProvider(provider);
    const origin = req.get('Origin');
    if (origin !== undefined && origin !== config.frontendUrl) {
      throw new SocialAuthError(
        `Social sign-in is configured for ${config.frontendUrl}. Open that public URL to sign in, or ask an administrator to correct the frontend URL.`,
      );
    }
    const entry: SocialState = {
      provider, codeChallenge: req.body.codeChallenge,
      fingerprint: socialConfigFingerprint(config, provider),
      frontendUrl: config.frontendUrl, redirectUri: config[provider].redirectUri,
      ...(provider === 'google' ? {
        googleVerifier: randomBytes(32).toString('base64url'), nonce: randomBytes(32).toString('base64url'),
      } : {}),
      createdAt: Date.now(),
    };
    const state = store.addState(entry);
    try {
      const authorizationUrl = await socialAuthorizationUrl(config, provider, state, entry);
      await requireProvider(provider, entry.fingerprint);
      res.json({ authorizationUrl });
    } catch (error) {
      store.takeState(state, provider);
      throw error;
    }
  });

  router.get('/auth/social/:provider/callback', limiter, async (req, res) => {
    const provider = req.params.provider;
    if (!isSocialProvider(provider)) throw new SocialAuthError('Unknown social provider', 404);
    const incoming = new URL(req.originalUrl, 'http://localhost');
    const state = incoming.searchParams.getAll('state').length === 1 ? incoming.searchParams.get('state') : null;
    const entry = store.takeState(state, provider);
    const config = await getSocialConfig();
    const frontendUrl = entry?.frontendUrl || config.frontendUrl;
    if (!frontendUrl) throw new SocialAuthError(SIGN_IN_FAILED);
    if (!entry || !state) return res.redirect(returnUrl(frontendUrl, 'social_error', SIGN_IN_FAILED));
    try {
      await requireProvider(provider, entry.fingerprint);
      const profile = await exchangeSocialProviderCode(config, provider, state, entry, req.originalUrl);
      await requireProvider(provider, entry.fingerprint);
      const login = await resolveSocialIdentity(provider, profile);
      const user = await resolveSocialLoginUser(login);
      await ensureAuthenticatedSinger(user);
      await requireProvider(provider, entry.fingerprint);
      const code = store.addExchange({
        provider, userId: login.id, codeChallenge: entry.codeChallenge, fingerprint: entry.fingerprint,
      });
      return res.redirect(returnUrl(frontendUrl, 'social_code', code));
    } catch (error) {
      // Provider errors may embed codes, tokens, or claims. Never log their payload or message.
      if (!(error instanceof SocialAuthError)) logger.error('[social] Callback processing failed');
      return res.redirect(returnUrl(frontendUrl, 'social_error', SIGN_IN_FAILED));
    }
  });

  router.post('/auth/social/exchange', limiter, async (req, res) => {
    const entry = store.takeExchange(req.body?.code, req.body?.codeVerifier);
    if (!entry) throw new SocialAuthError('Invalid or expired social sign-in code');
    await requireProvider(entry.provider, entry.fingerprint);
    const login = await getUserById(entry.userId);
    if (!login?.is_active || login.social_provider !== entry.provider || !login.social_subject) {
      throw new SocialAuthError('Social sign-in is unavailable for this account', 403);
    }
    const user = await resolveSocialLoginUser(login);
    await ensureAuthenticatedSinger(user);
    await requireProvider(entry.provider, entry.fingerprint);
    const sessionToken = await createSession(30, user.id, user.role, login.id);
    onLogin();
    res.json({
      ok: true, sessionToken, role: user.role,
      username: user.username, ...await getUserSingerPresentation(user),
    });
  });

  router.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof SocialAuthError) return res.status(error.status).json({ error: error.message });
    logger.error('[social] Request processing failed');
    res.status(500).json({ error: SIGN_IN_FAILED });
  });
  return router;
}
