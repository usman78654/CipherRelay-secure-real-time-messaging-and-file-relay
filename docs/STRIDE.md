# STRIDE Threat Model

This document summarizes the STRIDE threat analysis for the end-to-end encrypted chat & file sharing system.

System scope
- Clients (web browser / mobile app)
- Server (metadata relay, stores ciphertext only)
- Transport (HTTPS/WSS)
- Storage (MongoDB for metadata, S3-like for large files if used)

STRIDE categories and mitigations

- Spoofing (Authentication)
  - Threats: Impersonation of users, stolen JWTs.
  - Mitigations: Strong password hashing (bcrypt), JWT with short expiry and refresh policies, server-side audit logs for suspicious auth attempts, optional 2FA.

- Tampering (Integrity)
  - Threats: Modification of messages or file chunks in transit or at rest.
  - Mitigations: AES-GCM provides authenticity (authTag), server stores ciphertext only and rejects malformed metadata, signature verification for key-exchange ensures authenticity of public keys.

- Repudiation (Non-repudiation)
  - Threats: Users deny sending messages/files.
  - Mitigations: Server-side audit logs store event metadata (signatures, timestamps) and can be used as evidence; clients sign key-exchange steps with long-term keys.

- Information Disclosure (Confidentiality)
  - Threats: Server or MITM learning plaintext message/file contents.
  - Mitigations: True E2EE: symmetric keys derived from ephemeral ECDH; server only receives ciphertext + IV + metadata; keys never leave client.

- Denial of Service (Availability)
  - Threats: Flooding of file uploads or socket messages, oversized files.
  - Mitigations: Rate limiting middleware, maximum chunk/file size limits, backpressure on sockets, queueing and quotas per user.

- Elevation of Privilege (Authorization)
  - Threats: Privilege escalation to access other users' files or audit endpoints.
  - Mitigations: Proper `authMiddleware`, server-side access checks (owner/receiver), admin endpoints restricted via `ADMIN_USERS` env and role checks.

Notes & further work
- Consider using PFS (ephemeral keys per session) as implemented with ECDH ephemeral keys.
- Add key backup/recovery policies: users may lose long-term keys; provide optional secure key backup using client-side encryption under a user passphrase.
- For production, use HSM/KMS for any server-side sensitive operations and ensure HTTPS/TLS certs are valid.

References
- OWASP Top 10, NIST guidelines for key management, AES-GCM security notes.
