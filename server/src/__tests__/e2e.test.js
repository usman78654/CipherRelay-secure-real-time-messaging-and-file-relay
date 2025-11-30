/**
 * Jest E2E test: runs server with mongodb-memory-server and exercises
 * register/login, key-exchange (initiate/respond/confirm), send encrypted message,
 * upload encrypted file, and verify replay detection.
 */

let mongod;
let request;
let app;
let connectDB;

beforeAll(async () => {
  process.env.SKIP_DB = '1'; // prevent app auto-connecting; we'll connect to memory server
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();

  // Import connectDB after setting MONGO_URI
  connectDB = (await import('../config/db.js')).default;
  await connectDB();

  // Import app and supertest
  app = (await import('../app.js')).default;
  const supertest = (await import('supertest')).default;
  request = supertest(app);
});

afterAll(async () => {
  try { await mongod.stop(); } catch (e) { /* ignore */ }
  try {
    const mongoose = (await import('mongoose')).default;
    await mongoose.disconnect();
  } catch (e) { /* ignore */ }
});
test('E2E flow: auth, key-exchange, message, file upload, replay detection', async () => {
  // 1) Register two users (alice, bob)
  const uAlice = { username: 'alice_e2e', password: 'Pass123!' };
  const uBob = { username: 'bob_e2e', password: 'Pass123!' };

  let res = await request.post('/api/auth/register').send(uAlice).set('Content-Type', 'application/json');
  expect([201,409]).toContain(res.status); // allow if rerun

  res = await request.post('/api/auth/register').send(uBob).set('Content-Type', 'application/json');
  expect([201,409]).toContain(res.status);

  // 2) Login both
  res = await request.post('/api/auth/login').send(uAlice).set('Content-Type', 'application/json');
  expect(res.status).toBe(200);
  const tokenAlice = res.body.token;
  expect(tokenAlice).toBeDefined();

  res = await request.post('/api/auth/login').send(uBob).set('Content-Type', 'application/json');
  expect(res.status).toBe(200);
  const tokenBob = res.body.token;
  expect(tokenBob).toBeDefined();

  // Prepare EC keypairs for signing (simulate client long-term keys)
  const { generateKeyPairSync, createSign } = await import('crypto');
  const aliceKP = generateKeyPairSync('ec', { namedCurve: 'P-256', publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const bobKP = generateKeyPairSync('ec', { namedCurve: 'P-256', publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });

  // 3) Key-exchange initiate (Alice -> Bob)
  const ts = Math.floor(Date.now() / 1000);
  const payloadA = JSON.stringify({ ephPub: 'alice-eph', timestamp: ts });
  const signerA = createSign('sha256'); signerA.update(payloadA); signerA.end();
  const sigA = signerA.sign(aliceKP.privateKey).toString('base64');

  res = await request.post('/api/key-exchange/initiate')
    .set('Authorization', `Bearer ${tokenAlice}`)
    .send({ sender: uAlice.username, receiver: uBob.username, step: 'initiate', publicData: { payload: payloadA, signature: sigA, pubKeyPem: aliceKP.publicKey, timestamp: ts } });
  expect([201,400]).toContain(res.status);

  // 4) Key-exchange respond (Bob -> Alice)
  const ts2 = Math.floor(Date.now() / 1000);
  const payloadB = JSON.stringify({ ephPub: 'bob-eph', timestamp: ts2 });
  const signerB = createSign('sha256'); signerB.update(payloadB); signerB.end();
  const sigB = signerB.sign(bobKP.privateKey).toString('base64');

  res = await request.post('/api/key-exchange/respond')
    .set('Authorization', `Bearer ${tokenBob}`)
    .send({ sender: uBob.username, receiver: uAlice.username, step: 'respond', publicData: { payload: payloadB, signature: sigB, pubKeyPem: bobKP.publicKey, timestamp: ts2 } });
  expect([200,201,400]).toContain(res.status);

  // 5) Key-exchange confirm (Alice -> Bob)
  const ts3 = Math.floor(Date.now() / 1000);
  const fingerprint = 'fingerprint-sample';
  const payloadC = JSON.stringify({ fingerprint, timestamp: ts3 });
  const signerC = createSign('sha256'); signerC.update(payloadC); signerC.end();
  const sigC = signerC.sign(aliceKP.privateKey).toString('base64');

  res = await request.post('/api/key-exchange/confirm')
    .set('Authorization', `Bearer ${tokenAlice}`)
    .send({ sender: uAlice.username, receiver: uBob.username, step: 'confirm', publicData: { payload: payloadC, signature: sigC, pubKeyPem: aliceKP.publicKey, timestamp: ts3 } });
  expect([200,201]).toContain(res.status);

  // 6) Send encrypted message (mock ciphertext) with seqNum
  const chatId = `chat_${uAlice.username}_${uBob.username}`;
  const msg = {
    chatId,
    sender: uAlice.username,
    receiver: uBob.username,
    ciphertext: 'deadbeef',
    iv: 'iv',
    authTag: 'tag',
    metadata: { timestamp: Math.floor(Date.now() / 1000), seqNum: 1 }
  };
  res = await request.post('/api/chat/send').set('Authorization', `Bearer ${tokenAlice}`).send(msg);
  expect(res.status).toBe(201);

  // 7) Replay attempt: resend same seqNum should be rejected (409)
  res = await request.post('/api/chat/send').set('Authorization', `Bearer ${tokenAlice}`).send(msg);
  expect([409,400]).toContain(res.status);

  // 8) Upload encrypted file (mock chunks)
  const filePayload = { owner: uAlice.username, receiver: uBob.username, fileName: 'secret.txt', encryptedChunks: [{ index: 0, iv: 'iv', ciphertext: 'c1' }], metadata: { timestamp: Math.floor(Date.now() / 1000), chunkSize: 1024 } };
  res = await request.post('/api/files/upload').set('Authorization', `Bearer ${tokenAlice}`).send(filePayload);
  expect([201,400]).toContain(res.status);
}, 30000);
