# Paypoq Mobile — Implementation Plan v1

Status: Proposed  
Scope: Planning only.

## Phase 1: Foundation

Goal: create the technical base without adding mobile-specific business logic.

Includes:

- `apps/mobile`
- Expo + React Native + TypeScript setup
- Expo Router navigation
- Auth flow
- API client
- TanStack Query provider
- Secure token storage
- Environment config
- Basic role-based route groups
- Error/loading/empty states

Exit criteria:

- User can log in and reach the correct role shell.
- App can call existing backend APIs.
- Logout clears tokens and query cache.
- No business calculations exist in mobile.

## Phase 2: Employee App

Goal: deliver read-only employee self-service.

Includes:

- Profile
- Salary summary
- Payroll history
- Advances
- Worker activities
- Notifications

Exit criteria:

- Employee sees only their own data.
- Payroll and activity values come from backend APIs.
- No production, warehouse, or finance writes are exposed.

## Phase 3: Client App

Goal: deliver read-only client commercial visibility.

Includes:

- Orders
- Payments
- Debt
- Order statuses
- Notifications

Dependency:

Client identity and authorization must be confirmed before implementation. If existing auth does not safely support external client users, add a small backend auth design phase before this phase starts.

Exit criteria:

- Client sees only their own orders, payments, debt, and notifications.
- Clients cannot create orders or payments.
- Debt is backend-calculated.

## Phase 4: Manager Dashboard

Goal: deliver mobile executive and operational summary views.

Includes:

- Executive dashboard
- Production summaries
- Sales summaries
- Warehouse summaries
- Major alerts

Exit criteria:

- Stage Inventory is the primary production summary.
- Dashboard values come from backend APIs.
- No deep admin or mutation workflows are included.

## Later: FaceID

FaceID is explicitly out of v1.

Future FaceID should be designed as local app unlock after normal authentication, not as backend identity.

## Later: IoT

IoT is after mobile release.

Future IoT should integrate through backend/platform services and should not turn mobile into the source of production truth.

## Recommended first implementation slice

Start with Phase 1 plus the smallest Employee App read-only slice:

- Login
- Employee profile
- Current payroll summary
- Latest worker activities
- Logout

This tests auth, API integration, secure storage, role routing, query cache, and the key Paypoq rule that mobile displays backend-calculated values only.

