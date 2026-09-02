# Backup and Recovery v1

## Goal

Paypoq OS production data must be recoverable before a real factory relies on
the system for daily operations.

This document covers PostgreSQL backup and restore only.

## Tools

Scripts:

- `scripts/backup-db.sh`
- `scripts/restore-db.sh`

They use:

- `pg_dump`
- `pg_restore`

If PostgreSQL client tools are not installed on the host, the scripts can use a
PostgreSQL Docker container fallback with `PG_DOCKER_CONTAINER`.

## Backup strategy

Recommended production baseline:

- one automated full backup per day
- manual backup before every migration/deployment
- store backups outside the application server
- periodically copy backups to off-server storage
- test restore at least once per month

Recommended retention:

- daily backups: 14 days
- weekly backups: 8 weeks
- monthly backups: 6 months

Retention should be adjusted once the pilot factory defines legal/accounting
requirements.

## Required env

Host PostgreSQL client mode:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/paypoq_os?schema=public
```

Docker fallback mode:

```bash
PG_DOCKER_CONTAINER=shared-postgres
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=paypoq_os
```

No credentials are hardcoded in the scripts.

## Create backup

```bash
DATABASE_URL="postgresql://..." pnpm backup:db
```

Optional:

```bash
BACKUP_DIR=./backups BACKUP_PREFIX=paypoq-os-prod pnpm backup:db
```

Docker fallback example:

```bash
PG_DOCKER_CONTAINER=shared-postgres \
PGUSER=postgres \
PGPASSWORD=postgres \
PGDATABASE=paypoq_os \
pnpm backup:db
```

Backup files are timestamped:

```text
backups/paypoq-os-YYYYMMDDTHHMMSSZ.dump
```

## Restore procedure

Restore is intentionally guarded.

Required:

```bash
ALLOW_DB_RESTORE=true
```

Restore into a clean non-production database:

```bash
ALLOW_DB_RESTORE=true \
RESTORE_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/paypoq_os_restore?schema=public" \
pnpm restore:db backups/paypoq-os-....dump
```

Docker fallback:

```bash
ALLOW_DB_RESTORE=true \
PG_DOCKER_CONTAINER=shared-postgres \
PGUSER=postgres \
PGPASSWORD=postgres \
PGDATABASE=paypoq_os_restore \
pnpm restore:db backups/paypoq-os-....dump
```

Production restore requires an extra explicit confirmation:

```bash
CONFIRM_PRODUCTION_RESTORE=I_UNDERSTAND_THIS_RESTORES_PRODUCTION_DATA
```

## Disaster recovery flow

1. Stop Bot first to prevent duplicate Telegram actions during incident work.
2. Stop API writes by stopping API or putting the app in maintenance mode.
3. Identify the latest known-good backup.
4. Restore into a clean database first.
5. Run smoke tests against restored database:
   - `pnpm smoke:mvp`
   - `pnpm smoke:telegram`
6. Point API to restored database only after verification.
7. Start API, Web, then Bot.
8. Run post-deploy smoke.
9. Record incident timeline and chosen backup.

## RPO and RTO

Recommended pilot target:

- RPO: 24 hours with daily backup; lower if manual backups are taken before
  operationally risky changes.
- RTO: 1-2 hours for a small factory if backup file, credentials, and operator
  access are ready.

## Recovery ownership

At least one named operator must own:

- backup schedule
- backup storage access
- restore rehearsal
- incident decision making

For pilot, this can be the technical owner. For production, this should be a
documented operational role.

## Local restore rehearsal result

Phase 3 local restore rehearsal:

- Host PostgreSQL CLI tools were not installed.
- The local PostgreSQL database was available through Docker container
  `shared-postgres`.
- Backup was created with `scripts/backup-db.sh` using Docker fallback.
- Clean rehearsal database was created:
  - `paypoq_os_restore_phase3`
- Backup was restored into that clean database with `scripts/restore-db.sh`.
- Smoke tests were run against the restored database:
  - `pnpm smoke:telegram` passed.
  - `pnpm smoke:mvp` passed.

Observed rehearsal values:

- RPO tested: latest manual backup.
- RTO tested locally: backup + restore + smoke completed in minutes.
- Production RTO remains dependent on backup size, server access, and operator
  readiness.

Recommended next operational step:

- Run a full restore into a clean staging database with PostgreSQL CLI tools or
  the Docker fallback and keep the generated backup file outside the app server.

## Encryption at rest

Set `BACKUP_ENCRYPTION_KEY` before running `backup-db.sh` to AES-256-CBC
encrypt the dump (OpenSSL, PBKDF2-derived key) and delete the plaintext file —
the script never leaves an unencrypted dump on disk when the key is set. The
output file gets a `.enc` suffix. Pass the same `BACKUP_ENCRYPTION_KEY` to
`restore-db.sh` (it detects `.enc` automatically) to decrypt into a private
temp file that is removed as soon as `pg_restore` finishes, even on failure.

Store `BACKUP_ENCRYPTION_KEY` in a secrets manager, not in the repo or in
plain environment files committed anywhere. Losing the key makes existing
backups unrecoverable — treat it with the same care as a database password.

```bash
BACKUP_ENCRYPTION_KEY="$(cat /path/to/secret)" bash scripts/backup-db.sh
BACKUP_ENCRYPTION_KEY="$(cat /path/to/secret)" bash scripts/restore-db.sh backups/paypoq-os-*.dump.enc
```

## Limitations

- Backups are not yet scheduled automatically.
- Encryption covers the dump file itself; key management, off-host copy
  automation, and rotation policy remain operator responsibilities.
- Off-server storage is not automated.
- Restore does not automatically create a database; create the clean target DB
  first.
