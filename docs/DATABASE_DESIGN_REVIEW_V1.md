# Paypoq OS — Database Design Review v1

Status: Review / implementation guidance  
Scope: Documentation only; this is not a Prisma schema, migration plan, or API
contract.  
Sources: `docs/DOMAIN_MODEL_V1.md`, Product Specification v1.0, and Codex
Master Context v1.

## 1. Review conclusion

Paypoq OS should use a relational modular-monolith database design. The model
has three deliberately different data shapes:

1. **Master data and configuration** — small, editable, tenant-scoped records
   such as product attributes, stages, rates, and thresholds.
2. **Immutable transactions and audit history** — append-oriented operational
   facts such as movements, activities, payments, approvals, and audit logs.
3. **Current snapshots and calculated projections** — fast current-state
   records such as StageInventory and Stock, plus read-only debt and payroll
   results.

This split preserves factory-operational speed without treating batches or
historical movements as the primary reporting unit. In particular,
**StageInventory is the primary production reporting unit**; ProductionBatch
remains traceability data.

## 2. Classification legend

| Classification | Meaning |
| --- | --- |
| Master Data | Stable business reference data used by transactions. |
| Configuration | Tenant/factory-controlled behaviour or threshold. |
| Transaction | A business event that should be retained as a record. |
| Snapshot | Persisted current state, updated from valid transactions. |
| Projection | Read-only calculated view or materialized read model. |
| Audit | Append-only accountability record. |
| Future Scope | Explicitly outside V1 implementation. |

### Review conventions

- **Table?** means the recommended database representation, not an immediate
  schema instruction.
- **Calculated?** distinguishes derived values from manually editable fields.
- **History** means historical values must remain reviewable after later master
  data changes.
- **Soft delete** normally means an `active`/archived state rather than physical
  removal. It is not a substitute for immutable transaction history.
- **Tenant scope** assumes every tenant-owned table has a tenant boundary. A
  factory identifier is also required when the record is operationally tied to
  a factory.
- Proposed indexes are candidate indexes; final index selection must be checked
  against actual query plans and production data volume.

## 3. Cross-cutting database rules

### 3.1 Tenant and factory isolation

- Every tenant-owned record must be constrained and queried by `tenant_id`.
- Factory-operational records must additionally retain `factory_id`.
- Foreign-key paths must not permit a record to point across tenants.
- Tenant filtering must be enforced in the backend repository/service boundary,
  not trusted to the frontend.
- Combined-factory reporting is a scoped aggregate over factories the user may
  access; it is not an unscoped tenant query.

### 3.2 Historical snapshots

Transactions must preserve the facts that were true at the time of the event.
Examples include the stage rate used for WorkerActivity and the unit price used
for OrderItem. Historical facts must not be recomputed from current catalogue
or rate records.

### 3.3 Deletion policy

- Master data that has been referenced should be archived/inactivated, not
  deleted.
- Employees are never hard-deleted.
- Financial and operational transactions, snapshots with a transaction trail,
  payroll, and audit records should never be deleted in normal workflows.
- Corrections should be represented by a new corrective/reversal record with a
  reason, rather than overwriting history.

### 3.4 Numeric and time handling

- Quantity, money, and rates require exact decimal storage; floating-point
  values are not appropriate for financial or piece-count calculations.
- Operational event times must be stored consistently and displayed in the
  factory/user timezone.

## 4. Entity review

