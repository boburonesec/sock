# Operations Ownership v1

Date: 2026-07-02

## Named Owner Roles

These are operational roles that must be assigned to named people before a real
factory go-live.

| Area | Confirmed owner | Responsibility |
| --- | --- | --- |
| Backup | UNKNOWN - not provided in this thread | Daily backup, off-server copy, retention check |
| Restore | UNKNOWN - not provided in this thread | Restore rehearsal and emergency recovery |
| Deploy | UNKNOWN - not provided in this thread | Release deploy, migration, smoke, rollback |
| Monitoring | UNKNOWN - not provided in this thread | Uptime alerts and escalation |
| Secrets | UNKNOWN - not provided in this thread | Secret storage, rotation, access approval |
| Database | UNKNOWN - not provided in this thread | Migration discipline and data recovery support |
| Telegram | UNKNOWN - not provided in this thread | Bot token, bot process, support triage |
| Mobile Pilot | UNKNOWN - not provided in this thread | Device smoke and employee onboarding |

## Minimum Go-Live Checklist

1. Backup owner named.
2. Deploy owner named.
3. Monitoring owner named.
4. Secret owner named.
5. Off-server backup destination configured.
6. Restore rehearsal completed on target infrastructure.
7. `pnpm deploy:smoke` passes after deploy.
8. Mobile device smoke passes if mobile is included in pilot.

## Escalation

- API/Web/Bot down: Monitoring Owner contacts Deploy Owner.
- Backup failed: Backup Owner contacts Restore Owner.
- Secret leak suspected: Secret Owner rotates affected credentials.
- Data correction needed: Factory Operations Owner contacts Paypoq Engineer.

## Current Status

The required ownership model is defined, but actual owner names were not
provided during Phase 6.5. Production handoff remains incomplete until the
deployment operator fills in names, contacts, schedules, and credential custody.

## Phase 6.5 Confirmation

Confirmed owner names:

- Backup owner: UNKNOWN - not provided.
- Deploy owner: UNKNOWN - not provided.
- Monitoring owner: UNKNOWN - not provided.
- Secrets owner: UNKNOWN - not provided.
- Restore owner: UNKNOWN - not provided.

This is an operational blocker for unmanaged production, but not a code blocker.
