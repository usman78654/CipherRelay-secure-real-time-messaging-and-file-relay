# Local validation — 2026-09-26

Validated on Windows with Docker Desktop Linux containers, Docker Engine 28.0.1,
Compose 2.33.1, and host Node.js 22.14.0. No cloud resources were created and no
changes were pushed to GitHub.

| Check | Result |
| --- | --- |
| Server Jest suite | 5 suites / 13 tests passed, including concurrent replay rejection |
| Production configuration | Missing/placeholder JWT secrets, wildcard origins and invalid proxy settings rejected |
| API authorization | Sender/owner spoofing rejected; message/file reads restricted to participants |
| Socket authentication | Anonymous connections and authenticated sender spoofing rejected |
| Logging | Malformed request secret canary absent from response/logs; audit payloads filtered |
| Container builds | API and React/Caddy images built successfully with npm ci |
| Proxied smoke test | Registration/login, Socket.IO relay, file upload/download, SPA routes and private metrics passed |
| Browser crypto helpers | 200 KB file round trip passed; tampering rejected; ECDH peers agreed; outsider decryption and changed keys rejected; browser ECDSA proof verified by Node |
| HTTPS | Caddy local CA certificate issued; readiness returned 200 using explicit CA validation, without modifying host trust |
| Monitoring | Prometheus target up; Grafana healthy with all six dashboard panels provisioned |
| Monitoring config | Prometheus configuration and alert rules validated with promtool |
| Backup/restore | 16 documents restored into an isolated temporary database; collections/indexes restored, temporary DB removed |
| Rollback | Deploy local, deploy rollback-drill, rollback to local succeeded; both tags referenced the same tested build, exercising operations rather than a schema migration |
| DB failure drill | Readiness 503 with MongoDB stopped; liveness 200; readiness recovered to 200 after restart |
| Repository checks | Compose/workflow YAML parsed and git diff --check passed |
| Source secret scan | Trivy found no matches in staged source, excluding local credentials/backups/dependencies |

## Vulnerability scan evidence

Trivy 0.65.0 scanned exported image archives without access to the Docker control
socket. Only HIGH and CRITICAL findings were requested. Reports are generated into
the ignored reports directory; counts are a point-in-time observation, not a security guarantee.

| Runtime image | HIGH | CRITICAL |
| --- | ---: | ---: |
| securechat-api:local | 0 | 0 |
| securechat-web:local (Caddy 2.11.4 Alpine) | 17 | 0 |

The API's unused npm/Corepack tooling was removed after the first scan found issues
in bundled npm dependencies. Updating Caddy reduced the initial web image findings
from 77 HIGH / 6 CRITICAL to 17 HIGH / 0 CRITICAL. Remaining findings are in the
upstream Go runtime and Go dependencies (x/crypto, x/net, x/text, grpc); they are
not suppressed or claimed to be harmless. Track patched upstream images and rescan.
CI vulnerability reports are informational; they currently do not block a release.

The legacy React build dependency installation also reported 30 vulnerabilities
(9 low, 7 moderate, 14 high). The build tooling is excluded from the final static
web image, but that does not prove all browser-bundled dependencies are safe.
The MongoDB, Grafana and Prometheus images have not been separately vulnerability-scanned.

## Practical limits

- The predictable fallback was removed after the earlier validation run. The replacement
  static ECDH/HKDF flow has a deterministic crypto test, but still has the trust,
  forward-secrecy and recovery limits described in SECURITY.md.
- HTTP/API and socket transport were tested programmatically. No full two-browser
  interactive UI/cryptographic handshake acceptance test was performed.
- The local HTTPS check used the initial Caddy image before its patch update; final
  Caddy routing was rechecked over HTTP. Public ACME/domain issuance is not verified.
- GitHub workflows are authored and locally checked; hosted CI, registry publication,
  and remote deployment have not run.
- There is no load-test-derived throughput, high availability, disaster recovery SLA,
  or independently audited E2EE claim.

The local stack is available at http://localhost:18080. Grafana is at
http://localhost:3001 (admin; password in .secrets/grafana_password), and Prometheus
at http://localhost:9091. Normal shutdown with node scripts/ops.mjs down preserves data.