### 4.1 Core domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tenant | Master Data | Represents the customer company and isolation boundary. | Yes; not calculated. | History required; no normal delete. | Very low. | Unique tenant key/slug if introduced; active lookup. | Root owner of all tenant data. |
| Factory | Master Data | Represents a tenant’s physical factory and operational context. | Yes; not calculated. | History required; archive rather than delete after use. | Low. | `(tenant_id, active)`; unique name/key within tenant if defined. | Must belong to the same tenant as every linked operational record. |
| Warehouse | Master Data | Represents a stock-holding location; default is Main Warehouse. | Yes; not calculated. | History required; archive after use. | Low. | `(tenant_id, factory_id, active)`. | Belongs to tenant and factory; model supports multiple warehouses. |
| WarehouseZone | Master Data | Separates finished goods, raw materials, packaging, labels, and defects. | Yes; not calculated. | History required; archive after use. | Low. | `(tenant_id, warehouse_id, active)`; unique zone name/code per warehouse if defined. | Must belong to a warehouse in the same tenant. |

### 4.2 Identity domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| User | Master Data | Identifies the application actor responsible for work and audit. | Yes; not calculated. | History required; deactivate rather than erase referenced users. | Low to medium. | `(tenant_id, active)`; unique tenant-scoped login identity if applicable. | A user’s tenant membership must be explicit and enforced. |
| Role | Configuration | Groups permitted capabilities for a tenant. | Yes; not calculated. | History required; archive custom roles after use. | Very low. | `(tenant_id, active)`; unique role name per tenant. | Tenant-scoped roles; platform defaults may be seeded. |
| Permission | Configuration | Defines an individual capability that roles receive. | Yes, normally a small seeded reference table; not calculated. | Retain identifiers; do not delete permissions used by roles. | Very low. | Unique permission key. | Permissions are platform-defined; role assignment is tenant-scoped. |

**Supporting relations, not standalone domain concepts:** user-to-role and
role-to-permission relations need relational tables when RBAC is implemented.
They require tenant-consistent foreign keys and should be auditable when access
changes matter.

### 4.3 Product domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product | Master Data | Stable product model in the catalogue. | Yes; not calculated. | Archive/inactivate after use; preserve referenced history. | Low to medium. | `(tenant_id, active)`; unique model code/name per tenant if defined. | Tenant-owned catalogue data. |
| ProductVariant | Master Data | Stockable, producible combination of product, color, material, and season. | Yes; not calculated. | Archive/inactivate after use. | Medium. | Unique `(tenant_id, product_id, color_id, material_id, season_id)`; product lookup. | All referenced attributes must be in the same tenant. |
| Color | Master Data | Product variant attribute. | Yes; not calculated. | Archive/inactivate after use. | Low. | Unique `(tenant_id, normalized_name_or_code)`. | Tenant-scoped. |
| Material | Master Data | Shared product attribute and stockable raw material reference. | Yes; not calculated. | Archive/inactivate after use. | Low to medium. | Unique `(tenant_id, normalized_name_or_code)`; active lookup. | One tenant-owned concept used by product and warehouse domains; do not duplicate it. |
| Season | Master Data | Product variant attribute. | Yes; not calculated. | Archive/inactivate after use. | Very low. | Unique `(tenant_id, normalized_name_or_code)`. | Tenant-scoped. |
| ProductPrice | Master Data / Snapshot | Records effective product or variant prices while retaining price history. | Yes; effective price is selected/calculated by date/context, not manually derived. | Immutable/effective-dated history; never overwrite a used price. | Medium over time. | `(tenant_id, product_variant_id, effective_from)`; active/current-price lookup. | Tenant-owned; linked product/variant must match tenant. |

