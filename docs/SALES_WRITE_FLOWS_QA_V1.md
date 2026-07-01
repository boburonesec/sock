# Sales Write Flows QA Audit v1

Status: Completed  
Date: 2026-06-29  
Scope: Audit + safe fixes only

## Scope Reviewed

Reviewed implemented Sales write and read projection flows:

- Client create/edit/archive
- Sales order create
- Sales payment + allocation
- Sales debts projection
- Sales summary
- Executive summary sales values

No schema changes, migrations, new features, or new business flows were added.

## Summary

Sales write flows are acceptable for the current MVP vertical slice.

The implemented model keeps the approved business rule simple and deterministic:

```text
client debt = eligible order totals - allocated payments
```

The current v1 payment policy is also correctly enforced:

- no unallocated payments
- no client credit / advance payment concept
- no overpayment
- payment amount must equal allocation total exactly

## Verified Backend Behavior

### Auth / RBAC

Verified by code review:

- `SalesController` is protected by `JwtAuthGuard`.
- `SalesController` is protected by `PermissionGuard`.
- Read endpoints inherit `sales.view`.
- Write endpoints override with `sales.write`:
  - `POST /sales/clients`
  - `PATCH /sales/clients/:id`
  - `POST /sales/clients/:id/archive`
  - `POST /sales/orders`
  - `POST /sales/payments`

Verified by smoke test:

- unauthenticated `GET /sales/clients` returns `401`.
- Owner user can execute Sales read/write flows.

Not smoke-tested:

- `403` with a limited-permission user, because the local seed currently has only the demo Owner user. This is a can-defer QA data gap, not a code blocker.

### Tenant / Factory Context

Verified by code review:

- Client writes use `tenantId`.
- Order writes use `tenantId` and `activeFactoryId`.
- Payment allocation validates orders using `tenantId`, `activeFactoryId`, and selected `clientId`.
- Debt and summary projections use tenant/factory filters for order-backed calculations.

### Transactions

Verified by code review:

- Client create/edit/archive writes audit logs inside Prisma transactions.
- Sales order create writes order, items, and audit log inside one Prisma transaction.
- Sales payment create writes payment, allocations, order payment status updates, and audit logs inside one Prisma transaction.

No partial write risk was found for the reviewed happy-path and validation failure paths.

### Money Safety

Verified by code review and smoke test:

- Monetary values use Prisma `Decimal`.
- Order item totals are calculated in backend.
- Order total is calculated in backend.
- Payment amount must be positive.
- Allocation amount must be positive.
- Allocation total must equal payment amount exactly.
- Allocation cannot exceed remaining order balance.
- Over-allocation returns `409`.
- Full allocation mismatch returns `400`.
- Order `paymentStatus` transitions correctly:
  - `UNPAID`
  - `PARTIALLY_PAID`
  - `PAID`
- Debt projection is backend-calculated from eligible orders and payment allocations.

### Audit

Verified audit actions:

- `CLIENT_CREATED`
- `CLIENT_UPDATED`
- `CLIENT_ARCHIVED`
- `SALES_ORDER_CREATED`
- `CLIENT_PAYMENT_CREATED`
- `CLIENT_PAYMENT_ALLOCATED`
- `SALES_ORDER_PAYMENT_STATUS_UPDATED`

Audit records include tenant/user context. Factory context is included for factory-scoped Sales actions.

## Verified Frontend Behavior

Verified by code review:

- Sales pages use API data; no Sales mock files were found.
- Sales Clients invalidates:
  - clients
  - summary
  - debts
  - executive summary
- Sales Orders invalidates:
  - orders
  - summary
  - debts
  - executive summary
- Sales Payments invalidates:
  - payments
  - orders
  - debts
  - summary
  - executive summary
- Loading, error, and success states exist for write flows.
- Frontend displays backend values for debt, order totals, and payment status.

Allowed frontend-only UX calculations:

- Order create drawer shows estimated totals only when seller manually enters unit price.
- Payment create drawer checks allocation total against payment amount before submit.

These are not authoritative; backend validation remains the source of truth.

## Smoke Test Result

Smoke test passed against local development API/database.

Verified sequence:

1. Unauthenticated Sales request returned `401`.
2. Logged in as demo Owner.
3. Created client.
4. Edited client.
5. Created product, variant, and active price for test order.
6. Created Sales order.
7. Created partial payment allocation.
8. Verified order status moved to `PARTIALLY_PAID`.
9. Verified debt projection decreased.
10. Created second payment allocation.
11. Verified order status moved to `PAID`.
12. Verified debt projection reached `0`.
13. Verified over-allocation returned `409`.
14. Verified incomplete full-allocation policy returned `400`.
15. Archived client.
16. Verified archived client no longer appears in active client list.
17. Verified expected audit log actions.

Smoke output summary:

```json
{
  "ok": true,
  "unauthStatus": 401,
  "paymentStatus": "PAID",
  "finalDebt": "0",
  "overAllocationStatus": 409,
  "fullAllocationRequiredStatus": 400
}
```

## Build Results

API build:

```text
pnpm --filter @paypoq/api build
PASS
```

Web build:

```text
pnpm --filter @paypoq/web build
PASS
```

## Must-Fix Items

None found in this QA pass.

## Can-Defer Items

### 1. Payment concurrency hardening

Current payment allocation checks remaining balance inside a transaction, but high-concurrency double-payment scenarios may still need stronger protection later.

Recommended future options:

- transaction isolation review
- row-level lock strategy
- optimistic version field

Do not add this until real concurrent payment usage needs it.

### 2. Dedicated allocatable orders endpoint

The frontend currently filters `/sales/orders` by selected client for UX.

A future endpoint could return backend-calculated remaining balances:

```text
GET /sales/clients/:id/allocatable-orders
```

This would improve UX without moving debt logic to frontend.

### 3. Human-readable order number sequence

Current order number uses a date + UUID-short strategy.

Can defer until the factory needs strict sequential order numbers.

### 4. Limited-permission smoke user

The `403` path should be smoke-tested after adding a seeded user without `sales.write`.

Do not add that seed user unless explicitly approved.

### 5. Payment reversal / correction flow

There is no payment reversal or correction workflow yet.

This is intentionally deferred because it requires explicit audit and accounting rules.

## Known Limitations

- No payment reversal.
- No delivery flow.
- No warehouse stock deduction.
- No order edit/cancel flow.
- No client credit or unallocated payment.
- No order numbering sequence.
- No invoice module.
- No full accounting ledger.

## Recommended Next Milestone

Recommended next milestone:

```text
Sales Order lifecycle v1
```

Suggested narrow scope:

- order cancel flow
- order status transition rules
- audit for lifecycle changes
- no delivery/warehouse deduction yet unless explicitly approved

This keeps Sales workflow progressing without prematurely turning Paypoq OS into a generic ERP.

## Senior Engineering Review

Implemented:

- Documentation-only QA audit.
- Build verification.
- Smoke verification.

Architecture / design decisions:

- No code changes were made because no must-fix defect was found.
- Existing Sales flows remain inside the Sales module.
- Existing backend-owned calculation model remains valid.

Risks and edge cases noticed:

- Concurrent payment allocation can be hardened later.
- UX would improve with backend-calculated remaining balances.
- Strict order numbering requires a separate design decision.

Suggestions / alternatives:

- Add a limited-permission smoke user later for automated `403` testing.
- Add payment reversal only after explicit business rules are approved.

What was intentionally not implemented:

- No new Sales features.
- No schema changes.
- No migrations.
- No seed changes.
- No permission/user changes.
- No payment reversal or delivery/stock flow.

Assumptions:

- Demo Owner user remains the primary local smoke-test user.
- Full payment allocation policy remains approved for v1.

