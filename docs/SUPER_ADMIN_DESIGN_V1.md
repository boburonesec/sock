# Paypoq OS — Super Admin / SaaS Owner Panel Design v1

Status: Proposed

Date: 2026-06-30

Scope:

- Design documentation only
- No code changes
- No schema changes
- No migrations

## Purpose

Super Admin / SaaS Owner Panel Paypoq OS platform owneri uchun organization,
tenant, factory, tenant owner, manager, subscription/status va pilot lifecycle’ni
boshqaradigan alohida admin qatlami bo‘ladi.

Bu panel factory ichidagi operatsion app emas.

Factory app:

- production
- warehouse
- sales
- finance
- employees
- payroll

Super Admin app:

- tenant provisioning
- factory provisioning
- owner/manager onboarding
- subscription/status
- pilot activation
- basic tenant health
- support/admin operations

## Design Principles

- Super admin factory user emas.
- Tenant isolation buzilmasligi kerak.
- Platform admin permissions factory RBAC’dan alohida bo‘lishi kerak.
- Super admin default holatda tenant ichidagi business data’ni tahrirlamaydi.
- Har bir provisioning/security action audit qilinadi.
- MVP’da manual provisioning yetarli.
- Billing/subscription automation keyinroq.

Avoid:

- generic ERP admin
- complex billing engine in v1
- workflow engine
- multi-service split
- giving platform admin unrestricted hidden tenant access without audit

## 1. User Roles

### Platform Super Admin

Paypoq OS platform owner yoki internal support/admin.

Can manage:

- tenants / organizations
- factories
- tenant owner users
- manager users
- tenant status
- pilot activation
- subscription/status metadata
- basic tenant health

Must not casually do:

- edit production movements
- edit payments
- edit payroll
- bypass tenant audit
- impersonate users without explicit audit and approval policy

Platform Super Admin should be outside normal tenant RBAC or very carefully
scoped.

### Tenant Owner

Tenant ichidagi owner.

Can manage:

- own tenant business data
- own factories if authorized
- manager/accountant/seller/warehouse/shift receiver users later
- dashboards
- settings

Tenant Owner is still tenant-scoped.

### Factory Manager

Factory operational center.

Can manage:

- production
- warehouse operations
- employees
- day-to-day decisions
- operational summaries

Factory Manager cannot manage SaaS subscription or create another tenant.

### Accountant / Seller / Warehouse Operator / Shift Receiver

Existing factory roles:

- Accountant: finance/supplier/payroll
- Seller: clients/orders/payments
- Warehouse Operator: stock/material/warehouse
- Shift Receiver: production entry

They remain tenant/factory scoped.

## 2. Main Workflows

### Create tenant

Purpose:

Create organization/customer account.

Required input:

- organization name
- status: pilot/trial/active
- optional contact name
- optional contact phone/email
- optional notes

Backend should:

- create Tenant
- set tenant status
- audit `TENANT_CREATED`

### Create factory

Purpose:

Create first or additional factory for tenant.

Required input:

- tenantId
- factory name
- optional address/location later

Backend should:

- create Factory
- create default Main Warehouse
- create default zones:
  - Finished Products
  - Raw Materials
  - Packaging
  - Labels
  - Defects
- create default production stages
- audit `FACTORY_CREATED`

### Create tenant owner user

Purpose:

Create first owner user for tenant.

Required input:

- tenantId
- name
- email
- factory access
- role Owner

Recommended:

- create user with invite/reset flow instead of raw password
- MVP may create temporary password only if clearly marked and forced reset is
  added later

Audit:

- `TENANT_OWNER_CREATED`
- `USER_FACTORY_ACCESS_ASSIGNED`
- `USER_ROLE_ASSIGNED`

### Assign factory access

Purpose:

Give user access to one or more factories.

Backend should:

- validate tenant owns factory
- validate user belongs to tenant
- upsert UserFactoryAccess
- audit `USER_FACTORY_ACCESS_ASSIGNED`

### Assign roles

Purpose:

Assign tenant-scoped role to user.

Backend should:

- validate role belongs to tenant
- validate user belongs to tenant
- upsert UserRole
- audit `USER_ROLE_ASSIGNED`

V1:

- use existing roles:
  - Owner
  - Manager
  - Accountant
  - Seller
  - Warehouse Operator
  - Shift Receiver

### Activate / deactivate tenant

Purpose:

Control pilot/customer lifecycle.

Statuses should be explicit.

Recommended status examples:

```text
PILOT
ACTIVE
SUSPENDED
CANCELLED
```

Behavior:

- `ACTIVE` / `PILOT`: users can log in
- `SUSPENDED`: tenant login blocked except possibly tenant owner/support message
- `CANCELLED`: tenant disabled, data retained

Audit:

- `TENANT_ACTIVATED`
- `TENANT_SUSPENDED`
- `TENANT_CANCELLED`

### Reset demo password / invite user

MVP manual option:

- platform admin creates reset token
- tenant user receives link/code manually

Better v2:

- email invite/reset flow
- token expiration
- forced password setup

Audit:

- `USER_PASSWORD_RESET_REQUESTED`
- `USER_INVITE_CREATED`
- `USER_INVITE_ACCEPTED`

Do not expose password hash.

### View tenant health

Basic tenant health should be read-only.

Examples:

- tenant status
- factory count
- active users
- active employees
- product count
- last login date
- last activity date
- order count
- stock movement count
- payroll period count
- smoke/pilot readiness flags

Avoid showing sensitive detailed financial data by default.

## 3. Data Model Review

### What current schema supports

Current schema already supports:

- Tenant
- Factory
- Warehouse
- WarehouseZone
- User
- Role
- Permission
- UserRole
- UserFactoryAccess
- UserCredential
- RefreshSession
- AuditLog
- tenantId/factoryId across business records

This is enough for manual local seed and tenant-scoped application behavior.

### What is missing

Missing for real Super Admin:

- PlatformAdmin or platform-level user identity
- Tenant status field
- Tenant subscription fields
- Tenant contact metadata
- Factory address/contact metadata
- User invite token
- Password reset token
- forced password reset flag
- tenant onboarding/provisioning audit metadata
- optional tenant health snapshot/read model
- support/impersonation policy if ever needed

### Does PlatformAdmin need separate model?

Recommended:

```text
Yes, use a separate PlatformAdmin model/auth boundary.
```

Why:

- platform admins are not tenant users
- tenant-scoped User requires tenantId
- super admin should not accidentally inherit tenant RBAC
- super admin actions need separate permissions and audit
- safer mental model: platform access is not factory access

Alternative:

Use `User` with special platform tenant.

Downside:

- easy to accidentally mix tenant RBAC and platform permissions
- confusing audit and tenant isolation semantics
- risk of hidden "god tenant" assumptions

Recommendation:

Use separate platform admin identity for SaaS owner panel.

### Tenant status / subscription fields

Future `Tenant` should likely include:

```text
status enum: PILOT | ACTIVE | SUSPENDED | CANCELLED
subscriptionStatus enum: NONE | TRIAL | ACTIVE | PAST_DUE | CANCELLED
planCode nullable
pilotStartedAt nullable
pilotEndsAt nullable
activatedAt nullable
suspendedAt nullable
cancelledAt nullable
contactName nullable
contactPhone nullable
contactEmail nullable
notes nullable
```

Keep simple for v1:

- status
- subscriptionStatus
- planCode
- contact fields

Do not build billing engine yet.

### Invitation / reset token needs

Future models:

```text
UserInviteToken
PasswordResetToken
```

Suggested fields:

```text
id
tenantId
userId
tokenHash
expiresAt
usedAt nullable
createdByPlatformAdminId nullable
createdByUserId nullable
createdAt
metadata Json nullable
```

Rules:

- store token hash, never raw token
- expire quickly
- one-time use
- audit creation/use

## 4. Security Model

### Separate super admin boundary

Super Admin must be separate from tenant users or extremely carefully scoped.

Recommended:

- `PlatformAdmin`
- separate platform auth endpoint/session
- separate permissions:
  - `platform.tenants.view`
  - `platform.tenants.write`
  - `platform.users.write`
  - `platform.subscriptions.write`
  - `platform.health.view`

Do not reuse tenant factory permissions like `finance.write` for platform admin.

### No tenant data leakage

Rules:

- tenant list should show metadata only
- tenant detail should show health metrics, not raw business tables by default
- support deep access requires explicit audited action later
- all queries must filter by selected tenant
- never allow tenant admin to access platform admin routes

### Audit everything

Required audit actions:

```text
PLATFORM_ADMIN_LOGIN
TENANT_CREATED
TENANT_UPDATED
TENANT_ACTIVATED
TENANT_SUSPENDED
TENANT_CANCELLED
FACTORY_CREATED
TENANT_OWNER_CREATED
USER_INVITE_CREATED
USER_PASSWORD_RESET_REQUESTED
USER_ROLE_ASSIGNED
USER_FACTORY_ACCESS_ASSIGNED
SUBSCRIPTION_STATUS_UPDATED
TENANT_HEALTH_VIEWED
```

Important:

Platform audit may need separate `PlatformAuditLog`, because some actions happen
before tenant exists.

If using existing `AuditLog`, tenantId is required today, so pre-tenant platform
actions are not represented safely.

### Impersonation policy

Do not implement impersonation in v1.

If implemented later:

- require explicit reason
- short-lived session
- visible banner
- audit start/end
- never expose password
- never bypass tenant audit

## 5. UI Routes

Recommended route namespace:

```text
/admin
```

Routes:

```text
/admin/tenants
/admin/tenants/:id
/admin/users
/admin/subscriptions
```

### `/admin/tenants`

List tenants.

Columns:

- organization name
- status
- subscription status
- factory count
- active users
- last activity
- pilot status

Actions:

- create tenant
- open tenant
- activate/suspend

### `/admin/tenants/:id`

Tenant detail.

Sections:

- tenant info
- factories
- owner/manager users
- roles/access summary
- subscription/status
- basic tenant health
- audit timeline

Actions:

- create factory
- create owner
- create manager
- assign factory access
- assign role
- activate/suspend tenant
- create reset/invite token

### `/admin/users`

Platform-level view for tenant users.

Filters:

- tenant
- role
- status
- last login

Actions:

- reset password / invite
- deactivate user
- view factory access

### `/admin/subscriptions`

Simple subscription/status management.

V1:

- no billing integration
- manual status/plan updates

Fields:

- tenant
- plan
- subscriptionStatus
- pilot dates
- notes

## 6. API Design

Recommended module:

```text
apps/api/src/modules/platform-admin/
```

or separate route namespace in a platform module:

```text
/admin/*
```

### Platform auth endpoints

Future:

```text
POST /admin/auth/login
POST /admin/auth/logout
GET /admin/auth/me
```

These should not use tenant user auth.

### Tenant provisioning endpoints

```text
GET /admin/tenants
POST /admin/tenants
GET /admin/tenants/:id
PATCH /admin/tenants/:id
POST /admin/tenants/:id/activate
POST /admin/tenants/:id/suspend
POST /admin/tenants/:id/cancel
```

### Factory provisioning endpoints

```text
POST /admin/tenants/:tenantId/factories
GET /admin/tenants/:tenantId/factories
```

Factory creation should optionally create default:

- Main Warehouse
- warehouse zones
- production stages

### User provisioning endpoints

```text
GET /admin/tenants/:tenantId/users
POST /admin/tenants/:tenantId/users
PATCH /admin/tenants/:tenantId/users/:userId
POST /admin/tenants/:tenantId/users/:userId/roles
POST /admin/tenants/:tenantId/users/:userId/factory-access
POST /admin/tenants/:tenantId/users/:userId/invite
POST /admin/tenants/:tenantId/users/:userId/reset-password
```

### Subscription endpoints

```text
GET /admin/subscriptions
PATCH /admin/tenants/:tenantId/subscription
```

V1 should store manual status/plan fields only.

### Tenant health endpoints

```text
GET /admin/tenants/:tenantId/health
```

Return:

- factoryCount
- activeUserCount
- activeEmployeeCount
- productCount
- orderCount
- stockMovementCount
- lastLoginAt
- lastBusinessActivityAt
- openPayrollPeriods
- warnings

No detailed sensitive finance rows by default.

## 7. Phased Implementation Plan

### V1 — Manual provisioning

Goal:

Platform owner can create tenant/factory/owner manually.

