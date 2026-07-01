# Sales Payment Reversal Policy v1

Status: Proposed

Date: 2026-06-30

Scope:

- Design documentation only
- No code changes
- No schema changes
- No migrations

## Purpose

Sales payments in Paypoq OS v1 are fully allocated to one or more sales orders.
Client debt is calculated from eligible order totals minus allocated payments.

Because delivered orders may already have deducted warehouse stock, payment
reversal must not accidentally create a state where goods are delivered but the
order becomes unpaid without an explicit manager/accountant decision.

This policy defines the safest MVP behavior for reversing sales payments.

## Recommended Policy

Use a conservative MVP rule:

```text
Allow sales payment reversal only when all affected orders are not DELIVERED
and not CLOSED.
```

If any affected order is `DELIVERED` or `CLOSED`, block payment reversal and
require delivery return/reversal or administrative resolution first.

Reversal must be compensating and auditable. The system must not hard-delete
the original `ClientPayment` or `ClientPaymentAllocation` records.

## Decision Answers

### 1. Can a payment be reversed if related order is DELIVERED?

For MVP: **No.**

If a related order is already `DELIVERED`, payment reversal is blocked.

Reason:

- delivery already reduced warehouse stock
- reversing payment would increase client debt
- the system would show delivered goods with unpaid balance
- this can confuse sellers, accountants, and managers

### 2. If payment reversal is allowed, what happens to order paymentStatus?

For allowed cases only:

- backend recalculates payment status for each affected order
- possible statuses:
  - `UNPAID`
  - `PARTIALLY_PAID`
  - `PAID`

Example:

```text
Order total: 1,000,000
Allocated payments before reversal: 1,000,000
Reversed payment: 400,000
Remaining valid allocation: 600,000
New paymentStatus: PARTIALLY_PAID
```

The frontend must not calculate this status.

### 3. Should delivery be reversed first?

Yes.

If an affected order is `DELIVERED`, delivery return/reversal must happen
before payment reversal.

MVP sequence:

```text
Delivered order
→ delivery return/reversal
→ stock restored or moved to Defects zone
→ order no longer treated as delivered
→ payment reversal can be evaluated
```

Until delivery return/reversal exists, payment reversal for delivered orders
must remain blocked.

### 4. Should reversal create compensating records or mark original payment revoked?

Recommended MVP:

```text
Create compensating reversal records.
Do not hard-delete original payment/allocation records.
```

Ideal future schema may add:

- `ClientPayment.reversedAt`
- `ClientPayment.reversedByUserId`
- `ClientPayment.reversalReason`
- `ClientPayment.reversalPaymentId`
- `ClientPaymentAllocation.reversedAt`
- or dedicated reversal records

However, the policy itself is:

- original payment remains visible
- original allocation remains visible
- reversal is explicit
- debt projection excludes or offsets reversed allocations

If implementation can safely mark original rows as reversed without losing
history, that may be acceptable, but hard delete is not allowed.

### 5. What audit actions are required?

Required audit actions:

- `CLIENT_PAYMENT_REVERSED`
- `CLIENT_PAYMENT_ALLOCATION_REVERSED`
- `SALES_ORDER_PAYMENT_STATUS_UPDATED`

If reversal is blocked because of delivery:

- no business mutation should occur
- optional future audit action:
  - `CLIENT_PAYMENT_REVERSAL_BLOCKED`

This blocked-attempt audit is can-defer for MVP unless factory managers request
visibility into failed correction attempts.

### 6. What is the safest MVP policy?

Safest MVP policy:

```text
Payment reversal is allowed only when all affected orders are not DELIVERED,
not CLOSED, not CANCELLED, and not DRAFT.
Delivered orders must be returned/reversed first.
Closed orders require admin policy later.
```

This prevents payment/debt state from drifting away from physical warehouse
delivery state.

## Allowed Cases

Payment reversal is allowed when:

- user has `sales.write`
- payment belongs to current tenant
- all allocations belong to orders in current tenant/factory context
- payment is not already reversed
- payment has at least one allocation
- all affected orders are:
  - `CONFIRMED`
  - `WAITING_PRODUCTION`
  - `READY`
- no affected order is delivered or closed
- reversal reason is provided

Allowed examples:

```text
Mistake: payment entered against wrong READY order.
Action: reverse payment.
Result: order paymentStatus recalculated, client debt increases.
```

```text
Mistake: payment amount entered too high before delivery.
Action: reverse full payment, then enter correct payment.
Result: original history remains, corrected payment becomes source for debt.
```

## Blocked Cases

Payment reversal must be blocked when:

- affected order is `DELIVERED`
- affected order is `CLOSED`
- payment is already reversed
- allocation belongs to another client
- allocation belongs to another tenant/factory
- reversal would make allocation totals invalid
- reason is missing
- user lacks `sales.write`

Blocked delivered-order example:

```text
Order is PAID and DELIVERED.
Warehouse stock was deducted.
Accountant tries to reverse payment.
System blocks:
"Avval delivery return/reversal qilinishi kerak."
```

## Required Backend Behavior

Future endpoint suggestion:

```text
POST /sales/payments/:id/reverse
```

Input:

```ts
{
  reason: string
}
```

Backend rules:

1. Use authenticated request context.
2. Require `sales.write`.
3. Validate payment belongs to current tenant.
4. Load payment allocations and affected orders.
5. Block if payment is already reversed.
6. Block if any affected order is `DELIVERED` or `CLOSED`.
7. Require non-empty reason.
8. Create compensating reversal records or mark payment/allocation as reversed
   without deleting original records.
9. Recalculate affected `SalesOrder.paymentStatus`.
10. Debt projection must increase after reversal.
11. Use one transaction.
12. Write AuditLog inside the same transaction.

Backend must be source of truth for:

- valid reversal eligibility
- payment status recalculation
- debt projection impact
- audit records

Frontend must not calculate final payment status or debt.

## Frontend Behavior

Recommended UI location:

- `/sales/payments`
- payment details drawer

Action:

```text
To‘lovni bekor qilish
```

UI behavior:

- show reversal button only for non-reversed payments
- show warning if payment affects delivered/closed orders
- require reason textarea
- require confirm dialog
- show backend error if reversal is blocked
- after success, invalidate:
  - sales payments
  - sales orders
  - sales debts
  - sales summary
  - executive dashboard summary

Suggested Uzbek messages:

Allowed confirmation:

```text
Bu to‘lov bekor qilinadi. Client qarzi qayta hisoblanadi.
```

Blocked delivered order:

```text
Bu to‘lov yetkazilgan buyurtmaga bog‘langan.
Avval delivery return/reversal qilinishi kerak.
```

Success:

```text
To‘lov reversal qilindi.
```

## Debt Projection Behavior

Client debt projection must treat reversed payment allocations as no longer
valid.

Conceptually:

```text
client debt = eligible order totals - valid allocated payments
```

After reversal:

- valid allocated payment total decreases
- client debt increases
- affected order paymentStatus may move from `PAID` to `PARTIALLY_PAID` or
  `UNPAID`

Important:

- frontend must not calculate debt
- frontend must not calculate paid totals
- backend summary/debt endpoints must apply the same reversal rules

## Audit Actions

Required:

### CLIENT_PAYMENT_REVERSED

Entity:

- `ClientPayment`

Metadata:

- reason
- payment id
- client id
- affected order ids
- reversed amount

### CLIENT_PAYMENT_ALLOCATION_REVERSED

Entity:

- `ClientPaymentAllocation`

Metadata:

- reason
- payment id
- order id
- allocation amount
- reversal record id if available

### SALES_ORDER_PAYMENT_STATUS_UPDATED

Entity:

- `SalesOrder`

Before:

- previous paymentStatus

After:

- new paymentStatus

Metadata:

- reason
- payment id
- valid paid amount after reversal where backend safely provides it

## Risks

### Business risks

- Blocking delivered-order reversals may frustrate accountants when the mistake
  is obvious, but it prevents inconsistent debt/stock state.
- Allowing reversal after delivery without return creates a dangerous state:
  delivered goods but unpaid order.
- Staff may need training on the difference between payment reversal and order
  delivery return.

### Technical risks

- Current schema may not yet have reversal fields or reversal-link records.
- Debt projection must be updated everywhere consistently.
- Sales summary and executive dashboard must use the same valid-payment logic.
- Concurrent reversal/payment actions require transaction safety.

### UX risks

- If the UI simply hides reversal on delivered orders, users may not understand
  what to do next.
- The UI should clearly explain: return delivery first, then reverse payment.

## Implementation Phases

### Phase 1 — Policy-safe reversal for non-delivered orders

Implement:

- `POST /sales/payments/:id/reverse`
- reason required
- block delivered/closed orders
- reverse/offset payment allocations
- recalculate paymentStatus
- update debt projection logic
- audit logs

This is the recommended first implementation.

### Phase 2 — Delivery return/reversal flow

Implement:

- full delivery reversal
- stock return movement
- order status transition
- audit logs

After this, delivered-order payment reversal can be allowed only after delivery
has been reversed.

### Phase 3 — Payment details and reversal trace UI

Implement:

- payment reversal history
- allocation reversal details
- order timeline entry

### Phase 4 — Advanced cases, only if needed

Possible future additions:

- partial payment reversal
- payment correction instead of full reversal
- refund workflow
- client credit / prepayment
- manager approval for high-value reversals

Do not add these in MVP unless real factory validation proves they are needed.

## Senior Engineering Review

### Implemented

Created the Sales Payment Reversal Policy v1 documentation.

### Architecture / Design Decisions

- Recommended blocking reversal for delivered/closed orders.
- Recommended delivery return/reversal before payment reversal.
- Chose compensating/explicit reversal over hard delete.
- Kept backend as source of truth for debt and payment status.
- Avoided full accounting/refund workflow in MVP.

### Risks and Edge Cases Noticed

- Reversing payment after delivery can make stock/order/debt inconsistent.
- Current schema may require minimal reversal fields or compensating records
  before implementation.
- All sales/debt/executive summary queries must share the same valid-payment
  filtering rule after reversal exists.

### Suggestions / Alternatives

- Implement only full payment reversal first.
- Defer partial reversal and refund handling.
- Add delivery return/reversal before allowing delivered-order payment reversal.

### What Was Intentionally Not Implemented

- No code changes.
- No schema changes.
- No migrations.
- No endpoint.
- No frontend UI.

### Assumptions

- Sales payments remain fully allocated in v1.
- Client debt remains a backend-calculated projection.
- Paid-only delivery policy remains active.

### Build/Test Result

Not run. This was documentation-only and did not change application code.
