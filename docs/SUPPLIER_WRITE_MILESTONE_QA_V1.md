# Supplier Write Milestone QA v1

Status: Completed

Date: 2026-06-29

## Scope

This QA covers the Supplier Write Milestone v1:

- Supplier master data create/edit/archive
- Supplier purchase creation
- Supplier payment creation with full allocation
- Supplier debt projection behavior after payments
- Supplier write audit logging
- Finance Suppliers frontend write flows

No schema changes, migrations, material stock receipt integration, accounting ledger, or frontend-owned debt calculations were introduced.

## Implemented Endpoints

### Supplier master data

- `POST /supplier/suppliers`
- `PATCH /supplier/suppliers/:id`
- `POST /supplier/suppliers/:id/archive`

### Supplier purchases

- `POST /supplier/purchases`

### Supplier payments

- `POST /supplier/payments`

Existing read endpoints remain unchanged:

- `GET /supplier/suppliers`
- `GET /supplier/purchases`
- `GET /supplier/payments`
- `GET /supplier/debts`

## Permission Model

Write endpoints require:

- `finance.write`

Read endpoints continue to require:

- `finance.view`

Authentication and request context are still enforced through the existing JWT auth and request context foundation.

## Money and Allocation Policy

Supplier Payment Allocation v1 uses the approved deterministic policy:

- Allocations are required.
- At least one allocation row is required.
- Every allocation amount must be positive.
- Sum of allocations must exactly equal payment amount.
- No unallocated supplier credit exists in v1.
- No supplier overpayment exists in v1.
- Allocation cannot exceed purchase remaining balance.
- Supplier debt remains a backend projection:
  - purchase totals minus allocated supplier payments.

Frontend forms may show convenience values for operator UX, but backend validation and persisted values are the source of truth.

## Transaction Behavior

The following flows run inside database transactions:

- Supplier create/update/archive with audit entry.
- Supplier purchase creation with purchase items and audit entry.
- Supplier payment creation with allocations, affected purchase payment status updates, and audit entries.

This keeps payment, allocation, status update, and audit writes atomic for the implemented milestone.

## Audit Behavior

AuditLog records are created through `AuditService` for:

- `SUPPLIER_CREATED`
- `SUPPLIER_UPDATED`
- `SUPPLIER_ARCHIVED`
- `SUPPLIER_PURCHASE_CREATED`
- `SUPPLIER_PAYMENT_CREATED`
- `SUPPLIER_PAYMENT_ALLOCATED`
- `SUPPLIER_PURCHASE_PAYMENT_STATUS_UPDATED`

Audit records include tenant context, user context, relevant factory context where applicable, entity type, entity id, and before/after metadata where useful.

## Frontend Behavior

Route:

- `/finance/suppliers`

Added UI flows:

- Supplier create drawer
- Supplier edit drawer
- Supplier archive confirmation
- Supplier purchase drawer with material rows
- Supplier payment drawer with allocation rows

After successful mutations, the frontend invalidates:

- Supplier suppliers
- Supplier purchases
- Supplier payments
- Supplier debts
- Finance summary
- Executive dashboard summary

No old mock supplier data was reintroduced.

## Smoke Test Result

Smoke test passed against the local development API and PostgreSQL database.

Verified:

- Login as `owner@paypoq.local`
- Create supplier
- Edit supplier
- Create purchase
- Create partial supplier payment
- Payment status transitioned to `PARTIALLY_PAID`
- Create second supplier payment
- Payment status transitioned to `PAID`
- Supplier debt reached `0`
- Over-allocation returned `409`
- Archive supplier
- Archived supplier no longer appears in `GET /supplier/suppliers`
- Required audit logs were created

Smoke summary:

```json
{
  "ok": true,
  "partialStatus": "PARTIALLY_PAID",
  "finalStatus": "PAID",
  "debtAfterFinal": "0",
  "overAllocationStatus": 409,
  "archivedVisible": false,
  "auditSummary": {
    "SUPPLIER_ARCHIVED": 1,
    "SUPPLIER_CREATED": 1,
    "SUPPLIER_PAYMENT_ALLOCATED": 2,
    "SUPPLIER_PAYMENT_CREATED": 2,
    "SUPPLIER_PURCHASE_CREATED": 1,
    "SUPPLIER_PURCHASE_PAYMENT_STATUS_UPDATED": 2,
    "SUPPLIER_UPDATED": 1
  }
}
```

## Build Result

Passed:

- `pnpm --filter @paypoq/api build`
- `pnpm --filter @paypoq/web build`

## Must-Fix Items

None found during this milestone QA.

## Can-Defer Items

- Supplier payment reversal/correction flow.
- Supplier purchase edit/cancel flow.
- Supplier-specific remaining-balance read endpoint for cleaner payment allocation UX.
- Sequential human-readable purchase number generator.
- Concurrency hardening around simultaneous payments against the same purchase.
- Material stock receipt integration from supplier purchases.
- Limited-permission user smoke test for `403` behavior.

## Risks and Edge Cases

- Concurrent payments could race against the same purchase remaining balance. Current service validation is correct for normal MVP use, but row-level locking or serializable transaction strategy should be considered before high-volume usage.
- Purchase numbers are unique and readable, but UUID-suffixed rather than sequential. This avoids premature sequence design but may be less familiar to accountants.
- Supplier archive currently hides the supplier from active read endpoints but preserves historical purchases/payments. This matches the no-hard-delete rule.
- Frontend payment allocation filters purchases by selected supplier for UX, but backend remains the enforcement layer.

## Recommended Next Milestone

The next practical milestone is either:

1. Supplier purchase edit/cancel + payment correction, if finance operators need correction flows soon.
2. Material stock receipt linkage, if factory warehouse operations need supplier purchase-to-stock traceability.

Recommendation: keep Material Receipt and Supplier Purchase separate until real factory validation shows whether receiving materials and recording supplier debt happen in the same workflow or by different roles.

## Senior Engineering Review

Implemented scope is aligned with Paypoq OS principles:

- It stays modular-monolith.
- It keeps debt and money calculations in backend.
- It avoids accounting ledger overengineering.
- It preserves auditability for finance-sensitive writes.
- It does not create material stock as a side effect of supplier purchase, matching the explicit task boundary.

Main trade-off:

- Full allocation policy is simple and safe for MVP, but it means supplier prepayment/credit is intentionally unsupported. This is acceptable for v1 because it keeps supplier debt deterministic.
