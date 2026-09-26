# Security status

This repository is an educational portfolio application, not a production secure messenger.
Use synthetic accounts and test files only.

## Current protocol boundary

New accounts publish immutable P-256 public identity keys at registration. Their
non-exportable private ECDH keys remain in browser IndexedDB. Each pair derives the same
non-exportable AES-256-GCM key through ECDH and HKDF-SHA-256; the predictable fallback
has been removed. A peer fingerprint is pinned on first contact and later changes block
the chat. Message ciphertext is bound to chat/sender/receiver metadata with GCM AAD.

This is a reviewed portfolio design, not an independently audited messenger protocol.
Trust on first use cannot detect a malicious server substituting a key on the first
contact. Static identity ECDH does not provide forward secrecy. There is no multi-device
key transfer or private-key recovery; clearing browser data makes old ciphertext
unreadable. File names and routing/timing metadata remain visible to the server.

The deployment adds a visible demo banner, loopback defaults, authenticated sockets,
sender/owner binding, participant-only message/file reads, safer audit fields, restricted
origins and production secret validation. These changes do not constitute a full audit.

Before using sensitive data: adopt a standardized audited protocol with prekeys and
ratcheting, add an out-of-band safety-number comparison, design multi-device/recovery
flows, review metadata leakage and browser storage, and obtain an independent review.

## Secrets

Use scripts/ops.mjs init. Never commit .env, .secrets, backups or real private keys.
Compose file secrets are not an encrypted vault. Production startup refuses missing or
obviously placeholder JWT secrets. Browser-visible environment variables must never
contain secrets.

## Reporting

Report a vulnerability privately through GitHub's security reporting feature if enabled
for this repository. Do not include credentials or real user data in a public issue.
