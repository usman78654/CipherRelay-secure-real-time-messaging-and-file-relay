import { rateLimit as createRateLimit } from 'express-rate-limit';
export const rateLimit = createRateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false });
export const authRateLimit = createRateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, skipSuccessfulRequests: true });