### 4.4 Production domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stage | Configuration | Defines factory production flow and order. | Yes; not calculated. | Archive/inactivate instead of deletion; preserve historical stage labels. | Very low. | `(tenant_id, factory_id, active, sort_order)`; unique stage code/name per factory if defined. | Factory-scoped configuration within tenant. |
| StageInventory | Snapshot | Holds current ProductVariant quantity at each stage; primary production reporting unit. | Yes; current quantity is updated from valid production transactions, never manually calculated in UI. | Current snapshot plus movement history; do not delete active balances. | Medium: one row per active factory/stage/variant combination. | **Unique** `(tenant_id, factory_id, stage_id, product_variant_id)`; stage dashboard `(tenant_id, factory_id, stage_id)`. | Must include tenant and factory. Composite uniqueness prevents duplicate balances. |
| ProductionBatch | Transaction | Provides production intake traceability and audit grouping. | Yes; not calculated. | Immutable after creation except controlled metadata correction; no deletion. | Medium. | `(tenant_id, factory_id, created_at)`; product variant and batch-reference lookup. | Tenant and factory-scoped; optional links from movements preserve traceability. |
| StageMovement | Transaction / Audit | Records an auditable quantity transfer between stages. | Yes; not calculated. | Immutable; corrections are new movements, not edits/deletes. | High and append-oriented. | `(tenant_id, factory_id, occurred_at)`; source-stage and destination-stage date indexes; `(production_batch_id)` where used. | Tenant/factory required; source and destination stages must belong to the same factory. |
| WorkerActivity | Transaction | Records piece-based employee work entered by a Shift Receiver. | Yes; payroll input is calculated from it, but the activity fact is not calculated. | Immutable after payroll finalization; use controlled correction/reversal before then. | High and append-oriented. | `(tenant_id, factory_id, employee_id, activity_date)`; payroll-period lookup; `(stage_id, activity_date)`. | Employee, stage, product context, and entering user must share tenant/factory context. |
| Defect | Transaction / Audit | Records a rare defect and its production context. | Yes; not calculated. | Immutable; correction by linked follow-up record, not deletion. | Low to medium. | `(tenant_id, factory_id, detected_at)`; stage/date and employee/date lookups. | Tenant/factory required; no cross-factory employee or stage reference. |

### 4.5 Employee and payroll domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Employee | Master Data | Represents a factory employee and employment status. | Yes; not calculated. | **Soft delete/inactive required**; never hard-delete. | Low to medium. | `(tenant_id, factory_id, status)`; active employee lookup; searchable name/employee code where defined. | Tenant/factory scoped; records can retain historical factory context. |
| SalaryRate | Configuration | Defines a piece-based salary rate for applicable work. | Yes; effective rate is selected by business rules; frontend does not calculate it. | Effective-dated historical records; archive/supersede, do not overwrite used rates. | Medium over time. | `(tenant_id, factory_id, stage_id, effective_from)`; applicable-rate lookup. | Rate applicability must be restricted to same tenant/factory. |
| EmployeeAdjustment | Transaction | Stores Bonus, Penalty, or Advance affecting payroll. | Yes; not calculated. | Immutable after approval/payroll finalization; reversals as new records. | Medium. | `(tenant_id, factory_id, employee_id, effective_date)`; type/status lookup. | Tenant/factory and employee scoped. |
| Payroll | Projection / Snapshot | Stores backend-calculated payroll result for an employee and period. | Yes; generated/calculated in backend, not by frontend. | Historical result required; finalized/paid payroll should not be deleted or silently recalculated. | Medium: employees × periods. | **Unique** `(tenant_id, factory_id, employee_id, payroll_period)`; period/status lookup. | Tenant/factory scoped. Combined reporting aggregates authorized factories. |
| PayrollItem | Snapshot / Audit | Explains inputs and outcomes behind a Payroll result. | Yes; derived during payroll calculation and stored as an explanatory snapshot. | Immutable once payroll is finalized; no normal delete. | High relative to Payroll. | `(payroll_id)`; `(tenant_id, factory_id, payroll_id)` if tenant filter is repeated. | Must inherit and validate Payroll tenant/factory context. |

