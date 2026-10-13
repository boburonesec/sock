# Paypoq Mobile

Paypoq Mobile is the Expo/React Native **tenant client** of Paypoq OS. It is a
first-class client: whatever a tenant user can do in Paypoq Web they must be
able to do here, under the same role/permission and business rules
(`AGENTS.md` §15). What is delivered and what is pending is tracked in
[`docs/WEB_MOBILE_PARITY_V1.md`](../../docs/WEB_MOBILE_PARITY_V1.md).

Mobile never calculates payroll, production, debt, stock or finance values —
the API is the single source of business truth.

## Stack

- React Native, Expo SDK 54, Expo Router
- TypeScript
- TanStack Query for backend data
- Zustand for auth/UI state only
- Expo SecureStore for token persistence
- `@paypoq/shared` for contracts shared with Web (types, permissions, labels)

## Scripts

From the repository root:

```bash
pnpm mobile:dev
pnpm mobile:android
pnpm mobile:ios
pnpm mobile:typecheck
pnpm mobile:lint
pnpm mobile:test
pnpm --filter @paypoq/mobile export:android
```

`pnpm mobile:test` runs device-free helper/route checks and
`scripts/session-integration-test.mjs` (PR 01) and
`scripts/context-integration-test.mjs` (PR 02). They execute the real Zustand
store, native client, serialized storage, React Query and mounted mutation/form
logic with mocked HTTP and native hosts. The context adapter uses deterministic
microtask query notifications under React `act`; it does not simulate native
navigation, storage or scheduling. The 79 checks prove local races and failure
handling, not native device behavior.

`node scripts/native-context-api-acceptance.mjs` runs 11 context/RBAC checks
against a built API on loopback port 3998 and an owned disposable database.
It creates distinguishable A/B stock, verifies a committed A write leaves B
unchanged, tests native refresh/replay fencing and access removal, suspends its
tenants, then drops the database. Docker PostgreSQL and an API build are required.
Native hosts and SecureStore remain mocked in this runner.

## Environment

Set the API URL with `EXPO_PUBLIC_API_BASE_URL`.

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm mobile:dev
```

Backend reachability depends on where the app runs:

- iOS simulator on the same Mac: `http://localhost:3001`
- Android emulator: `http://10.0.2.2:3001`
- Real device/release: an explicit HTTPS API URL through the configured proxy.

Keep the API bound to loopback and the trusted-proxy boundary described in
`AGENTS.md` §7. Do not expose the API directly on the LAN for device tests.
Native session requests use JSON credentials and omit cookies.

