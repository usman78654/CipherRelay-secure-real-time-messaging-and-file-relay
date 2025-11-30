import config from '../config/env.js';
import { logEvent } from '../services/logger.js';

/**
 * Simple admin middleware: checks if `req.user.username` or `req.user.id`
 * is present in configured ADMIN_USERS list. If ADMIN_USERS is empty,
 * the middleware denies access to avoid accidental exposure.
 */
export const adminMiddleware = (req, res, next) => {
  const admins = config.ADMIN_USERS || [];
  if (!admins.length) {
    // No admins configured — deny by default.
    logEvent('admin-access-denied', { reason: 'no-admins-configured', user: req.user ? req.user.id : null }, req.user ? req.user.id : null);
    return res.status(403).json({ error: 'Admin access not configured.' });
  }

  const userId = req.user && req.user.id;
  const username = req.user && req.user.username;
  const allowed = admins.includes(userId) || admins.includes(username);
  if (!allowed) {
    logEvent('admin-access-denied', { userId, username }, userId || username || null);
    return res.status(403).json({ error: 'Forbidden: admin access required.' });
  }

  return next();
};
