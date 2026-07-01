# Correction and Reversal Policy v1

Status: Proposed

Date: 2026-06-30

Scope:

- Design documentation only
- No code changes
- No schema changes
- No migrations

## Purpose

Paypoq OS handles factory operations where mistakes are normal:

- a payment can be entered for the wrong order
- a material receipt can use the wrong quantity
- a delivery can be returned
- a production stage movement can be entered incorrectly
- payroll may need correction after review

The system must support corrections without destroying operational history.

This policy defines which records may be reversed, which require compensating
records, which must never be edited, and which correction flows should be built
first.

## Core Principle

Operational and financial history must not be silently edited.

For Paypoq OS v1:

```text
Correct current state with explicit corrective records.
Preserve original history.
Audit every correction.
```

This keeps the system understandable for factory managers, accountants, and
owners without introducing a full accounting ledger or event-sourcing engine.

## Recommended MVP Policy

MVP should use a conservative correction model:

1. **Immutable transactions stay immutable.**
2. **Current snapshots may be adjusted only through approved correction flows.**
3. **Financial/payment records are reversed with explicit reversal records.**
4. **Stock and stage inventory are corrected with reason-required movements.**
5. **Payroll after close is never edited directly.**
6. **AuditLog is append-only and never reversed.**

The recommended MVP implementation order is:

1. Warehouse stock correction
2. Sales payment reversal
3. Supplier payment reversal
4. Delivery return/reversal
5. Production stage movement correction
6. Material receipt correction
7. Payroll correction after close

Reason:

Warehouse and payment mistakes are the most likely real-world support issues
and directly affect trust in dashboards, debt, and stock.

## Policy Matrix

| Area | Can be reversed? | Recommended method | Direct edit allowed? | Why |
| --- | --- | --- | --- | --- |
| Sales payment | Yes | Reversal payment/allocation records | No | Client debt must remain explainable. |
| Supplier payment | Yes | Reversal payment/allocation records | No | Supplier debt must remain explainable. |
| Delivery | Yes | Return movement + order status transition | No | Stock deduction must be auditable. |
| Warehouse stock | Yes | Stock correction movement | No | Current stock changes need reason/history. |
| Production stage movement | Yes | Opposite/corrective StageMovement | No | StageInventory is primary reporting unit. |
| Material receipt | Yes | Corrective MaterialStock movement | No | Material stock history must remain auditable. |
| Payroll after close | Limited | New adjustment/correction period | No | Closed payroll is immutable. |
| Employee mistake | Partially | Update master data, keep history | Limited | Employees are master data, not transactions. |
| Salary rate mistake | Partially | Archive/supersede rate, future correction | Limited | WorkerActivity stores historical rate snapshot. |
| AuditLog | No | Append explanatory audit entry if needed | Never | Audit history must be trusted. |

## What Can Be Reversed

The following should have explicit reversal/correction flows:

- Sales payment allocation
- Supplier payment allocation
- Order delivery
- Finished product stock receipt
- Material receipt
- Warehouse stock balance
- Production stage movement
- Worker activity before payroll close
- EmployeeAdjustment before payroll close

Reversal means:

- the original record remains visible
- a new correcting record is created
- current projections/snapshots are updated by backend transaction logic
- an AuditLog record explains who corrected what and why

## What Must Use Compensating Records

These records should not be edited after creation. Corrections must be
represented with compensating records:

- `SalesOrder`
- `SalesOrderItem`
- `ClientPayment`
- `ClientPaymentAllocation`
- `SupplierPurchase`
- `SupplierPurchaseItem`
- `SupplierPayment`
- `SupplierPaymentAllocation`
- `StageMovement`
- `WorkerActivity`
- `Defect`
- `StockMovement`
- `ProductionBatch`
- `PayrollItem`
- `PayrollPayment`

Compensating records are preferred because they preserve:

- auditability
- operator accountability
- debt explainability
- stock traceability
- payroll review history

## What Must Never Be Edited

