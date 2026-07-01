# Paypoq OS — Auth + Tenant/Factory Context Design v1

Status: Design only  
Scope: No code, no schema changes, no migrations  
Date: 2026-06-27

## 1. Purpose

This document defines how Paypoq OS should replace the temporary
`DevContextService` with real authenticated request context.

The goal is to make tenant isolation, factory access, and RBAC explicit before
write-capable business flows are added.

Current state:

- Read endpoints are integrated end-to-end.
- `DevContextService` resolves the seeded demo tenant and `Main Factory`.
- Auth, sessions, guards, and RBAC enforcement are not implemented yet.
- The existing Prisma schema contains basic identity tables:
  - `User`
  - `Role`
  - `Permission`
  - `RolePermission`
  - `UserRole`
  - `UserFactoryAccess`

## 2. Senior Engineering Review

### Issue

The current backend uses `DevContextService` for tenant/factory context.

### Risk

This is safe for local development, but it is not an authorization mechanism.
If write endpoints are added before real request context, Paypoq OS risks:

- cross-tenant data exposure,
- unauthorized factory access,
- inaccurate audit ownership,
- unclear permission boundaries,
- hard-to-remove temporary assumptions.

### Recommended alternative

Implement a simple local authentication foundation with request-scoped
tenant/factory context and RBAC guards before business write flows.

This is not overengineering. Tenant isolation is mandatory in Paypoq OS, and
factory-scoped workflows are central to the product.

## 3. Recommended Authentication Strategy

### Recommendation

Use simple local email/password authentication for MVP.

Recommended MVP approach:

- Email/password login.
- Password hashing with Argon2id or bcrypt.
- Short-lived JWT access token.
- Refresh token stored in an HttpOnly, Secure, SameSite cookie.
- Refresh/session persistence added in a later approved auth schema slice.

### Why local auth for MVP

Paypoq OS is used by factory staff, managers, sellers, accountants, and owners.
For early deployments, local auth is simpler and easier to operate than an
external identity provider.

Benefits:

- No dependency on Google/Microsoft/OIDC accounts.
- Works for factory users with basic email/phone-based accounts.
- Easier tenant-scoped onboarding.
- Keeps V1 focused on factory operations, not enterprise SSO.

### Why not external provider first

External provider auth can be useful later, but it adds early complexity:

- tenant-to-provider mapping,
- invite/onboarding flows,
- external account recovery assumptions,
- extra operational dependency.

Future SSO/OIDC can be added after core tenant/factory boundaries are stable.

### Required future schema follow-up

The current `User` model has no `passwordHash`, token/session table, or account
status field beyond `deletedAt`.

Before implementation, approve a small auth schema slice such as:

- `User.passwordHash` or a separate credential table,
- refresh session/token table,
- optional `lastLoginAt`,
- optional user status if `deletedAt` alone is not enough.

Do not add these in this documentation task.

## 4. Request Context

Every authenticated business request should resolve a request context.

Recommended shape:

```ts
type RequestContext = {
  tenantId: string
  userId: string
  activeFactoryId: string | null
  accessibleFactoryIds: string[]
  roles: string[]
  permissions: string[]
}
```

### Field meanings

| Field | Meaning |
| --- | --- |
| `tenantId` | Tenant boundary derived from authenticated user, never trusted from request input. |
| `userId` | Authenticated application user. |
| `activeFactoryId` | Current factory selected for factory-scoped endpoints. |
| `accessibleFactoryIds` | Factories this user may access through `UserFactoryAccess`. |
| `roles` | Tenant-scoped role names assigned through `UserRole`. |
| `permissions` | Platform permission keys resolved through `RolePermission`. |

### Important rules

- Frontend must never send `tenantId` as trusted authority.
- Backend must derive `tenantId` from the authenticated user/session.
- Factory-scoped endpoints require an authorized `activeFactoryId`.
- Tenant-wide endpoints may allow `activeFactoryId = null` only when explicitly
  designed as tenant-level views.
- System/public endpoints must opt out explicitly.

## 5. Factory Selection

### Default factory behavior

