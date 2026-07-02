# Offsite Backup Validation v1

Date: 2026-07-02

## Scope

Validate the current Paypoq OS backup approach, restore procedure, retention
policy, off-server copy requirement, and ownership status. No schema changes,
new backup service, cloud integration, or business features were added.

## Current Backup Approach

Paypoq OS uses PostgreSQL custom-format dumps through:

- `scripts/backup-db.sh`
- `scripts/restore-db.sh`
- `pnpm backup:db`
- `pnpm restore:db`

The scripts support either host PostgreSQL tools or Docker fallback via
`PG_DOCKER_CONTAINER`.

## Phase 6.5 Local Validation

Docker Postgres status:

```text
shared-postgres Up healthy on localhost:55432
```

Backup command executed:

```bash
BACKUP_DIR=/private/tmp/paypoq-acceptance-backups \
BACKUP_PREFIX=paypoq-acceptance \
PG_DOCKER_CONTAINER=shared-postgres \
PGUSER=postgres \
PGPASSWORD=postgres \
PGDATABASE=paypoq_os \
bash scripts/backup-db.sh
```

Result:

```text
PASS
Backup file: /private/tmp/paypoq-acceptance-backups/paypoq-acceptance-20260702T041439Z.dump
Backup size: 307 KB
```

Restore rehearsal used a separate disposable database:

```text
paypoq_os_restore_acceptance
```

Restore result:

```text
PASS
Tenant count: 1
User count: 10
AuditLog count: 543
```

The production database was not overwritten.

## Retention

Documented policy from `docs/BACKUP_AND_RECOVERY_V1.md` and
`docs/BACKUP_SCHEDULER_V1.md`:

- daily backups: keep 14 days
- weekly backups: keep 8 weeks
- monthly backups: keep 6 months
- manual backup before every deployment or migration
- monthly restore rehearsal

Validation status:

```text
DOCUMENTED, NOT ENFORCED BY SCRIPT
```

The repository documents retention, but no destructive cleanup automation was
enabled. This is acceptable for the first factory if the backup owner manually
checks retention and off-server copy.

## Off-Server Copy

Validation status:

```text
NOT VERIFIED
```

No off-server storage host, bucket, rsync target, or operator credential was
provided in this workspace. Production must configure one of:

- rsync/SFTP to another server
- cloud object storage
- managed database backup export
- encrypted external storage controlled by the factory

## Ownership

Validation status:

```text
UNKNOWN
```

No named backup owner, restore owner, or off-server storage owner was provided
for Phase 6.5. See `docs/OPERATIONS_OWNERSHIP_V1.md`.

## Verdict

Backup and restore mechanics are proven locally through Docker. Off-server copy
and named ownership remain production acceptance blockers.

