import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { generateKeyPairSync, sign } from 'node:crypto';

function makeIdentityKeys(username) {
  const signingPair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const signingPublicKey = signingPair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const agreement = generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ format: 'jwk' });
  const agreementPublicKey = Buffer.concat([Buffer.from([4]), Buffer.from(agreement.x, 'base64url'), Buffer.from(agreement.y, 'base64url')]).toString('base64');
  const proofSignature = sign('sha256', Buffer.from(`securechat-identity-v1\u0000${username}\u0000${agreementPublicKey}`), { key: signingPair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64');
  return { signingPublicKey, agreementPublicKey, proofSignature };
}

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' }, instance: { storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('current flow: identity registration, directory, auth, message replay and encrypted file', async () => {
  const identityKeys = makeIdentityKeys('alice_e2e');
  const alice = { username: 'alice_e2e', password: 'Pass123!', identityKeys };
  const bob = { username: 'bob_e2e', password: 'Pass123!', identityKeys: makeIdentityKeys('bob_e2e') };
  expect((await request(app).post('/api/auth/register').send({ username: 'missing_keys', password: 'Pass123!' })).status).toBe(400);
  expect((await request(app).post('/api/auth/register').send(alice)).status).toBe(201);
  expect((await request(app).post('/api/auth/register').send(bob)).status).toBe(201);
  const aliceLogin = await request(app).post('/api/auth/login').send({ username: alice.username, password: alice.password });
  const bobLogin = await request(app).post('/api/auth/login').send({ username: bob.username, password: bob.password });
  expect(aliceLogin.status).toBe(200); expect(bobLogin.status).toBe(200);
  const aliceToken = aliceLogin.body.token; const bobToken = bobLogin.body.token;
  const directory = await request(app).get('/api/auth/users').auth(aliceToken, { type: 'bearer' });
  expect(directory.body.find(user => user.username === bob.username).identityKeys.agreementPublicKey).toBe(bob.identityKeys.agreementPublicKey);
  const message = { chatId: 'chat_alice_e2e_bob_e2e', sender: alice.username, receiver: bob.username, ciphertext: 'opaque', iv: 'opaque-iv', authTag: 'opaque-tag', metadata: { timestamp: Math.floor(Date.now() / 1000), seqNum: 1 } };
  expect((await request(app).post('/api/chat/send').auth(aliceToken, { type: 'bearer' }).send(message)).status).toBe(201);
  expect((await request(app).post('/api/chat/send').auth(aliceToken, { type: 'bearer' }).send(message)).status).toBe(409);
  expect((await request(app).get('/api/chat/' + message.chatId).auth(bobToken, { type: 'bearer' })).body).toHaveLength(1);
  const file = { owner: alice.username, receiver: bob.username, fileName: 'secret.txt', encryptedChunks: [{ index: 0, iv: 'iv', ciphertext: 'opaque' }], metadata: { timestamp: Math.floor(Date.now() / 1000) } };
  const upload = await request(app).post('/api/files/upload').auth(aliceToken, { type: 'bearer' }).send(file);
  expect(upload.status).toBe(201);
  expect((await request(app).get('/api/files/download/' + upload.body.fileId).auth(bobToken, { type: 'bearer' })).status).toBe(200);
});
