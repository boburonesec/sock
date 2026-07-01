# Paypoq OS — Domain Model v1

Status: Approved  
Source of truth: Product Specification v1.0 and Codex Master Context v1

## Purpose and modelling principles

Paypoq OS is a Manufacturing Operations Platform for sock factories. It is not
a generic ERP, a full accounting product, or an IoT platform in V1.

This document defines the domain boundaries and concepts that the backend will
model. It is intentionally implementation-neutral: it is not a Prisma schema,
API contract, database design, or workflow-engine specification.

Every operational record belongs to a tenant and, where operationally relevant,
to a factory. Historical records retain the product, rate, price, factory, and
other context that applied when the record was created.

## 1. Core Domain

### Tenant

`Tenant` represents one customer company using Paypoq OS. It owns its factories,
users, catalogue, employees, warehouses, commercial data, and finance data.

- Tenant isolation is mandatory; cross-tenant reads and writes are prohibited.
- A tenant can own one or more factories.

### Factory

`Factory` represents a physical factory operated by a tenant.

- A factory belongs to exactly one tenant.
- Production, warehouse, employee activity, sales, and finance records are
  associated with their factory context where applicable.
- A user may work in one factory or, with permission, view a combined factory
  context. Changing current factory does not rewrite historical records.

### Warehouse

`Warehouse` represents a stock-holding location belonging to a factory.

- Every factory starts with one default **Main Warehouse** in the MVP.
- The domain must support multiple warehouses for a factory, even though the MVP
  workflow is optimized for one.

### WarehouseZone

`WarehouseZone` represents a logical zone inside a warehouse, for example
finished products, raw materials, packaging, labels, or defects.

- A zone belongs to one warehouse.
- Product and material stock is tracked in a warehouse-zone context.

## 2. Identity Domain

### User

`User` is an application user who performs or records operational work.

- Users include Owner, Manager, Shift Receiver, Warehouse Worker, Seller, and
  Accountant roles.
- Production worker activity is entered by a Shift Receiver; factory workers do
  not use the web application directly.
- Important operational actions retain the responsible user for auditability.

### Role

`Role` groups permissions that determine a user's allowed actions and views.

- Roles are tenant-scoped master data.
- Default roles follow the Product Specification, but the model supports
  configured role assignments.

### Permission

`Permission` represents a specific allowed capability within the platform.

- Roles are assigned permissions; users receive access through role assignment.
- RBAC implementation is separate from this domain definition.

## 3. Product Domain

### Product

`Product` represents a sock product model in a tenant's catalogue.

- It is the stable model-level catalogue record.
- The MVP does not model size.

### ProductVariant

`ProductVariant` is the operationally stockable and producible form of a
product.

- It belongs to one Product.
- Its attributes are Color, Material, and Season.
- Production stage inventory, warehouse product stock, order items, and price
  records refer to a product variant.

### Color

`Color` is tenant master data used by a ProductVariant.

### Material

`Material` is tenant master data for a product's material attribute and for
raw-material inventory. A material can be used by one or more variants and can
have stock records.

### Season

`Season` is tenant master data used by a ProductVariant.

### ProductPrice

`ProductPrice` records a product or variant price with its effective context.

- A variant can override the product's default price.
- An OrderItem stores the price applicable at order creation so later catalogue
  price changes do not alter commercial history.

## 4. Production Domain

### Stage

`Stage` represents a configurable production stage for a factory. The default
flow is:

`Averlog → Dazmol → Sifat → Kiydirish → Par Dazmol → Parlash → Bezak → Etiketka → Qadoqlash → Ombor`

- Stages define the factory's production flow order.
- They are configurable master data; historical movements retain their original
  stage context.

### StageInventory

`StageInventory` is the current quantity of a ProductVariant at a Stage in a
factory.

**StageInventory is the primary production reporting unit.** Dashboards,
operational visibility, WIP, and bottleneck reporting are based on current
stage quantities, not batch counts.

- It is updated by valid production movements.
- Its quantity cannot become negative.
- It is scoped by tenant, factory, stage, and product variant.

### ProductionBatch

