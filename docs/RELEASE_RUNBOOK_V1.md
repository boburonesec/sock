# Pilot Release Runbook v1

Status: Active
Scope: how a Paypoq OS release reaches a pilot environment safely.
Related: `BACKUP_AND_RECOVERY_V1.md`, `SECRETS_MANAGEMENT_V1.md`,
`DOCKER_DEPLOYMENT_V1.md`, `PM2_PRODUCTION_DEPLOYMENT_V1.md`,
`PRODUCTION_READINESS_CHECKLIST_V1.md`

This runbook is **provider-neutral**. No hosting provider has been selected for
the pilot, so the contract below is what any target must satisfy. Do not treat
any config file in this repository as "the" production environment until an
operator selects one and fills in its values.

---

## 1. Deployment model status

| Config | Status | Meaning |
| --- | --- | --- |
| `docker-compose.yml` + `apps/*/Dockerfile` | **Supported** | Local development and single-host pilot. Operator supplies secrets, `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL`. |
| `configs/pm2.ecosystem.config.cjs` + `configs/nginx.paypoq.example.conf` | **Supported (example values)** | Single-host VPS pilot behind nginx/TLS. Domains and certs are placeholders. |
| `render.yaml` | **Example / evaluation only — not the pilot target** | `plan: free` services sleep and the free database has no operator-managed backups, which §3 requires. Paid plans + operator-supplied env would be required first. |

Whichever target is chosen, it must obey §3 exactly.

**Client IP boundary (auth rate limiting).** The API keys login/refresh rate
limits on the client IP it derives from X-Forwarded-For, which it accepts only
from `TRUSTED_PROXIES` peers (one hop). The reverse proxy must be the only way
to reach web and API, and must overwrite X-Forwarded-For with the address it
saw (the nginx example does). Compose publishes api/web on `127.0.0.1`
(`API_BIND_ADDRESS`/`WEB_BIND_ADDRESS`) and trusts its own network; PM2 binds
both to `127.0.0.1` and trusts loopback. Opening :3000/:3001 to a LAN or the
internet lets a client bypass the proxy and forge its rate-limit identity.
`render.yaml` (example only) sets no `TRUSTED_PROXIES`: before any Render use,
the platform proxy's source addresses and X-Forwarded-For behaviour, and the
web → API path, must be verified and configured explicitly — with the default
(`loopback`) every client shares the proxy's rate-limit identity.

**Database exposure and credentials.** Compose publishes PostgreSQL on
`127.0.0.1` only. Two required values, never derived from each other:
`POSTGRES_PASSWORD` is the **raw** password of the bundled postgres container
(no default); `DATABASE_URL` is the **connection URI** used by api, migrate and
bootstrap — for the bundled database
`postgresql://<user>:<password>@postgres:5432/<db>?schema=public` with the
password percent-encoded for a URI (a hex password, `openssl rand -hex 24`,
needs no encoding); for an external database, its own URI. A mismatch fails
closed (the API refuses to start; readiness 503). Host tools and a host-run API
use `localhost`; containers use the compose network. For remote maintenance
use an SSH tunnel, never a LAN/public binding.

---

## 2. Release contract (invariants)

1. A release is an **immutable accepted commit SHA** (and the images built from
   it). Never deploy a working tree.
2. The database is **backed up and the dump verified** before any migration.
3. `prisma migrate deploy` is the **only** migration mechanism, run **exactly
   once per release**, as an explicit step. The API image never migrates.
4. The API never seeds. Demo data cannot reach a production database: the
   demo seeds refuse `NODE_ENV=production`.
5. The first platform admin is created by an **operator CLI with an
   operator-supplied password**. There is no default password and no HTTP
   bootstrap route.
6. Traffic is only routed to an instance whose **`GET /health/readiness`**
   returns 200 (database reachable + application schema present + production
   secrets valid).
7. The deployed commit is verifiable at runtime via `GET /health` → `version`.
8. Pilot releases run in a **controlled maintenance window**. Zero-downtime is
   not claimed or supported.

---

## 3. Release procedure

### 3.1 Pre-flight

```bash
# 1. Accepted SHA (must match the reviewed/approved commit)
git fetch origin && git rev-parse origin/main

# 2. Critical CI green for that SHA:
#    build-and-smoke, production-hardening, pilot-acceptance

# 3. Backup + verify (see BACKUP_AND_RECOVERY_V1.md)
BACKUP_ENCRYPTION_KEY='<from password manager>' pnpm backup:db
ls -l backups/            # non-empty dump present

# 4. Environment validation (no placeholders, exact https CORS origin)
#    Production startup refuses weak secrets, '*' and localhost origins.

# 5. Migration status
DATABASE_URL='<prod>' pnpm --filter @paypoq/api exec prisma migrate status
```

Do not continue if any step fails.

### 3.2 Release

