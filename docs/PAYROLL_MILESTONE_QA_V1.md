# Payroll Milestone QA v1

Status: Completed

Date: 2026-06-29

## Scope

This milestone implemented the first backend-owned payroll write flow:

- Payroll period creation
- Payroll calculation from WorkerActivity snapshots
- Payroll review through PayrollItem snapshots
- Payroll payment
- Payroll period close
- Advance, bonus, and penalty creation

No schema changes, migrations, frontend payroll calculations, accounting ledger,
or approval workflow engine were introduced.

## Implemented Endpoints

### Payroll periods

- `POST /finance/payroll-periods`
- `POST /finance/payroll-periods/:id/calculate`
- `POST /finance/payroll-periods/:id/pay`
- `POST /finance/payroll-periods/:id/close`

### Employee adjustments

- `POST /finance/advances`
- `POST /finance/bonuses`
- `POST /finance/penalties`

Existing read endpoints remain:

- `GET /finance/payroll-periods`
- `GET /finance/payroll-periods/:id/items`
- `GET /finance/advances`

## Approved Lifecycle

Payroll lifecycle v1:

```text
DRAFT
→ CALCULATED
→ PARTIALLY_PAID / PAID
→ CLOSED
```

Rules implemented:

- Creating a period creates a zeroed `DRAFT` period.
- Calculation is allowed only while `DRAFT` or `CALCULATED`.
- Calculation replaces PayrollItem snapshots for the period.
- Payment is allowed only while `CALCULATED` or `PARTIALLY_PAID`.
- `PAID` means all PayrollItem balances are paid.
- `CLOSED` is a final administrative lock.
- No recalculation after `CLOSED`.
- No payment after `CLOSED`.

## Payroll Calculation Rules

Backend calculation uses:

- `WorkerActivity` as source of truth.
- `WorkerActivity.salaryRateAmount` snapshot as authoritative rate.
- Eligible EmployeeAdjustments in the payroll month:
  - bonuses increase net pay
  - penalties reduce net pay
  - advances reduce net pay

Formula:

```text
workedAmount = sum(quantity × salaryRateAmount)
finalAmount = workedAmount + bonuses - penalties - advances
```

If the raw final amount is negative, v1 floors the payable final amount at `0`
and stores the raw value in the calculation snapshot for audit visibility.

## Adjustment v1 Behavior

Because approval/payment workflow endpoints are not part of this milestone:

- `POST /finance/advances` creates a payroll-applicable paid advance.
- `POST /finance/bonuses` creates a payroll-applicable approved bonus.
- `POST /finance/penalties` creates a payroll-applicable approved penalty.

During payroll calculation, included adjustments are linked to the payroll period
and marked `APPLIED`.

## Frontend Behavior

Route:

- `/finance/payroll`

Implemented UI:

- Create payroll period drawer
- Add advance drawer
- Add bonus drawer
- Add penalty drawer
- Calculate payroll action
- Review PayrollItem table
- Pay payroll item drawer
- Close payroll period confirmation

Frontend renders backend snapshot values only. It does not calculate salary,
remaining amount, net pay, bonuses, penalties, advances, or payroll totals as
the source of truth.

## Audit Behavior

AuditLog records are created through `AuditService` for:

- `PAYROLL_PERIOD_CREATED`
- `PAYROLL_PERIOD_CALCULATED`
- `PAYROLL_PAYMENT_CREATED`
- `PAYROLL_PERIOD_PAYMENT_STATUS_UPDATED`
- `PAYROLL_PERIOD_CLOSED`
- `ADVANCE_CREATED`
- `BONUS_CREATED`
- `PENALTY_CREATED`

## Smoke Test Result

Smoke test passed against the local development API and PostgreSQL database.

Verified:

- Login as `owner@paypoq.local`
- Create employee for payroll smoke
- Create WorkerActivity payroll source record
- Create payroll period
- Create advance
- Create bonus
- Create penalty
- Calculate payroll
- Verify worked, bonus, penalty, advance, and final amounts
- Pay partially
- Status transitions to `PARTIALLY_PAID`
- Pay remaining balance
- Status transitions to `PAID`
- Close payroll period
- Status transitions to `CLOSED`
- Payment after close returns `409`
- Recalculation after close returns `409`
- Audit records created

Smoke summary:

```json
{
  "ok": true,
  "month": "2182-01",
  "worked": "10000",
  "bonus": "500",
  "penalty": "200",
  "advance": "1000",
  "finalAmount": "9300",
  "partialStatus": "PARTIALLY_PAID",
  "paidStatus": "PAID",
  "closeStatus": "CLOSED",
  "payAfterCloseStatus": 409,
  "calculateAfterCloseStatus": 409,
  "auditSummary": {
    "ADVANCE_CREATED": 1,
    "BONUS_CREATED": 1,
    "PAYROLL_PAYMENT_CREATED": 2,
    "PAYROLL_PERIOD_CALCULATED": 1,
    "PAYROLL_PERIOD_CLOSED": 1,
    "PAYROLL_PERIOD_CREATED": 1,
    "PAYROLL_PERIOD_PAYMENT_STATUS_UPDATED": 2,
    "PENALTY_CREATED": 1
  }
}
```

## Build Result

Passed:

- `pnpm --filter @paypoq/api build`
- `pnpm --filter @paypoq/web build`

## Must-Fix Items

None found after the parser fix discovered by the first smoke run.

## Can-Defer Items

- Separate advance approval and accountant payment workflow.
- Payroll correction/reversal after calculation but before close.
- Payroll payment reversal.
- Bulk “pay all employees” action.
- Payroll period close policy may be made stricter to require `PAID` only.
- Better payroll period date selection based on factory timezone.
- Dedicated automated integration test instead of manual smoke script.

## Risks and Edge Cases

- V1 adjustment endpoints intentionally skip manager/accountant approval steps.
  This is simple for the milestone but should be expanded before strict finance
  operations.
- Negative net payroll is floored at zero and the raw negative value is stored in
  the calculation snapshot. Future carry-forward policy should be approved if
  factories need it.
- Recalculation replaces PayrollItem snapshots only while no payment has begun.
  Once payment starts, status prevents recalculation.
- Closing a `CALCULATED` period with unpaid remaining amount is currently allowed
  only through backend lifecycle rules if status permits; operators should prefer
  paying first. Product may later choose to require `PAID` before `CLOSED`.

## Recommended Next Milestone

Recommended next step:

1. Payroll correction/reversal policy design.
2. Advance approval/payment workflow if real factory finance requires strict
   manager/accountant separation before payroll deduction.

Do not introduce a full accounting ledger yet; the current payroll snapshot flow
is enough for MVP operational payroll visibility.

## Senior Engineering Review

The implementation follows Paypoq OS principles:

- WorkerActivity remains the source of truth.
- Salary snapshots are used instead of current SalaryRate records.
- Payroll calculations are backend-owned.
- Frontend renders backend snapshots only.
- Closed payroll is immutable.
- The solution stays in the modular monolith and avoids ledger/workflow-engine
  overengineering.

The main trade-off is that adjustment approval/payment workflow is simplified in
v1. This is acceptable for the milestone, but should be revisited with real
factory validation.
