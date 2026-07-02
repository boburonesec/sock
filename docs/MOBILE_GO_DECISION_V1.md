# Paypoq Mobile — GO Decision v1

Status: GO WITH LIMITATIONS  
Scope: Planning conclusion only.

## Decision

Mobile App v1 can begin **now** as a planning-approved implementation track, with limitations.

The first implementation should start with foundation and read-only Employee/Manager surfaces. Client App should wait until client-scoped authentication and authorization are confirmed.

## Justification

### Backend readiness

Core business modules are reported implemented:

- Production
- Warehouse
- Sales
- Supplier
- Payroll
- Telegram
- Platform Admin

Production verdict is GO. The backend domain rules are stable enough for a read-heavy mobile companion app.

### API readiness

Mobile must reuse existing APIs. That is compatible with the current modular-monolith direction.

Limitation:

The API surface must be checked feature by feature before implementation. If existing endpoints are web-oriented but safely reusable, mobile can consume them. If a mobile screen needs a new read model, it should be backend-owned, read-only, and aligned with existing domains.

### Operational readiness

Mobile v1 fits current operations if it stays read-heavy:

- Employees see their own data.
- Clients see their own commercial data only after client auth is safe.
- Managers see summaries.
- Platform Admin stays out of scope.

### Future compatibility

The recommended Expo/React Native architecture keeps future paths open:

- FaceID can be added later as local unlock.
- IoT can be added later through backend/platform integration.
- Shared DTOs/contracts can be reused from `packages/shared` where practical.

## GO limitations

- No business calculations in mobile.
- No production, warehouse, finance, order, payment, or payroll writes in Mobile v1.
- No offline writes or sync engine.
- No FaceID in v1.
- No IoT in v1.
- Client App depends on a safe client identity model.

## Senior engineering review

### 1. Is backend stable enough for mobile?

Yes, for read-heavy mobile. The core domains and production verdict support beginning mobile foundation work. Mobile should not force backend architecture changes.

### 2. Will mobile require business logic changes?

No, not for v1 if scope is respected. Mobile should display backend-calculated values and reuse existing APIs. Any missing mobile-friendly summaries should be implemented as backend read-only endpoints, not mobile calculations.

### 3. Will FaceID block mobile?

No. FaceID is explicitly out of v1 and should not block mobile. It can be added later as local app unlock.

### 4. Will IoT block mobile?

No. IoT is explicitly out of scope and release-after-mobile. Mobile should not be designed around IoT in v1.

### 5. Recommended first implementation slice

Build the foundation plus a minimal Employee read-only flow:

- Login
- Employee profile
- Current payroll summary
- Latest worker activities
- Logout

This slice validates mobile auth, API reuse, secure storage, role routing, cache behavior, and the core rule that mobile does not calculate payroll or production data.

## Final recommendation

Proceed with **GO WITH LIMITATIONS**.

Recommended stack:

- React Native + Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand for local UI state only
- Expo SecureStore
- Expo Notifications