### 4.6 Warehouse domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stock | Snapshot | Holds current finished-product quantity by product variant and zone. | Yes; updated from stock movements, not calculated by frontend. | Current snapshot with immutable movement history; do not delete positive/active balances. | Medium: warehouse zones × variants. | **Unique** `(tenant_id, warehouse_id, zone_id, product_variant_id)`; variant/warehouse lookup. | Warehouse, zone, and variant must belong to the same tenant; factory follows warehouse. |
| StockMovement | Transaction / Audit | Records every finished-product or material stock event. | Yes; not calculated. | Immutable; corrections/reversals are new events with reasons. | High and append-oriented. | `(tenant_id, factory_id, occurred_at)`; item/date, warehouse/zone/date, movement-type/date indexes. | Tenant/factory required; source and destination contexts must be tenant-valid. |
| MaterialStock | Snapshot | Holds current Material quantity by zone and unit context. | Yes; updated from stock movements, not manually calculated. | Current snapshot with immutable movement history; no normal deletion. | Medium: zones × materials. | **Unique** `(tenant_id, warehouse_id, zone_id, material_id)`; material/warehouse lookup. | Material, warehouse, and zone must be in same tenant. |
| MaterialThreshold | Configuration | Defines configurable low-stock limits. | Yes; low-stock state is calculated from stock and threshold. | Historical changes may be audited; archive/supersede rather than delete used configuration. | Low to medium. | Unique `(tenant_id, material_id, warehouse_id, zone_id)` at the chosen scope. | Tenant-scoped; scope must not cross warehouse/factory boundaries. |

### 4.7 Sales domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Client | Master Data | Represents a buyer and relationship context. | Yes; not calculated. | Archive/inactivate after use; retain order/payment history. | Low to medium. | `(tenant_id, factory_id, active)`; seller lookup; normalized phone lookup if used. | Tenant/factory scoped; seller assignment must be tenant-valid. |
| Order | Transaction | Captures a client order and lifecycle. | Yes; order amounts are stored/frozen transaction facts, not recalculated from current prices. | Historical record; cancelled order remains; no normal delete. | Medium to high. | `(tenant_id, factory_id, status, deadline)`; client/date; seller/date; unique order number per tenant/factory as defined. | Tenant/factory/client/seller references must align. |
| OrderItem | Transaction / Snapshot | Captures each requested ProductVariant with frozen commercial values. | Yes; total can be validated/calculated in backend from frozen unit price and quantity, then stored for history. | Immutable after order confirmation; corrections via controlled order revision, not destructive edit. | High relative to Order. | `(order_id)`; `(tenant_id, product_variant_id)` for reporting if needed. | Inherits Order tenant/factory; product variant must match tenant. |
| Payment | Transaction | Records money received from a client separately from orders. | Yes; not calculated. | Immutable; reverse/correct with a new transaction. | Medium to high. | `(tenant_id, factory_id, client_id, payment_date)`; recorder/date; payment reference if introduced. | Tenant/factory/client must align. |
| ClientDebt | Projection | Provides current client debt for dashboard and collection workflows. | No canonical editable table. Start as backend-calculated query/projection; materialize only after measured need. | Source transactions provide history; optional materialization is rebuildable. | One current result per client/factory, but reads can be frequent. | On sources: confirmed order client/status/date and payment client/date; materialized form unique `(tenant_id, factory_id, client_id)`. | Always tenant/factory scoped; never expose cross-tenant aggregate. |

**Required design follow-up before schema work:** Payment-to-Order allocation is
required by the Product Specification because one payment may be distributed
across multiple orders. A dedicated allocation relation is likely necessary,
but its exact entity name, correction policy, and partial-payment rules must be
approved before implementation. It is intentionally not invented in this
review.

