# Paypoq OS — Prisma Schema Review v1

Status: Review before first migration  
Scope: Review only. No schema, migration, seed, API, or frontend changes are
authorized by this document.  
Reviewed sources: `apps/api/prisma/schema.prisma`, Domain Model v1, Database
Design Review v1, and Codex Master Context v1.

## Review outcome

The current schema is a sound V1 modular-monolith foundation. It models the
approved domains without introducing a generic ERP, event sourcing, workflow
engine, ledger, or separate reporting database.

`prisma validate` succeeds. No technical schema defect currently blocks a first
development migration. Several business rules are intentionally left to future
transactional services; this is appropriate for a schema-only phase, but those
rules must be implemented before the associated write endpoints are enabled.

## Approved parts

### 1. Tenant isolation

Approved.

- Every tenant-owned model has `tenantId`.
- Platform-defined `Permission` is the approved exception: it has no
  `tenantId`, while `RolePermission` remains tenant-scoped.
- Tenant-aware composite foreign keys are used where a child can otherwise
  reference another tenant's record.
- Tenant-prefixed indexes support tenant-scoped retrieval and reporting.

### 2. Factory isolation

Approved.

- Factory-operational models carry `factoryId` and relate to Factory through
  tenant-aware composite relations.
- StageInventory, WorkerActivity, Defect, stock snapshots, production events,
  payroll periods/items, and factory-linked finance records preserve factory
  context.
- Warehouse and WarehouseZone composite keys ensure that stock snapshots and
  movements cannot link a zone to an unrelated warehouse within the tenant.

### 3. Composite relations

Approved.

The schema uses composite uniqueness on parent entities to make these
cross-boundary relations safe:

- `User(id, tenantId)` for actor links.
- `Employee(id, tenantId, factoryId)` for worker and payroll links.
- `Factory(id, tenantId)` and `Warehouse(id, tenantId, factoryId)` for
  operational context.
- `WarehouseZone(id, tenantId, warehouseId)` for stock location context.
- `ProductionStage(id, tenantId, factoryId)` for stage operations.
- `PayrollPeriod(id, tenantId, factoryId)` for PayrollItem and adjustment
  scope.
- tenant-aware Product, ProductVariant, Material, Client, Supplier, Order,
  Purchase, and payment relations.

This prevents a large class of accidental cross-tenant and cross-factory
foreign-key references at the database level.

### 4. Snapshot, transaction, and projection choices

Approved.

| Concern | Decision | Review result |
| --- | --- | --- |
| Production reporting | `StageInventory` is a persisted snapshot. | Correct: batch remains traceability only. |
| Warehouse reporting | `Stock` and `MaterialStock` are persisted snapshots. | Correct. |
| Operational history | Movements, activity, defects, payments, approvals, and allocations are transaction records. | Correct. |
| Payroll | `PayrollPeriod` and per-employee `PayrollItem` are backend-calculated snapshots. | Correct; no frontend calculation. |
| Debt | ClientDebt and SupplierDebt have no canonical table. | Correct: they remain calculated projections. |
| Audit | `AuditLog` is append-only data. | Correct schema shape; write protection is still a service concern. |

### 5. Required uniqueness constraints

Approved.

| Model | Constraint | Why it matters |
| --- | --- | --- |
| StageInventory | `(tenantId, factoryId, productionStageId, productVariantId)` | One current WIP balance per stage and variant. |
| Stock | `(tenantId, warehouseId, warehouseZoneId, productVariantId)` | One current finished-product balance per location and variant. |
| MaterialStock | `(tenantId, warehouseId, warehouseZoneId, materialId)` | One current material balance per location and material. |
| PayrollPeriod | `(tenantId, factoryId, month)` | One monthly payroll aggregate per factory. |
| PayrollItem | `(tenantId, payrollPeriodId, employeeId)` | One employee result per payroll period. |
| SalesOrder | `(tenantId, orderNumber)` | Tenant-scoped commercial reference. |
| SupplierPurchase | `(tenantId, purchaseNumber)` | Tenant-scoped purchase reference. |
| Payment allocations | `(tenantId, paymentId, orderId/purchaseId)` | Prevents duplicate active allocation pairs. |

### 6. Index coverage

Approved for the V1 query shape.

- All high-volume history tables include tenant and time-oriented indexes.
- Stage, warehouse, product/material, employee, status, supplier/client, and
  payment-date lookups have tenant-prefixed indexes.
- AuditLog has the required tenant/time, entity, action, actor, and factory
  indexes.
- The current set avoids premature full-text, reporting, or partition indexes.

Actual production query plans should be reviewed after real data exists; index
expansion before measurement would be premature.

### 7. Decimal use

Approved.

- Product-piece balances and production quantities use `Int`.
- Material quantities use `Decimal(14,3)` for kg, rolls, and packages.
- Prices, payments, expenses, adjustments, and payroll amounts use
  `Decimal(14,2)`.
- No Float is used for money, rate, or quantity storage.

### 8. Nullable fields

Approved where they express a genuine domain state.

- Optional actor references support future system-originated actions.
- Optional factory references on tenant-level Expense and SupplierPurchase are
  intentional.
- Optional Defect employee/stage/product references reflect the approved model.
- Optional `ProductPrice.productVariantId` supports product defaults and
  variant overrides.
- Optional factory/user AuditLog relations support tenant-level and system
  actions.

## Issues found and recommended changes

### A. Payment allocation ownership is not fully database-enforced

