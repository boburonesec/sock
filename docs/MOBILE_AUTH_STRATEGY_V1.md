# Paypoq Mobile — Authentication Strategy v1

Status: Recommended  
Scope: Design only.

## Decision summary

- Employee: use normal email/password login for MVP if employees are provisioned as mobile users.
- Client: start by reusing existing auth only if client users already fit the tenant/RBAC model safely; otherwise define future client auth before implementation.
- Manager: reuse existing auth.
- FaceID: not in v1.

## Employee auth

Employee Mobile v1 should use:

- Email/password login
- Short-lived access token
- Refresh token handling
- Secure token storage
- Logout that clears local tokens and query cache

Important boundary:

Employees must only see their own profile, activity, payroll, advances, and notifications. They must not receive production, warehouse, finance, or admin permissions.

Risk:

The current product model says workers do not use the web application directly and Telegram is the worker self-service channel. Mobile employee access is therefore a product expansion from Telegram-only self-service.

Recommended alternative if employee user accounts are not ready:

Start Employee Mobile with the same identity boundary as Telegram link tokens, but do not implement that until a backend auth design is approved.

## Client auth

### Option A: Reuse existing auth

Pros:

- Faster MVP.
- One login system.
- Shared token refresh and RBAC patterns.

Cons:

- Existing auth may be designed for internal users, not external clients.
- Client access must not leak tenant/factory/internal operational data.
- Client roles and client-to-tenant relationships must be explicit.

### Option B: Future client auth

Pros:

- Cleaner security model for external users.
- Can support invite-based onboarding, client contacts, and restricted order/debt views.

Cons:

- Slower.
- Requires backend design work before Client App implementation.

### MVP recommendation

Use existing auth for Manager. For Client App, proceed only if the backend already has or can safely expose a client-scoped identity model without business logic changes. If not, defer Client App implementation behind a small backend auth design milestone.

This is a GO WITH LIMITATIONS item, not a reason to block Employee/Manager planning.

## Manager auth

Manager Mobile v1 should reuse existing auth and backend RBAC.

Manager app access must honor:

- Tenant context
- Factory context
- Role permissions
- Backend authorization for every read

## Refresh token handling

Recommended behavior:

- Store refresh token in SecureStore.
- Keep access token in memory when practical.
- Refresh access token through a centralized auth client.
- On refresh failure, clear auth state and send the user to login.
- On logout, revoke refresh token when backend support exists, then clear local tokens and query cache.

## FaceID

FaceID is explicitly **not in Mobile v1**.

Future FaceID should be treated as local app unlock only, not as a replacement for backend authentication or authorization.

