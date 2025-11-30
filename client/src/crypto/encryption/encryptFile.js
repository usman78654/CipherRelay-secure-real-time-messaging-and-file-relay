/**
 * Client-side file AES-GCM encryption scaffold.
 * Supports chunking if needed.
 */

export const encryptFile = async (file, sessionKey) => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  const CHUNK_SIZE = 64 * 1024; // 64KB default
  const toArrayBuffer = async (input) => {
    if (input instanceof ArrayBuffer) return input;
    if (input instanceof Uint8Array) return input.buffer;
    if (typeof Blob !== 'undefined' && input instanceof Blob) return await input.arrayBuffer();
    throw new Error('Unsupported file input');
  };

  const buf = await toArrayBuffer(file);
  const bytes = new Uint8Array(buf);
  const total = bytes.length;
  const chunks = [];

  for (let offset = 0, idx = 0; offset < total; offset += CHUNK_SIZE, idx++) {
    const slice = bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, total));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipherBuf = await subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, slice);
    const cipherBytes = new Uint8Array(cipherBuf);
    // Convert to base64 for transport/storage
    const { toBase64 } = await import('../utils/base64.js');
    chunks.push({ index: idx, iv: toBase64(iv), ciphertext: toBase64(cipherBytes) });
  }

  const metadata = { chunkSize: CHUNK_SIZE, totalSize: total, chunks: chunks.length, timestamp: Math.floor(Date.now() / 1000) };
  return { encryptedChunks: chunks, metadata };
};
