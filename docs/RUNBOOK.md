# Operations and recovery runbook

## API unavailable

1. Run docker compose ps and docker compose logs --tail 100 api.
2. Check /health/live and /health/ready through the web port.
   Liveness means the HTTP process answers; readiness requires MongoDB connected and
   the process not draining. Startup waits for the database.
3. Check docker compose logs --tail 100 mongo. A credential file change alone does not
   update an existing database user: initialization only happens on an empty volume.
4. Check host free disk and memory. Restart policies restart exited containers; Compose
   does not automatically restart a process merely because it is unhealthy.
5. Restore the last known good configuration or image. Do not delete database volumes
   as a troubleshooting shortcut.

## Backup and restore

Run node scripts/ops.mjs backup. The API is stopped briefly so a standalone MongoDB
dump is consistent with respect to application writes, then restarted. Archives contain
password hashes, ciphertext and identifying metadata: keep backups private, encrypt them
with your storage tool, and do not commit/upload them to CI artifacts.

Run node scripts/ops.mjs restore-check backups/ARCHIVE.archive.gz. This restores the
archive to a unique temporary database, prints collection/document counts, then drops
only that temporary database. It verifies archive readability and database restore, not
client key recovery. Keep a separate encrypted offline copy; a volume on the same machine
is not a disaster-recovery backup.

For an actual replacement: take a fresh backup first, then run
node scripts/ops.mjs restore backups/ARCHIVE.archive.gz --replace.
This stops the API, restores with --drop and restarts it. The replace flag explicitly
acknowledges destructive database replacement. --drop replaces archived collections;
collections absent from the archive are not removed. Compare collection inventories
when restoring across schema versions.

Private browser keys are not in a server backup. Losing browser storage can make messages
unrecoverable under a corrected encryption protocol. Never claim a server backup recovers
client cryptographic keys. Record backup duration and restore duration during drills;
no RPO/RTO guarantee has been measured.

## Bad release

Read .release-state.json. If the latest deploy failed before state was updated, deploy
the recorded current tag explicitly. Otherwise run node scripts/ops.mjs rollback.
Check readiness, run the smoke script, and inspect error-rate metrics. Keep image tags
immutable and retain the previous image. A schema-breaking migration requires its own
data recovery plan.

## Database disconnect drill

With disposable local data: docker compose stop mongo. Readiness should become 503
after the driver notices the disconnect; liveness can remain 200.
Run docker compose start mongo and verify readiness recovers. The API-down alert only
detects a failed metrics scrape; it does not currently detect all database failures.

## HTTPS problems

Confirm DNS, inbound ports, site origin and Caddy logs. Preserve the caddy_data volume.
A localhost CA must be trusted explicitly. Use SSH tunnels for dashboards on remote hosts.

## Credential rotation

Changing jwt_secret then recreating api invalidates existing login tokens.
MongoDB passwords require changing the database user's password and mounted credential
together during maintenance; do not just edit the file. Grafana's bootstrap admin password
only applies on first initialization; rotate existing credentials through Grafana.
Store replacement secrets outside Git and take backups first.

## Dependency and image findings

CI emits HIGH/CRITICAL runtime image reports as short-lived artifacts. Vulnerability
reporting is informational, not a clean bill of health or an enforced vulnerability gate.
Secret scanning fails CI on detections. Review reports and Dependabot updates, distinguish
build-only from runtime exposure, update lockfiles/images and rerun tests. Avoid blanket
audit --force upgrades of the legacy React build chain.

## Shutdown

node scripts/ops.mjs down removes containers/networks, preserving all named volumes.
Never add -v unless intentionally destroying an entirely disposable environment.
Shutdown sends SIGTERM; the API stops accepting connections, closes sockets and disconnects
MongoDB with a 20-second deadline.