These records must never be changed by normal business flows:

- `AuditLog`
- historical `StockMovement`
- historical `StageMovement`
- historical payment allocations
- closed `PayrollItem` snapshots
- closed payroll totals
- frozen order item unit prices and total prices
- WorkerActivity salary rate snapshots after payroll is closed

If a mistake is discovered, create a corrective business record and an audit
record. Do not rewrite the original fact.

## Required Audit Rules

Every correction or reversal must create an AuditLog entry.

Required audit fields:

- `tenantId`
- `factoryId` where applicable
- `userId`
- `action`
- `entityType`
- `entityId`
- `before`
- `after`
- `metadata.reason`
- `metadata.originalRecordId` where applicable

Required action naming convention:

```text
<DOMAIN_OBJECT>_<ACTION>
```

Examples:

- `CLIENT_PAYMENT_REVERSED`
- `CLIENT_PAYMENT_ALLOCATION_REVERSED`
- `SUPPLIER_PAYMENT_REVERSED`
- `SUPPLIER_PAYMENT_ALLOCATION_REVERSED`
- `ORDER_DELIVERY_REVERSED`
- `STOCK_CORRECTION_CREATED`
- `STOCK_MOVEMENT_CORRECTED`
- `STAGE_MOVEMENT_REVERSED`
- `MATERIAL_RECEIPT_CORRECTED`
- `PAYROLL_CORRECTION_CREATED`
- `SALARY_RATE_ARCHIVED`
- `EMPLOYEE_UPDATED`

Correction audit metadata should include:

- reason
- original record id
- correction record id
- operator note
- previous quantity/amount/status where useful
- resulting quantity/amount/status where useful

## Sales Payment Reversal Policy

### Problem

A seller/accountant may allocate a payment to the wrong order, wrong client, or
wrong amount.

### Recommended MVP policy

Sales payment reversal is allowed only by users with `sales.write`.

The original `ClientPayment` and `ClientPaymentAllocation` records remain.
The backend creates reversal records or marks the payment as reversed if the
schema later supports a reversal link/status.

Debt projection must treat reversed allocations as cancelled by their reversal.

### Rules

- A payment can be reversed only once.
- Reversal requires a reason.
- Reversal must be blocked if the order has downstream state that cannot safely
  remain, unless a linked delivery reversal is also performed.
- If reversing payment makes a delivered order unpaid, the system must either:
  - block reversal until delivery return is completed, or
  - allow reversal but flag the order as an exception.

### MVP recommendation

Use the safer policy:

```text
If order is already DELIVERED, require delivery return before payment reversal.
```

### Required audit actions

- `CLIENT_PAYMENT_REVERSED`
- `CLIENT_PAYMENT_ALLOCATION_REVERSED`
- `SALES_ORDER_PAYMENT_STATUS_UPDATED`

## Supplier Payment Reversal Policy

### Problem

Accountant may enter supplier payment with wrong amount or wrong purchase
allocation.

### Recommended MVP policy

Supplier payment reversal is allowed only by users with `finance.write`.

Original payment and allocations remain. A reversal record or reversal status is
used to remove the payment impact from supplier debt projection.

### Rules

- Reversal requires a reason.
- Reversal cannot create negative paid amount on a purchase.
- Purchase payment status is recalculated by backend.
- Supplier debt projection is recalculated from non-reversed purchases/payments.

### Required audit actions

- `SUPPLIER_PAYMENT_REVERSED`
- `SUPPLIER_PAYMENT_ALLOCATION_REVERSED`
- `SUPPLIER_PURCHASE_PAYMENT_STATUS_UPDATED`

## Delivery Return / Reversal Policy

### Problem

Delivered goods may be returned, or delivery may have been confirmed by
mistake.

### Recommended MVP policy

Delivery reversal should be represented as a warehouse stock return and order
status update.

Original delivery StockMovement remains. The return creates a new StockMovement
in the opposite direction.

### Rules

