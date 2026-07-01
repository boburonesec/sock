# MVP Smoke Test Suite v1

Status: Active

Date: 2026-06-30

## Purpose

This suite automates the representative Paypoq OS MVP API smoke flow that was
previously run manually during release-candidate QA.

It verifies that the main factory operating chain still works end-to-end:

```text
Auth
→ Product setup
→ Employee + salary rate
→ Production
→ Warehouse
→ Sales
→ Payment
→ Delivery
→ Delivery return
→ Payment reversal
→ Supplier flow
→ Payroll
→ Dashboard summaries
```

## Scope

Covered:

- auth login and request context
- product / variant / price setup
- employee and salary rate setup
- production batch
- stage movement
- worker activity
- defect
- finished product receipt
- material receipt
- stock correction
- client / order / payment
- delivery
- delivery return
- payment reversal after delivery return
- supplier purchase / payment
- payroll calculate / pay / close
- dashboard summary endpoints
- critical AuditLog actions
- limited-role RBAC checks

Not covered:

- frontend browser automation
- visual regression
- supplier payment reversal
- production movement correction
- material receipt correction
- concurrency / race-condition stress testing

## How to Run

From repository root:

```bash
pnpm smoke:mvp
```

The root script runs:

```bash
pnpm --filter @paypoq/api build
pnpm --filter @paypoq/api prisma:seed
node apps/api/scripts/mvp-smoke-test.mjs
```

The smoke runner starts the built API automatically on port `3015` unless
`MVP_SMOKE_BASE_URL` is provided.

## Requirements

Before running:

1. Local PostgreSQL development/test database must be reachable.
2. Prisma migrations must already be applied.
3. Baseline seed must exist, including:
   - demo tenant
   - main factory
   - warehouse zones
   - demo Owner user
   - limited-role demo users
   - default roles/permissions
   - default production stages
4. Demo credentials must work:

```text
LOCAL DEVELOPMENT ONLY
owner@paypoq.local / ChangeMe123!
```

Limited-role demo credentials used by RBAC checks:

```text
manager@paypoq.local
seller@paypoq.local
warehouse@paypoq.local
shift@paypoq.local
accountant@paypoq.local

Password: ChangeMe123!
```

## Environment Variables

Optional:

```bash
MVP_SMOKE_BASE_URL=http://localhost:3002
```

Use an already-running API instead of starting one.

```bash
MVP_SMOKE_PORT=3015
```

Port used when the runner starts the API itself.

```bash
MVP_SMOKE_EMAIL=owner@paypoq.local
MVP_SMOKE_PASSWORD=ChangeMe123!
```

Override demo login credentials.

```bash
MVP_SMOKE_VERBOSE=1
```

Print API server logs while the smoke suite runs.

```bash
MVP_SMOKE_KEEP_SERVER=1
```

Leave the auto-started API server running after the smoke suite finishes.

## Isolation Strategy

The suite creates unique test data with a timestamp/random suffix.

It does not depend on old smoke data and does not require deleting existing
records.

For payroll, the suite creates an isolated future payroll month. Since the
WorkerActivity API records today's date by design, the runner moves only its
own newly-created WorkerActivity record to that isolated test month using
Prisma. This is test setup only; payroll calculation, payment, and close are
still verified through public API endpoints.

## Expected Output

Successful run prints JSON similar to:

```json
{
  "ok": true,
  "baseUrl": "http://localhost:3015",
  "passedCount": 11,
  "checks": [
    {
      "name": "auth login and request context",
      "ok": true
    }
  ]
}
```

## Failure Handling

If the suite fails:

1. Read the failed check name and error message.
2. Confirm the local DB is reachable.
3. Confirm seed data exists.
4. Confirm `pnpm --filter @paypoq/api build` passes.
5. Re-run with:

```bash
MVP_SMOKE_VERBOSE=1 pnpm smoke:mvp
```

## Senior Engineering Notes

This is intentionally a smoke suite, not a full integration-test framework.

It is designed to catch broken MVP paths quickly while avoiding new
infrastructure, new databases, or broad test abstractions before the product
needs them.

Recommended next steps:

1. Add this command to CI once a disposable test database is available.
2. Add limited-role RBAC smoke users.
3. Split the suite into smaller integration tests only when runtime or failure
triage becomes painful.
