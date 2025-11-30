// Node-friendly demo of in-process key exchange between Initiator and Responder
(async () => {
  const path = require('path');
  const root = path.resolve(__dirname, '..');

  const { pathToFileURL } = require('url');
  const importE = (p) => import(pathToFileURL(path.join(root, p)).href);

  // Load helpers
  const genMod = await importE('crypto/keygen/generateKeys.js');
  const storeMod = await importE('crypto/keygen/storeKeys.js');
  const loadMod = await importE('crypto/keygen/loadKeys.js');
  const initMod = await importE('crypto/KeyExchange/initiateExchange.js');
  const respMod = await importE('crypto/KeyExchange/respondExchange.js');
  const finMod = await importE('crypto/KeyExchange/finalizeInitiator.js');
  const base64 = await importE('crypto/utils/base64.js');

  console.log('Starting key-exchange demo (in-process)');

  const subtle = (globalThis.crypto && globalThis.crypto.subtle) ? globalThis.crypto.subtle : require('crypto').webcrypto.subtle;

  // Generate two users: alice (initiator) and bob (responder)
  console.log('Generating keys for alice and bob...');
  const aliceKeys = await genMod.generateUserKeyPair();
  const bobKeys = await genMod.generateUserKeyPair();

  // Store them in-memory via the save helper (IndexedDB not available in Node); the storeKeys helper uses saveKeys so skip actual persistence.
  // Instead, we'll use the key objects directly when calling helpers by patching loadUserKeys behavior is not trivial here, so we will directly call functions.

  // Initiator (Alice) creates ephemeral and signed packet -- but original initiate sends to server via API.
  // For demo we build the packet locally similar to initiateKeyExchange, then pass it to responder flow.

  // Export Alice long-term signing public key SPKI and private JWK for signing
  const aliceSpki = await subtle.exportKey('spki', aliceKeys.signing.publicKey);
  const aliceSpkiB64 = base64.toBase64(new Uint8Array(aliceSpki));

  // Build keys object shape expected by existing helpers (loadUserKeys returns signing keys under publicKey/privateKey)
  const aliceLegacy = { publicKey: aliceKeys.signing.publicKey, privateKey: aliceKeys.signing.privateKey, username: 'alice' };
  const bobLegacy = { publicKey: bobKeys.signing.publicKey, privateKey: bobKeys.signing.privateKey, username: 'bob' };

  // Create ephemeral for Alice
  const aliceEph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
  const aliceEphRaw = await subtle.exportKey('raw', aliceEph.publicKey);
  const aliceEphB64 = base64.toBase64(new Uint8Array(aliceEphRaw));

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ ephPub: aliceEphB64, timestamp });

  const sigBuf = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, aliceLegacy.privateKey, new TextEncoder().encode(payload));
  const signatureB64 = base64.toBase64(new Uint8Array(sigBuf));

  const alicePacket = {
    sender: 'alice',
    receiver: 'bob',
    step: 'initiate',
    publicData: { payload, signature: signatureB64, pubKeyPem: `-----BEGIN PUBLIC KEY-----\n${aliceSpkiB64}\n-----END PUBLIC KEY-----`, timestamp }
  };

  console.log('Alice -> Bob packet prepared');

  // Responder: verify signature using aliceSpki and derive session key with bob ephemeral
  // We'll reuse logic from respondToKeyExchange but supply bob's signing keys directly by calling its internal steps here.
  console.log('Bob processing incoming packet...');
  // Import alice's spki
  const aliceSpkiBuf = base64.fromBase64(aliceSpkiB64);
  const alicePubKey = await subtle.importKey('spki', aliceSpkiBuf.buffer, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);

  const payloadBytes = new TextEncoder().encode(alicePacket.publicData.payload);
  const sigBytes = base64.fromBase64(alicePacket.publicData.signature);
  const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, alicePubKey, sigBytes.buffer, payloadBytes);
  if (!ok) throw new Error('Signature verification failed in demo');
  console.log('Bob verified Alice signature');

  // parse alice eph
  const parsed = JSON.parse(alicePacket.publicData.payload);
  const aliceEphRawBuf = base64.fromBase64(parsed.ephPub);

  const aliceEphKey = await subtle.importKey('raw', aliceEphRawBuf.buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);

  // Bob generates ephemeral
  const bobEph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const bobPubRaw = await subtle.exportKey('raw', bobEph.publicKey);
  const bobPubB64 = base64.toBase64(new Uint8Array(bobPubRaw));

  // Bob derives shared secret
  const bobShared = await subtle.deriveBits({ name: 'ECDH', public: aliceEphKey }, bobEph.privateKey, 256);
  const deriveMod = await importE('crypto/KeyExchange/deriveSessionKey.js');
  const bobSession = await deriveMod.deriveSessionKey(bobShared, {});

  console.log('Bob derived session key');

  // Alice derives shared secret using bobPub
  const bobPubRawBuf = base64.fromBase64(bobPubB64);
  const bobEphKeyImported = await subtle.importKey('raw', bobPubRawBuf.buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  const aliceShared = await subtle.deriveBits({ name: 'ECDH', public: bobEphKeyImported }, aliceEph.privateKey, 256);
  const aliceSession = await deriveMod.deriveSessionKey(aliceShared, {});

  // Export both session keys raw and compare hash/fingerprint
  const aRaw = await subtle.exportKey('raw', aliceSession);
  const bRaw = await subtle.exportKey('raw', bobSession);
  const hash = await subtle.digest('SHA-256', aRaw);
  const hash2 = await subtle.digest('SHA-256', bRaw);

  const same = Buffer.from(hash).toString('hex') === Buffer.from(hash2).toString('hex');
  console.log('Session keys match:', same);
  console.log('Alice fingerprint:', Buffer.from(hash).toString('hex'));
  console.log('Bob   fingerprint:', Buffer.from(hash2).toString('hex'));

  process.exit(same ? 0 : 2);

})();
