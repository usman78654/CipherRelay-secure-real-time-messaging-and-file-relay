import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import { generateKeyPairSync, sign } from 'node:crypto';
import app from '../app.js';
import initChatSocket from '../socket/chatSocket.js';
let mongo, server, io, base, alice, bob, mallory;
function identityKeys(username) {
  const signingPair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const signingPublicKey = signingPair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const agreement = generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ format: 'jwk' });
  const agreementPublicKey = Buffer.concat([Buffer.from([4]), Buffer.from(agreement.x, 'base64url'), Buffer.from(agreement.y, 'base64url')]).toString('base64');
  const proofSignature = sign('sha256', Buffer.from(`securechat-identity-v1\u0000${username}\u0000${agreementPublicKey}`), { key: signingPair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64');
  return { signingPublicKey, agreementPublicKey, proofSignature };
}
beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' }, instance: { storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongo.getUri());
  server = http.createServer(app);
  io = new Server(server);
  initChatSocket(io);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  for (const name of ['alice', 'bob', 'mallory']) {
    expect((await request(app).post('/api/auth/register').send({ username: name, password: 'Strong-test-password', identityKeys: identityKeys(name) })).status).toBe(201);
  }
  async function token(name) { return (await request(app).post('/api/auth/login').send({ username: name, password: 'Strong-test-password' })).body.token; }
  alice = await token('alice'); bob = await token('bob'); mallory = await token('mallory');
}, 120000);
afterAll(async () => {
  if (io) await new Promise(resolve => io.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test('readiness follows connection and draining state', async () => {
  expect((await request(app).get('/health/ready')).status).toBe(200);
  app.locals.draining = true;
  expect((await request(app).get('/health/ready')).status).toBe(503);
  app.locals.draining = false;
});
test('file access and message history are restricted to participants', async () => {
  const payload = { owner: 'alice', receiver: 'bob', fileName: 'test.txt', encryptedChunks: [{ index: 0, iv: 'iv', ciphertext: 'cipher' }], metadata: { timestamp: Math.floor(Date.now()/1000) } };
  const upload = await request(app).post('/api/files/upload').auth(alice, { type: 'bearer' }).send(payload);
  expect(upload.status).toBe(201);
  const uri = '/api/files/download/' + upload.body.fileId;
  expect((await request(app).get(uri).auth(bob, { type: 'bearer' })).status).toBe(200);
  expect((await request(app).get(uri).auth(mallory, { type: 'bearer' })).status).toBe(403);
  expect((await request(app).post('/api/files/upload').auth(mallory, { type: 'bearer' }).send(payload)).status).toBe(403);
  const message = { chatId: 'shared', sender: 'alice', receiver: 'bob', ciphertext: 'cipher', iv: 'iv', metadata: { timestamp: Math.floor(Date.now()/1000), seqNum: 1 } };
  expect((await request(app).post('/api/chat/send').auth(mallory, { type: 'bearer' }).send(message)).status).toBe(403);
  expect((await request(app).post('/api/chat/send').auth(alice, { type: 'bearer' }).send(message)).status).toBe(201);
  expect((await request(app).get('/api/chat/shared').auth(mallory, { type: 'bearer' })).body).toEqual([]);
  expect((await request(app).get('/api/chat/shared').auth(bob, { type: 'bearer' })).body).toHaveLength(1);
});
test('concurrent duplicate sequence numbers accept only one message', async () => {
  const payload = { chatId: 'concurrent-replay', sender: 'alice', receiver: 'bob', ciphertext: 'opaque', iv: 'iv', metadata: { timestamp: Math.floor(Date.now() / 1000), seqNum: 1 } };
  const results = await Promise.all([
    request(app).post('/api/chat/send').auth(alice, { type: 'bearer' }).send(payload),
    request(app).post('/api/chat/send').auth(alice, { type: 'bearer' }).send(payload)
  ]);
  expect(results.map(result => result.status).sort()).toEqual([201, 409]);
});
test('sockets reject unauthenticated clients and sender spoofing', async () => {
  const anonymous = connect(base, { transports: ['websocket'], reconnection: false });
  try {
    const error = await new Promise(resolve => anonymous.on('connect_error', resolve));
    expect(error.message).toBe('Unauthorized');
  } finally { anonymous.close(); }
  const socket = connect(base, { auth: { token: mallory }, transports: ['websocket'], reconnection: false });
  try {
    await new Promise((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); });
    const rejected = new Promise(resolve => socket.once('error', resolve));
    socket.emit('send-encrypted-message', { sender: 'alice', receiver: 'bob', chatId: 'shared', ciphertext: 'cipher', iv: 'iv' });
    expect((await rejected).error).toMatch(/Sender/);
  } finally { socket.close(); }
});
