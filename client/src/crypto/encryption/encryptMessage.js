/**
 * AES-256-GCM message encryption scaffolding.
 */

export const encryptMessage = async (plaintext, sessionKey) => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  // plaintext: string
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);

  // 96-bit IV recommended for GCM
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);

  const cipherBuf = await subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, data);

  // WebCrypto returns ciphertext with auth tag appended (16 bytes)
  const cipherBytes = new Uint8Array(cipherBuf);
  const tagLen = 16;
  const ctext = cipherBytes.subarray(0, cipherBytes.length - tagLen);
  const authTag = cipherBytes.subarray(cipherBytes.length - tagLen);

  // Base64 encode using built-in helpers (atob/btoa)
  const toBase64 = (buf) => {
    let binary = '';
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  };

  return {
    ciphertext: toBase64(ctext),
    iv: toBase64(iv),
    authTag: toBase64(authTag)
  };
};
