/**
 * Uses HKDF/SHA-256 to generate a session key.
 * No implementation (policy). Only structure.
 */

export const deriveSessionKey = async (sharedSecret, options = {}) => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available for HKDF');
  }
  const subtle = window.crypto.subtle;

  const secretBytes = sharedSecret instanceof Uint8Array ? sharedSecret : new Uint8Array(sharedSecret);
  const salt = options.salt || new Uint8Array([]);
  const info = options.info || new Uint8Array([]);

  const saltBytes = salt instanceof Uint8Array ? salt : new Uint8Array(salt);
  const infoBytes = info instanceof Uint8Array ? info : new Uint8Array(info);

  const baseKey = await subtle.importKey('raw', secretBytes, { name: 'HKDF' }, false, ['deriveKey']);

  const derivedKey = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBytes,
      info: infoBytes
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return derivedKey; // CryptoKey usable for AES-GCM

};
