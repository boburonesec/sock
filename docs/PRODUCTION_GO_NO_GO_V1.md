# Production GO / NO-GO v1

## Question

Can Paypoq OS operate in production without:

- Mobile
- FaceID
- IoT

## Verdict

```text
GO WITH LIMITATIONS
```

## Why not NO-GO

The core factory operating system exists and is smoke-tested:

- auth/RBAC
- product setup
- employees and salary rates
- production chain
- warehouse receipts/corrections
- sales orders/payments/delivery/return/reversal
- supplier purchases/payments
- payroll calculate/pay/close
- executive/operations summaries
- Telegram employee/client read-only bot
- platform admin manual provisioning

`pnpm smoke:mvp` and `pnpm smoke:telegram` pass against local PostgreSQL.

Latest local verification after database recovery:

```text
API build              PASS
Web build              PASS
Bot build              PASS
Telegram smoke         PASS
MVP smoke              PASS
Docker Compose config  PASS
API Docker build       PASS
Web Docker build       PASS
Bot Docker build       PASS
```

## Why not full GO

Broad production still needs operational hardening:

- backup/restore automation and rehearsal
- process supervision for API/Web/Bot
- production secrets management
- baseline observability/alerting
- supplier/payroll recovery path decisions

## Mobile, FaceID, IoT decision

These should wait.

Reason:

- Mobile is useful but not required for owner/manager/operator MVP web flows.
- FaceID is not required for production correctness.
- IoT is explicitly not V1 and would distract from StageInventory-driven
  operations.

## Conditions for limited production/pilot

Before using real factory data:

1. Configure production-grade PostgreSQL backups.
2. Rehearse restore.
3. Run migrations explicitly.
4. Run `pnpm smoke:mvp`.
5. Run `pnpm smoke:telegram` if Telegram is enabled.
6. Use strong secrets.
7. Run one bot instance per token.
8. Keep known limitations documented with the pilot operator.

## Current release decision

```text
Controlled pilot: GO
Broad production: NO-GO until backup/restore, secrets, supervision, and
observability are operationally owned.
```

## Next recommended phase

```text
Production Operations Hardening v1
```

Scope:

- backup/restore runbook and script
- PM2/systemd or Docker Compose production profile
- smoke-after-deploy checklist
- basic monitoring/alerts
- supplier payment reversal design/implementation
- payroll correction policy implementation
