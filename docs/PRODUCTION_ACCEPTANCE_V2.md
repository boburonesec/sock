# Production Acceptance v2

Date: 2026-07-02

## Scope

Phase 6.5 production acceptance closure. This phase closes remaining production
blockers where local validation is possible and documents exact blockers where a
real pilot server or device is unavailable.

No new business features, Push Notifications, FaceID, IoT, Client Mobile,
architecture changes, schema changes, migrations, or new modules were added.

## Target Server Validation

Real production/pilot server access was not provided. Local Docker validation
was performed against `shared-postgres`.

| Check | Result | Evidence |
| --- | --- | --- |
| PM2 startup | NOT EXECUTED | PM2 not installed locally; no target server provided |
| PM2 save | NOT EXECUTED | Requires target server PM2 runtime |
| Reboot persistence | NOT EXECUTED | Requires target server reboot |
| API startup | PASS via smoke | Smoke scripts started API locally on test ports |
| Web startup | NOT EXECUTED | No target web process; prior Docker/web builds pass |
| Bot startup | PASS via smoke | Telegram smoke started API and exercised bot internal flows |
| Single bot process rule | CONFIG PASS | `configs/pm2.ecosystem.config.cjs` has `paypoq-bot` `instances: 1` |
| Backup scheduler | NOT EXECUTED | Cron/PM2 scheduler not installed on target server |
| `deploy:smoke` | PASS | Updated script ran Telegram, MVP, and employee self-service smoke |
| Restore rehearsal | PASS locally | Backup restored into `paypoq_os_restore_acceptance` |

## Smoke Results

```text
pnpm deploy:smoke                                  PASS
pnpm smoke:mvp                                     PASS
pnpm smoke:employee-self-service                   PASS
pnpm --filter @paypoq/mobile typecheck             PASS
pnpm --filter @paypoq/mobile lint                  PASS
node -c configs/pm2.ecosystem.config.cjs           PASS
```

Important note: DB-backed commands required host networking escalation because
the sandbox could not reach Docker Postgres on `localhost:55432` without it.

## Backup Acceptance

Backup through Docker Postgres:

```text
PASS
/private/tmp/paypoq-acceptance-backups/paypoq-acceptance-20260702T041439Z.dump
```

Restore into disposable DB:

```text
PASS
paypoq_os_restore_acceptance
```

Off-server copy:

```text
NOT VERIFIED
```

No external backup destination was provided.

## Operations Ownership

Owner names remain unknown:

- backup owner: UNKNOWN
- deploy owner: UNKNOWN
- monitoring owner: UNKNOWN
- secrets owner: UNKNOWN
- restore owner: UNKNOWN

This is the biggest remaining non-code blocker.

## Mobile Real Device Validation

Mobile build checks pass, but real-device validation was not executed:

- `adb` not installed.
- `xcrun simctl` unavailable.
- No real Android/iOS device provided.

Result:

```text
MOBILE DEVICE SMOKE NOT VERIFIED
```

## Safe Operational Improvements Applied

- `scripts/deploy-smoke.sh` now includes `pnpm smoke:employee-self-service`.
- Operations ownership documentation now explicitly marks unknown owners instead
  of leaving role placeholders.
- Backup validation documentation now records actual local backup/restore
  evidence and off-server copy gap.

## Remaining Blockers

MUST resolve before unmanaged production:

- assign named backup/deploy/monitoring/secrets/restore owners
- configure off-server backup copy
- configure backup scheduler on target server
- run PM2 startup/save/reboot persistence on target server if PM2 deployment is
  used
- run mobile real-device smoke if mobile is included in pilot

## Acceptance Verdict

The codebase and local Docker-backed operational mechanics are acceptable for a
controlled pilot. Production handoff is not complete until named owners,
off-server backups, target-server process persistence, and mobile device smoke
are confirmed.