- Delivery return requires `sales.write` or `warehouse.write`.
- Return quantity cannot exceed delivered quantity not already returned.
- Returned product goes to:
  - `Finished Products` if sellable, or
  - `Defects` zone if damaged
- Reason is required.
- Order status should move from `DELIVERED` back to `READY` only for full
  reversal and only if business wants it.

### MVP recommendation

Use a simple conservative policy:

```text
Full delivery reversal only.
Partial return can be v2.
Returned stock goes to Finished Products or Defects by explicit operator choice.
```

### Required audit actions

- `ORDER_DELIVERY_REVERSED`
- `STOCK_INCREASED`
- `STOCK_MOVEMENT_CREATED`
- `SALES_ORDER_STATUS_UPDATED`

## Warehouse Stock Correction Policy

### Problem

Physical count may not match system stock because of entry mistakes, damage,
loss, counting errors, or operational exceptions.

### Recommended MVP policy

Warehouse stock correction is the first correction flow to implement.

Corrections should create StockMovement records with a correction movement type
and adjust the current `Stock` or `MaterialStock` snapshot.

### Rules

- Correction requires `warehouse.write`.
- Reason is required.
- Before and after quantity must be stored.
- Correction must not create negative stock.
- User must choose product/material and warehouse zone.
- Backend owns the final before/after calculation.

### Correction types

- Product stock correction
- Material stock correction

### Required audit actions

- `STOCK_CORRECTION_CREATED`
- `STOCK_INCREASED` or `STOCK_DECREASED`
- `MATERIAL_STOCK_INCREASED` or `MATERIAL_STOCK_DECREASED`
- `STOCK_MOVEMENT_CREATED`

## Production Stage Movement Correction Policy

### Problem

Shift Receiver may move product to the wrong stage, wrong product variant, or
wrong quantity.

### Recommended MVP policy

Do not edit the original `StageMovement`.

Create an opposite or corrective movement that updates `StageInventory`.

### Rules

- Correction requires `production.write`.
- Reason is required.
- Source stage must have enough quantity for corrective movement.
- Correction cannot create negative StageInventory.
- If the original movement is already linked to downstream warehouse receipt,
  correction should be blocked until warehouse correction is handled.

### Examples

Wrong stage:

```text
Original: Averlog → Dazmol, 500
Correction: Dazmol → Averlog, 500
```

Wrong quantity:

```text
Original: Averlog → Dazmol, 500
Correct quantity should be 400
Correction: Dazmol → Averlog, 100
```

### Required audit actions

- `STAGE_MOVEMENT_REVERSED`
- `STAGE_INVENTORY_DECREASED`
- `STAGE_INVENTORY_INCREASED`

## Material Receipt Correction Policy

### Problem

Warehouse operator may receive material with wrong quantity, unit, zone, or
material.

### Recommended MVP policy

Do not edit the original material receipt StockMovement.

Create a corrective material stock movement.

### Rules

- Correction requires `warehouse.write`.
- Reason is required.
- Material corrections cannot create negative MaterialStock.
- Unit mismatch must be blocked unless the correction is for the same material
  and same unit context.
- If material has already been consumed in future production-consumption flow,
  correction must be limited by available remaining quantity.

### Required audit actions

- `MATERIAL_RECEIPT_CORRECTED`
- `MATERIAL_STOCK_INCREASED` or `MATERIAL_STOCK_DECREASED`
- `STOCK_MOVEMENT_CREATED`

## Payroll Correction After Close

### Problem

After payroll is closed, a worker activity, salary rate, bonus, penalty, or
advance mistake may be discovered.

### Recommended MVP policy

Closed payroll is immutable.

Do not edit closed `PayrollPeriod`, `PayrollItem`, or `PayrollPayment` records.
Create a payroll correction adjustment in a future/open payroll period.

### Rules

- Correction requires finance/manager-level permission.
- Closed payroll cannot be recalculated.
- Closed payroll cannot receive new payment records.
- Correction must reference the original payroll period and reason.
- Correction appears as a new `EmployeeAdjustment` or future dedicated
  correction record.

