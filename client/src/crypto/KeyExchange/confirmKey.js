/**
 * Step 3: Final key confirmation message.
 */

export const confirmSessionKey = async (receiver) => {
  // Confirm session key by sending a signed fingerprint of the derived AES key
  const { loadUserKeys } = await import('../keygen/loadKeys.js');
  const { confirmSessionKey: apiConfirm } = await import('../../api/keyExchangeAPI.js');
  const { toBase64 } = await import('../utils/base64.js');

  const keys = await loadUserKeys();
  if (!keys || !keys.privateKey || !keys.publicKey) throw new Error('User long-term keys not found.');

  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  // Expect there's a stored sessionKey in memory or passed in; for this helper assume a global `currentSessionKey`
  if (!globalThis.currentSessionKey) throw new Error('No current session key available to confirm');

  const raw = await subtle.exportKey('raw', globalThis.currentSessionKey);
  const hashBuf = await subtle.digest('SHA-256', raw);
  const fingerprint = toBase64(new Uint8Array(hashBuf));

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ fingerprint, timestamp });
  const sigBuf = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, new TextEncoder().encode(payload));
  const signatureB64 = toBase64(new Uint8Array(sigBuf));

  const spki = await subtle.exportKey('spki', keys.publicKey);
  const pubKeyPem = `-----BEGIN PUBLIC KEY-----\n${toBase64(new Uint8Array(spki))}\n-----END PUBLIC KEY-----`;

  const packet = {
    sender: keys.username || 'me',
    receiver: receiver || null,
    step: 'confirm',
    publicData: { payload, signature: signatureB64, pubKeyPem, timestamp }
  };

  const res = await apiConfirm(packet);
  return { success: true, serverRes: res.data };
};
