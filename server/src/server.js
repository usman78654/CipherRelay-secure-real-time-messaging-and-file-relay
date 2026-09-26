import http from 'node:http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app.js';
import config from './config/env.js';
import connectDB from './config/db.js';
import initChatSocket from './socket/chatSocket.js';
import { log, registry } from './services/telemetry.js';
// TLS terminates at Caddy. Compose never publishes this port.
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.ALLOWED_ORIGINS },
  allowRequest: (req, callback) => callback(null, !req.headers.origin || config.ALLOWED_ORIGINS.includes(req.headers.origin)),
  maxHttpBufferSize: 1024 * 1024
});
initChatSocket(io);
// Separate internal listener keeps metrics outside the public API/proxy.
const metrics = http.createServer(async (req, res) => {
  if (req.url !== '/metrics') { res.writeHead(404); return res.end(); }
  try { res.writeHead(200, { 'Content-Type': registry.contentType }); res.end(await registry.metrics()); }
  catch { res.writeHead(500); res.end(); }
});
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.locals.draining = true;
  log('info', 'shutdown_started', { signal });
  const deadline = setTimeout(() => process.exit(1), 20000);
  deadline.unref();
  metrics.close();
  io.close(async () => {
    await mongoose.disconnect();
    clearTimeout(deadline);
    log('info', 'shutdown_complete');
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
server.on('error', () => { log('error', 'http_listener_failed'); process.exit(1); });
metrics.on('error', () => { log('error', 'metrics_listener_failed'); process.exit(1); });
try {
  await connectDB();
  server.listen(config.PORT, '0.0.0.0', () => log('info', 'server_started', { port: config.PORT }));
  metrics.listen(9090, process.env.METRICS_HOST || '127.0.0.1');
} catch { log('error', 'startup_failed'); process.exit(1); }
