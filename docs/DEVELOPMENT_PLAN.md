# Development plan

## Release target

Produce a clean, cloud-portable portfolio repository whose tested behavior matches its
documentation. The application must refuse insecure operation rather than silently
falling back to predictable cryptography.

## Phase 1 — encryption protocol correction

- Register each account with immutable ECDSA and ECDH public identity keys.
- Keep private keys non-exportable and stored as browser `CryptoKey` objects in IndexedDB.
- Derive a per-conversation AES-256-GCM key with P-256 ECDH and HKDF-SHA-256.
- Pin peer-key fingerprints on first use and block later key changes.
- Remove the username-derived PBKDF2 fallback and exported session-key storage.
- Bind ciphertext to conversation/sender/receiver metadata with AES-GCM additional data.
- Add browser-crypto protocol tests proving both peers derive the same key, a third party
  cannot decrypt, tampering fails, and a changed identity key is detected.

Acceptance: no predictable fallback remains; missing or changed keys stop sending;
two fresh accounts can exchange and decrypt messages/files.

## Phase 2 — application correctness and security

- Validate key formats and identity ownership at registration and API/socket boundaries.
- Make replay counters atomic under concurrency and constrain payload schemas/sizes.
- Remove obsolete handshake endpoints and misleading historical claims.
- Improve login/session restoration, errors, accessibility, and recovery when browser
  keys are lost.

Acceptance: authorization, validation, replay, recovery and negative tests pass.

## Phase 3 — supply chain and runtime images

- Keep runtime images minimal and scan exported archives without Docker-socket access.
- Update patched upstream images promptly; document any findings that cannot yet be fixed.
- Replace the legacy Create React App build chain in a separate reviewed migration.
- Generate an SBOM and attach scan reports to CI artifacts.

Acceptance: no known fixable HIGH/CRITICAL runtime findings; remaining upstream findings
have owners, upgrade conditions and an explicit risk record.

## Phase 4 — repository release

- Run unit/integration tests, container smoke tests, HTTPS, monitoring, backup/restore,
  outage and rollback drills from a clean checkout.
- Create the new GitHub repository, push only tracked source, run hosted Actions, publish
  immutable SHA-tagged images, and verify a fresh-machine install from the README.

Acceptance: hosted CI is green and the validation report contains only observed results.
