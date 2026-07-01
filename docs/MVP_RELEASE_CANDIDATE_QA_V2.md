# MVP Release Candidate QA v2

Status: Release candidate verified after correction and return flows

Date: 2026-06-30

## Scope

This QA pass verifies Paypoq OS MVP after the correction and return milestone:

- warehouse stock correction
- sales payment reversal
- order delivery return
- payment reversal after delivery return
- full operational chain from product setup to sales recovery
- payroll regression
- supplier regression
- dashboard summary regression

No new business features, schema changes, migrations, or risky refactors were
introduced during this QA pass.

## Build Results

Passed:

- `pnpm --filter @paypoq/api build`
- `pnpm --filter @paypoq/web build`

## Representative Smoke Test

A representative end-to-end smoke test passed against the local API on port
`3002`.

Verified:

1. Auth / RBAC baseline
   - protected endpoint returns `401` without token
   - demo Owner login succeeds
   - `/auth/me` returns tenant, active factory, and permissions

2. Product setup
   - create color
   - create material
   - create season
   - create product
   - create product variant
   - create product price

3. Employee and salary rate setup
   - create employee
   - create salary rate for stage + product variant

4. Production chain
   - create production batch
   - move stage inventory
   - create worker activity
   - create defect
   - move product to `Ombor`
   - receive finished product into warehouse stock

5. Warehouse correction
   - receive material stock
   - correct material stock
   - verify correction audit exists

6. Sales recovery chain
   - create client
   - create sales order
   - create fully allocated payment
   - correct finished product stock for delivery setup
   - deliver order
   - verify payment reversal is blocked while order is `DELIVERED`
   - return delivery
   - verify order status becomes `READY`
   - verify `paymentStatus` remains unchanged after delivery return
   - reverse payment after delivery return
   - verify order payment status recalculates
   - verify client debt increases again

7. Supplier regression
   - create supplier
   - create supplier purchase
   - create fully allocated supplier payment
   - verify supplier debt reaches zero

8. Payroll regression
   - create payroll period
   - calculate payroll
   - pay if item balance exists
   - close payroll period

9. Dashboards / summaries
   - executive summary
   - operations summary
   - warehouse stock summary
   - sales summary
   - finance summary
   - factory TV summary

10. Critical audit actions
   - `STOCK_CORRECTED`
   - `CLIENT_PAYMENT_REVERSED`
   - `SALES_ORDER_DELIVERY_RETURNED`
   - `STOCK_MOVEMENT_CREATED`

Smoke result:

```json
{
  "ok": true,
  "passedCount": 11,
  "verifiedHighlights": [
    "stock correction",
    "delivery return",
    "payment reversal after delivery return",
    "payroll regression",
    "supplier regression",
    "dashboard summaries"
  ]
}
```

## Frontend QA

Verified:

- no `mock.ts` files remain under `apps/web/src/features`
- API-connected routes build
- correction/return/reversal actions invalidate relevant queries
- frontend does not act as source of truth for debt, payroll, stock, or finance
  totals
- loading/error/success states remain present in implemented mutation flows

Allowed frontend behavior:

- formatting backend values
- UX-only estimated totals in forms where backend remains authoritative
- rendering backend projection values
- simple record counts for UI labels where not used as persisted business truth

## Must-Fix Items

None found in this QA pass.

## Can-Defer Items

- Add automated integration tests for the smoke flows.
- Add limited-permission seed users for repeatable `403` RBAC tests.
- Add supplier payment reversal policy/implementation.
- Add production stage movement correction policy/implementation.
- Add material receipt correction policy/implementation.
- Add delivery return reason input if factory operators require it.
- Add explicit `RETURNED` order status only if reporting requires it.
- Add audit browsing UI for owners/managers.
- Add concurrency hardening tests for high-volume stock and payment operations.

## Release Readiness

Recommendation:

```text
MVP RC v2 is demo-ready and stronger than RC v1 because the main sales recovery
path is now verified:

Delivery → Return → Payment reversal → Debt projection update.
```

It remains suitable for controlled factory validation, not broad uncontrolled
production deployment.

## Senior Engineering Review

The v2 QA result is aligned with Paypoq OS principles:

- business-critical calculations remain backend-owned
- correction and reversal flows preserve history instead of editing old records
- stock changes are auditable through `StockMovement`
- payment reversal after delivery is safely gated by delivery return
- no generic ERP, workflow engine, CQRS, or event-sourcing complexity was added

The main remaining risk is operational recovery breadth: supplier payment
reversal, production correction, and material receipt correction are still
deferred.
