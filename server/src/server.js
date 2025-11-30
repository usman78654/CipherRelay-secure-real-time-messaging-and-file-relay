import http from "http";
import https from "https";
import fs from "fs";
import { Server as IOServer } from "socket.io";
import app from "./app.js";
import config from "./config/env.js";
import initChatSocket from "./socket/chatSocket.js";

const PORT = config.PORT || 5000;

let server;
let usingTLS = false;
if (process.env.USE_TLS === 'true') {
  try {
    const key = fs.readFileSync(process.env.TLS_KEY_PATH || './config/ssl/key.pem');
    const cert = fs.readFileSync(process.env.TLS_CERT_PATH || './config/ssl/cert.pem');
    server = https.createServer({ key, cert }, app);
    usingTLS = true;
    console.log('Starting HTTPS server (dev TLS)');
  } catch (err) {
    console.warn('TLS files not found or unreadable, falling back to HTTP:', err.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

const io = new IOServer(server, {
  cors: { origin: true },
  secure: usingTLS
});

// Initialize chat socket handlers
initChatSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