### 4.8 Supplier domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Supplier | Master Data | Represents a material or supply provider. | Yes; not calculated. | Archive/inactivate after use; retain commercial history. | Low to medium. | `(tenant_id, factory_id, active)`; normalized name/phone lookup as needed. | Tenant/factory scoped. |
| Purchase | Transaction | Records supplier purchases contributing to supplier balance. | Yes; amount is a historical transaction fact, not a live calculation. | Immutable; correction/reversal is a new record. | Medium. | `(tenant_id, factory_id, supplier_id, purchase_date)`; material/date lookup where applicable. | Supplier, factory, and material references must be tenant-valid. |
| SupplierPayment | Transaction | Records payment made to a supplier separately from purchase. | Yes; not calculated. | Immutable; correction/reversal via new transaction. | Medium. | `(tenant_id, factory_id, supplier_id, payment_date)`. | Tenant/factory/supplier scoped. |
| SupplierDebt | Projection | Provides current supplier debt for finance visibility. | No canonical editable table. Start as backend-calculated query/projection; materialize only after measured need. | Source purchases and payments preserve history; optional materialization is rebuildable. | One current result per supplier/factory. | On sources: purchase supplier/date and supplier-payment supplier/date; materialized form unique `(tenant_id, factory_id, supplier_id)`. | Tenant/factory scoped; never manually edited. |

**Required design follow-up before schema work:** If a supplier payment can be
allocated across purchases, the allocation and partial-payment policy must be
defined alongside the sales-payment allocation policy. This is a genuine domain
decision, not a detail that should be guessed in a schema.

### 4.9 Finance domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Expense | Transaction | Records an operational expense request and payment state. | Yes; not calculated. | Immutable after approval/payment; corrections as new/reversing records. | Medium. | `(tenant_id, factory_id, status, request_date)`; category/date; requester/date. | Requester, approver, category, and factory must share tenant context. |
| ExpenseCategory | Configuration | Classifies expenses with tenant-defined categories. | Yes; not calculated. | Archive/inactivate after use. | Low. | Unique `(tenant_id, normalized_name_or_code)`. | Tenant-scoped master data. |
| ExpenseApproval | Transaction / Audit | Records manager approval or rejection of an expense. | Yes; decision is not calculated. | Immutable decision history; no delete. | Medium. | `(tenant_id, expense_id, decided_at)`; approver/date. | Expense and approver must share tenant/factory authorization context. |

### 4.10 Notification domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Notification | Transaction | Represents a generated operational alert for a user or role. | Yes when notification delivery/inbox is implemented; generation condition is calculated from source data. | Retain delivery/read status for a defined retention period; do not soft-delete as a workflow substitute. | Potentially high. | `(tenant_id, recipient_user_id, read_at, created_at)`; type/status/date. | Recipient and related factory must be tenant-valid. |
| TelegramNotification | Transaction | Represents Telegram delivery or read-only summary delivery. | Prefer a channel/delivery table linked to Notification when Telegram integration begins; no V1 table needed before then. | Retain delivery attempts/status for support and audit; no normal mutation of sent payload history. | Future medium to high. | `(tenant_id, employee_id, created_at)`; external delivery reference if introduced. | Must enforce employee-to-Telegram linkage and own-data-only access. |
| NotificationRule | Configuration | Defines a configured condition and audience for future alerts. | Table only for explicitly configured rules; avoid building a generic workflow/rules engine. | Audit configuration changes; archive/inactivate rules. | Low. | `(tenant_id, active, rule_type)`. | Tenant/factory scope must be explicit. |

### 4.11 Audit domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AuditLog | Audit | Preserves accountability for important operational and financial changes. | Yes; append-only and not calculated. | **Immutable; never delete in normal workflows.** | High and append-oriented. | `(tenant_id, factory_id, created_at)`; `(tenant_id, entity_type, entity_id, created_at)`; actor/date. | Tenant is mandatory; factory retained where applicable. Audit access itself must be permission-scoped. |

### 4.12 Future IoT domain

