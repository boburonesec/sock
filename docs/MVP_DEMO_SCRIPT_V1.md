# MVP Demo Script v1

Status: Active

Date: 2026-06-29

Audience:

- Owner
- Manager
- Accountant
- Seller
- Warehouse operator
- Shift receiver
- Business partner / investor

Recommended duration:

- Short demo: 15 minutes
- Full operational demo: 30-45 minutes

## Demo Goal

Show that Paypoq OS is not a generic ERP.

The demo should prove the core factory operating loop:

```text
Product setup
→ Employee and salary rate setup
→ Production batch
→ Stage movement
→ Worker activity
→ Finished product warehouse receipt
→ Sales order
→ Payment
→ Delivery
→ Dashboards and visibility
```

## Demo Preparation

Before the demo:

1. Start PostgreSQL local development database.
2. Start the API.
3. Start the web app.
4. Ensure baseline seed data exists.
5. Use the demo Owner account:

```text
LOCAL DEVELOPMENT ONLY
Email: owner@paypoq.local
Password: ChangeMe123!
```

Suggested browser routes:

- Web app: `/login`
- API health check: `/health`

## Demo Principles

During the demo, emphasize:

- Stage Inventory is the main production truth.
- Workers do not use the web app directly.
- Shift Receiver enters production and worker activity.
- Client debt is calculated from orders and allocated payments.
- Supplier debt is calculated from purchases and allocated payments.
- Payroll is backend-calculated from WorkerActivity and salary-rate snapshots.
- Warehouse stock changes are auditable through StockMovement.
- The UI is Uzbek-first, dark-mode-first, and operator-friendly.

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

> Owner and Manager can understand the factory’s current health in a few
> seconds without opening detailed operational screens.

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
3. Create a salary rate for:
   - stage-level rate, or
   - stage + product variant rate

Talk track:

> Workers are paid per piece. WorkerActivity stores the salary rate snapshot so
> payroll remains explainable even if rates change later.

## Step 4 — Production Batch

Route:

```text
/production
```

Actions:

1. Click `Partiya yaratish`.
2. Select the product variant.
3. Enter quantity.
4. Submit.
5. Verify the first production stage increased.

Talk track:

> Batch is for traceability. The primary operational view remains Stage
> Inventory.

## Step 5 — Stage Movement

Route:

```text
/production
```

Actions:

1. Click `Bosqichga o‘tkazish`.
2. Move quantity from one stage to the next.
3. Repeat until some quantity reaches `Ombor`.
4. Show recent movements.

Talk track:

> Managers can see where products are sitting and where the factory is getting
> blocked.

## Step 6 — Worker Activity

Route:

```text
/production
```

Actions:

1. Click `Ishchi faolligi qo‘shish`.
2. Select employee.
3. Select stage and product variant.
4. Enter quantity.
5. Submit.
6. Show recent worker activity.

Talk track:

> Shift Receiver enters this data. Workers do not need direct system access.

## Step 7 — Defect Recording

Route:

```text
/production
```

Actions:

1. Click `Brak qayd qilish`.
2. Select employee/stage/product if applicable.
3. Enter quantity and reason.
4. Submit.

Talk track:

> Defects are recorded for visibility. MVP does not automatically create
> penalties or payroll changes from defects.

## Step 8 — Finished Product Warehouse Receipt

Route:

```text
/production
```

Actions:

1. Ensure quantity exists in production `Ombor` stage.
2. Click `Omborga qabul qilish`.
3. Select product variant and quantity.
4. Submit.
5. Open `/warehouse`.
6. Show finished product stock.
7. Open `/warehouse/movements`.
8. Show related StockMovement.

Talk track:

> This closes the production-to-warehouse chain. Finished products leave
> production StageInventory and enter warehouse Stock.

## Step 9 — Material Receipt

Route:

```text
/warehouse/materials
```

Actions:

1. Click `Material qabul qilish`.
2. Select material.
3. Enter quantity and unit.
4. Submit.
5. Show MaterialStock and StockMovement.

