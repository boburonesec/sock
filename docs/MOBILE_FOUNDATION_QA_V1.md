# Paypoq Mobile — Foundation QA v1

Status: Implemented foundation  
Scope: `apps/mobile` only. Backend architecture and business logic unchanged.

## Architecture

Mobile foundation was added as `apps/mobile`, a workspace package using:

- React Native + Expo
- Expo Router
- TypeScript
- TanStack Query
- Zustand for auth/UI state only
- Expo SecureStore

The app includes route groups for unauthenticated and authenticated flows:

```text
app/
├── _layout.tsx
├── index.tsx
├── (auth)/
│   ├── _layout.tsx
│   └── login.tsx
└── (app)/
    ├── _layout.tsx
    └── home.tsx
```

## Startup flow

1. `AppProviders` creates the TanStack Query client.
2. Auth store restores secure session metadata from SecureStore.
3. If the access token is usable, mobile calls `GET /auth/me`.
4. If the access token is missing or stale, mobile calls `POST /auth/refresh`.
5. If restore fails, SecureStore and API auth state are cleared.
6. Expo Router redirects to login or protected app routes.

## Auth and API behavior

Mobile reuses existing tenant auth endpoints:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

The API layer:

- Attaches `Authorization: Bearer <accessToken>`.
- Attaches `X-Factory-Id` when active factory context exists.
- Sends `credentials: "include"` for the backend refresh cookie.
- Retries one unauthorized request after a successful refresh.
- Normalizes network/API failures with `ApiError`.

Important backend compatibility note:

The existing backend does not return refresh tokens to JavaScript. It stores
refresh state in an HttpOnly cookie. Mobile therefore stores access-token
session metadata in SecureStore and uses the existing cookie-based refresh
endpoint. No backend auth contract was changed.

## Environment setup

Set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Backend reachability:

- iOS simulator: `http://localhost:3001`
- Android emulator: `http://10.0.2.2:3001`
- Real device: `http://<computer-lan-ip>:3001`

Production should provide a public HTTPS API URL.

## Verification commands

Executed:

```bash
pnpm --filter @paypoq/mobile typecheck
pnpm --filter @paypoq/mobile lint
HOME=/private/tmp EXPO_NO_TELEMETRY=1 pnpm --filter @paypoq/mobile exec expo config --type public
HOME=/private/tmp EXPO_NO_TELEMETRY=1 pnpm --filter @paypoq/mobile exec expo export --platform android --output-dir /private/tmp/paypoq-mobile-android-export
node apps/web/node_modules/next/dist/bin/next build
```

Results:

- Mobile TypeScript: passed.
- Mobile lint: passed.
- Expo config validation: passed.
- Android bundle export: passed.
- Existing web build: passed.

Note:

The root `pnpm build` command was not used as the final build signal because the
managed shell preflight recreated `node_modules` and failed under sandbox DNS.
The web app was verified by running its underlying Next.js build binary after a
clean dependency install.

## Smoke checklist

| Check | Result | Notes |
| --- | --- | --- |
| App boots | Passed by bundle export | Android bundle export completed successfully. Simulator/device launch still recommended before Phase 5.3. |
| Login works | Implemented, live test deferred | Calls existing `POST /auth/login`; requires running API and test user for live verification. |
| Refresh works | Implemented, live test deferred | Calls existing `POST /auth/refresh`; route/API retry uses the shared refresh handler. |
| Logout works | Implemented, live test deferred | Calls `POST /auth/logout`, clears SecureStore, memory token, factory context, and query cache. |
| Protected routes work | Implemented and typechecked | `(app)` redirects unauthenticated users to login; route tree bundles successfully. |
| Session restore works | Implemented, live test deferred | Restores usable access token via `/auth/me`, otherwise attempts cookie refresh. |
| Invalid credentials handled | Implemented, live test deferred | `401` maps to Uzbek login error copy. |
| API unavailable handled | Implemented and typechecked | Network failures map to an API unavailable message. |

## Limitations

- No employee screens, payroll UI, activities UI, client app, or manager dashboard.
- No business calculations in mobile.
- No offline writes or sync engine.
- No FaceID.
- No IoT.
- No camera integration.
- No push notifications.
- No client mobile auth changes.

## QA result

Foundation implementation passes static, lint, config, and Android bundle export
verification. Employee Mobile v1 can start on top of the auth, route, API, and
query foundation. Before merging a real Employee screen, run live auth smoke on
at least one simulator/device against a running API.
