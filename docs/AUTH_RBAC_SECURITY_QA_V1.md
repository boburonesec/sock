# Paypoq OS — Auth + RBAC Security QA Audit v1

Status: Completed  
Scope: Audit + safe fixes only  
Date: 2026-06-27

## 1. Audit Scope

This audit reviewed the current authentication, session, request context, RBAC,
and frontend auth integration behavior after the initial Auth + RBAC rollout.

Reviewed areas:

- Auth endpoints:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- JWT access token behavior
- Refresh token cookie behavior
- Refresh session rotation and revocation
- Request context construction
- `X-Factory-Id` validation
- RBAC permission decorator and guard
- Public endpoint exceptions
- Frontend token storage and refresh retry flow

No schema changes, migrations, business mutations, or frontend feature changes
were made as part of this audit.

## 2. Verified Behavior

### 2.1 Auth Endpoints

#### `POST /auth/login`

Verified from code:

- Accepts email/password through `LoginDto`.
- Normalizes email with `trim().toLowerCase()`.
- Requires exactly one active, non-deleted user for the email.
- Verifies password with `argon2.verify()`.
- Updates `lastLoginAt`.
- Issues:
  - short-lived JWT access token
  - opaque refresh token in HttpOnly cookie
- Does not expose password hash.

Notes:

- Current login is global-email based, not tenant-slug based.
- If the same email exists in multiple tenants, login intentionally fails because
  the service requires exactly one matching active user.

#### `POST /auth/refresh`

Verified from code:

- Reads refresh token from configured cookie.
- Hashes the provided refresh token with SHA-256 before DB lookup.
- Rejects missing, revoked, expired, deleted-user, or inactive-user sessions.
- Rotates refresh token:
  - revokes old `RefreshSession`
  - creates new `RefreshSession`
  - returns a new access token
  - sets a new refresh cookie
- Does not store raw refresh token.

#### `POST /auth/logout`

Verified from code:

- Reads refresh token from cookie.
- Revokes the matching non-revoked refresh session by token hash.
- Clears the refresh cookie.
- Returns `{ data: { status: "ok" } }`.

#### `GET /auth/me`

Verified from code:

- Protected by `JwtAuthGuard`.
- Uses request context from the access token.
- Returns:
  - user
  - tenantId
  - activeFactoryId
  - accessibleFactories
  - roles
  - permissions
- Does not expose password hash, credential record, refresh sessions, or token
  hashes.

### 2.2 Token Behavior

Verified from code:

- Access token TTL defaults to `900` seconds.
- Access token secret is configurable through `JWT_ACCESS_SECRET`.
- Production requires `JWT_ACCESS_SECRET` with minimum length of 32 characters.
- Access token includes:
  - `sub`
  - `tenantId`
  - expiry from JWT library
- Refresh token is opaque random data generated with `randomBytes(48)`.
- Refresh token DB value is SHA-256 hash only.
- Refresh token TTL defaults to 30 days.
- Refresh rotation revokes the previous session.
- Logout revokes current refresh session.

### 2.3 Refresh Cookie Settings

Verified from code:

- Cookie is `HttpOnly`.
- Cookie is `secure` in production.
- Cookie is `sameSite: "strict"` in production.
- Cookie is `sameSite: "lax"` in development.
- Cookie path is `/auth`.
- Cookie max age follows `REFRESH_TOKEN_TTL_DAYS`.

Security note:

- `path: "/auth"` is a good minimal cookie scope because the refresh cookie is
  not automatically sent to business endpoints.

### 2.4 Request Context

Verified from code:

Request context includes:

- `userId`
- `tenantId`
- `activeFactoryId`
- `accessibleFactoryIds`
- `roles`
- `permissions`

Behavior:

- `JwtAuthGuard` extracts the bearer access token.
- `JwtAuthGuard` reads optional `X-Factory-Id`.
- `AuthService` verifies the token and builds request context.
- If `X-Factory-Id` is supplied, it must be included in the user’s factory
  access list.
- Unauthorized factory access returns `ForbiddenException`.
- If no factory is supplied, active factory defaults to first accessible
  factory.

### 2.5 RBAC

Verified from code:

- `@RequirePermissions(...permissions)` decorator exists.
- `PermissionGuard` reads required permission metadata.
- `PermissionGuard` reads granted permissions from request context.
- Missing request context returns `403`.
- Missing required permission returns `403`.
- `JwtAuthGuard` remains responsible for authentication only.
- `PermissionGuard` remains responsible for authorization only.
- Guard currently requires all permissions listed in the decorator.

Protected mapping verified:

| Permission | Protected routes |
| --- | --- |
| `dashboard.view` | `GET /dashboard/executive-summary` |
| `production.view` | all `/production/*` read endpoints |
| `warehouse.view` | all `/warehouse/*` read endpoints |
| `sales.view` | all `/sales/*` read endpoints |
| `finance.view` | all `/finance/*` read endpoints |
| `finance.view` | all `/supplier/*` read endpoints |
| `employees.view` | `GET /employees` |
| `settings.view` | `GET /settings/overview`, all `/product/*` master-data reads |
| `reports.view` | `GET /reports/overview` |

