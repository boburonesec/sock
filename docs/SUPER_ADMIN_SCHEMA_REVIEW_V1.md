# Paypoq OS — Super Admin Schema Review v1

Status: Proposed schema review  
Scope: Design/schema review only; no code changes, no Prisma schema changes, no migrations  
Date: 2026-06-30

## 1. Purpose

This document proposes the minimal schema changes required for Super Admin
Manual Tenant Provisioning v1.

Super Admin is a platform-owner capability. It is not part of the factory
operational app and must not blur tenant/factory boundaries.

The goal of v1 is simple:

- create and manage tenants manually,
- create factories for a tenant,
- create first owner/manager users safely,
- track tenant lifecycle and subscription metadata,
- audit platform-level provisioning/security actions.

This is not a billing engine, marketplace admin, generic ERP admin, or support
impersonation system.

## 2. Current Schema Review

The current schema already supports tenant-scoped factory operations:

- `Tenant`
- `Factory`
- `Warehouse`
- `WarehouseZone`
- `User`
- `Role`
- `Permission`
- `UserRole`
- `UserFactoryAccess`
- `UserCredential`
- `RefreshSession`
- `AuditLog`

This is enough for authenticated tenant users inside the factory app.

It is not enough for platform-owner provisioning because:

- `User` is tenant-scoped and requires `tenantId`.
- `UserCredential` and `RefreshSession` are tenant-scoped.
- `AuditLog` requires `tenantId`.
- Platform actions may happen before a tenant exists.
- Tenant has no lifecycle/status/subscription/contact metadata yet.

## 3. Senior Engineering Review

### Issue

Using the existing tenant-scoped `User` model for platform super admins would
mix SaaS platform authority with factory tenant authority.

### Risk

This creates a hidden “god tenant” pattern and increases the chance of:

- accidental cross-tenant access,
- confusing audit ownership,
- platform admins inheriting tenant RBAC accidentally,
- tenant users being treated as platform users,
- brittle authorization rules later.

### Recommended alternative

Use a separate platform-admin identity boundary:

- `PlatformAdmin`
- `PlatformAdminCredential`
- `PlatformRefreshSession`
- `PlatformAuditLog`

This keeps the modular monolith simple while preserving a clean security model.
It is not overengineering; it is the minimum safe separation for a real
multi-tenant SaaS admin panel.

## 4. Recommended Minimal Schema

### 4.1 Tenant lifecycle and subscription metadata

Add lifecycle and metadata fields to `Tenant`.

Recommended enums:

```prisma
enum TenantStatus {
  PILOT
  ACTIVE
  SUSPENDED
  CANCELLED
}

enum TenantSubscriptionStatus {
  NONE
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
}
```

Recommended `Tenant` additions:

```prisma
status             TenantStatus             @default(ACTIVE)
subscriptionStatus TenantSubscriptionStatus @default(NONE)
planCode           String?
pilotStartedAt     DateTime?
pilotEndsAt        DateTime?
activatedAt        DateTime?
suspendedAt        DateTime?
cancelledAt        DateTime?
contactName        String?
contactPhone       String?
contactEmail       String?
notes              String?

@@index([status])
@@index([subscriptionStatus])
@@index([planCode])
```

Defaulting existing tenants to `ACTIVE` is the safest migration behavior because
it avoids accidentally blocking current local/dev tenant logins after migration.
New pilot tenants can explicitly be created as `PILOT`.

### 4.2 PlatformAdmin

Recommended model:

```prisma
enum PlatformAdminStatus {
  ACTIVE
  INACTIVE
}

model PlatformAdmin {
  id          String              @id @default(cuid())
  email       String
  name        String
  status      PlatformAdminStatus @default(ACTIVE)
  lastLoginAt DateTime?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  deletedAt   DateTime?

  credential      PlatformAdminCredential?
  refreshSessions PlatformRefreshSession[]
  auditLogs       PlatformAuditLog[]
  accessTokens    UserAccessToken[] @relation("UserAccessTokenPlatformCreator")

  @@unique([email])
  @@index([status, deletedAt])
  @@index([deletedAt])
}
```

Notes:

- Platform admin email is globally unique.
- Platform admin does not have `tenantId`.
- Platform admin does not use tenant `Role` / `Permission` in v1.
- Platform permissions can be added later if multiple platform roles become
  necessary.

### 4.3 PlatformAdminCredential

Recommended model:

```prisma
model PlatformAdminCredential {
  id                String   @id @default(cuid())
  platformAdminId   String
  passwordHash      String
  passwordUpdatedAt DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  platformAdmin PlatformAdmin @relation(fields: [platformAdminId], references: [id], onDelete: Restrict)

  @@unique([platformAdminId])
}
```

Rules:

- Do not store password hash directly on `PlatformAdmin`.
- Keep the same hashing standard as tenant auth: Argon2id.
- Do not print hashes in seed logs or admin UI.

