/**
 * Placeholder for RSA/ECC key generation using WebCrypto.
 * DO NOT implement full logic here (LLM policy).
 */

export const generateUserKeyPair = async () => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  // Generate signing key (ECDSA P-256)
  const signKeyPair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign', 'verify']
  );

  // Generate ECDH key for key agreement (P-256)
  const ecdhKeyPair = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );

  return {
    signing: signKeyPair,
    ecdh: ecdhKeyPair
  };
};

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export const exportPublicIdentityKeys = async (keys, username) => {
  const signingPublicKey = toBase64(await window.crypto.subtle.exportKey('spki', keys.signing.publicKey));
  const agreementPublicKey = toBase64(await window.crypto.subtle.exportKey('raw', keys.ecdh.publicKey));
  const proof = new TextEncoder().encode(`securechat-identity-v1\u0000${username}\u0000${agreementPublicKey}`);
  const proofSignature = toBase64(await window.crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.signing.privateKey, proof));
  return { signingPublicKey, agreementPublicKey, proofSignature };
};
