# Production GO / NO-GO v2

## Question

Can Paypoq OS run without:

- Mobile
- FaceID
- IoT

in a real factory environment?

## Verdict

```text
GO WITH DOCUMENTED LIMITATIONS
```

## Technical reasons

The core system exists:

- auth/RBAC
- product setup
- employee/salary rates
- production flow
- warehouse flow
- sales/payment/delivery/return/reversal
- supplier purchase/payment
- payroll calculate/pay/close
- dashboard summaries
- Telegram read-only employee/client bot
- platform admin manual tenant provisioning

Operational hardening added:

- backup/restore scripts
- PM2 process supervision config
- post-deploy smoke script
- API readiness endpoint
- production operations docs

Phase 3 verification:

```text
API build                         PASS
Bot build                         PASS
Web build                         PASS
Backup script                     PASS
Restore into clean rehearsal DB   PASS
Telegram smoke on restored DB     PASS
MVP smoke on restored DB          PASS
Deploy smoke script               PASS
```

## Operational reasons

Safe enough for a small factory if:

- backups are scheduled
- restore is rehearsed
- PM2/Docker process supervision is owned
- smoke tests are run after deploy
- secrets are managed outside git
- alerts are configured

Not safe for broad production if:

- no one owns backups
- no monitoring exists
- deployments are made without smoke tests
- secrets are copied casually

## Business reasons

Mobile, FaceID, and IoT should still wait.

Reason:

- Web app covers MVP owner/manager/operator workflows.
- FaceID is not required for business correctness.
- IoT is explicitly outside V1 and would distract from StageInventory-driven
  operations.

## Conditions for GO

Before real factory data:

1. Configure daily backups.
2. Store backups off-server.
3. Rehearse restore.
4. Configure process supervisor.
5. Configure uptime/readiness alerts.
6. Run post-deploy smoke.
7. Record known limitations with the factory owner.

## Remaining limitations

- no automated backup scheduler in repo
- no cloud secret manager integration
- no centralized logging
- no automatic monitoring setup
- no supplier payment reversal
- no payroll correction after close

## Recommended next phase

```text
Additional Production Hardening
```

Focus:

- backup scheduler and restore rehearsal automation
- Uptime Kuma or equivalent setup
- production secret rotation rehearsal
- process supervisor install guide for target server
- supplier payment reversal
- payroll correction policy implementation

Mobile App v1 should start only after these operations are owned.
