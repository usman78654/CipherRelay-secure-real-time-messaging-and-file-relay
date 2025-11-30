/**
 * Client-side encrypted file decryption scaffold.
 */

export const decryptFile = async (encryptedData, sessionKey) => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  const { fromBase64 } = await import('../utils/base64.js');
  const { encryptedChunks, metadata } = encryptedData;
  if (!Array.isArray(encryptedChunks)) throw new Error('Invalid encrypted data');

  const parts = [];
  for (const chunk of encryptedChunks) {
    const ivBytes = fromBase64(chunk.iv);
    const cipherBytes = fromBase64(chunk.ciphertext);
    const plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, sessionKey, cipherBytes.buffer);
    parts.push(new Uint8Array(plainBuf));
  }

  // Concatenate parts
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }

  // Return Blob for browser
  return new Blob([out]);
};
