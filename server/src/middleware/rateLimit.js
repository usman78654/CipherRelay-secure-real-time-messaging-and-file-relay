/**
 * Simple rate-limiting middleware scaffold.
 * Prevents repeated brute-force or abuse.
 */

const requestCounts = {};

export const rateLimit = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();

  if (!requestCounts[ip]) {
    requestCounts[ip] = [];
  }

  // Remove old requests older than 1 minute
  requestCounts[ip] = requestCounts[ip].filter(
    (timestamp) => now - timestamp < 60000
  );

  // Limit to 100 requests per minute per IP
  if (requestCounts[ip].length > 100) {
    return res.status(429).json({ error: "Too many requests." });
  }

  requestCounts[ip].push(now);
  next();
};
