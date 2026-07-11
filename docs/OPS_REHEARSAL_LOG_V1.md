# Ops Rehearsal Log v1

Status: Completed (local pilot environment)  
Date: 2026-07-11  
Environment: local workstation + `shared-postgres` Docker (`localhost:55432`)  
Git: `main` @ `5bf4ed5` (or later)

This is **not** a cloud production server sign-off. It proves the same scripts
and order of operations work end-to-end on a real PostgreSQL instance.

## 1. Pull / migrate / env

| Step | Result |
| --- | --- |
| Code on `main`, clean working tree | PASS |
| `pnpm prisma:generate` | PASS |
| `pnpm prisma:migrate:deploy` (8 migrations) | PASS — no pending |
| API env: `DATABASE_URL`, JWT secrets, `FACTORY_TV_ACCESS_TOKEN` | PASS (set) |
| Web env: `NEXT_PUBLIC_API_URL`, `FACTORY_TV_ACCESS_TOKEN`, `API_INTERNAL_URL` | PASS |

Commands used:

```bash
pnpm prisma:generate
pnpm prisma:migrate:deploy
```

## 2. Backup + restore rehearsal

| Step | Result |
| --- | --- |
| Full backup via Docker `pg_dump` | PASS |
| Backup file | `backups/paypoq-os-20260711T104236Z.dump` (~304KB custom format) |
| Isolated restore DB | `paypoq_os_restore_rehearsal` (created) |
| `ALLOW_DB_RESTORE=true` restore | PASS |
| Restored row counts (sample) | Tenant=2, User=21, Employee=23 |
| Primary `paypoq_os` still intact | PASS (User=21 after restore of copy) |

Commands used:

```bash
export PG_DOCKER_CONTAINER=shared-postgres PGUSER=postgres PGPASSWORD=postgres PGDATABASE=paypoq_os
pnpm backup:db

# create isolated DB, then:
export PGDATABASE=paypoq_os_restore_rehearsal ALLOW_DB_RESTORE=true
pnpm restore:db backups/paypoq-os-20260711T104236Z.dump
```

Safety notes:

- Restore was **not** written over the primary `paypoq_os` database.
- Production restore still requires `CONFIRM_PRODUCTION_RESTORE=...` when
  `NODE_ENV=production`.

## 3. Deploy smoke + golden path

| Step | Result |
| --- | --- |
| `pnpm deploy:smoke` | PASS |
| → `smoke:telegram` | PASS (6 checks) |
| → `smoke:mvp` | PASS (12 checks) |
| → `smoke:employee-self-service` | PASS (6 checks) |
| RBAC live matrix | PASS 72/72 |
| Owner dashboard/production/sales/finance | 200 |
| Shift Receiver production | 200; finance denied 403 |
| Seller sales + warehouse read | 200 |
| Web Factory TV proxy `/api/factory-tv/summary` | 200 |

## 4. Remaining OPS for a real factory server

These cannot be finished only in this laptop environment:

1. Deploy to the real host (PM2 or Docker) with **strong non-placeholder secrets**.
2. Install daily backup cron + **off-server** copy.
3. Put `/tv` and `/admin` behind VPN / IP allowlist if internet-facing.
4. Name owners: deploy, backup, secrets, monitoring.
5. Re-run `pnpm deploy:smoke` **on the target server** after first deploy.

See: `docs/PRODUCTION_READINESS_CHECKLIST_V1.md`.

## 5. Sign-off (local rehearsal)

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| Technical operator (rehearsal) | automated agent + local env | 2026-07-11 | DONE |
| Factory super-user | _TBD_ | | |
| Backup owner | _TBD_ | | |