| Entity | Class | Why it exists | Table? / calculated? | History / soft delete | Expected growth | Important indexes | Tenant implications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Machine | Future Scope / Master Data | Identifies a production device. | Future table only; not V1. | Archive, do not erase referenced history. | Low. | `(tenant_id, factory_id, active)`; unique machine code per factory if defined. | Tenant/factory scoped. |
| MachineTelemetry | Future Scope / Transaction | Captures time-stamped device data. | Future append-only table only; not V1. | Immutable, retention/partition policy required before adoption. | Very high. | `(tenant_id, machine_id, occurred_at)`; likely time partitioning after measured volume. | Machine must be in same tenant/factory. |
| MachineRuntime | Future Scope / Projection | Summarizes machine state and operating time. | Future calculated projection; not V1. | Derived from telemetry/history. | Medium. | `(tenant_id, machine_id, observed_at)`. | Tenant/factory scoped. |
| MachineProductionCounter | Future Scope / Transaction | Captures machine-reported production count. | Future table only; not V1. | Immutable source event; manual confirmation policy required. | High. | `(tenant_id, machine_id, occurred_at)`; idempotency/source-event key if provided. | Tenant/factory scoped; must remain distinguishable from manual data. |

## 5. Special attention review

### 5.1 Production: authoritative current state and immutable history

`StageInventory` should be a real snapshot table, not a query that sums all
movements on every dashboard request. Factory users need immediate, reliable
stage visibility; a direct current-state row per stage and product variant
supports that need.

`StageMovement` is the durable explanation for every snapshot change. Creation
of a movement and update of affected StageInventory rows must be one backend
database transaction. The backend must prevent negative source quantities under
concurrent submissions. This needs an explicit concurrency strategy during
implementation (for example, row-level locking or an equivalent guarded update)
but not a distributed lock or event-sourcing architecture.

`ProductionBatch` is a real traceability table. It should not be used as the
dashboard aggregation dimension, because a factory’s present bottleneck is the
quantity in each StageInventory, regardless of batch grouping.

`WorkerActivity` and `Defect` are append-oriented facts. A later rate change or
manager decision must not mutate their original recorded context. Defect-to-
penalty linkage remains an explicit manager decision, not an automatic trigger.

### 5.2 Warehouse: snapshot plus movement ledger

`Stock` and `MaterialStock` should be real current-state tables. `StockMovement`
is the append-only history that explains their changes. The movement transaction
must atomically update the appropriate snapshot and save the responsible user,
reason, and before/after context for corrections.

Using a single universal stock table for both finished products and materials
would reduce table count but weakens type safety and unit handling. Separate
`Stock` and `MaterialStock` snapshots are the clearer V1 choice because their
business identities differ. `StockMovement` can still represent both item types
through a deliberately constrained item-type design when implementation begins.

### 5.3 Sales and supplier debt: projections, not editable balances

`ClientDebt` and `SupplierDebt` must be read-only projections. The initial
implementation should calculate them in backend queries from their source
transactions, using suitable source indexes. A materialized projection table is
appropriate only if measured dashboard/report latency shows the query is too
slow. If materialized later, it is rebuildable and must never become a manually
edited source of truth.

The only unresolved modelling dependency is payment allocation: the product
requires one client payment to apply to multiple orders. Schema work must wait
for explicit allocation and correction rules. The same decision likely applies
to supplier payments and purchases.

### 5.4 Payroll: calculated result with preserved explanation

Payroll needs both a calculated result (`Payroll`) and preserved explanation
(`PayrollItem`). Its calculation belongs in the backend and must use historical
WorkerActivity rates and EmployeeAdjustment facts. Once a payroll period is
finalized or paid, destructive change is unsafe; any post-finalization fix needs
an explicit correction/recalculation policy before it is implemented.

### 5.5 Audit: append-only from the first business transaction

AuditLog should be introduced alongside the first write-capable business module,
not retrofitted much later. It is high-growth data, so date and entity lookup
indexes are essential. Retention, redaction, and partitioning are operational
policies to decide when real volume requires them; they should not block V1.

## 6. Direct answers to the key questions

### Which entities become real tables?

