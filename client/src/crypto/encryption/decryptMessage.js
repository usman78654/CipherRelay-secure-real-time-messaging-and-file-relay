/**
 * AES-256-GCM message decryption scaffolding.
 */

export const decryptMessage = async (encryptedPacket, sessionKey) => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  // encryptedPacket: { ciphertext: base64, iv: base64, authTag: base64 }
  const fromBase64 = (str) => {
    if (!str) throw new Error('Empty base64 string');
    const binary = atob(str);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  try {
    const ctext = fromBase64(encryptedPacket.ciphertext);
    const iv = fromBase64(encryptedPacket.iv);
    const authTag = encryptedPacket.authTag ? fromBase64(encryptedPacket.authTag) : new Uint8Array(16);

    // Reconstruct combined cipher+tag as expected by WebCrypto
    const combined = new Uint8Array(ctext.length + authTag.length);
    combined.set(ctext, 0);
    if (authTag.length) combined.set(authTag, ctext.length);

    const plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv }, sessionKey, combined.buffer);
    const dec = new TextDecoder();
    return dec.decode(plainBuf);
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error(`Failed to decrypt message: ${err.message}`);
  }
};