On login or `GET /me`:

1. Load factories from `UserFactoryAccess`.
2. If the user has one accessible factory, select it by default.
3. If the user has multiple accessible factories:
   - use the last selected factory when user preference storage exists,
   - otherwise return all accessible factories and require the frontend to
     choose one before factory-scoped pages load.

For current MVP, if user preference storage does not exist yet, selecting the
first accessible factory is acceptable only as a temporary implementation detail
and should be documented clearly.

### Factory switching

Recommended request pattern:

- Frontend stores selected factory in UI/session state.
- API requests include an `X-Factory-Id` header for factory-scoped endpoints.
- Backend validates that `X-Factory-Id` belongs to `accessibleFactoryIds`.

Alternative:

- Store active factory server-side and expose `POST /me/active-factory`.

Trade-off:

- Header-based factory selection is simpler and stateless.
- Server-side active factory is more controlled but requires preference/session
  persistence.

Recommended MVP: header-based `X-Factory-Id` validation.

### Multi-factory view later

Combined-factory views should not happen accidentally.

Future multi-factory pages should use explicit scope, for example:

- `factoryScope=all`
- `factoryIds[]=...`
- or a dedicated aggregate endpoint.

Rules:

- Only users with permission and access to all requested factories may use
  multi-factory aggregates.
- Default behavior remains single active factory.
- Cross-factory summaries must aggregate only authorized factories.

### Unauthorized factory access

If a request includes a factory the user cannot access:

- return `403 Forbidden`,
- do not reveal whether the factory exists in another tenant,
- log/audit repeated suspicious attempts after audit middleware exists.

## 6. Backend Enforcement Design

### Components

Recommended backend pieces:

- `AuthModule`
- `RequestContextModule`
- JWT auth guard
- permission guard
- factory access guard or context validator
- request context decorator
- current user decorator

Suggested names:

```ts
@CurrentUser()
@CurrentContext()
@RequirePermissions('production.view')
@FactoryScoped()
```

### Request flow

1. Auth guard validates the access token.
2. Backend loads the user with:
   - tenant,
   - active roles,
   - permissions,
   - accessible factories.
3. Request context is attached to the request.
4. Permission guard checks route-level permission metadata.
5. Factory validator checks the selected factory for factory-scoped endpoints.
6. Service methods receive context and apply tenant/factory filters.

### Where filters are applied

Tenant and factory filters must be applied in backend service/repository
boundaries.

Example rule:

```ts
where: {
  tenantId: context.tenantId,
  factoryId: context.activeFactoryId,
}
```

Do not rely on frontend filtering.
Do not trust IDs from request body/query without tenant/factory validation.

### Replacing DevContextService

Current pattern:

```ts
const context = await devContext.getFactoryContext()
```

Future pattern:

```ts
const context = getRequestContext(request)
```

or:

```ts
method(@CurrentContext() context: RequestContext)
```

Every endpoint currently using `DevContextService` should be migrated
module-by-module.

### Public and system endpoints

Public/system endpoints must be explicit:

| Endpoint type | Auth requirement |
| --- | --- |
| `/health` | Public |
| `/auth/login` | Public |
| `/auth/refresh` | Public with refresh cookie |
| `/auth/logout` | Authenticated or refresh-cookie based |
| Business read/write endpoints | Authenticated |
| Future system jobs | Explicit system context |

Factory TV needs a separate decision:

- For internal deployment, it may use normal authenticated session.
- Later, it can use a limited display token scoped to one tenant/factory and
  read-only operational data.

## 7. RBAC Design

### Existing model usage

Current schema supports:

- platform-defined `Permission`,
- tenant-scoped `Role`,
- `RolePermission` linking roles to permissions,
- `UserRole` assigning users to roles,
- `UserFactoryAccess` assigning factory access.

This matches the approved minimal identity design.

### Permission naming strategy

Keep permission keys simple:

```text
module.action
```

Examples:

- `dashboard.view`
- `production.view`
- `production.write`
- `warehouse.view`
- `warehouse.write`
- `sales.view`
- `sales.write`
- `finance.view`
- `finance.write`
- `employees.view`
- `employees.write`
- `reports.view`
- `settings.view`
- `settings.write`
- `audit.view`

