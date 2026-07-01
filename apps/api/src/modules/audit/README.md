# Audit module

Reserved for append-only audit records of important operational and financial
changes. Audit storage and write integration will be added incrementally.

## Current API

`AuditService.createWithTransaction(tx, input)` creates one `AuditLog` record
inside an existing Prisma transaction.

Use this helper from explicit write flows only. The module intentionally does
not provide automatic interceptors, workflow orchestration, event sourcing, or
global side effects.
