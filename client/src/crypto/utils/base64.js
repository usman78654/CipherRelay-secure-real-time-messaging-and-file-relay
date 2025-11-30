/**
 * Base64 helpers for encoding/decoding.
 */
export const toBase64 = (buffer) => {
  // Accept ArrayBuffer or Uint8Array
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  // btoa works on binary strings in browsers; in Node use Buffer
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
};

export const fromBase64 = (str) => {
  // atob available in browsers; in Node use Buffer
  let binary;
  if (typeof atob === 'function') binary = atob(str);
  else binary = Buffer.from(str, 'base64').toString('binary');
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};
