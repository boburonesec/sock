# Paypoq OS — Super Admin Manual Tenant Provisioning QA v1

Status: Completed smoke verification  
Date: 2026-07-01  
Scope: Super Admin Manual Tenant Provisioning Milestone v1

## Implemented scope

Backend:

- `POST /platform-auth/login`
- `POST /platform-auth/refresh`
- `POST /platform-auth/logout`
- `GET /platform-auth/me`
- `GET /platform-admin/tenants`
- `POST /platform-admin/tenants`
- `GET /platform-admin/tenants/:id`
- `POST /platform-admin/tenants/:id/factories`
- `POST /platform-admin/tenants/:id/owner-users`
- `POST /platform-admin/tenants/:id/activate`
- `POST /platform-admin/tenants/:id/suspend`
- `GET /platform-admin/tenants/:id/health`

Frontend:

- `/admin/login`
- `/admin/tenants`
- `/admin/tenants/:id`

## Provisioning behavior verified

### Platform login

Verified local development platform admin:

```text
platform@paypoq.local / ChangeMe123!
```

Result:

- login succeeded,
- platform access token returned,
- platform refresh cookie issued.

### Tenant create

Created smoke tenant through:

```text
POST /platform-admin/tenants
```

Policy:

- new tenants are created with `PILOT` status,
- `subscriptionStatus` defaults to `NONE`,
- contact/plan/note metadata is saved.

### Factory create

Created factory through:

```text
POST /platform-admin/tenants/:id/factories
```

Verified that factory creation also created:

- Main Warehouse,
- warehouse zones:
  - Finished Products
  - Raw Materials
  - Packaging
  - Labels
  - Defects
- production stages:
  - Averlog
  - Dazmol
  - Sifat
  - Kiydirish
  - Par Dazmol
  - Parlash
  - Bezak
  - Etiketka
  - Qadoqlash
  - Ombor
- default roles and permissions if missing.

Note:

`location` is accepted by the API but not persisted because current `Factory`
schema has no location field. It is stored in platform audit metadata only.

### Owner user create

Created tenant owner through:

```text
POST /platform-admin/tenants/:id/owner-users
```

Verified:

- tenant `User` created,
- `UserCredential` created with Argon2 hash,
- Owner role assigned,
- `UserFactoryAccess` assigned,
- no password hash exposed.

### Tenant owner login

Verified created tenant owner can log in through normal tenant auth:

```text
POST /auth/login
```

Result:

- tenant owner login succeeded,
- active factory was resolved from `UserFactoryAccess`,
- platform token was not used for tenant app access.

### Tenant health

Verified:

```text
GET /platform-admin/tenants/:id/health
```

Returned basic tenant health:

- factory count,
- active user count,
- active employee count,
- product count,
- order count,
- stock movement count,
- payroll period count,
- readiness flags.

## PlatformAuditLog verification

Verified audit actions for smoke tenant:

- `TENANT_CREATED`
- `FACTORY_CREATED`
- `TENANT_OWNER_CREATED`
- `USER_ROLE_ASSIGNED`
- `USER_FACTORY_ACCESS_ASSIGNED`
- `TENANT_ACTIVATED`
- `TENANT_SUSPENDED`

Platform auth audit was previously verified for:

- `PLATFORM_ADMIN_LOGIN`
- `PLATFORM_ADMIN_REFRESH`
- `PLATFORM_ADMIN_LOGOUT`

## Build result

API:

```text
pnpm --filter @paypoq/api build
passed
```

Web:

```text
pnpm --filter @paypoq/web build
passed
```

## Smoke test result

Representative smoke passed:

1. Seed platform admin.
2. Platform login.
3. Create tenant.
4. Create factory.
5. Create owner user.
6. Login as created tenant owner through tenant auth.
7. Read tenant health.
8. Activate tenant.
9. Suspend tenant.
10. Verify platform audit logs.

## Known limitations

- Tenant `SUSPENDED` status is recorded, but tenant login enforcement is deferred.
- Platform RBAC is not implemented; all active platform admins are equivalent.
- No invite email flow yet.
- Owner user password can be set manually in v1; if omitted, backend generates a temporary password and returns it once.
- No billing automation.
- No tenant self-signup.
- No platform impersonation.
- No separate `apps/admin`; `/admin` currently lives in `apps/web`.
- Factory `location` is not persisted because schema does not support it yet.

## Must-fix items

None for this milestone.

## Can-defer items

- Enforce tenant lifecycle status in tenant auth.
- Add platform RBAC if multiple platform roles are needed.
- Add invite/reset-token UI flow.
- Persist factory address/location once pilot data needs are validated.
- Add rate limiting to platform auth.
- Add automated smoke test coverage for platform-admin endpoints.

## Recommended next milestone

Implement tenant lifecycle enforcement in tenant auth:

- block login for `SUSPENDED` / `CANCELLED` tenants,
- return a clear safe error,
- audit suspicious login attempts later if required.