`ClientPaymentAllocation` prevents cross-tenant references, but cannot ensure
the payment's client matches the order's client. `SupplierPaymentAllocation`
has the equivalent supplier/purchase limitation. Neither allocation table can
enforce that its summed allocations do not exceed the payment amount.

**Recommendation:** Implement these checks in the first payment-allocation
service inside one database transaction. Do not add a generic workflow engine
or denormalized debt table to solve this.

### B. Payment factory attribution needs an explicit reporting policy

ClientPayment and SupplierPayment are tenant-scoped, while orders/purchases can
be factory-scoped. Allocated payment factory attribution can be derived from the
related order/purchase; an unallocated payment has no factory attribution.

**Recommendation:** Before debt-reporting or payment-write endpoints, approve
one policy:

1. unallocated payments are tenant-level until allocated; or
2. add optional factory context to payment records in a later, explicit schema
   change.

The current schema follows the approved field lists and does not invent a
factory field on payments.

### C. Effective-date overlap is not database-enforced

ProductPrice and SalaryRate preserve historical rows but do not prevent
overlapping effective periods. ProductPrice also cannot enforce that an optional
variant belongs to its selected product solely through the current relations.

**Recommendation:** Validate effective ranges and product/variant ownership in
the future Product/Payroll write services. A PostgreSQL exclusion constraint is
possible later, but adding it now would add database-specific complexity before
the first price/rate workflow exists.

### D. Soft-delete names are not reusable without a policy

Referenced master data uses `deletedAt`, while current unique constraints still
cover the original names/codes. After archival, a same-name record cannot be
created; the record must be reactivated or renamed.

**Recommendation:** Adopt “reactivate existing master data” as the V1 policy,
or explicitly approve PostgreSQL partial unique indexes in a later migration.
Do not silently change uniqueness semantics now.

### E. Immutability is a business-layer guarantee

AuditLog, movements, activity, defects, payments, allocations, and finalized
payroll data have no `updatedAt`/`deletedAt` where appropriate, but Prisma
schema alone cannot prohibit an application update or delete.

**Recommendation:** Add write-only/reversal-based service rules with the first
mutation endpoints. Consider database-level guards only after operational needs
are demonstrated; they are not required to validate the first migration.

### F. String action/status fields require future validation

AuditLog action/entityType and ExpenseApproval action are strings by design to
avoid migration churn. Client and Supplier status are also strings.

**Recommendation:** Define constants and validate them in their future write
services. Do not promote every evolving string to a database enum prematurely.

## Must-fix before first migration

There is **no schema-validation blocker** requiring a schema change before the
first development migration.

Before running that migration, record these V1 decisions in the migration/PR
review so the team shares the same expectations:

1. Master data is reactivated rather than recreated when a duplicate archived
   name/code is encountered.
2. Unallocated client and supplier payments are tenant-level until allocation.
3. First write endpoints must use backend transactions for allocation limits,
   source-balance checks, status transitions, and finalized-record protection.

These are operational policies, not a reason to add unapproved models or
schema complexity now.

## Can defer until the relevant write module

- Payment allocation amount, client/supplier ownership, and correction/reversal
  validation.
- Negative stock and StageInventory prevention with row-level/guarded backend
  updates.
- ProductPrice and SalaryRate effective-date overlap validation.
- Payroll finalization and PayrollPayment remaining-amount validation.
- AuditLog write-only enforcement and sensitive-field redaction.
- Optional PostgreSQL partial unique indexes for archived master-data reuse.
- Query-plan-based index tuning, log retention, and partitioning.
- Explicit factory attribution for unallocated payments, if future reporting
  requires it.

## Cascade and delete behavior

Approved for V1.

All declared foreign keys use `onDelete: Restrict`. This is appropriate for a
factory operations platform because historical transactions must not disappear
when master data is archived. Soft deletion is used only for mutable master
data such as employees, catalogue attributes, stages, warehouses, clients,
suppliers, and categories. Transaction, snapshot, payroll, payment, and audit
records are not soft-deleted by schema design.

## Future migration risks

1. First migration creates a broad initial schema. It should be reviewed as one
   baseline migration and never applied automatically to shared/production
   databases.
2. Nullable composite relations are valid in Prisma but require backend code to
   pass a complete valid context whenever the optional related identifier is
   present.
3. Adding database check constraints, partial unique indexes, exclusion
   constraints, or append-only triggers later will require custom SQL migrations
   and should be separately approved.
4. Payment allocation and debt reporting policies must not be hidden in UI;
   they belong to backend services and documented business rules.
5. Schema changes after data exists need backward-compatible migrations and a
   data-migration review.

## Senior Engineering Review

### Implemented review outcome

The schema is ready for a first **development** migration after the listed V1
operational policies are acknowledged. No change was made because validation
passes and the open items are business/service concerns, not critical schema
defects.

### Risks and edge cases

- Allocation, stock, payroll, and status invariants cannot be solved by Prisma
  model declarations alone.
- Audit record immutability depends on future write-path discipline.
- Effective dating can produce ambiguous applicable prices/rates until validated
  in a service.
- Duplicate archival/recreation behaviour must be consistent for operators.

### Advisory alternatives

- Start with the simple relational schema and backend transactions; do not add
  event sourcing, distributed locks, or a ledger.
- Add materialized debt projections only after measured read performance
  requires them.
- Split the first implementation work after migration into vertical writes:
  production/warehouse first, then sales allocation, then finance/payroll.

No advisory item authorizes a schema or architecture change without approval.