### MVP recommendation

Use existing adjustment model first:

```text
Closed payroll correction → EmployeeAdjustment in next open period
```

If real factories need more detailed correction tracing, add a dedicated
PayrollCorrection model later.

### Required audit actions

- `PAYROLL_CORRECTION_CREATED`
- `EMPLOYEE_ADJUSTMENT_CREATED`
- `PAYROLL_PERIOD_CORRECTION_REFERENCED`

## Employee and Salary Rate Mistakes

### Employee mistake

Employee master data can be corrected if the mistake is descriptive:

- name typo
- status mistake
- factory assignment mistake before use

But employee records must never be hard-deleted.

If employee has historical WorkerActivity, PayrollItem, or AuditLog references:

- keep the employee
- update current display data only
- preserve historical references

Required audit actions:

- `EMPLOYEE_UPDATED`
- `EMPLOYEE_INACTIVATED`
- `EMPLOYEE_REACTIVATED` if added later

### Salary rate mistake

SalaryRate is configuration and may be archived/superseded.

WorkerActivity stores a salary rate snapshot. Existing WorkerActivity should
not be silently changed after payroll is calculated or closed.

Recommended policy:

- If no WorkerActivity used the rate: archive and recreate.
- If WorkerActivity used the rate but payroll is not closed: allow controlled
  recalculation through payroll calculation flow, not manual frontend math.
- If payroll is closed: create payroll correction adjustment in a future/open
  period.

Required audit actions:

- `SALARY_RATE_ARCHIVED`
- `SALARY_RATE_CREATED`
- `WORKER_ACTIVITY_CORRECTION_CREATED` if added later
- `PAYROLL_CORRECTION_CREATED` after payroll close

## Audit Log Immutability

AuditLog is the accountability source and must remain append-only.

Rules:

- No update endpoint.
- No delete endpoint.
- No archive endpoint.
- No correction endpoint.
- No business flow modifies old audit rows.

If an audit record is incomplete or confusing, create a new explanatory audit
entry. Do not change the original record.

Required action:

- `AUDIT_NOTE_CREATED` only if a future audit-note flow is explicitly approved.

## Backend Implementation Requirements for Future Flows

Future correction endpoints should follow these rules:

1. Use Auth + RequestContext.
2. Enforce tenantId and activeFactoryId.
3. Require appropriate permission.
4. Validate the original record belongs to the same tenant/factory.
5. Require a reason.
6. Use a single Prisma transaction.
7. Update current snapshots and create compensating history together.
8. Write AuditLog inside the same transaction.
9. Return backend-calculated final state.
10. Never rely on frontend calculations.

## Frontend Requirements for Future Flows

Future correction UI should be simple and operator-friendly:

- show original record
- show current state
- require reason
- use confirm dialog
- clearly label action as correction/reversal
- show warning if downstream records are affected
- no hidden calculations
- no frontend source-of-truth totals

Suggested Uzbek labels:

- `Tuzatish kiritish`
- `Bekor qilish`
- `Qaytarish`
- `Sabab`
- `Oldingi holat`
- `Yangi holat`
- `Tasdiqlash`

## Risks

### Business risks

- Incorrect reversals can hide real operational mistakes if too easy.
- Blocking reversals too aggressively can force manual database fixes.
- Operators may confuse archive, cancel, reverse, and correct.
- Payment reversal after delivery can make sales/debt state inconsistent unless
  delivery return policy is enforced.
- Payroll correction after close can create trust issues if not clearly shown.

### Technical risks

- Snapshot updates and reversal records must be transactionally consistent.
- Concurrent corrections can cause race conditions if guarded updates are weak.
- Existing schema may need reversal-link fields or status fields for clean
  implementation.
- Projections must consistently exclude or offset reversed records.
- AuditLog volume will grow quickly after correction flows are added.

### UX risks