`EXPO_PUBLIC_PILOT_SCOPE_MODE=false` disables the pilot role scope (mirrors
Web's `NEXT_PUBLIC_PILOT_SCOPE_MODE`). Leave it unset for the pilot.

## Release builds (EAS)

`eas.json` defines three profiles: `development` (APK / iOS simulator),
`preview` (`APP_ENV=staging`, internal APK) and `production`
(`APP_ENV=production`, Play Store app bundle). For `staging`/`production`,
`app.config.ts` refuses to build unless `EXPO_PUBLIC_API_BASE_URL` is a public
`https://` URL. Each profile loads the EAS environment of the same purpose
(`development` / `preview` / `production`), so set the URL in each environment
you build from. `EXPO_PUBLIC_*` values are embedded in the app bundle, so use
plain-text visibility:

```bash
eas env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.uz --visibility plaintext
eas build --platform android --profile production
```

Dependency versions are pinned to the Expo SDK 54 set (`react@19.1.0`,
`react-native@0.81.5`); run `pnpm --filter @paypoq/mobile deps:check` after
any dependency change. App icon and splash artwork are not yet provided — add
`icon`/`adaptiveIcon.foregroundImage` assets before a store submission.

## Architecture

```text
apps/mobile/
├── app/
│   ├── (auth)/login.tsx
│   └── (app)/                     # 5 role-aware tabs, each a nested stack
│       ├── home/                  # home, executive + operations dashboards
│       ├── operations/            # production, machines, mechanic, warehouse
│       ├── sales/                 # overview (Wave 2 adds the workflows)
│       ├── finance/               # overview (Wave 3 adds the workflows)
│       └── more/                  # profile, factory switch, self-service
└── src/
    ├── lib/api/<domain>.ts        # API functions + query/mutation hooks
    ├── lib/api/query-keys.ts      # central keys + invalidation groups
    ├── lib/access/use-access.ts   # permission + pilot-scope checks
    ├── lib/routes.ts              # static route map
    ├── features/<domain>/         # domain UI pieces shared by screens
    ├── shared/ui/                 # Screen, controls, sheets, lists, guards
    └── shared/hooks/use-guarded-mutation.ts
```

### Rules for new screens

| Concern | Rule |
| --- | --- |
| Navigation | Add screens inside the existing tab stacks. Never add a tab. |
| Authorization | Wrap every area screen in `<AreaGuard area="…">`; pass `endpoint` for write screens. Hide action affordances with `useAccess().can(...)`. The API still enforces everything. |
| Contracts | Import types, enums, labels and permissions from `@paypoq/shared`. Do not redeclare them. |
| Reads | `useContextQuery` hooks in `src/lib/api/<domain>.ts` with keys from `query-keys.ts`; render through `<QueryState>` (skeleton → error with retry → content). |
| Writes | `useGuardedMutation` with an invalidation group; show `<MutationError>`; success via `showFlash` or an inline banner. |
| Irreversible actions | `<ConfirmSheet>`; it stays open and shows the API error on failure. |
| Numbers | Whole pieces via `parsePositiveInteger`; decimals stay strings via `normalizeDecimalInput`. No client-side business totals. |
| Lists | Cards with search/filter, pull-to-refresh, explicit empty state. No horizontally scrolling tables. |

## Auth boundary — PR 01

Native uses `POST /auth/native/login`, `/auth/native/refresh`,
`/auth/native/logout` and the existing `GET /auth/me`. The additive JSON
transport delegates to the same AuthService, hashed RefreshSession records,
atomic rotation, expiry, tenant/user validation and rate limiter as Web.
It grants no trust based on platform headers or user agents. Web keeps its
existing HttpOnly cookie routes and BFF.

The access token, expiry and opaque refresh credential live in one versioned
SecureStore envelope using `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Native requests
omit cookies. The old access-only keys are ignored, so upgrading requires a
fresh login; there is no cookie-only cold-launch fallback.

Concurrent expired requests share one refresh and replay at most once. A
request keeps its originating session generation and factory header. Logout
and new logins fence old responses; a late token is revoked best effort.
Network/429/5xx failures preserve credentials and expose recovery. Auth 401/403
ends the session. A failed rotated-token write signs out and revokes the
successor best effort. Mutations never retry after network/5xx ambiguity.

Logout clears memory immediately and writes a signed-out tombstone before
attempting deletion. A successful overwrite **or** deletion prevents restart
restoration after local logout completes, even offline. Server revocation needs
connectivity; a lost refresh response can leave an unknown successor until its
server expiry. If the OS rejects both clearing operations, the app shows a
storage warning: disk erasure/restart logout cannot be guaranteed. Clear app
credentials/data before relying on logout in that state. Storage calls finish
for the UI after 5 seconds; underlying operations stay serialized so late saves
cannot overwrite a queued logout. A permanently hung OS operation blocks later
storage work until process restart; failures remain visible, not an endless
splash screen. Killing the process before local persistence completes needs
runtime validation and cannot be claimed safe merely from an in-memory reset.

Optional employee-profile failures do not hide account/factory/logout controls.
Account switches clear the query cache. PR 02 below adds selected-factory
persistence and context isolation while preserving this session lifecycle.

PR 01 source and local tests are implemented. Native iOS/Android runtime and
physical-device acceptance remain pending; see the parity document for evidence.
For live native API + built Web authentication checks, build API/Web and run
`node scripts/native-session-acceptance.mjs` (Chromium and WebKit installed).
Its Web test uses port 3100 and API 3997; build with
`NEXT_PUBLIC_API_URL=http://127.0.0.1:3997 pnpm --filter @paypoq/web build`.
The runner owns/suspends a disposable tenant and drops its database, and requires
the local Docker PostgreSQL container. Restore the normal Web build afterwards.

## Factory and session continuity — PR 02

A factory preference is stored with tenant/user identity in the existing secure
session envelope. Restoration first obtains fresh `/auth/me` without a persisted
factory header. It keeps the preference only when that identity and factory are
still authorized; otherwise it uses the authorized API default, then API order.
SINGLE/MULTI access remains the API's decision. Refresh preserves the current
verified choice. Preference patches use the same queue as rotation and read the
current envelope, so switching factories cannot overwrite a rotated credential.
A preference-only storage failure keeps authentication and shows a retry notice
on the profile; choosing that factory again retries persistence.

Every domain request captures session generation, tenant, user, factory and
an authorization version. Caller cancellation and the 20-second deadline both
apply. Superseded reads abort; late data is rejected even if cancellation is
ignored. A request from A that gets 401 cannot replay after switching to B (or
A → B → A). The existing single-flight refresh and one bounded replay remain.
A dispatched write may commit at its original factory: its receipt is retained,
late success/failure/unknown notices name that factory, and mutations do not retry
network/5xx ambiguity or release success callbacks in the new context.

Query keys keep their domain prefixes and append tenant/user/session/access
identity plus factory for factory data. Products, materials and product-variant
lookups use an explicit tenant scope; operational data, self-service and summaries
use factory scope. Domain invalidation targets the write's original session and
factory, including its tenant-wide dependencies. Logout clears all cached data
and context feedback. No credentials enter keys or notices.

Factory/access/session changes reset descendant local inputs, confirmations and
retry keys, block old operational route parameters and return to Home with an
Uzbek notice. The existing five tabs, AreaGuard and guarded-mutation patterns
remain. On background resume, fresh auth context revalidates access; unchanged
context preserves drafts, changed access resets them. Restart revalidates the
stored preference rather than restoring unsaved forms.

Source and local validation are complete; iOS/Android simulator, emulator,
physical-device and signed native-build acceptance are **NOT TESTED**. Metro
exports and mocked React tests do not prove OS persistence or Expo navigation.
See the parity document for exact evidence and remaining runtime cases.

## Delivered capability

### Wave 1 — Core operations

| Area | Read | Write |
| --- | --- | --- |
| Production | Board KPIs, stage flow, product breakdown, recent movements, worker activity, shift readiness, correction queue | Move to next stage (worker shares), extra worker activity, defect, finished-product receipt, correction request + resolve, shift submit / accept / return, warehouse handoff stage |
| Machines | Machines, state, assignments, active runs | Start run, receive output (idempotent), complete run, create machine, assign mechanic, piece rate, maintenance task, inspection slots, measurement specification |
| Mechanic | Today's inspection rounds, quality issues, maintenance tasks | Enter measurements, recheck, hold run, start / complete task |
| Warehouse | Stock overview, low stock, product + material stock, materials, movements, zones (with details) | Material receipt, stock correction |

### Dashboards and self-service

- `home/executive`, `home/operations-summary`, `sales`, `finance`: read-only
  summaries (`/dashboard/executive-summary`, `/production/operations-summary`,
  `/sales/summary`, `/finance/summary`).
- Employee self-service (`/mobile/employee/*`): own activities, payroll items
  and advance history for users linked to exactly one active employee.
  Owners/managers without an employee profile simply do not see those entries.

## Not yet delivered

Sales workflows (Wave 2), Finance & People (Wave 3), Settings / Reports /
Notifications (Wave 4) — see the parity matrix. Also out of scope for now:
offline writes or a sync engine, push notifications, FaceID, camera, IoT.

## Validation status

The app has been validated by static gates (typecheck, lint, unit, Android
bundle export) and by exercising every Wave 1 endpoint against a real local
API with each role. It has **not** been run on an iOS Simulator, Android
emulator or a physical device in this repository's automation.