`ProductionBatch` is a traceability and audit grouping for a production intake.

- The default batch quantity is 500, but it is configurable.
- A batch identifies the product variant, received quantity, creator, and
  creation context.
- A batch is **not** the primary reporting unit and must not replace
  StageInventory in operational reporting.

### StageMovement

`StageMovement` is an auditable transfer of a quantity of a ProductVariant from
one production stage to another.

- It records source stage, destination stage, quantity, timestamp, responsible
  user, and optional note.
- A movement may reference a ProductionBatch for traceability.
- The source stage must contain enough quantity; a movement cannot create
  negative StageInventory.

### WorkerActivity

`WorkerActivity` records piece-based work entered by a Shift Receiver for an
employee.

- It records employee, stage, product context, quantity, date, entering user,
  and the historical salary rate used by payroll.
- It contributes to payroll, but recording activity does not itself constitute
  a salary payment.

### Defect

`Defect` records a rare product defect discovered during production.

- It records quantity, reason, detected stage, product context, responsible
  employee where applicable, reporter, and time.
- A defect does not automatically create an employee penalty. Any penalty is a
  separate EmployeeAdjustment decision.

## 5. Employee Domain

### Employee

`Employee` represents a factory employee, including production workers and
operational staff.

- It includes identity, role, department, and employment status context.
- Employees are never hard-deleted. They are made inactive when they leave or
  should no longer receive new activity.

### SalaryRate

`SalaryRate` defines a piece-based amount for an applicable production stage
and product/work context.

- Rates are configurable master data.
- WorkerActivity retains the historical rate used at entry time so later rate
  changes do not rewrite past payroll.

### EmployeeAdjustment

`EmployeeAdjustment` is a payroll-affecting adjustment for an employee.

Allowed types:

- `Bonus`
- `Penalty`
- `Advance`

An adjustment records its amount, reason, effective context, and audit trail.
An advance follows the business process of manager approval and accountant
payment; approval and payment are not inferred from the adjustment type alone.

### Payroll

`Payroll` represents the backend-calculated payroll result for one employee in
one payroll period.

- It contains the resulting worked amount, adjustments, paid amount, remaining
  amount, and payment status.
- Payroll is calculated in the backend from eligible WorkerActivity and
  EmployeeAdjustment records. It is not calculated by the frontend.

### PayrollItem

`PayrollItem` is a visible line item that explains a Payroll result.

- It links the payroll result to the activity, adjustment, or payment context
  that produced the line.
- It preserves calculation inputs for review and auditability.

## 6. Warehouse Domain

### Stock

`Stock` represents current finished-product stock for a ProductVariant in a
WarehouseZone.

- It is scoped to tenant, factory, warehouse, zone, and product variant.
- Product stock arrives in the warehouse when finished products move from
  Qadoqlash to Ombor according to the approved operational flow.

### StockMovement

`StockMovement` is an auditable product or material stock event.

- It records the item, item type, movement type, quantity, unit, zone context,
  responsible user, time, and reason or note.
- Examples include receipt, issue, production receipt, transfer, return, and
  correction.
- Every stock correction requires a reason and records before/after quantities
  as part of its audit context.

### Material

`Material` is the same tenant master-data concept described in the Product
Domain. In the Warehouse Domain it is the stockable raw material, such as yarn,
elastic, labels, or packaging material.

### MaterialStock

`MaterialStock` represents current stock of a Material in a WarehouseZone.

- It is distinct from finished-product Stock and retains its own unit context.

### MaterialThreshold

`MaterialThreshold` defines the configurable low-stock limit for a Material in
the relevant warehouse or zone context.

- It drives future low-stock visibility and notifications.
- Low-stock state is derived from stock and threshold data, not manually set.

## 7. Sales Domain

### Client

`Client` represents a customer purchasing products from a factory.

- It includes contact, address, assigned seller, notes, and factory context.
- Sellers can create clients; managers manage client records in the MVP.

### Order

`Order` represents a client sales order.

- It records client, seller, factory, deadline, lifecycle status, and frozen
  commercial values.
- Supported statuses are Draft, Confirmed, Waiting Production, Ready,
  Delivered, Closed, and Cancelled.
