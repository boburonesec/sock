# Target Server Validation v1

Date: 2026-07-02

## Scope

Target production or staging server validation checklist. No server credentials
or production host were available in this local workspace. Phase 6.5 completed
local Docker-backed validation where possible and keeps PM2/reboot/server-only
checks explicit.

## Phase 6.5 Results

| Check | Result | Notes |
| --- | --- | --- |
| PM2 startup | NOT EXECUTED | PM2 not installed locally; no target server provided |
| PM2 save | NOT EXECUTED | Requires target server |
| Reboot persistence | NOT EXECUTED | Requires target server reboot |
| API startup | PASS via smoke | Smoke scripts started API locally on test ports |
| Web startup | NOT EXECUTED | No target web process; web build/Docker build passed in Phase 6 |
| Bot startup | PASS via smoke | Telegram smoke exercised bot internal API flows |
| Single bot process rule | CONFIG PASS | PM2 config sets `paypoq-bot` `instances: 1` |
| Backup scheduler | NOT EXECUTED | Requires target server cron/system scheduler |
| `deploy:smoke` | PASS | Ran Telegram, MVP, and employee self-service smoke |
| Restore rehearsal | PASS locally | Restored backup into `paypoq_os_restore_acceptance` |

## Still Not Executed On Target Server

- PM2 reboot persistence
- backup scheduler execution
- off-server backup transfer
- deployed monitoring alert test

## Required Commands

On the target server after deployment:

```bash
pnpm prisma:migrate:deploy
pnpm deploy:smoke
pnpm smoke:mvp
pnpm smoke:telegram
pnpm smoke:employee-self-service
```

If using PM2:

```bash
pm2 status
pm2 save
pm2 startup
sudo reboot
pm2 status
```

Backup and restore rehearsal:

```bash
pnpm backup:db
bash scripts/restore-db.sh <latest-backup-file>
pnpm smoke:mvp
```

## Required Evidence

Record before go-live:

- server hostname
- deployment commit SHA
- successful smoke timestamps
- backup file path and off-server destination
- restore rehearsal timestamp
- PM2/Docker process status
- monitoring URLs

## Verdict

Local Docker-backed deploy smoke and restore rehearsal passed. Target-server
readiness is still not fully proven because PM2 startup/save/reboot,
backup scheduler, off-server copy, and deployed monitoring require the real
server.