Public exceptions verified:

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /dashboard/factory-tv-summary`

### 2.6 401 vs 403 Behavior

Verified by smoke test from previous RBAC task and code review:

- Missing access token on protected endpoint returns `401`.
- Authenticated user without required permission returns `403`.
- Public endpoints remain available without access token.

### 2.7 Frontend Auth

Verified from code:

- Access token is kept in memory only:
  - module-level variable in `apps/web/src/lib/api/client.ts`
  - Zustand in-memory store
- No `localStorage` or `sessionStorage` token storage was found.
- API client sends:
  - `Authorization: Bearer <accessToken>` when access token exists
  - `X-Factory-Id` when active factory exists
  - `credentials: "include"` for refresh cookie support
- On `401`, API client attempts refresh once, then retries original request.
- Refresh requests skip auth refresh to avoid loops.
- Logout calls backend logout and clears local session state.
- `AuthGate` refreshes session on app-shell load and redirects unauthenticated
  users to `/login`.
- `/login` refreshes existing session and redirects authenticated users to
  `/dashboard/executive`.

## 3. Must-Fix Items

No immediate code-level must-fix item was found for the current development
read-endpoint rollout.

Before production or broader pilot usage, the following become must-fix:

1. Add auth rate limiting.
   - Risk: brute-force login attempts are currently not throttled.
   - Suggested scope: login/refresh endpoint throttling by IP and email.

2. Add auth/security audit logging.
   - Risk: login, logout, refresh reuse attempts, and forbidden access attempts
     are not recorded.
   - Suggested scope: write `AuditLog` records for security-sensitive auth
     events.

3. Decide production TV access strategy.
   - Risk: `GET /dashboard/factory-tv-summary` is intentionally public in V1.
   - Suggested scope: display token, device token, IP allowlist, or authenticated
     TV mode.

4. Resolve multi-tenant login tenant selection.
   - Risk: current email-only login fails when the same email exists in multiple
     tenants.
   - Suggested scope: tenant slug/domain selection or explicit tenant code at
     login.

## 4. Can-Defer Items

These are valid future improvements but are not blockers for current local
development:

- Permission constants to reduce string literal drift.
- E2E tests for auth/RBAC behavior.
- Permission-aware frontend navigation hiding.
- Factory switcher UI.
- Password reset flow.
- User invite flow.
- Session management screen.
- Refresh token reuse detection response.
- Device/session revocation by manager/owner.
- Stronger cookie/domain configuration documentation for production deployment.
- Supplier-specific permission such as `supplier.view` if supplier becomes a
  standalone security domain.

## 5. Security Risks

### 5.1 Brute-force login attempts

Current system has no rate limit. This is acceptable for local development, but
not acceptable for production.

### 5.2 Public Factory TV endpoint

Factory TV intentionally remains public because `/tv` is outside the app shell.
The endpoint avoids sensitive finance/payroll/debt data, but it still exposes
operational production visibility.

### 5.3 Multi-tenant email collision

Email-only login is simple but incomplete for real multi-tenant operation.
Current logic avoids accidental cross-tenant login by failing if more than one
active user exists for the same email, but the user experience will need a
tenant selector or tenant-specific login namespace.

### 5.4 No auth event audit yet

Important auth events are not persisted to `AuditLog` yet.

### 5.5 No permission-aware frontend navigation yet

Backend correctly enforces permissions. Frontend navigation may still show links
that a user cannot open. This is not a data leakage issue because backend RBAC
returns `403`, but it is a UX gap.

## 6. Recommended Next Milestone

Recommended next milestone:

Auth + RBAC Hardening v1

Suggested tasks:

1. Add API-level rate limiting for auth endpoints.
2. Add auth/security audit logging.
3. Add backend E2E smoke tests for:
   - login
   - refresh rotation
   - logout revocation
   - `401` unauthenticated
   - `403` missing permission
   - `X-Factory-Id` forbidden factory
4. Add permission constants.
5. Add frontend permission-aware navigation hiding.
6. Decide and implement TV access strategy.
7. Design tenant-aware login UX for multi-tenant operation.

## 7. Senior Engineering Review

### Implemented

This task produced an audit document only. No app behavior was changed.

### Architecture / Design Decisions

- Kept current modular monolith approach.
- Did not add new auth features during audit.
- Treated public TV as a documented exception rather than silently changing
  product behavior.
- Treated supplier endpoints as finance-protected in the audit because the
  current permission model has no separate `supplier.view`.

### Risks and Edge Cases Noticed

- Lack of rate limiting is the largest near-term security gap.
- Public TV access needs an explicit production strategy.
- Email-only login is not sufficient for full multi-tenant rollout.
- No audit trail exists yet for auth/security events.
- Frontend does not hide unauthorized navigation yet.

### Suggestions / Alternatives

- Keep local auth for MVP, but add rate limiting and audit logging before real
  users.
- Use tenant slug/domain for login instead of global email matching when
  multi-tenant rollout begins.
- Use a device/display token for `/tv` rather than regular user auth if factory
  monitors must remain operator-friendly.

### What Was Intentionally Not Implemented

- No code changes.
- No schema changes.
- No migrations.
- No backend endpoint changes.
- No frontend feature changes.
- No new tests added.

### Assumptions

- Current environment is still local development / pre-production.
- Backend RBAC enforcement is the source of truth; frontend permission hiding is
  a UX improvement, not a security boundary.
- Factory TV public access remains an approved V1 exception until the user
  approves a display-token or authenticated-TV design.

