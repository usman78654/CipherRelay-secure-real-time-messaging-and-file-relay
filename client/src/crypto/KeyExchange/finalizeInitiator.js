/**
 * Finalize initiator side of ECDH exchange.
 * Accepts initiator ephemeral keypair and responder packet (with ephPub)
 * Derives shared secret bits and produces a session CryptoKey via HKDF.
 */
export const finalizeInitiator = async (ephKeyPair, responderPacket) => {
  const { fromBase64 } = await import('../utils/base64.js');
  const { deriveSessionKey } = await import('./deriveSessionKey.js');

  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  if (!responderPacket || !responderPacket.publicData || !responderPacket.publicData.payload) {
    throw new Error('Invalid responder packet');
  }

  const parsed = JSON.parse(responderPacket.publicData.payload);
  const peerEphB64 = parsed.ephPub;
  const peerEphRaw = fromBase64(peerEphB64);

  const peerEphKey = await subtle.importKey('raw', peerEphRaw.buffer, { name: 'ECDH', namedCurve: 'P-256' }, true, []);

  const shared = await subtle.deriveBits({ name: 'ECDH', public: peerEphKey }, ephKeyPair.privateKey, 256);

  const sessionKey = await deriveSessionKey(shared, {});

  try { globalThis.currentSessionKey = sessionKey; } catch (e) { /* ignore */ }
  return sessionKey;
};
