/**
 * Step 1: Initiator sends DH/ECDH public component + signature.
 */

export const initiateKeyExchange = async (targetUser) => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  const subtle = window.crypto.subtle;

  // Load user's long-term keys
  const { loadKeysSecurely } = await import('../keygen/loadKeys.js');
  const keys = await loadKeysSecurely();
  
  if (!keys || !keys.signing) {
    throw new Error('User signing keys not found. Please generate keys first.');
  }

  // Generate ephemeral ECDH keypair for this session
  const eph = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  
  // Export ephemeral public key
  const rawPub = await subtle.exportKey('raw', eph.publicKey);
  const ephPubB64 = btoa(String.fromCharCode(...new Uint8Array(rawPub)));

  const timestamp = Math.floor(Date.now() / 1000);
  const username = targetUser.username || targetUser.name || targetUser.id;
  
  // Create payload with ephemeral public key and timestamp
  const payload = JSON.stringify({
    ephPub: ephPubB64,
    timestamp,
    sender: keys.username || 'me',
    receiver: username
  });

  // Sign payload with long-term ECDSA private key
  const payloadBytes = new TextEncoder().encode(payload);
  const sigBuf = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keys.signing.privateKey,
    payloadBytes
  );
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  // Export long-term public key for verification
  const spki = await subtle.exportKey('spki', keys.signing.publicKey);
  const spkiB64 = btoa(String.fromCharCode(...new Uint8Array(spki)));

  const packet = {
    sender: keys.username || 'me',
    receiver: username,
    step: 'initiate',
    publicData: {
      payload,
      signature: signatureB64,
      pubKeyB64: spkiB64,
      timestamp
    }
  };

  console.log('🔐 Key Exchange Initiated:', {
    to: username,
    ephemeralPublicKey: ephPubB64.substring(0, 20) + '...',
    signed: true
  });

  // Store locally instead of sending to server for now
  sessionStorage.setItem(`keyExchange_${username}`, JSON.stringify(packet));

  return {
    success: true,
    ephKeyPair: eph,
    packet
  };
};
