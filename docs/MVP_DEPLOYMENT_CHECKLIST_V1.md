# MVP Deployment Checklist v1

Status: Active

Date: 2026-06-30

## Purpose

This checklist is a concise pre-flight guide for running a Paypoq OS MVP pilot
or demo environment.

It should be completed before any factory pilot session.

## 1. Code and Dependencies

- [ ] Repository is on the intended branch/commit.
- [ ] Dependencies installed:

```bash
pnpm install
```

- [ ] Prisma Client generated:

```bash
pnpm prisma:generate
```

## 2. Environment Configuration

API:

- [ ] `apps/api/.env` exists.
- [ ] `NODE_ENV` is set appropriately.
- [ ] `PORT` is set.
- [ ] `DATABASE_URL` points to the intended pilot database.
- [ ] `CORS_ORIGIN` matches the web URL.
- [ ] `JWT_ACCESS_SECRET` is not the local default for real pilot usage.
- [ ] `AUTH_COOKIE_NAME` is set.

Web:

- [ ] `apps/web/.env.local` exists.
- [ ] `NEXT_PUBLIC_API_URL` points to the API URL.

## 3. Database

- [ ] PostgreSQL is running.
- [ ] Database exists.
- [ ] Database is not a production/shared database unless explicitly intended.
- [ ] Backup taken before migration:

```bash
pg_dump "$DATABASE_URL" > paypoq_pre_deploy_backup.sql
```

- [ ] Migrations applied:

```bash
pnpm prisma:migrate:deploy
```

- [ ] Seed data applied when needed:

```bash
pnpm prisma:seed
```

## 4. Build

- [ ] API build passes:

```bash
pnpm api:build
```

- [ ] Web build passes:

```bash
pnpm build
```

## 5. Runtime

- [ ] API starts:

```bash
pnpm api:start
```

- [ ] API health returns ok:

```bash
curl http://localhost:3001/health
```

- [ ] Web starts:

```bash
pnpm start
```

- [ ] Login page opens.
- [ ] Demo Owner can log in if using seeded pilot data.

## 6. Smoke Test

- [ ] MVP smoke test passes:

```bash
pnpm smoke:mvp
```

If API is already running:

```bash
MVP_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:mvp
```

Expected result:

```json
{
  "ok": true
}
```

## 7. Pilot Demo Readiness

- [ ] Executive dashboard opens.
- [ ] Production page opens.
- [ ] Warehouse page opens.
- [ ] Sales Orders page opens.
- [ ] Sales Payments page opens.
- [ ] Finance Payroll page opens.
- [ ] Settings Products page opens.
- [ ] Factory TV page opens.

Demo flow ready:

- [ ] product setup
- [ ] employee setup
- [ ] salary rate setup
- [ ] production batch
- [ ] stage movement
- [ ] worker activity
- [ ] finished product receipt
- [ ] sales order
- [ ] payment allocation
- [ ] delivery
- [ ] delivery return
- [ ] payment reversal
- [ ] dashboard review

## 8. Known Limitations Reviewed

- [ ] `docs/MVP_KNOWN_LIMITATIONS_V2.md` reviewed.
- [ ] Pilot audience understands that this is not a full accounting system.
- [ ] Pilot audience understands that this is not a generic ERP.
- [ ] Pilot audience understands that IoT is future scope.
- [ ] Correction gaps are known:
  - supplier payment reversal
  - production movement correction
  - material receipt correction

## 9. Rollback Preparedness

- [ ] Previous known-good application build is available.
- [ ] Database backup exists.
- [ ] Restore process has been reviewed.
- [ ] No one will manually edit AuditLog or historical movement/payment records.

Application rollback:

```text
Stop API/Web
→ deploy previous build
→ restart API/Web
→ check /health
→ run targeted smoke
```

Database restore:

```bash
psql "$DATABASE_URL" < paypoq_pre_deploy_backup.sql
```

Only restore with explicit approval because it can overwrite pilot data.

## 10. Go / No-Go

Go if:

- [ ] API build passed
- [ ] Web build passed
- [ ] migrations applied
- [ ] seed applied if needed
- [ ] smoke test passed
- [ ] backup exists
- [ ] known limitations reviewed

No-Go if:

- [ ] database target is uncertain
- [ ] smoke test fails
- [ ] login fails
- [ ] API health fails
- [ ] backup is missing before a real pilot
- [ ] migration status is unknown

## Senior Engineering Notes

This checklist keeps pilot deployment intentionally simple. It avoids Docker,
Kubernetes, Redis, background workers, and distributed systems until the MVP
factory workflow has been validated in real usage.
