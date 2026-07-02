# Production Hardening Audit v1

Date: 2026-07-02

## Implemented Hardening

- Added process-local tenant auth throttling for `/auth/login` and
  `/auth/refresh`.
- Added process-local platform auth throttling for `/platform-auth/login` and
  `/platform-auth/refresh`.
- Added tenant audit event `AUTH_LOGIN_BLOCKED` for known tenant-user blocked
  login/refresh cases.
- Added platform audit event `PLATFORM_AUTH_LOGIN_BLOCKED`.
- Protected `GET /dashboard/factory-tv-summary` with `X-Factory-TV-Token`.
- Required `FACTORY_TV_ACCESS_TOKEN` in production env validation.
- Wired Factory TV token through web env, Docker, readiness, and MVP smoke.
- Added mobile typecheck, mobile lint, Expo config validation, and employee
  self-service smoke to CI.
- Documented mobile device smoke, Telegram hardening, operations ownership, and
  target server validation.

## Verification Results

```text
pnpm --filter @paypoq/api build                         PASS
NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN=... pnpm --filter @paypoq/web build  PASS
pnpm --filter @paypoq/bot build                         PASS
pnpm --filter @paypoq/mobile typecheck                  PASS
pnpm --filter @paypoq/mobile lint                       PASS
pnpm --filter @paypoq/mobile exec expo config --type public  PASS
docker build -f apps/api/Dockerfile ...                 PASS
docker build -f apps/web/Dockerfile ...                 PASS
docker build -f apps/bot/Dockerfile ...                 PASS
git diff --check                                        PASS
pnpm smoke:mvp                                          BLOCKED: PostgreSQL localhost:55432 unavailable
pnpm smoke:employee-self-service                        BLOCKED: API could not become healthy without local DB
```

Live Android/iOS smoke was not executed because no emulator or real device was
available in this workspace.

## Backend Re-Audit

Backend architecture remains the approved modular monolith. No schema changes,
migrations, business features, microservices, CQRS, event sourcing, or new
business calculations were introduced.

Auth hardening is improved for first production deployment. The limiter is
process-local, which is acceptable for a single API instance but not sufficient
for multi-instance SaaS.

## Factory TV Re-Audit

Factory TV is no longer accidentally public by default. It requires a display
token and remains read-only.

Residual risk: the token is visible to the TV browser bundle, so it must be
paired with network controls for internet-exposed deployments.

## Mobile Re-Audit

Mobile implementation remains read-only for employee and manager screens and
continues to consume backend-calculated values only.

CI now protects typecheck, lint, and Expo config. Live device auth/session smoke
is still pending because no emulator or device was available in this workspace.

## Telegram Re-Audit

Telegram remains controlled-pilot ready. The in-memory limiter is acceptable for
single-instance deployment, with Redis deferred until multi-instance or abuse
pressure.

## Platform Admin Re-Audit

Platform auth now has throttling and blocked-login audit events. Platform admin
MFA remains a should-fix item before broad SaaS operation.

## Docker / Deployment Re-Audit

Docker env now includes Factory TV token wiring. Target-server PM2/reboot,
backup, restore, monitoring, and deploy smoke still require execution on the
actual host.

## CI/CD Re-Audit

CI coverage now includes API/Web/Bot builds, mobile typecheck/lint/Expo config,
Docker builds, Telegram smoke, MVP smoke, and employee self-service smoke.

## Security Re-Audit

High-risk issues from the final audit are reduced:

- auth brute-force risk mitigated for single API instance
- Factory TV accidental public exposure mitigated
- self-service API remains scoped to own employee data
- platform admin auth has blocked-attempt audit events

Remaining security limits:

- process-local limiter resets on restart
- no platform admin MFA
- no centralized security alerting
- Factory TV display token is not a device identity mechanism

## Operations Re-Audit

Ownership roles are now documented, but real people and target-server evidence
must be added by the operator before go-live.

## Recovery Re-Audit

Backup and restore scripts exist. Target-server restore rehearsal remains a
production gate.

## Monitoring Re-Audit

Monitoring ownership is defined. Installed monitors and alert delivery remain
target-environment tasks.
