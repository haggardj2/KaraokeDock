import type { RequestHandler } from 'express';
import { getRequestIdentity } from '../authenticatedSinger.js';
import { canAccessHost } from '../permissions.js';

export const hostGuard: RequestHandler = async (req, res, next) => {
  try {
    const identity = await getRequestIdentity(req.headers['x-session-token']);
    const role = identity.isAdmin ? 'admin' : identity.user?.role ?? '';
    if (!canAccessHost(identity.user, role)) {
      res.status(403).json({ error: 'Forbidden: Host access required' });
      return;
    }
    res.locals.user = { userId: identity.user?.id, role };
    next();
  } catch (error) {
    console.error('hostGuard error:', error);
    res.status(403).json({ error: 'Forbidden: Invalid or expired session' });
  }
};
