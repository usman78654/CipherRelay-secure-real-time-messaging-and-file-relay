/**
 * Step 2: Respond to incoming key exchange.
 */

export const respondToKeyExchange = async (incoming) => {
  const { loadUserKeys } = await import('../keygen/loadKeys.js');
  const { respondToKeyExchange: apiRespond } = await import('../../api/keyExchangeAPI.js');
  const { fromBase64, toBase64 } = await import('../utils/base64.js');

  const keys = await loadUserKeys();
  if (!keys || !keys.privateKey || !keys.publicKey) throw new Error('User long-term keys not found.');

  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  // incoming: { sender, receiver, step, publicData }
  const { sender, publicData } = incoming;
  if (!publicData || !publicData.payload || !publicData.signature || !publicData.pubKeyPem) {
    throw new Error('Invalid incoming key exchange packet');
  }

  // Verify incoming signature using sender's pubKeyPem
  // Convert PEM (we used base64 in PEM body) to SPKI buffer
  const pemBody = publicData.pubKeyPem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '');
  const spki = fromBase64(pemBody);
  const peerPubKey = await subtle.importKey('spki', spki.buffer, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);

  const payloadBytes = new TextEncoder().encode(publicData.payload);
  const sigBytes = fromBase64(publicData.signature);
  const valid = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, peerPubKey, sigBytes.buffer, payloadBytes);
  if (!valid) throw new Error('Invalid signature on incoming key exchange');

  // Parse payload to extract peer ephemeral public key
  const parsed = JSON.parse(publicData.payload);
  const peerEphB64 = parsed.ephPub;
  const peerEphRaw = fromBase64(peerEphB64);

  // Generate our ephemeral ECDH keypair
  const eph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
  const ourPubRaw = await subtle.exportKey('raw', eph.publicKey);
  const ourPubB64 = toBase64(new Uint8Array(ourPubRaw));

  // Import peer ephemeral public key for deriveBits
  const peerEphKey = await subtle.importKey('raw', peerEphRaw.buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);

  // Derive shared secret bits
  const shared = await subtle.deriveBits({ name: 'ECDH', public: peerEphKey }, eph.privateKey, 256);

  // Derive session key using HKDF
  const { deriveSessionKey } = await import('./deriveSessionKey.js');
  const sessionKey = await deriveSessionKey(shared, {});

  // Build response payload and sign it
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ ephPub: ourPubB64, timestamp });
  const sigBuf = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, new TextEncoder().encode(payload));
  const signatureB64 = toBase64(new Uint8Array(sigBuf));

  const spkiExport = await subtle.exportKey('spki', keys.publicKey);
  const pubKeyPem = `-----BEGIN PUBLIC KEY-----\n${toBase64(new Uint8Array(spkiExport))}\n-----END PUBLIC KEY-----`;

  const packet = {
    sender: keys.username || 'me',
    receiver: sender,
    step: 'respond',
    publicData: {
      payload,
      signature: signatureB64,
      pubKeyPem,
      timestamp
    }
  };

  const res = await apiRespond(packet);
  // Store current session key for confirmation/decryption flows
  try { globalThis.currentSessionKey = sessionKey; } catch (e) { /* ignore */ }
  return { success: true, sessionKey, ephKeyPair: eph, serverRes: res.data };
};
