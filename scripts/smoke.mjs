import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateKeyPairSync, sign } from 'node:crypto';
const require = createRequire(new URL('../server/src/package.json', import.meta.url));
const { io } = require('socket.io-client');
const base = process.env.BASE_URL || 'http://localhost:8080';
async function call(route, body, token) {
  const response = await fetch(base + route, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000)
  });
  return { status: response.status, data: await response.json() };
}
assert.equal((await call('/health/ready')).status, 200);
assert.equal((await fetch(base + '/metrics')).status, 404);
assert.equal((await fetch(base + '/chat')).status, 200); // SPA deep link
const suffix = Date.now();
const users = ['alice', 'bob'].map(name => {
  const username = name + suffix;
  const signingPair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const signingPublicKey = signingPair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const agreement = generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ type: 'spki', format: 'jwk' });
  const x = Buffer.from(agreement.x, 'base64url');
  const y = Buffer.from(agreement.y, 'base64url');
  const agreementPublicKey = Buffer.concat([Buffer.from([4]), x, y]).toString('base64');
  const proofSignature = sign('sha256', Buffer.from(`securechat-identity-v1\u0000${username}\u0000${agreementPublicKey}`), { key: signingPair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64');
  return { username, password: 'Smoke-password-' + suffix, identityKeys: { signingPublicKey, agreementPublicKey, proofSignature } };
});
const tokens = [];
for (const user of users) {
  assert.equal((await call('/api/auth/register', user)).status, 201);
  const login = await call('/api/auth/login', user);
  assert.equal(login.status, 200); tokens.push(login.data.token);
}
const clients = tokens.map(token => io(base, { transports: ['websocket'], auth: { token }, reconnection: false, timeout: 10000 }));
const timeout = setTimeout(() => { console.error('Socket smoke test timed out'); process.exit(1); }, 15000);
try {
  await Promise.all(clients.map(socket => new Promise((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); })));
  const packet = { chatId: 'smoke-' + suffix, sender: users[0].username, receiver: users[1].username, ciphertext: 'opaque-test-ciphertext', iv: 'test-iv', metadata: { seqNum: 1, timestamp: Math.floor(Date.now()/1000) } };
  const received = new Promise(resolve => clients[1].once('receive-encrypted-message', resolve));
  clients[0].emit('send-encrypted-message', packet);
  assert.equal((await received).ciphertext, packet.ciphertext);
  const file = await call('/api/files/upload', { owner: users[0].username, receiver: users[1].username, fileName: 'smoke.txt', encryptedChunks: [{ index: 0, iv: 'iv', ciphertext: 'opaque' }], metadata: { timestamp: Math.floor(Date.now()/1000) } }, tokens[0]);
  assert.equal(file.status, 201);
  assert.equal((await call('/api/files/download/' + file.data.fileId, null, tokens[1])).status, 200);
  console.log('PASS: readiness, private metrics, SPA routing, registration/login, proxied WebSocket relay and file transfer.');
} finally { clearTimeout(timeout); clients.forEach(socket => socket.close()); }
