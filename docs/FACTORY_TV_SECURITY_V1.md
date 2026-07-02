# Factory TV Security v1

Date: 2026-07-02

## Scope

This document covers `GET /dashboard/factory-tv-summary` and the web `/tv`
screen. No new dashboard data, calculations, write actions, schema changes, or
business features were added.

## Implemented Security Behavior

- `GET /dashboard/factory-tv-summary` now requires `X-Factory-TV-Token`.
- API production env validation requires `FACTORY_TV_ACCESS_TOKEN` with at
  least 32 characters.
- Web `/tv` sends `NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN` to the API.
- API readiness now reports `factoryTvAccessToken`.
- MVP smoke checks both missing-token denial and configured-token success.

## Data Boundary

Factory TV remains a read-only operational display. It excludes salary, payroll,
debt, expenses, user records, platform admin data, and write actions.

The endpoint still uses the existing backend-calculated dashboard read model.
No frontend aggregation or business calculation was introduced.

## Deployment Rules

Production must set both values to the same high-entropy display token:

```text
FACTORY_TV_ACCESS_TOKEN=...
NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN=...
```

The token is a display gate, not a private user secret, because the browser TV
screen must send it. Production should still use HTTPS and preferably LAN/VPN
or reverse-proxy allowlisting.

## Smoke

Expected checks:

```text
GET /dashboard/factory-tv-summary without X-Factory-TV-Token -> 401
GET /dashboard/factory-tv-summary with X-Factory-TV-Token -> 200
```

`apps/api/scripts/mvp-smoke-test.mjs` now includes these checks.

## Limitations

- Shared token does not identify a TV device.
- Token rotation requires updating API and web deployment env together.
- Public internet exposure is still not recommended without network controls.

