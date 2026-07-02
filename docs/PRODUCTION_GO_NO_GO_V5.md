# Production GO / NO-GO v5

Date: 2026-07-02

## Verdict Summary

| Deployment target | Verdict |
| --- | --- |
| Controlled Pilot | GO WITH LIMITATIONS |
| Small Factory | GO WITH LIMITATIONS |
| Multi-Factory SaaS | NO-GO |

## Controlled Pilot

```text
GO WITH LIMITATIONS
```

Why:

- DB-backed deploy smoke passes locally against Docker Postgres.
- Telegram, MVP, RBAC, Factory TV token protection, and employee self-service
  smoke pass.
- Backup and restore mechanics are proven locally using a disposable restore DB.

Limitations:

- no real target server PM2/reboot validation
- no off-server backup destination verified
- owner names unknown
- no real mobile device smoke

## Small Factory

```text
GO WITH LIMITATIONS
```

The system can support a real small factory only if the factory accepts the
operational limitations and closes them before unmanaged go-live.

Required before daily production reliance:

1. Name backup, deploy, monitoring, secrets, and restore owners.
2. Configure off-server backup copy.
3. Configure backup scheduler.
4. Run restore rehearsal on the real target server.
5. Verify PM2 or Docker process restart behavior after reboot.
6. Run mobile device smoke if mobile is part of the pilot.

## Multi-Factory SaaS

```text
NO-GO
```

Reasons:

- no platform admin MFA
- no centralized production observability
- no automated off-server backup integration
- process-local auth rate limiting only
- mobile real-device validation incomplete
- operations ownership still unknown

## Push Notification Readiness

Push Notifications are the correct next product phase only after the operational
acceptance items above are closed for the pilot environment. The architecture
can support push without rewrite, but production operations should not be
skipped.

## FaceID Decision

FaceID remains correctly deferred. It should be local mobile unlock only when
needed and does not require backend rewrite.

## IoT Decision

IoT remains correctly deferred. It will require device/event/reconciliation
design later, but the current modular monolith does not need a rewrite for it.

## Final Decision

Paypoq OS is technically deployable for a controlled pilot today. It is not yet
operationally closed for unattended small-factory production because ownership,
off-server backups, target-server persistence, and mobile-device smoke are still
unconfirmed.

