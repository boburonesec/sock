# MVP Demo Script v2

Status: Active

Date: 2026-06-30

Audience:

- Owner
- Manager
- Accountant
- Seller
- Warehouse operator
- Shift receiver
- Business partner / investor

Recommended duration:

- Short demo: 20 minutes
- Full operational demo: 45-60 minutes

## Demo Goal

Show that Paypoq OS is a sock-factory Manufacturing OS, not a generic ERP.

The v2 demo should prove the full operating loop plus recovery:

```text
Product setup
→ Employee and salary rate setup
→ Production
→ Warehouse
→ Sales order
→ Payment
→ Delivery
→ Delivery return
→ Payment reversal
→ Dashboards update from backend values
```

## Demo Preparation

Before the demo:

1. Start PostgreSQL local development database.
2. Prepare a clean demo database:

```bash
ALLOW_DEMO_RESET=true pnpm demo:prepare
pnpm smoke:mvp
```

3. Start the API.
4. Start the web app.
5. Use the demo Owner account:

```text
LOCAL DEVELOPMENT ONLY
Email: owner@paypoq.local
Password: ChangeMe123!
```

Suggested browser routes:

- Web app: `/login`
- Super Admin: `/admin/login`
- API health check: `/health`

Optional platform-admin rehearsal:

```text
LOCAL DEVELOPMENT ONLY
Email: platform@paypoq.local
Password: ChangeMe123!
Route: /admin
```

## Demo Principles

During the demo, emphasize:

- Stage Inventory is the main production truth.
- Workers do not use the web app directly.
- Shift Receiver enters production and worker activity.
- Client debt is calculated from orders and allocated payments.
- Supplier debt is calculated from purchases and allocated payments.
- Payroll is backend-calculated from WorkerActivity and salary-rate snapshots.
- Warehouse stock changes are auditable through StockMovement.
- Corrections and reversals preserve history; old transaction records are not
  silently edited.
- UI is Uzbek-first, dark-mode-first, and operator-friendly.

Avoid presenting Paypoq OS as:

- a full accounting system
- a generic ERP
- an IoT platform
- a complex workflow engine

## Step 1 — Login and Executive Overview

Route:

```text
/login
```

Actions:

1. Log in as Demo Owner.
2. Open `/dashboard/executive`.
3. Show high-level KPIs:
   - sales
   - expenses
   - client debt
   - supplier debt
   - active employees
   - active orders
   - products
   - low-stock materials

Talk track:

> Owner and Manager can understand the factory’s current health quickly without
> opening every operational screen.

## Step 2 — Product and Price Setup

Routes:

```text
/settings/colors
/settings/materials
/settings/seasons
/settings/stages
/settings/products
```

Actions:

1. Show existing colors, materials, seasons, and production stages.
2. Create or select:
   - color
   - material
   - season
3. Open Product Catalog.
4. Create a product model.
5. Create a product variant.
6. Add a product price.

Talk track:

> Product Variant is model + color + material + season. Size is intentionally
> not part of MVP.

## Step 3 — Employee and Salary Rate Setup

Routes:

```text
/employees
/settings/salary-rates
```

Actions:

1. Create an employee.
2. Open Salary Rates.
3. Create a rate for:
   - stage-level rate, or
   - stage + product variant rate

Talk track:

> Workers are paid per piece. WorkerActivity stores the salary rate snapshot so
> payroll remains explainable even if rates change later.

## Step 4 — Production

Route:

```text
/production
```

Actions:

1. Create a production batch.
2. Move quantity between stages.
3. Add worker activity.
4. Record a defect.
5. Move quantity to `Ombor`.
6. Receive finished product into warehouse stock.

Talk track:

> Production visibility is centered on Stage Inventory, not batch counts.

## Step 5 — Warehouse

Routes:

```text
/warehouse
/warehouse/materials
/warehouse/movements
```

Actions:

1. Receive material stock.
2. Show finished product stock.
3. Perform a stock correction with a reason.
4. Show StockMovement history.

Talk track:

> Corrections do not erase history. Paypoq OS adjusts the current snapshot and
> creates auditable movement history.

## Step 6 — Sales Order and Payment

Routes:

```text
/sales/clients
/sales/orders
/sales/payments
/sales/debts
```

Actions:

1. Create a client.
2. Create an order with product variant rows.
3. Record a fully allocated payment.
4. Show client debt projection.

Talk track:

> Payments are separate from orders. Client debt is backend-calculated from
> eligible orders and allocated, non-reversed payments.

## Step 7 — Delivery

Route:

```text
/sales/orders
```

Actions:

1. Open the paid order.
2. Deliver the order.
3. Show warehouse stock deduction.
4. Show delivery StockMovement.

Talk track:

> Delivery deducts warehouse stock only after payment is complete in this MVP.

## Step 8 — Delivery Return and Payment Reversal

Routes:

```text
/sales/orders
/sales/payments
/sales/debts
/warehouse/movements
```

Actions:

1. Try to reverse payment while order is `DELIVERED`.
2. Explain that reversal is blocked for delivered orders.
3. Return delivery.
4. Show order status becomes `READY`.
5. Show stock returns to Finished Products.
6. Reverse the payment.
7. Show client debt increases again.
8. Show audit-friendly movement history.

Talk track:

> Recovery is explicit and auditable: delivery return is operational, payment
> reversal is financial, and neither silently edits old records.

## Step 9 — Supplier Flow

Route:

```text
/finance/suppliers
```

Actions:

1. Create supplier.
2. Create purchase.
3. Allocate supplier payment.
4. Show supplier debt projection.

Talk track:

> Supplier debt follows the same principle as client debt: backend-calculated
> from purchases and payments.

## Step 10 — Payroll

Route:

```text
/finance/payroll
```

Actions:

1. Create payroll period.
2. Calculate payroll.
3. Review payroll items.
4. Pay item or period.
5. Close period.

Talk track:

> Payroll is calculated from WorkerActivity and historical salary-rate
> snapshots. Closed payroll is locked.

## Step 11 — Dashboards and Reports

Routes:

```text
/dashboard/executive
/dashboard/operations
/sales
/finance
/warehouse
/reports
/tv
```

Actions:

1. Show executive dashboard.
2. Show operations dashboard.
3. Show sales, finance, and warehouse summaries.
4. Show Factory TV.
5. Show Reports overview.

Talk track:

> Dashboards read backend summaries. Frontend does not calculate debt, payroll,
> stock totals, or finance totals as source of truth.

## Demo Close

End with the product positioning:

```text
Paypoq OS is an MVP Manufacturing OS for sock factories.
It is demo-ready for controlled factory validation.
It is not a generic ERP or full accounting system.
```

Recommended next milestones:

1. Supplier payment reversal.
2. Production movement correction.
3. Material receipt correction.
4. Audit browsing UI.
5. Automated smoke tests.
