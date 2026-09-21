import express from 'express';
import { getSocialConfig } from '../socialAuthConfig.js';
import { renderPublicLegalPage, type LegalPage } from '../publicLegal.js';
import { logger } from '../logger.js';

export const publicLegalRouter = express.Router();

for (const page of ['privacy', 'terms'] satisfies LegalPage[]) {
  publicLegalRouter.get(`/${page}`, async (_req, res) => {
    const { operatorName, contactEmail, frontendUrl } = await getSocialConfig();
    const iconOrigin = frontendUrl ? ` ${new URL(frontendUrl).origin}` : '';
    res.set({
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; img-src 'self'${iconOrigin}; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
      'Referrer-Policy': 'no-referrer',
    });
    res.type('html').send(renderPublicLegalPage(page, { operatorName, contactEmail, frontendUrl }));
  });
}

publicLegalRouter.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(error);
  logger.error('[legal] Could not load the public policy page');
  res.status(503).type('text').send('This policy is temporarily unavailable. Please try again later or contact your karaoke host.');
});
