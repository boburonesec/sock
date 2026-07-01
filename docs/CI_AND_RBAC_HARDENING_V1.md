# CI and RBAC Pilot Hardening v1

Status: Active

Date: 2026-06-30

## Purpose

This document explains the first CI and RBAC hardening pass for the Paypoq OS
MVP pilot.

Scope:

- CI build workflow
- limited-role local demo users
- RBAC smoke checks
- no business feature changes
- no schema changes
- no migrations

## Limited-role demo users

The development seed creates these local users:

| Email | Role | Password |
| --- | --- | --- |
| `owner@paypoq.local` | Owner | `ChangeMe123!` |
| `manager@paypoq.local` | Manager | `ChangeMe123!` |
| `seller@paypoq.local` | Seller | `ChangeMe123!` |
| `warehouse@paypoq.local` | Warehouse Operator | `ChangeMe123!` |
| `shift@paypoq.local` | Shift Receiver | `ChangeMe123!` |
| `accountant@paypoq.local` | Accountant | `ChangeMe123!` |

These credentials are **LOCAL DEVELOPMENT / PILOT SMOKE TEST ONLY**.

Passwords are stored as Argon2 hashes in `UserCredential`.

## RBAC matrix

Seeded role permissions:

| Role | Main permissions |
| --- | --- |
| Owner | all permissions |
| Manager | dashboard, production, warehouse, sales, finance, employees, reports, settings |
| Accountant | finance view/write, sales view, reports view |
| Seller | sales view/write |
| Warehouse Operator | warehouse view/write |
| Shift Receiver | production view/write |

Automated RBAC smoke checks:

| User | Allowed | Denied |
| --- | --- | --- |
| Owner | full MVP smoke flow | n/a |
| Seller | sales read/write | finance write, warehouse write |
| Warehouse Operator | warehouse write | sales payment write |
| Shift Receiver | production write | finance write |
| Accountant | finance/supplier/payroll read | production write |
| Manager | main operational summaries | n/a |

## Smoke suite behavior

Root command:

```bash
pnpm smoke:mvp
```

It now runs:

```bash
pnpm --filter @paypoq/api build
pnpm --filter @paypoq/api prisma:seed
node apps/api/scripts/mvp-smoke-test.mjs
```

The seed step is idempotent and ensures the limited-role demo users exist.

The smoke runner:

- starts the built API unless `MVP_SMOKE_BASE_URL` is set
- logs in as Owner for the full MVP chain
- logs in as limited-role users for RBAC checks
- creates isolated test data using timestamp/random suffixes
- verifies 401/403 behavior for selected protected endpoints
- verifies critical AuditLog records

## CI behavior

GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

Steps:

1. checkout
2. setup pnpm
3. setup Node.js
4. install dependencies
5. Prisma generate
6. API build
7. Web build
8. if `DATABASE_URL` is configured:
   - apply migrations with `pnpm prisma:migrate:deploy`
   - run `pnpm smoke:mvp`
9. if `DATABASE_URL` is missing:
   - skip smoke with a clear notice

## CI database requirement

To run smoke tests in CI, configure a disposable PostgreSQL database and expose:

```text
DATABASE_URL
```

as a repository secret.

Important:

- CI DB must not be production.
- CI DB may keep smoke data, or be recreated between runs.
- `pnpm smoke:mvp` creates isolated test data and does not depend on old smoke
  records.

## Local verification

Run:

```bash
pnpm prisma:seed
pnpm smoke:mvp
```

Expected output:

```json
{
  "ok": true
}
```

## Risks and limitations

- CI smoke depends on an external/disposable PostgreSQL database secret.
- The smoke suite is broad; if it fails, the JSON check name identifies the
  broken area, but it is not yet split into small test files.
- Limited-role users are for pilot validation only and must not become real
  production accounts.
- `403` coverage is representative, not exhaustive for every endpoint.

## Recommended next step

Add a disposable PostgreSQL service container to CI if repository policy allows
it, or provision a dedicated CI database and set `DATABASE_URL` secret.

After that, split smoke checks into smaller integration tests only if failure
triage becomes painful.
