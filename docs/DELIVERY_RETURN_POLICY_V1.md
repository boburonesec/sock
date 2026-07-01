# Delivery Return / Reversal Policy v1

Status: Proposed

Date: 2026-06-30

Scope:

- Design documentation only
- No code changes
- No schema changes
- No migrations

## Purpose

In Paypoq OS v1, order delivery deducts warehouse stock and sets the order
status to `DELIVERED`. Sales payment reversal is blocked for `DELIVERED` and
`CLOSED` orders because reversing payment after delivery can create a dangerous
business state:

```text
Goods delivered
→ warehouse stock already deducted
→ payment reversed
→ order becomes unpaid
```

Delivery return/reversal is therefore required before payment reversal can be
allowed for delivered orders.

This policy defines the safest MVP delivery return behavior.

## Current Schema Support

Current schema supports:

- `SalesOrderStatus.DELIVERED`
- `SalesOrderStatus.READY`
- `SalesOrderStatus.CLOSED`
- `StockMovementType.RETURN`
- product `Stock`
- immutable `StockMovement`
- `AuditLog`

Current schema does **not** support:

- `SalesOrderStatus.RETURNED`
- delivery-return entity/table
- partial-return tracking
- return reason fields on `SalesOrder`
- returned/damaged quantity per order item

## Recommended MVP Policy

Use a conservative, schema-compatible MVP policy:

```text
Full delivery return only.
Returned stock goes back to Finished Products.
Order status changes from DELIVERED back to READY.
Payment is not reversed automatically.
After delivery return, payment reversal may be evaluated normally.
```

Why `READY` instead of `RETURNED` in MVP:

- current schema does not include `RETURNED`
- adding a new enum value requires migration
- `READY` accurately means goods are back in warehouse and can be delivered
  again or used for payment reversal workflow
- return history remains visible through StockMovement and AuditLog

If the business later needs explicit returned-order reporting, add
`SalesOrderStatus.RETURNED` in a separate schema slice.

## Policy Decisions

### 1. Full delivery return only vs partial return

MVP should support **full delivery return only**.

Partial return is deferred.

Reason:

- partial return requires per-order-item returned quantity tracking
- partial return complicates delivery status, stock movement, and payment
  reversal rules
- full return is enough to unblock safe payment reversal for MVP

### 2. Returned goods destination

MVP default:

```text
Returned goods go back to Finished Products zone.
```

Reason:

- simplest happy path
- returned goods are assumed sellable unless future workflow says otherwise
- current goal is reversal of mistaken delivery, not damaged return processing

Can-defer:

- allow operator to choose `Defects` zone for damaged returns
- support partial damaged quantity

### 3. Order status after return

MVP:

```text
DELIVERED → READY
```

Reason:

- schema has `READY`
- schema does not have `RETURNED`
- `READY` allows the order to remain an active fulfilled-ready order after
  stock is restored
- payment reversal can then be evaluated because the order is no longer
  `DELIVERED`

Alternative:

```text
DELIVERED → RETURNED
```

This is cleaner semantically but requires schema migration. Recommended for v2
only if real reporting needs it.

### 4. Does paymentStatus change?

No.

Delivery return must not change payment status automatically.

Rules:

- `paymentStatus` remains whatever it was before return
- payment reversal is a separate explicit action
- debt projection changes only if payment is later reversed

Reason:

- delivery and payment are separate workflows
- automatic payment reversal would hide financial responsibility
- accountants must explicitly reverse payment if needed

### 5. Is payment reversal allowed after delivery return?

Yes, after delivery return, payment reversal can be evaluated normally.

Sequence:

```text
Delivered paid order
→ full delivery return
→ order status READY
→ payment reversal endpoint allowed to proceed if all other rules pass
→ debt projection increases
```

### 6. StockMovement behavior

Delivery return must create compensating `StockMovement` records.

For each order item:

- `itemType = PRODUCT`
- `movementType = RETURN`
- `productVariantId = order item productVariantId`
- `quantity = order item quantity`
- `unit = dona` or existing product unit convention
- `beforeQuantity = current stock quantity`
- `afterQuantity = current stock quantity + returned quantity`
- `reason = ORDER_DELIVERY_RETURN`
- `note` includes order number and operator reason
- `recordedByUserId = current user`
- `occurredAt = now`

Original delivery `StockMovement` must never be edited.

## Allowed Cases

Delivery return is allowed when:

- user has `sales.write` or explicitly approved future `warehouse.write`
- order belongs to current tenant/factory
- order status is `DELIVERED`
- order is not `CLOSED`
- order has order items
- return reason is provided
- target warehouse has active `Finished Products` zone

Allowed example:

```text
Order was delivered by mistake.
Manager returns delivery.
System creates RETURN StockMovement rows.
Stock goes back to Finished Products.
Order status becomes READY.
Payment remains PAID.
Accountant may now reverse payment if needed.
```

## Blocked Cases

Delivery return must be blocked when:

- order is not `DELIVERED`
- order is `CLOSED`
- order is `CANCELLED`
- order belongs to another tenant/factory
- order has no items
- reason is missing
- Finished Products zone is missing
- user lacks permission

Blocked examples:

```text
Order is CONFIRMED.
There was no delivery yet.
Return is blocked.
```

```text
Order is CLOSED.
Administrative lock exists.
Return is blocked until separate admin correction policy is approved.
```

## Required Backend Behavior

Future endpoint suggestion:

```text
POST /sales/orders/:id/return-delivery
```

Input:

```ts
{
  reason: string
}
```

Backend rules:

1. Use authenticated request context.
2. Require `sales.write` in MVP.
3. Validate order belongs to current tenant/factory.
4. Validate order status is `DELIVERED`.
5. Block `CLOSED` orders.
6. Require non-empty reason.
7. Find active `Finished Products` zone for current factory.
8. For each order item:
   - read current Stock row
   - create or increment Stock by returned quantity
   - create immutable `StockMovement` with `movementType = RETURN`
9. Set order status from `DELIVERED` to `READY`.
10. Do not change `paymentStatus`.
11. Do not reverse payment automatically.
12. Use one transaction.
13. Write AuditLog inside the same transaction.

Backend must return the updated order.

## Required Frontend Behavior

Recommended UI location:

- `/sales/orders`
- order details drawer

Action label:

```text
Delivery return qilish
```

UI behavior:

- show action only when order status is `DELIVERED`
- disable action for `CLOSED`, `CANCELLED`, non-delivered orders
- require reason textarea
- show confirmation warning:

```text
Bu delivery return qilinadi. Ombor stock qaytariladi.
To‘lov avtomatik bekor qilinmaydi.
```

After success, invalidate:

- sales orders
- sales payments
- sales debts
- sales summary
- warehouse stock
- warehouse stock summary
- warehouse movements
- executive dashboard summary

Frontend must not calculate stock totals or payment/debt values.

## Required Audit Actions

Delivery return must create these audit actions:

### SALES_ORDER_DELIVERY_RETURNED

Entity:

- `SalesOrder`

Before:

- status `DELIVERED`

After:

- status `READY`

Metadata:

- reason
- order number
- returned item count

### STOCK_INCREASED

Entity:

- `Stock`

Before:

- stock quantity before return

After:

- stock quantity after return

Metadata:

- reason
- order id
- order number
- product variant id
- returned quantity

### STOCK_MOVEMENT_CREATED

Entity:

- `StockMovement`

After:

- created return movement

Metadata:

- reason
- order id
- order number
- movement type `RETURN`

Optional future audit action:

- `ORDER_DELIVERY_RETURN_BLOCKED`

This is can-defer unless managers need a history of failed attempts.

## Payment Reversal After Delivery Return

After delivery return:

- order status becomes `READY`
- paymentStatus remains unchanged
- sales payment reversal endpoint may proceed if:
  - payment is not already reversed
  - affected order is not `DELIVERED`
  - affected order is not `CLOSED`
  - reason is provided

This preserves the clean sequence:

```text
Physical stock correction first
Financial reversal second
```

## Schema Gaps

Current schema is sufficient for MVP full delivery return if the order status
returns to `READY`.

No schema change is required for that policy.

Schema is insufficient for:

- explicit `RETURNED` order status
- partial returns
- return reason stored directly on order
- return entity/detail table
- damaged return split between Finished Products and Defects
- return quantity per order item

## Minimal Schema Change If RETURNED Is Required

If the business requires explicit returned-order reporting before implementation,
the minimal schema change is:

```prisma
enum SalesOrderStatus {
  DRAFT
  CONFIRMED
  WAITING_PRODUCTION
  READY
  DELIVERED
  RETURNED
  CLOSED
  CANCELLED
}
```

Optional but not MVP-minimal:

```prisma
model SalesOrderDeliveryReturn {
  id String @id @default(cuid())
  tenantId String
  factoryId String
  orderId String
  reason String
  returnedByUserId String
  returnedAt DateTime
}
```

Recommendation:

Do **not** add this schema in MVP unless real reporting requires it. Use
`READY` plus AuditLog and StockMovement history first.

## Phased Implementation Plan

### Phase 1 — Full delivery return to Finished Products

Implement:

- `POST /sales/orders/:id/return-delivery`
- reason required
- full order return only
- `StockMovementType.RETURN`
- order status `DELIVERED → READY`
- no paymentStatus change
- audit logs

This is the recommended first implementation.

### Phase 2 — Payment reversal after return

Use existing sales payment reversal endpoint after delivery return succeeds.

No automatic payment reversal.

### Phase 3 — Damaged return support

Add optional target zone:

- `Finished Products`
- `Defects`

Still full-return only unless partial return is approved.

### Phase 4 — Explicit RETURNED status if needed

Add `SalesOrderStatus.RETURNED` only if real factory reporting needs it.

### Phase 5 — Partial return

Only after factory validation:

- returned quantity per item
- partial stock return
- partial redelivery policy
- order status semantics
- payment/debt policy for partial return

Do not implement partial return in MVP.

## Senior Engineering Review

### Implemented

Created the Delivery Return / Reversal Policy v1 documentation.

### Architecture / Design Decisions

- Recommended full delivery return only.
- Recommended returned stock goes back to `Finished Products`.
- Recommended order status `DELIVERED → READY` because schema lacks
  `RETURNED`.
- Kept payment reversal separate and explicit.
- Chose compensating StockMovement over editing old delivery movements.

### Risks and Edge Cases Noticed

- `READY` after return is schema-compatible but less semantically explicit than
  `RETURNED`.
- Damaged returns need a later Defects-zone option.
- Partial returns require additional schema and business policy.
- Payment must not be reversed automatically because financial responsibility
  belongs to accountant/sales flow.

### Suggestions / Alternatives

- Implement Phase 1 without schema change.
- Add `RETURNED` later only if reporting actually needs it.
- Keep delivery return before payment reversal as the required operator flow.

### What Was Intentionally Not Implemented

- No code changes.
- No schema changes.
- No migrations.
- No endpoint.
- No frontend UI.

### Assumptions

- Paid-only delivery policy remains active.
- Current order status enum should not be expanded unless needed.
- `StockMovementType.RETURN` is available and should be used for return history.

### Build/Test Result

Not run. This was documentation-only and did not change application code.