All master data, configuration, transactions, snapshots, payroll records, and
AuditLog should become real tables when their module is implemented. The main
exceptions are `ClientDebt`, `SupplierDebt`, and future `MachineRuntime`, which
are projections rather than canonical editable tables. `TelegramNotification`
and the IoT entities remain outside V1.

### Which entities become calculated projections?

- ClientDebt
- SupplierDebt
- Payroll (calculated in backend, then stored as a historical result)
- PayrollItem (derived explanatory snapshot stored with Payroll)
- Current low-stock state from MaterialStock + MaterialThreshold
- Future MachineRuntime

### Which entities become snapshots?

- StageInventory
- Stock
- MaterialStock
- ProductPrice, SalaryRate, and OrderItem preserve historical/effective values
  in different ways; they are not current-balance snapshots.

### Which require immutable history?

- StageMovement, WorkerActivity, Defect, ProductionBatch
- StockMovement
- Purchase, SupplierPayment, Payment, Order/OrderItem after confirmation
- EmployeeAdjustment, Payroll/PayrollItem after finalization, ExpenseApproval
- AuditLog
- Effective-dated ProductPrice and SalaryRate records

### Which require soft delete or archival?

- Employee: inactive status is mandatory; never hard-delete.
- Referenced master/configuration data: Product, ProductVariant, Color,
  Material, Season, Stage, Warehouse, WarehouseZone, Client, Supplier,
  ExpenseCategory, Role, and NotificationRule.
- User should be deactivated when no longer active, not removed from history.

### Which should never be deleted in normal operations?

- AuditLog
- Payroll and finalized PayrollItem
- ProductionBatch, StageMovement, WorkerActivity, Defect
- StockMovement
- Orders, OrderItems, Payments, Purchases, SupplierPayments
- ExpenseApproval and finalized Expense records

## 7. Senior Engineering Review

### Implemented review outcome

This document recommends a simple relational modular-monolith model with
explicit current snapshots and immutable operational transactions. It does not
recommend microservices, event sourcing, a generic rules engine, Kafka, or a
separate reporting database for V1.

### Risks and edge cases noticed

1. **Payment allocation is underspecified.** The product requires payments that
   can span orders, but allocation, partial-payment, cancellation, and
   correction rules are not approved. Implementing debt tables before resolving
   this can create incorrect balances.
2. **Concurrent stock/stage movements can overspend a balance.** Without an
   atomic backend transaction and concurrency guard, two Shift Receivers could
   move the same quantity simultaneously and create negative inventory.
3. **Payroll finalization needs a correction policy.** Recomputing a paid
   payroll after its inputs change would make financial history unreliable.
4. **Multi-tenant joins are a security risk.** Tenant identifiers alone are not
   sufficient if foreign keys and repository queries do not validate the same
   tenant/factory context.
5. **High-growth logs need measured operational review.** Movements and audit
   logs can become large, but early partitioning would be premature without
   real volume data.

### Suggestions / alternatives (advisory only)

1. Approve a short payment-allocation decision before the Sales and Supplier
   schema tasks begin.
2. Implement production and warehouse writes in small vertical slices: one
   transaction table plus its current snapshot and audit entry at a time.
3. Add projection materialization for debt only after query measurements justify
   it; start with indexed backend calculations.
4. Split future schema work into: (a) tenant/identity/master data, (b)
   production/warehouse, (c) sales/supplier payment allocation, and (d)
   finance/payroll/audit. This keeps the first migration reviewable and avoids
   a fragile all-at-once schema.

### Trade-offs

- Persisted current snapshots make dashboards fast and operator-friendly but
  require atomic write handling. Summing all transaction history would be
  simpler to write initially but too slow and fragile for the core factory view.
- Debt as a query projection avoids duplicated truth, while a materialized debt
  table can improve read performance later at the cost of synchronization.
- Separate finished-product and material stock snapshots add a small amount of
  schema surface but prevent ambiguous item/unit handling in V1.

No advisory suggestion in this review authorizes implementation by itself.
