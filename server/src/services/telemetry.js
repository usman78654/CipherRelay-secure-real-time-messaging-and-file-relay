import { randomUUID } from 'node:crypto';
import client from 'prom-client';
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'chat_' });
export const sockets = new client.Gauge({ name: 'chat_socket_connections', help: 'Authenticated socket connections', registers: [registry] });
const requests = new client.Counter({ name: 'chat_http_requests_total', help: 'Completed HTTP requests', labelNames: ['method', 'route', 'status'], registers: [registry] });
const duration = new client.Histogram({ name: 'chat_http_duration_seconds', help: 'HTTP request latency', labelNames: ['method', 'route'], buckets: [0.01, 0.05, 0.1, 0.3, 1, 3, 10], registers: [registry] });
// Never serialize bodies, tokens, exception messages, URLs or file names.
export function log(level, event, fields = {}) {
  const allowed = ['requestId', 'method', 'route', 'status', 'durationMs', 'signal', 'port'];
  const safe = Object.fromEntries(allowed.filter(key => fields[key] !== undefined).map(key => [key, fields[key]]));
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...safe }));
}
export function observeRequest(req, res, next) {
  const start = performance.now();
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  res.on('finish', () => {
    if (['/health/live', '/health/ready', '/metrics'].includes(req.path)) return;
    const route = req.route ? req.baseUrl + req.route.path : 'unmatched';
    const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(req.method) ? req.method : 'OTHER';
    const seconds = (performance.now() - start) / 1000;
    requests.inc({ method, route, status: String(res.statusCode) });
    duration.observe({ method, route }, seconds);
    log('info', 'http_request', { requestId: req.requestId, method, route, status: res.statusCode, durationMs: Math.round(seconds * 1000) });
  });
  next();
}
