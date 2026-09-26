import { log } from '../services/telemetry.js';
export const errorHandler = (err, req, res, _next) => {
  const status = err.type === 'entity.too.large' ? 413 : err.type === 'entity.parse.failed' ? 400 : 500;
  log('error', 'request_failed', { requestId: req.requestId, status });
  res.status(status).json({ error: status === 413 ? 'Payload too large.' : status === 400 ? 'Invalid JSON payload.' : 'Internal server error.', requestId: req.requestId });
};
