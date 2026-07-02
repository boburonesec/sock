# Employee Self-Service API v1

## Purpose

Employee Self-Service API v1 provides the read-only backend surface required for
Employee Mobile v1. It lets an authenticated tenant user view only their own
employee profile, worker activity, payroll snapshots, and advances.

This API does not introduce mobile business logic, payroll calculation, broad
finance access, broad production access, write actions, or client/manager
functionality.

## Routes

All routes require a valid tenant JWT.

```text
GET /mobile/employee/me
GET /mobile/employee/activities
GET /mobile/employee/payroll
GET /mobile/employee/advances
```

These routes intentionally use authentication only. They do not require
`finance.view`, `production.view`, or employee management permissions because
they expose only the current user's own employee records.

## Employee Resolution

The current tenant user is resolved to an employee through an active
`TelegramAccount` link:

- `tenantId` equals the current request tenant.
- `userId` equals the authenticated user.
- `type` is `EMPLOYEE`.
- `status` is `ACTIVE`.
- `employeeId` is present.
- Linked `Employee` belongs to the same tenant and active factory.
- Linked `Employee.status` is `ACTIVE`.
- Linked `Employee.deletedAt` is `null`.

Exactly one active employee link is required. If there is no link, more than one
link, no active factory, or the employee is inactive/deleted, the API returns
`403 Forbidden`.

This uses existing schema only. No migration was added for this milestone.

## Response Contracts

### GET /mobile/employee/me

Returns safe identity and employment context:

```json
{
  "data": {
    "employee": {
      "id": "employee_id",
      "name": "Employee Name",
      "status": "ACTIVE",
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    },
    "factory": {
      "id": "factory_id",
      "name": "Factory Name"
    },
    "tenant": {
      "id": "tenant_id",
      "name": "Tenant Name"
    },
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "employee@example.com",
      "status": "ACTIVE"
    }
  }
}
```

### GET /mobile/employee/activities

Returns the latest 100 `WorkerActivity` records for the resolved employee only.

```json
{
  "data": [
    {
      "id": "activity_id",
      "quantity": 12,
      "salaryRateAmount": "120.00",
      "activityDate": "2026-07-01T00:00:00.000Z",
      "stage": {
        "id": "stage_id",
        "name": "Knitting",
        "sortOrder": 1
      },
      "productVariant": {
        "id": "variant_id",
        "label": "Sock / Black / Cotton / Summer",
        "product": { "id": "product_id", "name": "Sock", "code": "SOCK" },
        "color": { "id": "color_id", "name": "Black", "code": "BLK" },
        "material": { "id": "material_id", "name": "Cotton", "code": "COT" },
        "season": { "id": "season_id", "name": "Summer", "code": "SUM" }
      }
    }
  ]
}
```

`salaryRateAmount` is the stored historical rate from the activity record. The
mobile app must display it as returned and must not calculate payroll totals.

### GET /mobile/employee/payroll

Returns the latest 36 `PayrollItem` snapshots for the resolved employee only.

```json
{
  "data": [
    {
      "id": "payroll_item_id",
      "month": "2026-07-01T00:00:00.000Z",
      "payrollPeriodStatus": "CALCULATED",
      "status": "CALCULATED",
      "workedAmount": "1000.00",
      "bonusAmount": "100.00",
      "penaltyAmount": "0.00",
      "advanceAmount": "200.00",
      "finalAmount": "900.00",
      "paidAmount": "500.00",
      "remainingAmount": "400.00",
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    }
  ]
}
```

All amounts are backend-calculated or backend-stored decimal strings.

### GET /mobile/employee/advances

Returns the latest 100 `EmployeeAdjustment` records where `type = ADVANCE` for
the resolved employee only.

```json
{
  "data": [
    {
      "id": "adjustment_id",
      "amount": "500.00",
      "reason": "Advance note",
      "status": "PAID",
      "requestedAt": "2026-07-01T00:00:00.000Z",
      "approvedAt": "2026-07-01T00:00:00.000Z",
      "paidAt": "2026-07-01T00:00:00.000Z",
      "cancelledAt": null,
      "payrollPeriod": {
        "id": "payroll_period_id",
        "month": "2026-07-01T00:00:00.000Z",
        "status": "CALCULATED"
      }
    }
  ]
}
```

## Security Behavior

- Unauthenticated requests return `401 Unauthorized`.
- Authenticated tenant users without exactly one active employee link return
  `403 Forbidden`.
- Owner or manager users are not treated specially. If they are not linked to
  exactly one active employee, they receive `403`. If deliberately linked, they
  receive only the linked employee's own records.
- Every data query filters by tenant, active factory, and resolved employee.
- The API does not call bot internal endpoints.
- The API does not expose all employees, payroll periods, production activity,
  or finance records.
- The API does not add mutations.

## Smoke Verification

Run:

```bash
pnpm smoke:employee-self-service
```

The smoke script:

- Starts the built API unless `EMPLOYEE_SELF_SERVICE_SMOKE_BASE_URL` is set.
- Creates a temporary active tenant user linked to one active employee.
- Creates a second unlinked user.
- Creates own and other employee activity, payroll, and advance records.
- Logs in as both users.
- Verifies unauthenticated access is rejected.
- Verifies the unlinked user receives `403`.
- Verifies the linked user sees only their own employee data.
- Verifies another employee's activity, payroll, and advance records are not
  returned.

Environment overrides:

```bash
EMPLOYEE_SELF_SERVICE_SMOKE_BASE_URL=http://localhost:3000 pnpm smoke:employee-self-service
EMPLOYEE_SELF_SERVICE_SMOKE_PORT=3017 pnpm smoke:employee-self-service
EMPLOYEE_SELF_SERVICE_SMOKE_VERBOSE=1 pnpm smoke:employee-self-service
```

## Limitations

- Employee linking reuses the existing `TelegramAccount.userId` and
  `TelegramAccount.employeeId` relationship to avoid schema changes. A dedicated
  employee-user link may be cleaner if the product needs non-Telegram employee
  identity management later.
- Responses are fixed-size lists. Cursor or date pagination can be added once
  mobile usage patterns are known.
- `/me` returns only fields already modeled safely. Phone, position, and current
  salary rate are not invented by this API.
- No write actions, profile editing, advance requests, push notifications,
  FaceID, offline writes, IoT, camera integration, client app, or manager app are
  included.
