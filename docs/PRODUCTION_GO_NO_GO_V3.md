# Production GO / NO-GO v3

## Question

Can Paypoq OS operate in a real factory without:

- Mobile
- FaceID
- IoT

## Verdict

```text
GO
```

This GO is for a first real factory deployment with documented limitations and
named operational ownership.

It is not a claim that Paypoq OS is an enterprise SaaS platform with fully
automated operations.

## Technical justification

Ready:

- API build
- Web build
- Bot build
- MVP smoke
- Telegram smoke
- deploy smoke
- Docker image verification from Phase 2
- PM2 config
- backup/restore scripts
- API readiness endpoint

Core business flows are smoke-tested:

- product/variant/price setup
- employee/salary rate
- production batch/stage move/activity/defect
- warehouse receipt/correction
- sales order/payment/delivery/return/payment reversal
- supplier purchase/payment
- payroll calculate/pay/close
- dashboards

## Operational justification

Ready if the target server has:

- PM2 configured and saved for reboot
- daily backups scheduled
- backups copied off-server
- Uptime Kuma or equivalent checks configured
- secrets stored outside git
- deploy smoke run after updates

## Business justification

Mobile, FaceID, and IoT are not required for the current product promise.

Current business value is:

- owner/manager visibility
- production stage inventory
- worker activity and payroll
- warehouse stock
- sales/client debt
- supplier debt
- operational dashboards

The web app and Telegram read-only bot cover the first real factory use case.

## Limitations accepted

- no mobile app
- no FaceID
- no IoT
- no full accounting ledger
- no supplier payment reversal
- no payroll correction after close
- no automated cloud backup integration
- no enterprise monitoring stack

## Required production conditions

The GO is valid only if:

1. A named operator owns backups.
2. A named operator owns deploys.
3. A named operator owns secrets.
4. A named operator owns monitoring alerts.
5. Backup cron is configured.
6. Off-server backup storage is configured.
7. Restore procedure is known.
8. `pnpm deploy:smoke` passes after deployment.

If these are not true, verdict becomes:

```text
GO WITH LIMITATIONS
```

## Recommended next phase

```text
Mobile App v1
```

Reason:

- The remaining production hardening items are now operational setup tasks, not
  major product engineering blockers.
- Mobile can start if production ownership is assigned.
- Do not start FaceID or IoT yet.

Mobile v1 should stay narrow:

- manager/operator mobile views
- employee self-service later
- reuse existing API
- no new business calculations in mobile