Future refinement can introduce resource-level permissions only when a real
business need appears.

Avoid premature complexity such as:

- policy engines,
- ABAC DSLs,
- workflow engines,
- factory-scoped roles in V1.

### Route-level permission checks

Recommended examples:

| Route group | Permission |
| --- | --- |
| Dashboard read endpoints | `dashboard.view` |
| Production read endpoints | `production.view` |
| Production future writes | `production.write` |
| Warehouse read endpoints | `warehouse.view` |
| Warehouse future writes | `warehouse.write` |
| Sales read endpoints | `sales.view` |
| Sales future writes | `sales.write` |
| Finance/payroll reads | `finance.view` |
| Finance/payroll future writes | `finance.write` |
| Employees read endpoints | `employees.view` |
| Employee future writes | `employees.write` |
| Reports | `reports.view` |
| Settings read | `settings.view` |
| Settings future writes | `settings.write` |
| Audit log | `audit.view` |

### Role behavior

| Role | MVP behavior |
| --- | --- |
| Owner | All permissions and all factories in tenant. |
| Manager | Operational center: dashboard, production, warehouse, sales, employees, reports, and selected settings. |
| Accountant | Finance/payroll, supplier payments, expenses, sales visibility, reports. |
| Seller | Sales clients, orders, payments, and sales visibility. Sellers can see all clients in MVP. |
| Warehouse Operator | Warehouse stock, materials, zones, movements. |
| Shift Receiver | Production stage inventory, stage movements, worker activity, defects. |

### Owner access

Owner should still be represented through normal roles and permissions.

Avoid hardcoded “superuser bypass” except for carefully designed platform admin
operations, which are outside Paypoq OS V1 scope.

## 8. Data Isolation Rules

### Tenant isolation

Tenant isolation is mandatory for all business data.

Rules:

- Every business query includes `tenantId`.
- `tenantId` comes from authenticated context.
- Cross-tenant reads and writes are prohibited.
- Composite relations help prevent cross-tenant references, but service filters
  are still required.

### Factory isolation

Factory-scoped data must include factory filtering when applicable.

Factory-scoped examples:

- Production
- Warehouse
- Employee
- Payroll
- Finance operations
- Sales orders
- Factory dashboards

Tenant-wide examples:

- Some master data lists
- Tenant settings overview
- Permission metadata

### Common mistakes to avoid

- Accepting `tenantId` from query/body/header.
- Looking up records by `id` only.
- Trusting `factoryId` from frontend without `UserFactoryAccess` validation.
- Returning records with `deletedAt != null` in active lists.
- Joining across tenant-owned tables without composite tenant checks.
- Caching data without tenant/factory-aware cache keys.
- Treating platform `Permission` as tenant-owned.
- Using frontend navigation visibility as security.

## 9. Frontend Impact

### Login page

Add a simple login route later:

```text
/login
```

The login page should be Uzbek-first, dark-mode compatible, and minimal.

### Current user endpoint

Add:

```text
GET /me
```

Recommended response:

```ts
{
  data: {
    user: {
      id: string
      name: string
      email: string | null
    }
    tenant: {
      id: string
      name: string
    }
    activeFactory: {
      id: string
      name: string
    } | null
    accessibleFactories: Array<{
      id: string
      name: string
    }>
    roles: string[]
    permissions: string[]
  }
}
```

### Token handling

Recommended frontend behavior:

- Store access token in memory.
- Store refresh token only in HttpOnly cookie.
- API client sends:

```text
Authorization: Bearer <access-token>
X-Factory-Id: <active-factory-id>
```

- On `401`, attempt refresh once.
- On refresh failure, clear session and redirect to `/login`.

If the implementation chooses cookie-only auth, API client must use
`credentials: "include"` and CSRF protection must be designed.

### Active factory selector

Topbar should show a factory selector when the user has more than one factory.

Rules:

- Hide or make read-only when only one factory exists.
- Changing factory updates frontend active factory state.
- All factory-scoped queries must refetch after factory change.
- Unauthorized factory IDs must never be accepted silently.

### Navigation visibility

Sidebar visibility should use permissions from `GET /me`.

Examples:

- Hide Finance when user lacks `finance.view`.
- Hide Settings when user lacks `settings.view`.
- Hide Audit when user lacks `audit.view`.

Important:

Navigation visibility improves UX, but backend guards remain the real security
boundary.

## 10. Migration Plan

### Step 1 — Auth schema slice

Add minimal approved schema for credentials and refresh sessions.

Do not add business modules in the same migration.

### Step 2 — Auth endpoints

Add:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Keep them small and auditable.

### Step 3 — Current user endpoint

Add:

- `GET /me`

Return user, tenant, accessible factories, selected/default factory, roles, and
permissions.

### Step 4 — Request context foundation

Add:

- request context builder,
- auth guard,
- permission guard,
- factory access validator,
- `@CurrentContext()` decorator.

### Step 5 — Protect one low-risk read module first

Start with a simple module such as Product/Master Data or Settings read.

Goal:

- validate request context,
- validate permission guard,
- validate factory selection behavior,
- keep behavior small and reversible.

### Step 6 — Roll out read endpoint guards

Migrate modules one by one:

1. Product/settings master data.
2. Warehouse reads.
3. Production reads.
4. Sales reads.
5. Supplier reads.
6. Finance/payroll reads.
7. Employees reads.
8. Dashboard/reports cross-domain reads.
9. Factory TV read endpoint.

### Step 7 — Remove DevContextService usage

After all read endpoints use real context:

- remove `DevContextService` injection from business modules,
- keep development seed data,
- remove dev-context-only assumptions from documentation.

### Step 8 — Begin write flows

Only after auth, tenant context, factory context, and RBAC are in place:

- implement production writes,
- implement warehouse writes,
- implement finance approvals/payments,
- implement sales writes.

## 11. Risks and Trade-offs

### Security risks

- Token theft if access tokens are stored in localStorage.
- Refresh token replay if sessions are not persisted/revoked.
- CSRF risk if cookie-only auth is used without CSRF protection.
- Tenant data leakage from id-only queries.
- Factory data leakage from missing `UserFactoryAccess` checks.
- Permission drift if frontend and backend use different permission keys.

### Overengineering risks

Avoid in MVP:

- external SSO as the only login path,
- microservices,
- CQRS/event sourcing,
- generic policy engines,
- workflow engines,
- factory-scoped roles before a proven need,
- complex multi-factory analytics framework.

### Underengineering risks

Do not skip:

- password hashing,
- tenant-scoped queries,
- factory access validation,
- route-level permission checks,
- `deletedAt` filtering for active master data,
- audit preparation for future writes.

### MVP simplifications

Acceptable for V1:

- local email/password auth,
- simple role-permission RBAC,
- single active factory per request,
- no SSO,
- no ABAC,
- no multi-tenant admin portal,
- no advanced session management UI.

### Future improvements

Possible later improvements:

- SSO/OIDC per tenant,
- 2FA for Owner/Manager,
- session/device management,
- password reset flow,
- audit logging for auth events,
- display tokens for TV screens,
- Telegram account linking.

## 12. Open Decisions

These should be decided before implementation:

1. Should `User` store `passwordHash`, or should credentials live in a separate
   `UserCredential` table?
2. Should refresh sessions be stored in PostgreSQL from day one?
3. What are the access and refresh token lifetimes?
4. Should active factory preference be stored server-side?
5. Should Factory TV use normal login or a limited display token?
6. Does `Manager` receive `settings.write` in MVP, or only Owner?
7. Do Accountant payment actions need separate permissions such as
   `finance.pay` later?
8. What is the password reset/onboarding flow for factory staff?

## 13. What This Design Intentionally Does Not Implement

- No code changes.
- No Prisma schema changes.
- No migrations.
- No auth endpoints.
- No guards.
- No frontend login page.
- No token storage.
- No RBAC enforcement.
- No business write flows.