```bash
# 1. Migrate exactly once. Non-zero exit = STOP (no app rollout).
DATABASE_URL='<prod>' pnpm --filter @paypoq/api prisma:migrate:deploy

# 2. First release on a brand-new database only: create the platform admin.
PLATFORM_BOOTSTRAP_EMAIL='ops@example.com' \
PLATFORM_BOOTSTRAP_PASSWORD='<generated, stored in password manager>' \
DATABASE_URL='<prod>' pnpm --filter @paypoq/api bootstrap:platform-admin

# 3. Start/restart API with BUILD_SHA set to the release SHA.
#    A production API refuses to start (exits non-zero, never listens) if any
#    migration shipped with this build is missing, failed or unfinished, or the
#    database cannot be reached to verify it. See "Failed release migration".
# 4. Gate on readiness before sending traffic:
curl -fsS https://api.example.com/health/readiness

# 5. Start/restart Web (built with NEXT_PUBLIC_API_URL = the real API origin).
# 6. Start/restart Bot last (exactly one process per Telegram token).

# 7. Post-deploy smoke against the dedicated smoke tenant:
SMOKE_WEB_URL=https://app.example.com \
SMOKE_API_URL=https://api.example.com \
SMOKE_PLATFORM_ADMIN_EMAIL='<ops email>' \
SMOKE_PLATFORM_ADMIN_PASSWORD='<secret>' \
SMOKE_TENANT_EMAIL='<smoke tenant operator>' \
SMOKE_TENANT_PASSWORD='<secret>' \
SMOKE_EXPECTED_SHA="$(git rev-parse origin/main)" \
pnpm smoke:production
```

With Docker Compose the same order is:

```bash
BUILD_SHA=$(git rev-parse HEAD) docker compose --env-file .env.docker build
docker compose --env-file .env.docker --profile migrate run --rm migrate
# first release only:
PLATFORM_BOOTSTRAP_EMAIL=... PLATFORM_BOOTSTRAP_PASSWORD=... \
  docker compose --env-file .env.docker --profile bootstrap run --rm bootstrap
docker compose --env-file .env.docker up -d api   # healthcheck = readiness
docker compose --env-file .env.docker up -d web bot
```

### 3.2.1 Failed release migration

`prisma migrate deploy` exits non-zero (P3018) and records the migration as
failed. PostgreSQL may have applied part of it: Prisma does not roll a failed
migration back. Further deploys stop with P3009 until it is resolved, and the
new API build refuses to start against this database.

1. Do not start the new build; keep application writes stopped.
2. Inspect the failed migration and the database state
   (`prisma migrate status`, the `logs` column of `_prisma_migrations`).
3. Either repair the partial change by hand and mark it
   `prisma migrate resolve --rolled-back <migration>` then re-run
   `prisma migrate deploy`, or restore the pre-release dump (§4).
4. Start the API only after `prisma migrate deploy` exits 0.

### 3.3 Verify

- `GET /health` returns `version` equal to the release SHA.
- `GET /health/readiness` returns 200 with every check `ok`.
- `/health/bootstrap`, `/health/migrate`, `/health/diagnostic` return 404.
- Post-deploy smoke passed.

---

## 4. Rollback

**App-only rollback (safe when the release added no migration, or the new
migration is backward compatible):**

1. Stop Bot.
2. Redeploy the previous accepted SHA/image (API, then Web).
3. Wait for `GET /health/readiness` = 200.
4. Start Bot.
5. Run the post-deploy smoke.

**Rollback requiring database restore (only when a migration or data change
caused damage that forward-fixing cannot repair):**

1. Announce the maintenance window; **stop application writes** (stop API and
   Bot, leave the database running).
2. Confirm the pre-release dump exists and is non-empty.
3. Restore with the supported script — the dumps are PostgreSQL **custom
   format**, so `pg_restore` (not `psql`) is required:
   ```bash
   ALLOW_DB_RESTORE=true \
   CONFIRM_PRODUCTION_RESTORE=I_UNDERSTAND_THIS_RESTORES_PRODUCTION_DATA \
   RESTORE_DATABASE_URL='<prod>' \
   BACKUP_ENCRYPTION_KEY='<key if the dump is .enc>' \
   pnpm restore:db backups/paypoq-os-<timestamp>.dump
   ```
4. Deploy the application version that matches the restored schema.
5. Readiness, then smoke.

Schema rollback is **not** automatic: migrations are forward-only. Everything
written after the dump is lost, so restore is a last resort.

---

## 5. Incident: admin access recovery

There is no default credential and no recovery HTTP route. To restore platform
access:

```bash
PLATFORM_BOOTSTRAP_EMAIL='ops@example.com' \
PLATFORM_BOOTSTRAP_PASSWORD='<newly generated>' \
DATABASE_URL='<prod>' pnpm --filter @paypoq/api bootstrap:platform-admin
```

The command is idempotent for the same email (it resets that admin's
password), creates no tenants or demo users, and never logs the password.
Record the new secret in the password manager immediately.

---

## 6. Backup operating procedure (pilot minimum)

| Item | Value |
| --- | --- |
| Cadence | Daily full dump, plus a manual dump immediately before every release |
| Command | `pnpm backup:db` (custom-format `pg_dump`) |
| Encryption | `BACKUP_ENCRYPTION_KEY` **required** outside local development |
| Retention | 14 daily, 8 weekly, 6 monthly |
| Off-host copy | Mandatory; operator responsibility (rsync/S3 after the dump) |
| Verification | `pg_restore --list <dump>` after each backup; full restore drill monthly into a scratch database |
| Restore command | `pnpm restore:db <dump>` (never `psql < file`) |
| Failure alerting | Backup job failure must page the named backup owner |

**Not installed by this repository.** `configs/backup-cron.example` is a
template: no cron, no scheduler and no off-host destination exist until an
operator installs them on a real host. Do not record this row as automated
until that is done.

---

## 7. Named owners (fill in before pilot)

| Role | Owner |
| --- | --- |
| Deploy owner | |
| Backup/restore owner | |
| Secret owner | |
| Monitoring/incident owner | |
