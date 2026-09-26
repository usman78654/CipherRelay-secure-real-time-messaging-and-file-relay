# Secure Chat — cloud-portable DevOps portfolio

An educational encrypted chat and file-sharing application with a reproducible
single-host deployment. It combines React, Node.js, Socket.IO, MongoDB, Caddy,
Prometheus, Grafana, Docker Compose and GitHub Actions.

> Use synthetic data only. This is a portfolio security design, not an independently
> audited production messenger. Read [SECURITY.md](SECURITY.md) before evaluating its
> encryption claims.

## Verified capabilities

- Browser-side AES-256-GCM encryption for message and file content.
- Per-conversation keys derived with P-256 ECDH and HKDF-SHA-256.
- Non-exportable private identity keys stored as `CryptoKey` objects in IndexedDB.
- Immutable public identity keys registered with an account.
- Trust-on-first-use peer fingerprints that block later identity-key changes.
- Authenticated WebSockets, sender/owner binding and participant-only data access.
- Caddy same-origin routing, security headers and automatic HTTPS for a public domain.
- Health/readiness endpoints, structured logs and private Prometheus metrics.
- Provisioned Grafana dashboard and Prometheus alert rules.
- Backup/restore verification and immutable-tag deployment/rollback commands.
- GitHub Actions tests, container smoke tests, secret scanning and image reports.

## Security boundary

The server cannot derive conversation content keys from the registered public keys.
It can still see usernames, participants, timestamps, file names, sizes and traffic
patterns. The protocol uses static identity ECDH, so it has no forward secrecy. A
malicious server could substitute a key on first contact before it is pinned. There is
no multi-device key transfer or key recovery; deleting browser storage makes existing
ciphertext unreadable on that browser. See [SECURITY.md](SECURITY.md) for the full model.

## Run locally

Prerequisites: Docker Desktop/Engine with Compose v2 and Node.js 22.

```sh
node scripts/ops.mjs init
node scripts/ops.mjs up
```

The default URL is `http://localhost:8080`. This Windows workspace uses port `18080`
because port 8080 was unavailable. Register two fresh accounts in separate browser
profiles so each profile retains its own private keys.

Optional monitoring:

```sh
node scripts/ops.mjs monitor
```

Grafana is at `http://localhost:3001` (`admin`; generated password in
`.secrets/grafana_password). Prometheus is at `http://localhost:9091`.

## Operations

```sh
node scripts/ops.mjs status
node scripts/ops.mjs backup
node scripts/ops.mjs restore-check backups/ARCHIVE.archive.gz
node scripts/ops.mjs down
```

Normal shutdown preserves named volumes. Do not add `-v` unless intentionally deleting
disposable data.

## Documentation

- [Development plan](docs/DEVELOPMENT_PLAN.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Architecture and recruiter demo](docs/ARCHITECTURE.md)
- [Operations runbook](docs/RUNBOOK.md)
- [Local validation evidence](docs/VALIDATION.md)
- [Security model and limitations](SECURITY.md)

The remaining files under `docs/protocol`, `docs/report` and `attacks` are historical
course-project material. They do not override the current security boundary above.
