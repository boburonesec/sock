# Production Readiness Audit v1

## Summary

Paypoq OS is close to controlled pilot readiness, but broad production rollout
still has operational and recovery-path gaps.

Overall classification:

```text
GO WITH LIMITATIONS
```

## Latest verification evidence

After local PostgreSQL became reachable again, release-readiness verification was
re-run:

```text
pnpm api:build        PASS
pnpm bot:build        PASS
pnpm build            PASS
pnpm smoke:telegram   PASS
pnpm smoke:mvp        PASS
```

Docker verification:

```text
docker compose --env-file .env.docker.example config  PASS
apps/api Docker image build                           PASS
apps/web Docker image build                           PASS
apps/bot Docker image build                           PASS
```

Smoke coverage confirmed:

- Telegram smoke: 6/6 checks passed.
- MVP smoke: 12/12 checks passed.
- RBAC matrix was verified for seller, warehouse operator, shift receiver,
  accountant, and manager paths.
- Critical audit actions were verified for payment reversal, payroll close,
  delivery return, stock correction, stock movement, and supplier payment.

## Auth & Security

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Tenant auth | READY | JWT access token + refresh session implemented and smoke-tested | Local email/password MVP is acceptable |
| Refresh sessions | READY | Smoke covers login/session basics | Rate limiting login is can-defer for pilot but needed later |
| Platform auth | READY | Platform admin auth/provisioning implemented | Platform RBAC not implemented; acceptable for v1 super admin |
| Tenant lifecycle | READY | Suspended/cancelled tenant enforcement implemented | Smoke previously covered lifecycle behavior |
| RBAC | READY | MVP smoke verifies limited-role matrix | Permission granularity may expand later |
| Telegram security | READY | `smoke:telegram` verifies link, block, wrong key, rate limit | Rate limiter is in-memory |
| Secret handling | PARTIAL | Env examples and Docker envs exist | Needs real secret manager in production |
| Audit logging | READY | Critical write flows audit actions smoke-tested | Audit browsing UI missing |
| Tenant isolation | READY | Tenant/factory context and RBAC used in APIs | Needs continued review for every new endpoint |

## Business Modules

| Module | Happy path | Recovery path | Status |
| --- | --- | --- | --- |
| Production | Batch, stage move, worker activity, defect, receipt smoke-tested | Stock correction exists; production movement correction policy exists but not full flow | PARTIAL |
| Warehouse | Material/finished receipt, stock movement, correction smoke-tested | Stock correction implemented | READY |
| Sales | Client/order/payment/delivery/return/reversal smoke-tested | Payment reversal and delivery return implemented | READY |
| Supplier | Supplier purchase/payment allocation smoke-tested | Supplier payment reversal missing | PARTIAL |
| Payroll | Period create/calculate/pay/close smoke-tested | Correction after close not implemented | PARTIAL |
| Telegram | Employee/client read-only flows smoke-tested | Block/unlink exists; unblock missing by policy | READY FOR PILOT |
| Platform Admin | Manual provisioning implemented and documented | Billing/subscription automation missing | PARTIAL |

## Operations

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Backups | BLOCKED | No backup/restore automation | Must-have before real production |
| Rollback | PARTIAL | Docs describe rollback approach | Needs rehearsed backup restore |
| Smoke tests | READY | `smoke:mvp` and `smoke:telegram` pass | Good pilot safety net |
| Demo reset | READY | Demo reset/seed strategy exists | Must remain local-only |
| Deployment docs | READY | Docker deployment doc added | Needs pilot rehearsal |
| CI | READY FOR PILOT | Builds, Docker image build, smokes in CI | No deployment automation |
| Observability | PARTIAL | Health endpoints/logs exist | No metrics/alerts |
| Telegram operations | PARTIAL | Runbook and deployment hardening docs exist | Needs process manager config |
| Docker runtime | READY FOR PILOT | Compose config and API/Web/Bot image builds pass | Runtime container smoke is can-defer |

## Must have before production

These are real production blockers:

1. Database backup and restore procedure
   - automated backups
   - restore rehearsal
   - documented RPO/RTO

2. Process supervision and deployment runbook execution
   - API/Web/Bot restart policy
   - exactly one bot instance per Telegram token
   - operational owner

3. Production secrets management
   - no secrets in files
   - rotation process
   - restricted access

4. Observability baseline
   - API uptime
   - bot uptime
   - error logs
   - smoke-after-deploy checklist

5. Supplier/payroll recovery policy decision for production
   - supplier payment reversal
   - payroll correction after close

## Can wait

These are safe to postpone:

- Mobile app
  - Web app covers MVP operator/admin flows.

- FaceID
  - Not required for controlled pilot or production web workflows.

- IoT
  - Product spec says human-before-IoT; StageInventory is current core metric.

- Telegram webhook
  - Long polling is acceptable for low-volume pilot.

- Redis limiter
  - In-memory limiter is acceptable until abuse/multi-instance risk appears.

- Advanced analytics
  - Existing dashboards and reports cover MVP health.

- Billing automation
  - Platform admin can manage pilot lifecycle manually.

- Advanced reports/export
  - Not required for first production operations.

## Verdict

```text
GO WITH LIMITATIONS
```

Paypoq OS can run a controlled pilot/limited production without Mobile, FaceID,
or IoT if operational constraints are accepted and backup/restore is handled
before real production data is trusted.
