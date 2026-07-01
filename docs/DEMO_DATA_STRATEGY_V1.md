# Paypoq OS — Demo Data Reset + Seed Strategy v1

Status: Implemented  
Date: 2026-07-01

## Purpose

This strategy gives the team a controlled way to prepare a clean local
demo/pilot database.

It is intentionally separate from the baseline seed:

- baseline seed creates safe foundation data,
- demo reset wipes local/demo data,
- demo seed adds meaningful sample business data.

## Scripts

Root scripts:

```bash
pnpm demo:reset
pnpm demo:seed
pnpm demo:prepare
```

API package scripts:

```bash
pnpm --filter @paypoq/api demo:reset
pnpm --filter @paypoq/api demo:seed
pnpm --filter @paypoq/api demo:prepare
```

## Safe demo prepare flow

Use only with a local development database.

```bash
ALLOW_DEMO_RESET=true pnpm demo:prepare
```

This runs:

1. `demo:reset`
2. baseline `prisma:seed`
3. `demo:seed`

## Reset safety guards

`apps/api/scripts/demo-reset.mjs` refuses to run unless all of these are true:

- `ALLOW_DEMO_RESET=true`
- `NODE_ENV` is not `production`
- `DATABASE_URL` exists
- `DATABASE_URL` host looks local:
  - `localhost`
  - `127.0.0.1`
  - `::1`
  - `*.local`
- database name looks local/test/demo:
  - contains `demo`
  - contains `test`
  - contains `dev`
  - or equals `paypoq_os`

The reset truncates application tables with `RESTART IDENTITY CASCADE` and keeps
`_prisma_migrations`.

## Baseline seed

Baseline seed remains idempotent and creates:

- demo tenant,
- main factory,
- main warehouse,
- warehouse zones,
- permissions,
- roles,
- local tenant demo users,
- platform admin,
- production stages,
- expense categories,
- basic colors/materials/seasons.

Baseline local credentials:

```text
owner@paypoq.local / ChangeMe123!
manager@paypoq.local / ChangeMe123!
seller@paypoq.local / ChangeMe123!
warehouse@paypoq.local / ChangeMe123!
shift@paypoq.local / ChangeMe123!
accountant@paypoq.local / ChangeMe123!
platform@paypoq.local / ChangeMe123!
```

## Demo seed data

`apps/api/prisma/demo-seed.ts` adds data that makes dashboards and major modules
look meaningful.

Included demo data:

- product catalog:
  - Classic Paypoq
  - Sport Paypoq
  - variants
  - prices
- employees:
  - production workers
  - salary rates
- production:
  - stage inventory
  - production batch
  - stage movements
  - worker activities
  - defect record
- warehouse:
  - finished product stock
  - material stock
  - low-stock threshold
  - stock movements
- sales:
  - client
  - delivered paid order
  - active partially paid order
  - client payments and allocations
- supplier finance:
  - supplier
  - purchase
  - partial supplier payment allocation
- finance:
  - paid expense
  - employee bonus/advance adjustment
- payroll:
  - current month payroll period
  - payroll items
  - partial payroll payment

## Recommended local workflow

```bash
pnpm install
pnpm prisma:migrate:deploy
ALLOW_DEMO_RESET=true pnpm demo:prepare
pnpm api:dev
pnpm dev
```

Then open:

```text
http://localhost:3000/login
http://localhost:3000/admin/login
```

## Verification

After preparing demo data:

```bash
pnpm api:build
pnpm build
pnpm smoke:mvp
```

## Risks

- `demo:reset` is destructive by design.
- It must never be run against production/shared databases.
- The script has guards, but humans should still read `DATABASE_URL` carefully.
- Demo seed is designed for a clean database after `demo:reset`.
- Demo financial/payroll numbers are sample snapshots, not real accounting.

## What is intentionally not implemented

- No production data anonymizer.
- No selective tenant reset.
- No SaaS billing demo data.
- No migration changes.
- No new business features.
- No automated cloud database backup/restore.

## Next improvement

Add a dedicated automated demo smoke test that asserts the dashboard summaries
contain non-zero values after `demo:prepare`.
