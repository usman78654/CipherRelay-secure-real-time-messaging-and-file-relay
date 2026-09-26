import { loadKeysSecurely } from '../keygen/loadKeys.js';
import { fromBase64, toBase64 } from '../utils/base64.js';

const encoder = new TextEncoder();

export async function identityFingerprint(identityKeys) {
  if (!identityKeys?.signingPublicKey || !identityKeys?.agreementPublicKey) throw new Error('Contact has no registered identity keys.');
  const canonical = `${identityKeys.signingPublicKey}.${identityKeys.agreementPublicKey}`;
  const digest = await window.crypto.subtle.digest('SHA-256', encoder.encode(canonical));
  return toBase64(new Uint8Array(digest)).replace(/=+$/, '');
}

export function pinPeerIdentity(username, fingerprint) {
  const key = `securechat:identity:v1:${username}`;
  const pinned = localStorage.getItem(key);
  if (pinned && pinned !== fingerprint) throw new Error(`Safety check failed: ${username}'s identity key changed. Do not continue until you verify the contact.`);
  if (!pinned) localStorage.setItem(key, fingerprint);
}

export async function deriveConversationKey({ localUsername, peerUsername, peerIdentityKeys, pin = true }) {
  const localKeys = await loadKeysSecurely(localUsername);
  if (!localKeys?.ecdh?.privateKey) throw new Error('Your private agreement key is missing. This account cannot decrypt on this browser.');
  const fingerprint = await identityFingerprint(peerIdentityKeys);
  if (pin) pinPeerIdentity(peerUsername, fingerprint);
  const key = await deriveConversationKeyFromPrivate({ localUsername, peerUsername, privateKey: localKeys.ecdh.privateKey, peerAgreementPublicKey: peerIdentityKeys.agreementPublicKey });
  return { key, fingerprint };
}

export async function deriveConversationKeyFromPrivate({ localUsername, peerUsername, privateKey, peerAgreementPublicKey }) {
  const peerPublic = await window.crypto.subtle.importKey(
    'raw', fromBase64(peerAgreementPublicKey),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const shared = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: peerPublic }, privateKey, 256
  );
  const participants = [localUsername, peerUsername].sort().join('\u0000');
  const salt = await window.crypto.subtle.digest('SHA-256', encoder.encode(`securechat:v1:${participants}`));
  const material = await window.crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  const key = await window.crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: encoder.encode('securechat conversation AES-256-GCM') },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
  return key;
}