- Clients do not create orders.

### OrderItem

`OrderItem` is a requested ProductVariant within an Order.

- It records product attributes, quantity, unit price, and total price as
  historical order data.
- The unit price is frozen when the order is created.

### Payment

`Payment` is a received client payment and is separate from an Order.

- It records client, amount, method, date, recorder, and note.
- One payment can be allocated to one or more orders. The exact persistence
  representation of allocation is intentionally deferred until implementation.

### ClientDebt

`ClientDebt` is a calculated projection of a client's debt, not an editable
transaction.

- It is derived from confirmed orders minus received payments according to
  their allocations.
- It can be materialized or queried for reporting, but users must not manually
  edit the debt value.

## 8. Supplier Domain

### Supplier

`Supplier` represents a provider of materials or supplies, such as yarn,
elastic, labels, or packaging.

### Purchase

`Purchase` represents an approved supplier purchase that contributes to the
supplier balance.

- It retains supplier, material/supply context, amount, date, and factory
  context.

### SupplierPayment

`SupplierPayment` records a payment made to a supplier.

- It is separate from a Purchase and may be associated with one or more
  purchase balances when allocation is implemented.

### SupplierDebt

`SupplierDebt` is a calculated projection, not a manually editable value.

- It is derived from purchases minus supplier payments.

## 9. Finance Domain

### Expense

`Expense` represents an operational expense request and its financial record.

- It records category, amount, reason, requester, request date, and payment
  state.
- Manager approval and accountant payment are separate business responsibilities.

### ExpenseCategory

`ExpenseCategory` is configurable tenant master data used to classify expenses.

### ExpenseApproval

`ExpenseApproval` records the manager's approval or rejection decision for an
Expense, including the approver, decision time, and reason where applicable.

## 10. Notification Domain

### Notification

`Notification` represents an operational alert delivered or available to a
user, such as low stock, a stalled production stage, a defect, pending approval,
or overdue debt.

### TelegramNotification

`TelegramNotification` represents a notification or read-only summary delivered
through Telegram.

- Telegram is the worker self-service channel in the product direction.
- It must expose only the linked employee's own read-only activity and payroll
  summary; it cannot modify production or finance records.

### NotificationRule

`NotificationRule` defines the configured condition and audience for a future
notification type. It does not imply a workflow engine in V1.

## 11. Audit Domain

### AuditLog

`AuditLog` is an append-only record of an important system change.

- It records entity type, entity identifier, action, old value, new value,
  responsible user, and timestamp.
- Important audited actions include production movements, stock movements,
  defects, worker activity, orders, payments, debt-affecting records, salary
  rates, bonuses, penalties, advances, and finance changes.
- Ordinary users cannot modify audit records.

## 12. Key Business Rules

1. Employees are never hard-deleted; use inactive status.
2. Tenant isolation is mandatory for all reads and writes.
3. Client and supplier debt are calculated projections, never manually edited.
4. Payroll is calculated in the backend from recorded inputs and historical
   rates; the frontend displays backend-calculated values only.
5. The frontend must not calculate business-critical values, including payroll,
   debt, stock totals, or finance totals.
6. Every stock correction requires a reason and must be auditable.
7. Low-stock thresholds are configurable.
8. StageInventory is the primary production reporting unit; ProductionBatch is
   for traceability and audit.
9. A production movement cannot create negative stage inventory.
10. Defects do not automatically create penalties or payroll changes.
11. Workers do not use the web application directly; Shift Receivers record
    their activity.

## 13. Future IoT Extension

The following concepts are reserved for a future IoT integration. They are not
part of V1 implementation and must not delay manual operational workflows.

### Machine

`Machine` represents a factory production machine or device.

### MachineTelemetry

`MachineTelemetry` represents time-stamped data received from a Machine.

### MachineRuntime

`MachineRuntime` represents machine operating-time and state information.

### MachineProductionCounter

`MachineProductionCounter` represents a machine-reported production count.

Future automated data must remain distinguishable from manually entered data
and may require Shift Receiver confirmation before it affects operational
records.