- Too many correction options can overwhelm non-technical factory staff.
- Correction screens must be clear enough for managers/accountants to review.
- Reason entry should be required but not overly bureaucratic.

## Phased Implementation Plan

### Phase 1 — Warehouse Stock Correction

Implement:

- product stock correction
- material stock correction
- reason-required StockMovement
- audit actions

Why first:

- most operationally urgent
- lowest cross-domain coupling
- protects warehouse trust before delivery/return complexity

### Phase 2 — Sales Payment Reversal

Implement:

- reverse allocated client payment
- recalculate order paymentStatus
- update debt projection
- block reversal when delivered unless delivery is reversed first

Why second:

- client debt is one of the most important business metrics
- payment mistakes are common

### Phase 3 — Supplier Payment Reversal

Implement:

- reverse allocated supplier payment
- recalculate purchase paymentStatus
- update supplier debt projection

Why third:

- mirrors sales payment logic
- important for accountant workflow

### Phase 4 — Delivery Return / Reversal

Implement:

- full delivery reversal
- returned stock movement
- order status update
- damaged return to Defects zone option

Why fourth:

- depends on warehouse correction confidence
- interacts with sales payment policy

### Phase 5 — Production Stage Movement Correction

Implement:

- reverse or corrective stage movement
- StageInventory update
- reason and audit

Why fifth:

- important, but downstream warehouse receipt interactions need clear policy

### Phase 6 — Material Receipt Correction

Implement:

- corrective material receipt movement
- block negative material stock
- unit-safety validation

Why sixth:

- similar to stock correction but has unit complications

### Phase 7 — Payroll Correction After Close

Implement:

- future-period payroll correction adjustment
- link to original closed payroll period
- clear payroll review UI

Why last:

- payroll correction has the highest trust and people-risk impact
- best implemented after real factory payroll feedback

## Which Correction Flow Should Be Implemented First

Recommended first implementation:

```text
Warehouse Stock Correction v1
```

Reason:

- It solves the largest practical gap before real factory validation.
- It does not require changing sales, supplier, or payroll domain rules.
- It directly supports physical inventory count correction.
- It creates the reusable correction UX pattern:
  - select record/context
  - show current quantity
  - enter corrected quantity or delta
  - require reason
  - confirm
  - create audit + movement

The first endpoint should be narrow:

```text
POST /warehouse/stock-corrections
```

Suggested v1 scope:

- product stock correction
- material stock correction
- one warehouse/factory context
- reason required
- no bulk correction
- no CSV import

## Senior Engineering Review

### Implemented

Created a design policy for correction and reversal flows across sales,
supplier, warehouse, production, payroll, employee/salary-rate mistakes, and
AuditLog immutability.

### Architecture / Design Decisions

- Chose compensating records over destructive edits.
- Kept AuditLog append-only.
- Kept correction logic backend-owned.
- Recommended Warehouse Stock Correction as the first implementation.
- Avoided event sourcing, CQRS, workflow engines, and full accounting ledger.

### Risks and Edge Cases Noticed

- Payment reversal after delivery can create inconsistent order/debt state.
- Delivery reversal requires careful stock-zone handling.
- Payroll correction after close affects employee trust and should be delayed
  until the policy is very clear.
- Material unit mismatch can corrupt stock if not blocked.
- Correction flows need strong transaction boundaries and guarded updates.

### Suggestions / Alternatives

- Add reversal-link fields in future only when implementation proves they are
  needed.
- Start with one narrow correction flow rather than building a generic
  correction framework.
- Create limited-role QA users before implementing high-risk correction flows.

### What Was Intentionally Not Implemented

- No code changes.
- No schema changes.
- No migrations.
- No endpoints.
- No frontend correction screens.

### Assumptions

- Existing immutable movement/payment/payroll principles remain valid.
- MVP continues to prefer simple explicit workflows over generic workflow
  engines.
- Factory staff need understandable correction screens more than broad
  configurability.

### Build/Test Result

Not run. This was documentation-only and did not change application code.
