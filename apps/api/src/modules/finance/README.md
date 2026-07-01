# Finance module

Finance endpoints are protected by JWT auth and RBAC.

Read permissions:

- `finance.view`

Write permissions:

- `finance.write`

Read endpoints:

- `GET /finance/expenses`
- `GET /finance/summary`
- `GET /finance/advances`
- `GET /finance/payroll-periods`
- `GET /finance/payroll-periods/:id/items`

Write endpoints:

- `POST /finance/payroll-periods`
- `POST /finance/payroll-periods/:id/calculate`
- `POST /finance/payroll-periods/:id/pay`
- `POST /finance/payroll-periods/:id/close`
- `POST /finance/advances`
- `POST /finance/bonuses`
- `POST /finance/penalties`

All protected endpoints use the authenticated request context:

- `tenantId`
- `userId`
- `activeFactoryId`
- roles and permissions

Payroll responses expose stored `PayrollPeriod` and `PayrollItem` snapshots.
Payroll write endpoints calculate and persist payroll snapshots in the backend.
The frontend must not calculate payroll values.

`/finance/advances` returns only `EmployeeAdjustment` records whose type is
`ADVANCE`.

Payroll lifecycle v1:

```text
DRAFT
→ CALCULATED
→ PARTIALLY_PAID / PAID
→ CLOSED
```

Rules:

- Calculation is allowed only while `DRAFT` or `CALCULATED`.
- Payment is allowed only while `CALCULATED` or `PARTIALLY_PAID`.
- `CLOSED` is the final administrative lock.
- No recalculation or payment is allowed after `CLOSED`.
- `WorkerActivity.salaryRateAmount` snapshot is authoritative for payroll
  calculation.

Expenses with `factoryId = null` are tenant-level records and are intentionally
excluded from the current factory-specific endpoint until their visibility rule
is explicitly defined.

`/finance/summary` returns backend-calculated overview data for the current
demo factory. Monthly expenses use the current Asia/Tashkent month and paid
expenses. Pending expenses are requested expense amount totals. Pending advances
are `ADVANCE` employee adjustments with `REQUESTED` or `APPROVED` status.
Payroll remaining uses active payroll period snapshots and does not calculate
payroll from worker activity.

## Manual verification

After running the development seed and starting the API, first authenticate,
then call protected endpoints with a bearer token.

The baseline seed intentionally creates no expenses, employee adjustments, or
payroll snapshots. Payroll data appears after write flows are exercised in the
local development database.
