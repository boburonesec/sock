# Paypoq Mobile — Architecture v1

Status: Recommended  
Scope: Planning only. No mobile implementation yet.

## Recommended app location

Create the future mobile app at:

```text
apps/mobile
```

This matches the existing monorepo layout and keeps mobile as a first-class app without changing backend module boundaries.

## Architecture style

Use a feature-based architecture:

```text
apps/mobile/
├── app/                 # Expo Router routes and layouts
├── src/
│   ├── app/             # app bootstrap, providers, config
│   ├── features/        # employee, client, manager, notifications, auth
│   ├── shared/          # API client, UI primitives, formatting, utilities
│   └── assets/
└── package.json
```

Feature modules should own their screens, query hooks, small UI pieces, and mock-free API integration. Shared code should remain small and generic.

## Core decisions

| Area | Decision |
| --- | --- |
| Framework | React Native + Expo |
| Routing | Expo Router |
| Server state | TanStack Query |
| UI state | Zustand only for local UI state |
| Auth storage | Expo SecureStore |
| Notifications | Expo Notifications for MVP |
| Environment config | Expo config with typed app config and environment-specific API base URL |
| API contracts | Reuse `packages/shared` DTOs/enums/schemas when practical |

## API client reuse

Mobile should reuse existing backend APIs. It should not require new business modules or duplicate business calculations.

Recommended API approach:

- Use one typed API client wrapper for HTTP requests.
- Attach access tokens centrally.
- Refresh tokens centrally.
- Normalize API errors into user-friendly states.
- Keep feature query hooks close to each feature.
- Reuse shared DTOs and enums where they are stable.

Avoid:

- Business-specific calculation helpers in mobile.
- Separate mobile-only versions of payroll, debt, stock, or dashboard formulas.
- Mixing mock data and live API calls inside the same feature.

## Auth storage

Use `expo-secure-store` for refresh tokens and access tokens if access-token persistence is required.

Guidelines:

- Prefer short-lived access tokens.
- Keep refresh-token rotation on the backend.
- Clear stored tokens on logout.
- Do not store payroll, debt, or sensitive business snapshots as permanent local files.

## Query cache

Use TanStack Query for API state.

Guidelines:

- Cache read-only data for good mobile UX.
- Use conservative stale times for dashboards and operational summaries.
- Refetch important summaries when the app returns to foreground.
- Do not use optimistic updates for business-critical values in v1.

## Navigation

Use Expo Router with role-based route groups:

```text
app/
├── (auth)/
├── (employee)/
├── (client)/
└── (manager)/
```

Route access must be based on backend-provided identity, role, tenant, and factory context. Hidden mobile screens are not a security boundary; backend authorization remains mandatory.

## Notifications

Mobile should receive notification payloads and open the relevant read-only screen where possible. Notification payloads must not contain sensitive full payroll, debt, or finance details; use IDs and fetch details from the backend after authorization.

## Environment config

Define explicit environments:

- local
- staging
- production

Each environment needs:

- API base URL
- push notification project/application identifiers
- release channel/profile
- logging level

Secrets must not be committed into the mobile app.

## Non-negotiable rules

- No business calculations in mobile.
- Backend remains source of truth.
- Tenant isolation remains enforced by backend APIs.
- Factory context must come from authorized backend context.
- FaceID is not in v1.
- IoT is not in v1.