### 4.4 PlatformRefreshSession

Recommended model:

```prisma
model PlatformRefreshSession {
  id              String   @id @default(cuid())
  platformAdminId String
  tokenHash       String
  userAgent       String?
  ipAddress       String?
  expiresAt       DateTime
  revokedAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  platformAdmin PlatformAdmin @relation(fields: [platformAdminId], references: [id], onDelete: Restrict)

  @@unique([tokenHash])
  @@index([platformAdminId])
  @@index([expiresAt])
  @@index([revokedAt])
}
```

Recommended session strategy:

- separate platform refresh cookie from tenant app refresh cookie,
- separate access token audience/claim for platform admin,
- store only refresh token hash,
- rotate refresh token on refresh,
- revoke on logout.

### 4.5 User invite / password reset token

Manual provisioning needs a safe way to create tenant owner/manager users without
handing out raw passwords.

Recommended minimal model:

```prisma
enum UserAccessTokenType {
  INVITE
  PASSWORD_RESET
}

model UserAccessToken {
  id                       String              @id @default(cuid())
  tenantId                 String
  userId                   String
  type                     UserAccessTokenType
  tokenHash                String
  expiresAt                DateTime
  usedAt                   DateTime?
  revokedAt                DateTime?
  createdByPlatformAdminId String?
  createdByUserId          String?
  metadata                 Json?
  createdAt                DateTime            @default(now())

  tenant                 Tenant         @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  user                   User           @relation(fields: [userId, tenantId], references: [id, tenantId], onDelete: Restrict)
  createdByPlatformAdmin PlatformAdmin? @relation("UserAccessTokenPlatformCreator", fields: [createdByPlatformAdminId], references: [id], onDelete: Restrict)
  createdByUser          User?          @relation("UserAccessTokenUserCreator", fields: [createdByUserId, tenantId], references: [id, tenantId], onDelete: Restrict)

  @@unique([tokenHash])
  @@index([tenantId, userId, type])
  @@index([expiresAt])
  @@index([usedAt])
  @@index([revokedAt])
}
```

Why one token model instead of separate `UserInviteToken` and
`PasswordResetToken` tables:

- both need the same security behavior,
- both are tenant/user-scoped,
- both store token hash, expiry, one-time usage, and creator metadata,
- one table is simpler for MVP.

If invite and password reset rules diverge materially later, split the model.

### 4.6 PlatformAuditLog

Existing `AuditLog` is tenant-scoped and requires `tenantId`, so it should not be
used for platform actions that may happen before a tenant exists.

Recommended model:

```prisma
model PlatformAuditLog {
  id              String   @id @default(cuid())
  platformAdminId String?
  tenantId        String?
  factoryId       String?
  action          String
  entityType      String
  entityId        String?
  before          Json?
  after           Json?
  metadata        Json?
  createdAt       DateTime @default(now())

  platformAdmin PlatformAdmin? @relation(fields: [platformAdminId], references: [id], onDelete: Restrict)
  tenant        Tenant?        @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  factory       Factory?       @relation(fields: [factoryId], references: [id], onDelete: Restrict)

  @@index([createdAt])
  @@index([platformAdminId, createdAt])
  @@index([tenantId, createdAt])
  @@index([factoryId, createdAt])
  @@index([action])
  @@index([entityType, entityId])
}
```

Rules:

- no `updatedAt`,
- no `deletedAt`,
- platform audit rows are immutable history,
- store metadata carefully; do not log raw tokens or password hashes.

### 4.7 Factory metadata

Factory address/contact metadata is useful, but not required for the first
manual provisioning slice.

Recommendation:

- keep `Factory.name` as the only required factory field in v1,
- add address/location/contact fields later when pilot operations require them.

This avoids schema churn before the exact factory profile data is validated.

## 5. Whether to Reuse UserCredential

Recommendation: do not reuse `UserCredential` for platform admins.

Reason:

- `UserCredential` is tenant-scoped.
- Platform admins are not tenant users.
- Making `tenantId` nullable would weaken tenant guarantees.
- Creating a fake platform tenant would create confusing authorization and audit
  semantics.

Use `PlatformAdminCredential` and `PlatformRefreshSession` instead.

## 6. Alternatives Rejected

### Alternative A — Use tenant `User` with a special platform tenant

Rejected for v1.

Why:

- hidden “god tenant” pattern,
- easy to accidentally apply tenant RBAC to platform routes,
- confusing audit trails,
- future tenant isolation risk.

### Alternative B — Make `User.tenantId` nullable for platform users

Rejected.

Why:

- weakens the strongest tenant isolation invariant,
- every tenant-scoped query becomes easier to get wrong,
- not necessary for MVP.

### Alternative C — Reuse existing `AuditLog`

Rejected.

Why:

- existing `AuditLog` requires `tenantId`,
- platform actions may happen before tenant creation,
- platform audit has different ownership and access rules.

