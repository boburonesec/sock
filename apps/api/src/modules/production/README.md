# Production module

Read endpoints:

- `GET /production/stage-inventory`
- `GET /production/recent-movements`
- `GET /production/worker-activities`
- `GET /production/defects`
- `GET /production/operations-summary`

Write endpoints:

- `POST /production/batches`
- `POST /production/stage-movements`
- `POST /production/worker-activities`
- `POST /production/defects`

Read endpoints require authenticated request context and production read
permission. Production write endpoints require `production.write`.

`/production/operations-summary` is a backend-calculated dashboard projection.
It includes all active production stages, sums `StageInventory` by stage, and
uses the last seven Tashkent calendar days of `WorkerActivity` for today’s
production, active-worker, top-worker, and trend values. It returns zero-valued
stage and trend entries when production transactions do not exist.

Bottleneck thresholds are a temporary v1 backend rule: `HIGH` at 1,000 pieces
or more and `MEDIUM` at 500 pieces or more. They must become configurable once
an approved settings policy exists.

Recent history endpoints return at most 50 records, newest first. With the
baseline development seed, every endpoint returns an empty `data` array because
the seed intentionally creates no production transactions.

Batch creation is the first production write slice. It creates a
`ProductionBatch`, increases current `StageInventory` for the first active
production stage, records an immutable `StageMovement`, and writes audit logs in
one database transaction. The current schema requires `sourceStageId`, so initial
batch intake is recorded as first-stage to first-stage movement. No warehouse
stock, payroll, worker activity, defect, or sales data is created in this flow.

Stage movement is the second production write slice. It validates the source and
destination stages in the active factory, verifies that source `StageInventory`
has enough quantity, decrements source inventory, increments destination
inventory, records immutable `StageMovement`, and writes inventory/movement audit
logs in one database transaction. It does not create warehouse stock, payroll,
worker activity, defect, or sales data.

Worker activity is the third production write slice. It validates an active
employee in the active factory, validates the stage and product variant, finds
the active `SalaryRate` for stage/product first and stage-level fallback second,
then stores the selected rate amount as an immutable `WorkerActivity` snapshot.
If no active salary rate exists, the endpoint returns a safe conflict instead of
guessing a rate. This flow does not mutate `StageInventory`, calculate payroll,
create `PayrollItem`, create defect records, or create warehouse/sales data.

Defect creation records an immutable production defect with optional employee,
stage, and product variant context. It validates every provided reference within
the current tenant and active factory, writes a `DEFECT_CREATED` audit log in the
same transaction, and does not mutate `StageInventory`, create penalties,
calculate payroll, or create warehouse/sales records in v1.
