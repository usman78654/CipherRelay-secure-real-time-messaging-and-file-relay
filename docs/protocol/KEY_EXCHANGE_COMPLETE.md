# Conversation Key Agreement

## Current implementation

Each browser creates two P-256 identity key pairs during registration:

- ECDSA for proving ownership of the registered identity bundle.
- ECDH for deriving conversation secrets.

The public keys and registration proof are stored by the API. Private keys are
non-exportable Web Crypto keys stored in the browser's IndexedDB. For a chat,
each participant combines their private ECDH key with the peer's public ECDH key,
then uses HKDF-SHA-256 to derive an AES-256-GCM conversation key. Both sides use
the same canonical conversation context as HKDF input.

The browser pins the peer identity fingerprint on first use. A later identity
change stops the conversation until the local pin is deliberately cleared. If a
private key or peer public key is missing, sending and decryption fail closed.
There is no password-, username-, or chat-ID-derived fallback.

Messages bind the chat ID, sender, and recipient as AES-GCM additional
authenticated data. The server atomically enforces monotonically increasing
sequence numbers to reject replayed message envelopes.

## Security boundary

This is an educational static-key ECDH design. It provides encrypted message and
file contents and detects a peer key change after the first successful contact.
It does not provide forward secrecy, post-compromise security, authenticated
first contact against a malicious server, multi-device key synchronization, or
account recovery. A production messenger should use a reviewed protocol such as
X3DH plus Double Ratchet rather than extending this custom protocol.

Operational metadata remains visible to the service, including usernames,
participants, timestamps, message sizes, and file names.

## Implementation and validation

- `client/src/crypto/KeyExchange/conversationKey.js` derives keys and manages
  trust-on-first-use identity pins.
- `client/src/crypto/keygen/generateKeys.js` creates identity keys and the signed
  registration proof.
- `client/src/pages/ChatRoom.jsx` blocks chat until key derivation succeeds.
- `client/src/tests/conversation_crypto_demo.cjs` verifies matching peer keys,
  outsider decryption failure, identity-change blocking, and registration-proof
  interoperability.
- Server tests verify public-key validation and concurrent replay rejection.

The former incomplete ephemeral exchange and PBKDF2 compatibility fallback were
removed. See `SECURITY.md` and `docs/DEVELOPMENT_PLAN.md` for current limitations
and planned protocol work.
