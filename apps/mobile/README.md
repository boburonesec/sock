# Paypoq Mobile

Paypoq Mobile is the Expo/React Native Employee Mobile v1 app. It reuses the
existing Paypoq OS tenant auth APIs and Employee Self-Service API v1. Mobile
does not calculate payroll, production, debt, stock, or finance values.

## Stack

- React Native
- Expo
- Expo Router
- TypeScript
- TanStack Query for backend data
- Zustand for auth/UI state only
- Expo SecureStore for token persistence

## Scripts

From the repository root:

```bash
pnpm mobile:dev
pnpm mobile:android
pnpm mobile:ios
pnpm mobile:typecheck
pnpm mobile:lint
pnpm --filter @paypoq/mobile export:android
```

Or from `apps/mobile`:

```bash
pnpm dev
pnpm android
pnpm ios
pnpm typecheck
pnpm lint
pnpm export:android
```

## Environment

Set the API URL with `EXPO_PUBLIC_API_BASE_URL`.

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm mobile:dev
```

Backend reachability depends on where the app runs:

- iOS simulator on the same Mac: `http://localhost:3001`
- Android emulator: `http://10.0.2.2:3001`
- Real device: `http://YOUR_COMPUTER_LAN_IP:3001`

For real devices, the API server must listen on a network-reachable host and
CORS/cookie settings must allow the mobile origin/runtime as needed.

## Auth boundary

The mobile foundation calls:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

The existing backend uses a JWT access token plus an HttpOnly refresh cookie.
Mobile stores access-token session metadata in SecureStore and relies on the
backend-managed refresh cookie for refresh. The backend contract is unchanged.

## Employee Self-Service API

Employee Mobile v1 consumes:

- `GET /mobile/employee/me`
- `GET /mobile/employee/activities`
- `GET /mobile/employee/payroll`
- `GET /mobile/employee/advances`

Screens:

- `/(app)/home` shows employee name, factory, status, and quick actions.
- `/(app)/activities` shows latest WorkerActivity records with pull-to-refresh.
- `/(app)/payroll` shows backend payroll item snapshots.
- `/(app)/profile` shows read-only employee, tenant/factory, and safe user info.
- `/(app)/advances` shows read-only advance history.

If the authenticated tenant user is not linked to exactly one active employee,
the app shows:

```text
Sizning akkauntingiz xodim profiliga ulanmagan.
```

## Manager Dashboard API

Manager Mobile v1 consumes existing backend summary endpoints only:

- `GET /dashboard/executive-summary`
- `GET /production/operations-summary`
- `GET /warehouse/stock-summary`
- `GET /sales/summary`
- `GET /finance/summary`

Manager routes:

- `/(app)/manager`
- `/(app)/manager-executive`
- `/(app)/manager-production`
- `/(app)/manager-warehouse`
- `/(app)/manager-sales`
- `/(app)/manager-finance`

The Manager tab is shown only when the authenticated user has at least one of:

- `dashboard.view`
- `production.view`
- `warehouse.view`
- `sales.view`
- `finance.view`

Direct access without permission shows an access denied state. Employee-only
users can continue using Employee screens.

## V1 limitations

- No employee profile editing.
- No advance request flow.
- No manager write actions.
- No payroll, activity, debt, stock, finance, or production calculations.
- No offline writes or sync engine.
- No FaceID.
- No IoT.
- No camera integration.
- No push notifications.
- No client mobile auth changes.