### Alternative D — Add full subscription/billing schema now

Rejected.

Why:

- pilot only needs status/plan metadata,
- invoices, payments, billing provider integration, and entitlement engines are
  not MVP needs,
- overbuilding billing would slow tenant provisioning.

### Alternative E — Separate `UserInviteToken` and `PasswordResetToken` tables

Deferred.

Why:

- one `UserAccessToken` model covers v1 safely,
- both token types have identical security mechanics in MVP,
- split later only if workflows diverge.

## 7. Migration Plan

Recommended migration sequence:

1. Approve this schema review.
2. Add Prisma enums and models:
   - `TenantStatus`
   - `TenantSubscriptionStatus`
   - `PlatformAdminStatus`
   - `UserAccessTokenType`
   - `PlatformAdmin`
   - `PlatformAdminCredential`
   - `PlatformRefreshSession`
   - `UserAccessToken`
   - `PlatformAuditLog`
3. Extend `Tenant` with lifecycle/contact/subscription fields.
4. Run `prisma validate`.
5. Run `prisma generate`.
6. Run API build.
7. Apply development migration:
   - `super_admin_schema_v1`
8. Seed one local platform admin only after migration is approved.
9. Implement platform auth endpoints separately.
10. Implement manual tenant provisioning endpoints.

No frontend or API behavior should depend on these fields until the platform
auth/provisioning slice is explicitly implemented.

## 8. Migration Risks

### Existing tenants need safe defaults

Adding `Tenant.status` without a safe default could block or complicate existing
dev data.

Recommendation:

- `Tenant.status @default(ACTIVE)`
- `Tenant.subscriptionStatus @default(NONE)`

### Platform admin email overlap

A platform admin and tenant user may technically share the same email if they
are stored in separate tables.

Recommendation:

- allow it at schema level for simplicity,
- optionally block overlap in platform admin service if support policy requires.

### Token cleanup

Invite/reset/session tokens will grow over time.

Recommendation:

- add indexes on `expiresAt`, `usedAt`, and `revokedAt`,
- add cleanup job later; do not add job infrastructure in schema slice.

### Platform audit access

Platform audit can expose sensitive provisioning metadata.

Recommendation:

- restrict reads to platform admins only,
- never log raw tokens, passwords, hashes, or full secret values.

### Tenant suspension enforcement

Adding `Tenant.status` does nothing unless auth checks it.

Recommendation:

- platform schema migration and tenant auth enforcement must be separate,
  explicit implementation steps.

## 9. First Implementation Slice

After approval, the first safe implementation slice should be:

1. Prisma schema slice for platform admin and tenant lifecycle metadata.
2. Development migration.
3. Seed one local platform admin:
   - local development only,
   - Argon2id password hash,
   - no raw hash logging.
4. Platform admin login/refresh/logout/me endpoints.
5. Platform admin guard separate from tenant `JwtAuthGuard`.
6. `/admin/tenants` read/create.
7. `/admin/tenants/:id/factories` create with default warehouse/zones/stages.
8. Tenant owner creation through invite/reset token.
9. Platform audit for all provisioning actions.

Keep billing automation, impersonation, deep tenant data access, and tenant
health analytics out of this first slice.

## 10. Required Audit Actions

Platform audit actions for v1:

- `PLATFORM_ADMIN_LOGIN`
- `PLATFORM_ADMIN_LOGOUT`
- `TENANT_CREATED`
- `TENANT_UPDATED`
- `TENANT_ACTIVATED`
- `TENANT_SUSPENDED`
- `TENANT_CANCELLED`
- `FACTORY_CREATED`
- `TENANT_OWNER_CREATED`
- `USER_INVITE_CREATED`
- `USER_PASSWORD_RESET_REQUESTED`
- `USER_ROLE_ASSIGNED`
- `USER_FACTORY_ACCESS_ASSIGNED`
- `SUBSCRIPTION_STATUS_UPDATED`

Do not use tenant business `AuditLog` for these platform actions.

## 11. What Is Intentionally Not Included

- No Prisma schema change in this task.
- No migration in this task.
- No platform auth implementation.
- No `/admin` frontend routes.
- No billing ledger.
- No subscription payment provider.
- No super-admin impersonation.
- No support tooling for editing tenant business data.
- No microservice split.
- No CQRS/event sourcing.

## 12. Summary Recommendation

For Super Admin Manual Tenant Provisioning v1, Paypoq OS should add a small,
separate platform identity and audit schema while keeping tenant users and
factory RBAC untouched.

Minimal recommended schema changes:

- extend `Tenant` with lifecycle/contact/subscription metadata,
- add `PlatformAdmin`,
- add `PlatformAdminCredential`,
- add `PlatformRefreshSession`,
- add `UserAccessToken`,
- add `PlatformAuditLog`.

This keeps the SaaS owner panel safe, understandable, and aligned with the
existing modular monolith.
