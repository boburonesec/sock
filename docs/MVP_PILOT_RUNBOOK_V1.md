# MVP Pilot Runbook v1

Status: Active

Date: 2026-06-30

## Purpose

This runbook explains how to prepare and run a controlled Paypoq OS MVP pilot.

The pilot is intended for factory validation and demo usage, not broad
uncontrolled production deployment.

Paypoq OS remains:

- a sock-factory Manufacturing OS
- dark-mode-first
- backend-owned for business calculations
- audit-first for important write actions
- intentionally not a generic ERP

## Repository Layout

```text
paypoq-os/
├── docs/
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # NestJS backend
├── packages/
│   └── shared/
└── package.json
```

## Prerequisites

Required:

- Node.js compatible with the project runtime
- pnpm
- PostgreSQL
- local or pilot database
- access to this repository

Recommended for pilot:

- use a dedicated pilot database
- take a database backup before every demo day
- do not reuse a developer's personal scratch database for a real factory pilot

## Install Dependencies

From repository root:

```bash
pnpm install
```

If native dependencies such as `argon2` or Prisma engines fail to install,
rerun on the target machine after verifying Node/pnpm versions and network
access.

## Configure Environment

### API

Create:

```text
apps/api/.env
```

Use `apps/api/.env.example` as the template.

Required values:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/paypoq_os?schema=public
CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=replace-with-long-random-secret
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
AUTH_COOKIE_NAME=paypoq_refresh_token
```

Pilot note:

- `JWT_ACCESS_SECRET` must be changed from the local default.
- `DATABASE_URL` must point to the pilot database, not a production/shared DB.
- `CORS_ORIGIN` must match the web app URL.

### Web

Create:

```text
apps/web/.env.local
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For hosted pilot:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Generate Prisma Client

```bash
pnpm prisma:generate
```

## Run Database Migrations

For a local development database:

```bash
pnpm prisma:migrate:dev
```

For a pilot/staging-style database where migrations already exist:

```bash
pnpm prisma:migrate:deploy
```

Do not use `db push` for pilot data.

## Seed Demo / Baseline Data

```bash
pnpm prisma:seed
```

Seed creates baseline data such as:

- Demo tenant
- Main Factory
- Main Warehouse
- Warehouse zones
- default permissions
- default roles
- default production stages
- demo Owner user
- limited-role users for RBAC smoke testing

Local development credentials:

```text
LOCAL DEVELOPMENT ONLY
Email: owner@paypoq.local
Password: ChangeMe123!
```

Other local/pilot smoke users:

```text
manager@paypoq.local
seller@paypoq.local
warehouse@paypoq.local
shift@paypoq.local
accountant@paypoq.local

Password: ChangeMe123!
```

For real pilot users, create proper credentials and do not share the local demo
password outside controlled testing.

## Build

Build API:

```bash
pnpm api:build
```

Build Web:

```bash
pnpm build
```

## Run API

Development:

```bash
pnpm api:dev
```

Built API:

```bash
pnpm api:build
pnpm api:start
```

Health check:

```bash
curl http://localhost:3001/health
```

Expected:

```json
{
  "status": "ok",
  "service": "paypoq-os-api"
}
```

## Run Web

Development:

```bash
pnpm dev
```

Built web app:

```bash
pnpm build
pnpm start
```

Default local route:

```text
http://localhost:3000/login
```

## Run MVP Smoke Test Suite

From repository root:

```bash
pnpm smoke:mvp
```

The smoke suite:

- builds API first
- runs the idempotent seed
- starts local API automatically on port `3015`
- creates isolated test data
- verifies core MVP API flows
- verifies representative RBAC access/denial checks
- leaves created smoke data in the database for audit/debugging

Use an already-running API:

```bash
MVP_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:mvp
```

Verbose mode:

```bash
MVP_SMOKE_VERBOSE=1 pnpm smoke:mvp
```

## Pilot Demo Checklist

Before the demo:

1. Database is reachable.
2. API `.env` points to the correct database.
3. Web `.env.local` points to the correct API.
4. Migrations are applied.
5. Seed data exists.
6. API build passes.
7. Web build passes.
8. `pnpm smoke:mvp` passes.
9. Demo Owner login works.
10. Browser can open:
    - `/dashboard/executive`
    - `/production`
    - `/warehouse`
    - `/sales/orders`
    - `/finance/payroll`
    - `/tv`

Recommended demo flow:

```text
Login
→ Product setup
→ Employee + salary rate
→ Production batch
→ Stage move
→ Worker activity
→ Finished product receipt
→ Client/order/payment
→ Delivery
→ Delivery return
→ Payment reversal
→ Dashboards
```

## Backup Notes

Before pilot/demo day:

```bash
pg_dump "$DATABASE_URL" > paypoq_pilot_backup_$(date +%Y%m%d_%H%M%S).sql
```

Before risky manual database operations:

1. Stop API writes if possible.
2. Take a backup.
3. Confirm backup file exists and is non-empty.
4. Only then proceed.

## Rollback Notes

For application code rollback:

1. Stop API and Web processes.
2. Deploy the previous known-good build.
3. Restart API.
4. Restart Web.
5. Run `/health`.
6. Run a targeted smoke check.

For database rollback:

- Prefer restoring from a known backup.
- Do not manually edit operational tables unless explicitly approved.
- Never delete audit records.
- Never edit historical movement/payment/payroll records to "fix" data.

Restore example:

```bash
psql "$DATABASE_URL" < paypoq_pilot_backup_YYYYMMDD_HHMMSS.sql
```

Use database restore only with clear approval because it can overwrite pilot
data.

## Known Limitations

Current MVP limitations are documented in:

- `docs/MVP_KNOWN_LIMITATIONS_V2.md`
- `docs/USER_GUIDE_V1.md`

Most important pilot limitations:

- no automated CI smoke job yet
- no full audit browsing UI
- no supplier payment reversal yet
- no production movement correction yet
- no material receipt correction yet
- no partial delivery/return
- no invoice/print flow
- no full accounting ledger
- no IoT integration

## Troubleshooting

### API cannot connect to database

Check:

```bash
echo "$DATABASE_URL"
pnpm prisma:generate
pnpm prisma:migrate:deploy
```

Confirm PostgreSQL is running and credentials are correct.

### Login fails

Check:

```bash
pnpm prisma:seed
```

Confirm the demo Owner exists only for local/pilot validation.

### Web cannot call API

Check:

- `NEXT_PUBLIC_API_URL`
- `CORS_ORIGIN`
- browser console network errors
- API `/health`

### Smoke test cannot bind local port

Use an already-running API:

```bash
MVP_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:mvp
```

## Senior Engineering Notes

This pilot runbook intentionally keeps operations simple:

- one API
- one Web app
- one PostgreSQL database
- no Redis unless future evidence requires it
- no microservices
- no workflow engine

That matches the MVP principle: prove the factory workflow first, then harden.