Scope:

- schema slice:
  - PlatformAdmin
  - PlatformAdminCredential
  - PlatformAdminSession or reuse auth session pattern separately
  - Tenant.status
  - Tenant subscription/contact fields
  - PlatformAuditLog or adjusted audit support
- platform auth
- `/admin/tenants`
- create tenant
- create factory
- create tenant owner user
- assign role/factory access
- activate/suspend tenant
- basic tenant health

No billing automation.

### V2 — Invite flow

Goal:

Remove temporary/manual password handling.

Scope:

- UserInviteToken
- PasswordResetToken
- invite acceptance
- reset password
- forced first password setup
- email/SMS delivery later, manual copy first if needed

### V3 — Subscription / billing

Goal:

Track customer subscription state.

Scope:

- plan codes
- subscription status
- pilot start/end
- manual payment/billing notes
- optional integration later

Do not build full billing ledger unless real business needs it.

### V4 — Tenant health dashboard

Goal:

Support SaaS owner operations.

Scope:

- tenant activity health
- inactive tenants
- last login
- data volume indicators
- smoke/pilot readiness
- warnings
- basic support view

## Recommended Architecture

Recommended:

```text
Platform admin lives inside same modular monolith backend,
but with separate platform auth and permission boundary.
```

Frontend options:

1. Add `/admin/*` routes inside `apps/web`.
2. Later split to `apps/admin` only if UI/security/deployment needs justify it.

Recommendation for V1:

```text
Use apps/web /admin routes first.
Keep API platform admin routes under /admin.
Use separate platform auth/session.
```

Why:

- fastest pilot path
- no extra app deployment
- no microservice
- clear route namespace
- separate auth boundary still protects tenant app

If admin UI grows, split later:

```text
apps/admin
```

## First Implementation Slice

Recommended first slice:

```text
Super Admin Manual Tenant Provisioning v1
```

Deliverables:

1. Schema design review:
   - PlatformAdmin
   - PlatformAdminCredential
   - platform session
   - Tenant status/contact/subscription fields
   - PlatformAuditLog
2. Migration after approval.
3. Seed one local platform admin.
4. Platform admin login.
5. `/admin/tenants` list/create.
6. `/admin/tenants/:id` detail.
7. Create factory with default warehouse/zones/stages.
8. Create owner user with role/factory access.
9. Activate/suspend tenant.
10. Basic tenant health endpoint.
11. Smoke tests for tenant provisioning.

## Risks

### Super admin mixed with tenant users

Risk:

Tenant RBAC and platform permissions become confused.

Mitigation:

- separate PlatformAdmin model/auth
- separate `/admin` routes
- separate platform permissions

### Tenant data leakage

Risk:

Platform admin sees or modifies business data without audit.

Mitigation:

- metadata/health only by default
- explicit audited support access later
- no silent impersonation

### Password reset abuse

Risk:

Platform admin can take over tenant accounts.

Mitigation:

- reset tokens only
- audit everything
- no raw password display
- forced user setup later

### Overbuilding billing

Risk:

Building full subscription/billing too early slows MVP.

Mitigation:

- V1 manual subscription/status only
- billing integration later

### Underbuilding tenant lifecycle

Risk:

Manual DB scripts remain required for onboarding.

Mitigation:

- implement manual tenant/factory/owner provisioning early
- add smoke tests for onboarding

## Intentionally Deferred

Deferred:

- billing gateway integration
- invoices
- automated subscription charging
- tenant self-signup
- full support impersonation
- separate `apps/admin` frontend
- advanced tenant analytics
- multi-region deployment
- SSO/OIDC
- audit browsing deep tenant data
- Telegram/mobile provisioning

## Senior Engineering Review

Super-admin design is necessary before serious multi-tenant pilot because
tenant/factory/user provisioning is currently seed/manual-script oriented.

The safest architecture is not a new microservice. Keep the platform admin API
inside the modular monolith, but separate identity and permissions from tenant
users. This avoids both overengineering and the more dangerous alternative:
making platform admins ordinary tenant users with hidden global powers.

First slice should be manual provisioning, not billing. Billing can wait until
real pilot/customer operations prove what plans and lifecycle states are needed.
