# Paypoq OS Tech Debt Register v1

Date: 2026-07-02  
Purpose: Classify remaining production risks after Final Production Audit v1.

## Severity Definitions

MUST FIX:

- Blocks internet-exposed production or safe small-factory operation.
- Could cause security exposure, data loss, inability to recover, or severe
  operational confusion.

SHOULD FIX:

- Important for reliability, supportability, or scale.
- Acceptable for a controlled pilot with explicit owner and workaround.

CAN DEFER:

- Useful future improvement.
- Does not materially block controlled pilot or first small-factory production.

## MUST FIX

### TD-001 Auth and Platform Auth Rate Limiting

Area: Security  
Risk: Brute-force login, password spraying, and platform admin credential attack.  
Current state: No application-level login throttling found. Telegram link has
in-memory rate limiting, but tenant/platform login do not.  
Required before: Internet-exposed production.  
Recommended fix: Add rate limiting for `/auth/login`, `/platform-auth/login`,
and possibly refresh abuse paths. For first deployment, a reverse-proxy/WAF
limit is acceptable if documented and tested.

### TD-002 Public Factory TV Access Strategy

Area: Security / Data exposure  
Risk: `GET /dashboard/factory-tv-summary` is public and can expose operational
factory summary data if API is internet-reachable.  
Current state: Intentional V1 public endpoint for TV display.  
Required before: Internet-exposed production.  
Recommended fix: Add display token, IP allowlist, authenticated TV mode, or keep
API strictly private behind LAN/VPN.

### TD-003 Production Backup Ownership and Off-Server Copy

Area: Operations / Recovery  
Risk: Data loss if backups are manual, unowned, or stored only on the app
server.  
Current state: Backup scripts and docs exist; actual production schedule and
off-server storage are operator tasks.  
Required before: First real production day.  
Recommended fix: Assign named owner, configure daily backup, copy off-server,
and document retention.

### TD-004 Production Restore Rehearsal on Target Server

Area: Operations / Recovery  
Risk: Backup files may exist but not be restorable under real credentials,
network, disk, or PostgreSQL version conditions.  
Current state: Prior local restore rehearsal passed; target-server rehearsal not
proven in this final audit.  
Required before: First real production day.  
Recommended fix: Restore latest backup into a clean DB on production-like
infrastructure and run `pnpm smoke:mvp` plus `pnpm smoke:telegram`.

### TD-005 Monitoring and Alert Ownership

Area: Operations  
Risk: API, Web, Bot, backup failure, or readiness degradation can go unnoticed.  
Current state: Uptime Kuma and monitoring docs exist; installation is an
operator task.  
Required before: First real production day.  
Recommended fix: Configure monitors for Web, API `/health/readiness`, backup
job, and Bot process; assign alert owner.

### TD-006 Production Smoke Must Pass on Deployment Target

Area: Release management  
Risk: Local/static checks pass but production env, secrets, DB, or process model
is wrong.  
Current state: Final audit static/build checks passed; `pnpm deploy:smoke` was
blocked locally because PostgreSQL at `localhost:55432` was unavailable.  
Required before: Go-live and after each deploy.  
Recommended fix: Run `pnpm deploy:smoke` against the real deployment after
migrations and before handoff.

### TD-007 Mobile Live Device Session Smoke

Area: Mobile / Auth  
Risk: Expo native cookie/session behavior or network reachability differs from
desktop/browser assumptions.  
Current state: Mobile typecheck, lint, config, and Android export passed; live
device/simulator auth smoke was not executed during final audit.  
Required before: Mobile pilot.  
Recommended fix: Test login, refresh, restart/session restore, employee screen
loads, manager permission behavior, and logout on target Android/iOS devices.

## SHOULD FIX

### TD-101 Auth and Security Event Audit Logging

Area: Security / Forensics  
Risk: Failed login, refresh abuse, forbidden access, and suspicious auth events
are harder to investigate.  
Recommended fix: Add audit/security log events for login success/failure,
logout, refresh reuse, permission denial, and platform admin actions.

### TD-102 CI Coverage for Mobile

