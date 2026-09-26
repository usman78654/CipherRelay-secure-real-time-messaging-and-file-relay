# Cloud-portable deployment

This is a single-host DevOps portfolio deployment. No AWS account, domain purchase,
managed database, or paid monitoring service is required for the local demo.
The application is educational. Its predictable chat-key fallback has been removed,
but its static ECDH design lacks forward secrecy, first-contact malicious-server
protection, multi-device support and recovery. Do not use real secrets or personal
files. See [SECURITY.md](../SECURITY.md).

## Quick start (Windows, macOS, Linux)

Prerequisites: Docker Engine/Desktop running Linux containers with Compose v2, Node.js 22,
and enough disk space for images. Allow roughly 2 GB RAM for the runtime with monitoring;
the client build can need additional memory. These are planning estimates, not benchmarks.

From the repository root:

```sh
node scripts/ops.mjs init
node scripts/ops.mjs up
```

Open http://localhost:8080. Register two test users in separate browser profiles.
Passwords must be at least 8 characters; usernames use 3-32 letters, digits, underscores
or hyphens. Select a contact, open Chat, exchange a message and a small test file.
The banner explains the known encryption limitation.

The init command is repeatable: it does not overwrite credentials or configuration.
Secrets are generated locally in ignored .secrets files and mounted only into services
that need them. On Linux the enclosing directory is 0700; mounted files are readable by
container users. On Windows protect the workspace with your account ACLs. Compose secrets
are file mounts, **not an encrypted secret vault**. Never commit .env, .secrets or backups.

MongoDB, the API and metrics have no host-published ports. Local web ports bind to
127.0.0.1. Data survives container recreation and normal shutdown.

```sh
node scripts/ops.mjs status
node scripts/ops.mjs down
```

## Optional local monitoring

```sh
node scripts/ops.mjs monitor
```

- Grafana: http://localhost:3001, user admin; read password from .secrets/grafana_password.
- Prometheus: http://localhost:9091.
- Grafana's Secure Chat folder has a provisioned Chat operations dashboard.
- API request rate, p95 latency, failures, active sockets and process memory are collected.
- Prometheus alert rules show API scrape failure and sustained HTTP error rate.
  They do not send notifications; no Alertmanager or external messaging is configured.
- Metrics use route templates rather than user IDs or arbitrary URL paths.
- Metrics retention is capped at three days / 256 MB; Docker logs rotate at 3 x 10 MB per service.

An idle system can show no request latency until you create traffic. These metrics are
single-process observations, not measured availability commitments. Database readiness is
reported separately at /health/ready; metrics being reachable does not imply DB readiness.

## HTTPS and a future cloud host

The same Compose file works on a Linux VM with Docker on AWS, Azure, GCP or another provider.
It does not provision or purchase any cloud resources. Check a provider's actual cost
terms before creating a host. A public VM is optional.

For a **test-data-only** public demo, configure .env with a DNS name resolving to the host:

```dotenv
SITE_ADDRESS=chat.example.org
ALLOWED_ORIGINS=https://chat.example.org
BIND_ADDRESS=0.0.0.0
HTTP_PORT=80
HTTPS_PORT=443
```

Open only inbound TCP 80/443 in the provider firewall. Caddy obtains and renews public
certificates automatically once DNS and public reachability work. Its data volume retains
certificates. Monitoring stays bound to loopback; access it through an SSH tunnel.
Local HTTP works because browsers treat localhost as a secure context for Web Crypto.
Plain HTTP on a remote IP will not provide a usable secure context.

For **local HTTPS** without a domain set SITE_ADDRESS=localhost and
ALLOWED_ORIGINS=https://localhost:8443. Caddy uses its local CA; export and trust that
CA on your test machine before browser use. Do not disable certificate verification
in your application or deployment scripts.

Keep TRUST_PROXY=1 only with the API behind the single Caddy proxy and without a
published API port. If you change proxy topology, review forwarded-header trust and
origin settings. CORS is not authentication.

## Release delivery and rollback

CI builds and tests the containers and performs a backup/restore drill. The manual
Publish release images workflow repeats server tests and container smoke tests before
pushing SHA-tagged images to GHCR. Publishing requires your repository's Actions/packages
permissions; it has not run merely because the files exist locally.

On the target host, set IMAGE_PREFIX=ghcr.io/YOUR_LOWERCASE_OWNER/e2e-chatapp in .env.
Use a public package or docker login for a private package. Then:

```sh
# POSIX shell example; SHA is the full commit printed by the workflow.
APP_TAG=SHA docker compose pull api web
node scripts/ops.mjs deploy SHA
```

On PowerShell, set $env:APP_TAG='SHA' for the pull, then remove that variable afterward.
Deploy uses --no-build and waits for container health. It records successful current
and previous tags in ignored .release-state.json. Run two successful releases to establish
a rollback target:

```sh
node scripts/ops.mjs rollback
```

This recreates services with a short outage. It is not blue/green or zero downtime.
Rollbacks require compatible database schemas and retained images. No automatic
remote deployment or cloud credentials are configured. A failed rollout attempts to
recover the last recorded healthy tag; if recovery also fails, use the runbook.
Use the release commands consistently.
The operations script honors the last successful release recorded in .release-state.json
when APP_TAG is not explicitly set; direct docker compose commands use the .env default.

## Verification

```sh
cd server/src
npm ci
npm test
cd ../..
node scripts/smoke.mjs
node scripts/ops.mjs backup
node scripts/ops.mjs restore-check backups/ARCHIVE.archive.gz
```

Smoke testing creates disposable test users/messages/files in the local app database.
It validates opaque payload transport, not cryptographic correctness. See [RUNBOOK.md](RUNBOOK.md)
for recovery and [ARCHITECTURE.md](ARCHITECTURE.md) for tradeoffs.
Recorded local results and remaining findings are in [VALIDATION.md](VALIDATION.md).

If your machine rejects port 8080, change HTTP_PORT and ALLOWED_ORIGINS together
in .env, recreate api/web, and set BASE_URL for scripts/smoke.mjs. The current Windows
workspace uses http://localhost:18080 and reserves 18443 for local HTTPS testing.

Official references: [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/),
[Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy),
[Prometheus configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/).
