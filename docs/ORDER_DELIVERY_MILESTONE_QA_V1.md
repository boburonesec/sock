# Order Delivery + Warehouse Stock Deduction Milestone QA v1

Status: Verified

Date: 2026-06-29

## Scope

This milestone implemented the first sales delivery flow:

- Backend delivery endpoint
- Sales Orders frontend delivery action
- Warehouse finished-product stock deduction
- StockMovement creation
- AuditLog creation
- Build verification

No schema changes, migrations, delivery/shipping module, invoice/print flow, or
accounting ledger were introduced.

## Implemented Endpoint

- `POST /sales/orders/:id/deliver`

Permission:

- `sales.write`

## Delivery Policy v1

Safe v1 policy:

- Order must belong to current `tenantId` and `activeFactoryId`.
- Order must have `paymentStatus = PAID`.
- Order status must not be:
  - `DRAFT`
  - `CANCELLED`
  - `DELIVERED`
  - `CLOSED`
- Delivery uses frozen order item quantities.
- No extra frontend quantity input exists.
- No payment mutation happens during delivery.
- No invoice or accounting entry is created.

This means debt/unpaid orders cannot leave stock in v1.

## Warehouse Stock Rules

For each order item:

- Product stock is deducted from the active `Finished Products` warehouse zone.
- Stock must exist and contain enough quantity.
- Stock is decremented with a guarded update to prevent negative stock.
- A `StockMovement` is created with:
  - `itemType = PRODUCT`
  - `movementType = ISSUE`
  - quantity
  - `beforeQuantity`
  - `afterQuantity`
  - reason: `Order delivery`
  - order metadata in note/audit metadata

## Transaction Behavior

The delivery flow runs inside one database transaction:

1. Validate order.
2. Validate payment/delivery policy.
3. Validate Finished Products stock for every order item.
4. Decrease stock with guarded update.
5. Create StockMovement per item.
6. Create stock audit records.
7. Set order status to `DELIVERED`.
8. Create order delivery audit record.

If any step fails, the transaction rolls back.

## Audit Behavior

AuditLog records are created through `AuditService` for:

- `SALES_ORDER_DELIVERED`
- `STOCK_DECREASED`
- `STOCK_MOVEMENT_CREATED`

Audit records include tenant/factory/user context and order metadata where
useful.

## Frontend Behavior

Route:

- `/sales/orders`

Added behavior:

- Order details drawer now shows `Yetkazildi qilish`.
- Button is disabled unless order matches the v1 delivery policy.
- Confirm dialog appears before delivery.
- Successful delivery shows success feedback.
- Backend errors show error feedback.

After successful delivery, frontend invalidates:

- sales orders
- sales summary
- sales debts
- warehouse stock
- warehouse stock summary
- warehouse movements
- executive dashboard summary
- factory TV summary

## Build Result

Passed:

- `pnpm --filter @paypoq/api build`
- `pnpm --filter @paypoq/web build`

## Smoke Test Status

Smoke test passed against a freshly built local API on port `3002` and the local
PostgreSQL database at `localhost:55432`.

Verified:

- create or reuse client/order/payment
- ensure Finished Products stock exists for order product variant
- unpaid order delivery returns `409`
- paid order delivery succeeds
- order status becomes `DELIVERED`
- warehouse stock decreases by order quantity
- StockMovement is created with `ISSUE`
- audit logs are created:
  - `SALES_ORDER_DELIVERED`
  - `STOCK_DECREASED`
  - `STOCK_MOVEMENT_CREATED`
- insufficient stock returns `409`

Smoke summary:

```json
{
  "ok": true,
  "status": "DELIVERED",
  "beforeStock": 20,
  "afterStock": 15,
  "unpaidDeliverStatus": 409,
  "insufficientStockStatus": 409,
  "auditSummary": {
    "SALES_ORDER_DELIVERED": 1,
    "STOCK_DECREASED": 1,
    "STOCK_MOVEMENT_CREATED": 1
  }
}
```

## Must-Fix Items

- None found by build or smoke verification.

## Can-Defer Items

- Delivery reversal/return flow.
- Partial delivery flow.
- Delivery address/shipping module.
- Invoice/print workflow.
- Accounting ledger integration.
- Better stock reservation before delivery.
- Dedicated automated integration test for delivery flow.

## Risks and Edge Cases

- V1 does not reserve stock when the order is created or paid. Stock is checked
  only at delivery time.
- Multiple concurrent deliveries for the same product rely on guarded update to
  prevent negative stock, but high-volume usage may later need row locking or a
  stricter transaction isolation strategy.
- Delivery is all-or-nothing; partial fulfillment is intentionally not
  supported in v1.
- Delivery requires paid order in v1, which is safe but may be stricter than
  factories that allow trusted-client debt delivery.

## Recommended Next Milestone

Recommended next milestone after DB smoke verification:

1. Delivery smoke verification when PostgreSQL is reachable.
2. Return/correction policy design for delivered orders and warehouse stock.

Avoid adding shipping/invoice/accounting flows until the basic warehouse-stock
deduction workflow is validated in real factory operations.

## Senior Engineering Review

The implementation follows Paypoq OS principles:

- Stock deduction is backend-owned.
- Frontend does not calculate or mutate quantities directly.
- Warehouse stock cannot go negative through the delivery endpoint.
- The operation is auditable.
- The solution stays inside the modular monolith.
- No generic ERP delivery/shipping/accounting subsystem was introduced.

The strict paid-order delivery policy is intentionally conservative for v1.
