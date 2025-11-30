/**
 * Stores private/public keys securely in IndexedDB or encrypted storage.
 */

export const storeKeysSecurely = async (publicKey, privateKey) => {
  // publicKey/privateKey may be objects containing multiple keypairs
  // We'll persist exported JWK/SPKI material in IndexedDB via storage helper
  const { saveKeys } = await import('../../storage/indexedDB.js');
  const subtle = (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) ? window.crypto.subtle : (globalThis.crypto && globalThis.crypto.subtle) ? globalThis.crypto.subtle : null;
  if (!subtle) throw new Error('Web Crypto API not available');

  // Expect an object like { username, signing: { publicKey, privateKey }, ecdh: { publicKey, privateKey } }
  const id = publicKey.username || publicKey.id || 'local-user';

  const out = { id };

  if (publicKey.signing && publicKey.signing.publicKey) {
    const pubSpki = await subtle.exportKey('spki', publicKey.signing.publicKey);
    const privJwk = await subtle.exportKey('jwk', publicKey.signing.privateKey);
    out.signingPublic = Array.from(new Uint8Array(pubSpki));
    out.signingPrivate = privJwk;
  }

  if (publicKey.ecdh && publicKey.ecdh.publicKey) {
    const pubRaw = await subtle.exportKey('raw', publicKey.ecdh.publicKey);
    const privJwk = await subtle.exportKey('jwk', publicKey.ecdh.privateKey);
    out.ecdhPublic = Array.from(new Uint8Array(pubRaw));
    out.ecdhPrivate = privJwk;
  }

  // Persist under the `publicKey` field (saveKeys expects publicKey, privateKey)
  await saveKeys(id, out, null);
};