Talk track:

> Material receipt is separate from SupplierPurchase in v1. This keeps warehouse
> operations simple and auditable.

## Step 10 — Client and Sales Order

Routes:

```text
/sales/clients
/sales/orders
```

Actions:

1. Create a client.
2. Open Sales Orders.
3. Click `Buyurtma yaratish`.
4. Select client.
5. Add product variant and quantity.
6. Use stored price or enter an explicit unit price.
7. Submit.
8. Open order details.

Talk track:

> Order prices are frozen at creation time. The backend calculates totals.

## Step 11 — Payment Allocation

Route:

```text
/sales/payments
```

Actions:

1. Click `To‘lov qayd qilish`.
2. Select client.
3. Enter payment amount.
4. Allocate payment to the order.
5. Submit.
6. Open `/sales/debts`.
7. Show updated debt projection.

Talk track:

> Payments are separate from orders. Client debt is calculated from eligible
> orders minus allocated payments.

## Step 12 — Order Delivery and Stock Deduction

Route:

```text
/sales/orders
```

Actions:

1. Open a fully paid order.
2. Click delivery action.
3. Confirm delivery.
4. Verify order status becomes delivered.
5. Open `/warehouse`.
6. Show finished product stock decreased.
7. Open `/warehouse/movements`.
8. Show delivery StockMovement.

Talk track:

> V1 uses a conservative paid-only delivery policy. Delivery deducts warehouse
> stock atomically and writes audit records.

## Step 13 — Supplier Purchase and Payment

Route:

```text
/finance/suppliers
```

Actions:

1. Create supplier.
2. Create supplier purchase with material rows.
3. Create supplier payment and allocate it to purchase.
4. Show supplier debt projection.

Talk track:

> Supplier debt is calculated from purchases and allocated payments. Supplier
> purchase does not automatically receive material stock in v1.

## Step 14 — Payroll Lifecycle

Route:

```text
/finance/payroll
```

Actions:

1. Create payroll period.
2. Add or show adjustments if available:
   - advance
   - bonus
   - penalty
3. Calculate payroll.
4. Review PayrollItem snapshots.
5. Pay salary.
6. Close period after payment/review.

Talk track:

> Payroll is backend-calculated. Closed payroll is an administrative lock and
> cannot be recalculated or paid again.

## Step 15 — Dashboards and Visibility

Routes:

```text
/dashboard/executive
/dashboard/operations
/finance
/sales
/warehouse
/tv
/reports
```

Actions:

1. Show Executive Dashboard.
2. Show Operations Dashboard.
3. Show Finance Overview.
4. Show Sales Overview.
5. Show Warehouse Overview.
6. Open Factory TV dashboard.
7. Open Reports overview.

Talk track:

> The system gives the owner a top-level view and gives managers operational
> visibility without forcing factory staff through complex ERP workflows.

## Recommended Demo Closing

Close with:

1. What is already working:
   - auth/RBAC
   - master data
   - production chain
   - warehouse stock
   - sales payment/debt
   - supplier debt
   - payroll lifecycle
   - dashboards
2. What is intentionally not in MVP:
   - IoT
   - full accounting ledger
   - delivery/shipping module
   - invoice/print flow
   - correction/reversal flows
3. Next validation step:
   - run with real factory staff
   - observe 2-3 real shifts
   - collect feedback
   - implement correction/reversal policies

## Demo Troubleshooting

If order delivery fails:

- Verify the order is fully paid.
- Verify finished product warehouse stock exists for the ordered product.

If worker activity fails:

- Verify an active SalaryRate exists for the selected stage/product variant or
  stage fallback.

If payroll close fails:

- Verify payroll has been calculated.
- Verify payroll item balances are paid or the period is ready for final
  administrative close according to current policy.

If protected API calls fail:

- Log out and log in again.
- Verify access token refresh succeeds.
- Verify the demo Owner user has permissions.
