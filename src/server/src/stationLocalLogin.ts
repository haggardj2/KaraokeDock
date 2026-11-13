import express from 'express';
import { createSession, getSetting, query, type User } from './db.js';
import { logger } from './logger.js';
import { getUserSingerPresentation } from './singerProfile.js';

// Header the web app sends with the request. A custom header makes any cross-origin attempt
// a CORS preflight, so other sites cannot fire the request blind.
export const STATION_LOCAL_LOGIN_HEADER = 'x-station-local';

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const PROXY_HEADERS = ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-real-ip'];

function isLoopbackAddress(address: string | undefined) {
  if (!address) return false;
  const ip = address.startsWith('::ffff:') ? address.slice(7) : address;
  return ip === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
}

function hostnameOf(value: string) {
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * True only for a request made on the Station machine itself: Station mode, a loopback
 * connection that did not come through a proxy, addressed to a loopback host name (which rules
 * out DNS rebinding) and, when the browser names an origin, a loopback origin.
 */
export function isStationLocalRequest(req: express.Request) {
  if (process.env.STATION_MODE !== 'true') return false;
  if (req.get(STATION_LOCAL_LOGIN_HEADER) !== '1') return false;
  if (!isLoopbackAddress(req.socket.remoteAddress)) return false;
  if (PROXY_HEADERS.some(header => req.get(header) !== undefined)) return false;
  if (!LOOPBACK_HOSTNAMES.has(hostnameOf(req.get('host') || ''))) return false;
  const origin = req.get('origin');
  return origin === undefined || LOOPBACK_HOSTNAMES.has(hostnameOf(origin));
}

// The admin to sign in as: the configured admin username when it is an active admin,
// otherwise the oldest active admin.
async function findStationAdmin(): Promise<User | null> {
  const preferred = (await getSetting('admin.username')) || process.env.ADMIN_USERNAME || 'admin';
  const res = await query<User>(
    `SELECT * FROM users
      WHERE role = 'admin' AND is_active AND canonical_user_id IS NULL
      ORDER BY (username = $1) DESC, created_at ASC, id ASC
      LIMIT 1`,
    [preferred]
  );
  return res.rows[0] || null;
}

/** Whether this server runs inside Station with its desktop app reachable (native dialogs). */
export function hasStationControl() {
  return process.env.STATION_MODE === 'true' && Boolean(process.env.STATION_CONTROL_URL && process.env.STATION_CONTROL_TOKEN);
}

/**
 * POST /auth/station-local: signs a Station's own windows and local browsers in as admin.
 * POST /station/pick-folder (admin): opens the native folder picker on the Station screen,
 * only for a page open on the Station machine itself.
 */
export function createStationLocalLoginRouter(adminGuard: express.RequestHandler) {
  const router = express.Router();
  router.post('/station/pick-folder', adminGuard, express.json(), async (req, res, next) => {
    try {
      if (!hasStationControl() || !isStationLocalRequest(req)) {
        res.status(404).json({ error: 'The folder picker is only available on the Station itself' });
        return;
      }
      const response = await fetch(`${process.env.STATION_CONTROL_URL}/pick-folder`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.STATION_CONTROL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: req.body?.title, defaultPath: req.body?.defaultPath }),
      });
      const result = await response.json() as { path?: string | null; error?: string };
      if (!response.ok) {
        res.status(response.status === 409 ? 409 : 502).json({ error: result.error || 'The folder picker failed' });
        return;
      }
      res.json({ path: typeof result.path === 'string' ? result.path : null });
    } catch (error) {
      next(error);
    }
  });
  router.post('/auth/station-local', async (req, res, next) => {
    try {
      if (!isStationLocalRequest(req)) {
        res.status(404).json({ ok: false, message: 'Not available' });
        return;
      }
      const admin = await findStationAdmin();
      if (!admin) {
        res.status(404).json({ ok: false, message: 'No active admin account' });
        return;
      }
      const sessionToken = await createSession(30, admin.id, admin.role);
      logger.info(`[station] Signed in local request as admin "${admin.username}".`);
      res.json({
        ok: true,
        sessionToken,
        role: admin.role,
        username: admin.username,
        ...await getUserSingerPresentation(admin),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
