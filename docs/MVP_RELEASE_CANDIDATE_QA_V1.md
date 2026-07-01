# MVP Release Candidate QA v1

Status: Release candidate verified with documented limitations

Date: 2026-06-29

## Scope

This QA pass reviewed the Paypoq OS MVP as a release candidate.

Scope was limited to:

- QA
- documentation
- safe verification
- representative smoke tests

No new business features, schema changes, migrations, or risky refactors were
introduced.

## Build Results

Passed:

- `pnpm --filter @paypoq/api build`
- `pnpm --filter @paypoq/web build`

## Database Status

Local PostgreSQL was reachable through Prisma.

```json
{
  "ok": true,
  "tenantCount": 1,
  "userCount": 1
}
```

## Frontend Audit

### Mock data

No `mock.ts` files remain under:

```text
apps/web/src/features
```

### Frontend business calculations

No forbidden authoritative frontend business calculations were found.

Allowed frontend behavior found:

- Display formatting for backend values.
- UX-only form helpers such as showing payable payroll items or filling a
  remaining amount into an input.
- Record counts returned by API arrays for simple display cards.
- Backend response mapping and rendering.

Important note:

- Frontend does not persist debt, stock, payroll, salary, or finance totals as
  source of truth.
- Backend remains authoritative for debt, payroll, stock, order totals, payment
  status, and dashboard summary values.

### Navigation / UI quality

Main routes build successfully, including:

- dashboards
- production
- warehouse
- sales
- finance
- employees
- reports
- settings
- factory TV

Future actions remain visibly disabled or separated from implemented write
flows.

## Auth / RBAC QA

Verified:

- Login as `owner@paypoq.local`
- Refresh endpoint
- `/auth/me` request context
- Logout endpoint
- Protected endpoint without token returns `401`
- Owner has one role and 15 permissions in the demo seed

Not fully verified:

- `403` for a limited-permission user, because the seed currently contains only
  the demo Owner login.

## Representative MVP Smoke Test

A broad smoke test passed against a freshly built API on port `3002`.

Verified:

1. Auth/RBAC
   - protected endpoint returns `401` without auth
   - login
   - refresh
   - `/auth/me`
   - logout

2. Settings/Product setup
   - create color
   - create material
   - create season
   - read production stages
   - create product
   - create variant
   - create product price
   - create salary rate

3. Employee/Production
   - create employee
   - create production batch
   - move product through production stages
   - create worker activity
   - create defect

4. Warehouse
   - receive finished product into warehouse stock
   - receive material stock
   - read warehouse summary

5. Sales
   - create client
   - create order
   - allocate payment
   - deliver order
   - verify debt reaches zero
   - read sales summary

6. Supplier
   - create supplier
   - create purchase
   - allocate payment
   - verify supplier debt reaches zero

7. Payroll
   - current-month payroll calculate/pay path exercised
   - isolated payroll period calculate/pay/close verified separately

8. Dashboards / summaries
   - executive summary
   - operations summary
   - factory TV summary
   - finance summary
   - sales summary
   - warehouse stock summary
   - settings overview
   - reports overview

Broad smoke summary:

```json
{
  "ok": true,
  "passedCount": 13,
  "warnings": [
    {
      "name": "payroll close",
      "details": "Current-month payroll period had remaining balances, so close correctly returned 409."
    }
  ]
}
```

Isolated payroll close smoke:

```json
{
  "ok": true,
  "calculatedFinal": "1100",
  "closedStatus": "CLOSED"
}
```

## Must-Fix Items

None found in this QA pass.

## Can-Defer Items

- Add a limited-permission seeded user for repeatable `403` RBAC smoke tests.
- Add automated integration tests for the current smoke scripts.
- Add return/reversal flows for delivered orders and stock movements.
- Add payroll correction/reversal policy.
- Add supplier/client payment reversal policy.
- Add production correction/reversal policy.
- Add stricter factory timezone handling for payroll periods and daily reports.

## Release Readiness

Recommendation:

```text
MVP RC v1 is demo-ready and suitable for controlled factory/user validation.
```

It is not yet production-ready for uncontrolled deployment because correction,
reversal, operational recovery, and broader RBAC test coverage are intentionally
still limited.

## Senior Engineering Review

This RC stays aligned with Paypoq OS principles:

- Business-first factory workflows are implemented.
- StageInventory remains the production center.
- Debt, payroll, stock, and financial totals remain backend-owned.
- Frontend is operator-friendly and does not own business-critical math.
- The system remains a modular monolith.
- No generic ERP, ledger, workflow engine, IoT, or delivery subsystem was added.

The main release risk is not core flow correctness; it is operational correction
coverage. That should be validated with real factory users before expanding the
system.