Area: CI/CD  
Risk: Mobile regressions are not protected by GitHub Actions.  
Recommended fix: Add mobile typecheck, lint, Expo config, and Android export to
CI or a separate mobile workflow.

### TD-103 CI Coverage for Employee Self-Service Smoke

Area: CI/CD / Security  
Risk: Employee-scoped API regressions may not be caught automatically.  
Recommended fix: Add `pnpm smoke:employee-self-service` to CI after stabilizing
test data and DB runtime expectations.

### TD-104 Systematic RBAC Negative Tests

Area: Security / Authorization  
Risk: Permission regressions rely on manual review and broad smoke coverage.  
Recommended fix: Add integration tests for representative `401`, `403`, and
cross-factory denial paths.

### TD-105 Redis or Persistent Rate Limiter for Telegram Link Attempts

Area: Telegram / Security  
Risk: In-memory limiter resets on API restart and does not coordinate across
future API replicas.  
Recommended fix: Use Redis or a database-backed limiter before multi-instance
deployment.

### TD-106 Platform Admin MFA

Area: Platform Security  
Risk: Platform admin compromise gives high operational power.  
Recommended fix: Add MFA before broad SaaS/platform operations.

### TD-107 Supplier Payment Reversal

Area: Business recovery  
Risk: Supplier payment mistakes require manual remediation.  
Current state: Deferred policy/implementation.  
Recommended fix: Define and implement supplier payment reversal with audit.

### TD-108 Production Stage Movement Correction Policy

Area: Production recovery  
Risk: Wrong stage movement entries may require manual DB correction if no
business-safe correction flow exists.  
Recommended fix: Define correction/reversal policy before high-volume
production rollout.

### TD-109 Material Receipt Correction Policy

Area: Warehouse recovery  
Risk: Wrong material receipt entries may be difficult to correct cleanly.
Recommended fix: Define material receipt correction/reversal flow with
StockMovement audit.

### TD-110 Payroll Correction After Close

Area: Payroll recovery  
Risk: Closed payroll mistakes may require exceptional operational process.  
Recommended fix: Define reopen/correction/carry-forward policy before factories
depend on payroll for official payment.

### TD-111 Invite, Password Reset, and Session Management

Area: Operations / Admin UX  
Risk: Manual credential handling does not scale and can create support/security
issues.  
Recommended fix: Add invite/password reset and session revocation workflows.

### TD-112 Audit Log Browsing UI

Area: Operations / Support  
Risk: Audit data exists but is hard for owner/manager/support to inspect.
Recommended fix: Add filtered audit log UI for authorized users.

## CAN DEFER

### TD-201 Push Notifications

Reason: Useful for responsiveness, not required for current core operational
value. Existing architecture can add it without rewrite.

### TD-202 FaceID

Reason: Should be a local mobile unlock convenience, not server auth. Correctly
deferred until mobile usage proves need.

### TD-203 IoT Integration

Reason: Product remains human-first. IoT will need schema additions and
ingestion/reconciliation design but no backend rewrite.

### TD-204 Client Mobile

Reason: Telegram client read-only flow already exists. Internal factory
operations and notifications should stabilize first.

### TD-205 Webhook Mode for Telegram

Reason: Long polling is acceptable for first single-instance deployment.
Webhook mode can wait until hosting/network maturity increases.

### TD-206 Enterprise Observability Stack

Reason: Uptime Kuma + PM2 logs are sufficient for first factory. Prometheus,
Grafana, ELK, tracing, and Sentry can be adopted when operational volume
justifies them.

### TD-207 Automated Cloud Backup Upload

Reason: Off-server copy is mandatory, but first deployment can use manual or
simple cron/rsync ownership. Full cloud integration can come later.

### TD-208 Multi-Tenant Self-Service Signup

Reason: Manual platform admin provisioning is sufficient for first factory.
Self-service signup is a SaaS-scale feature.

### TD-209 Manager Write Actions on Mobile

Reason: Manager Mobile v1 is intentionally read-only. Approval/write workflows
should be designed after dashboard pilot feedback.

### TD-210 Advanced Mobile E2E Automation

Reason: Useful, but static checks plus live device smoke are sufficient for
early pilot. Add E2E once mobile scope stabilizes.
