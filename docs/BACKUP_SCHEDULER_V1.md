# Backup Scheduler v1

## Goal

Make PostgreSQL backups a routine operation, not a manual memory test.

Existing tools:

- `scripts/backup-db.sh`
- `scripts/restore-db.sh`
- `pnpm backup:db`
- `pnpm restore:db`

This document adds scheduling and ownership guidance. It does not implement S3,
Backblaze, NAS, or external disk upload automation.

## Recommended production schedule

Minimum for a small factory:

- daily backup every night
- manual backup before every deployment/migration
- monthly restore rehearsal

Recommended cron:

```cron
# Daily Paypoq OS backup at 02:30 server time.
30 2 * * * cd /opt/paypoq-os && /usr/bin/env BACKUP_DIR=/var/backups/paypoq-os DATABASE_URL='postgresql://...' pnpm backup:db >> /var/log/paypoq-backup.log 2>&1
```

If the server runs PostgreSQL inside Docker:

```cron
# Daily Docker-container PostgreSQL backup.
30 2 * * * cd /opt/paypoq-os && /usr/bin/env BACKUP_DIR=/var/backups/paypoq-os PG_DOCKER_CONTAINER=paypoq-postgres PGUSER=postgres PGPASSWORD='...' PGDATABASE=paypoq_os pnpm backup:db >> /var/log/paypoq-backup.log 2>&1
```

Manual pre-deploy backup:

```bash
BACKUP_DIR=/var/backups/paypoq-os pnpm backup:db
```

## Retention policy

Recommended simple retention:

- daily backups: keep 14 days
- weekly backups: keep 8 weeks
- monthly backups: keep 6 months

Example cleanup command for local filesystem backups:

```bash
find /var/backups/paypoq-os -name '*.dump' -type f -mtime +14 -print
```

Do not enable destructive cleanup until the operator verifies backup copies are
available off-server.

## Off-server backup recommendation

Production backups should not live only on the application server.

Acceptable first options:

- S3-compatible bucket
- Backblaze B2
- NAS in the factory office
- external encrypted disk rotated weekly

For MVP, copying backup files off-server can be manual but must be owned.

Example manual copy:

```bash
rsync -av /var/backups/paypoq-os/ backup-user@backup-host:/backups/paypoq-os/
```

Cloud integration is intentionally not implemented in this phase.

## Failure handling

If backup fails:

1. Treat it as an operational incident.
2. Check disk space.
3. Check database connectivity.
4. Check credentials.
5. Run backup manually.
6. Notify the owner if backup remains failed.

Recommended alert:

- Uptime Kuma push monitor or cron failure email.

## Ownership

One named person must own:

- daily backup schedule
- backup storage location
- restore rehearsal calendar
- incident decision making

Backup ownership must not be vague. “The team” is not enough for production.

## Recovery responsibility

Before production:

- verify at least one backup can be restored into a clean database
- document where backups are stored
- document who has credentials
- document expected RPO/RTO

Baseline targets:

- RPO: 24 hours
- RTO: 1-2 hours for a small factory

## Monthly restore rehearsal

Recommended monthly flow:

1. Create clean DB, e.g. `paypoq_os_restore_YYYYMM`.
2. Restore latest backup into it.
3. Run:
   ```bash
   DATABASE_URL='postgresql://.../paypoq_os_restore_YYYYMM?schema=public' pnpm smoke:mvp
   DATABASE_URL='postgresql://.../paypoq_os_restore_YYYYMM?schema=public' pnpm smoke:telegram
   ```
4. Record result in operations notes.

## Status

```text
Backup scheduling strategy: READY
Automated cloud upload: intentionally not implemented
Production backup ownership: must be assigned per factory
```
