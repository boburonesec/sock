# Production Known Limitations

Status: Active  
Date: 2026-07-11

## Purpose

Paypoq OS is ready for operational factory use for the core production path.
This document lists intentional gaps that remain outside the current product
scope. It is not a full ERP, accounting ledger, or IoT platform.

## What is production-ready

- Platform tenant bootstrap (roles, factory, zones, stages, expense categories)
- Operator accounts vs piece-rate employees (Xodimlar)
- Catalog, salary rates, employees
- Production: batch, stage move, worker activity, defect record, finished receipt
- Warehouse: material receipt, stock correction, low-stock thresholds, movements
- Sales: clients, orders, payments, reverse payment, deliver, return delivery
- Suppliers: purchase, payment, debt (purchase does not auto-create stock)
- Finance: expenses (request → approve → pay), advances (request → approve → pay),
  bonuses/penalties, payroll calculate/pay/close
- Multi-factory: client-side factory switcher via `X-Factory-Id`
- Audit log browse
- Reports hub links to real operational screens

## Remaining limitations (intentional / later)

### Auth

- No self-service password reset email flow
- No invite-user email flow
- Platform admin and tenant operator are separate login paths

### Production

- No stage movement correction after commit
- No batch cancellation
- Defects do not auto-reduce StageInventory
- Defects do not auto-create penalties
- No automatic material consumption from production
- No IoT
- Stage move requires workers assigned to the source stage (Xodimlar)
- Per-worker quantities supported; equal split is the default helper only

### Warehouse

- No zone-to-zone transfer write flow
- No multi-warehouse optimization UI (schema supports multiple warehouses)
- No stock reservation before delivery
- Supplier purchase does not auto-create material stock (use material receipt)

### Sales

- No order edit/cancel after creation
- No partial delivery / partial return
- No partial payment reverse / refund
- No invoice/print
- Delivery only when fully paid

### Finance

- No expense/advance multi-role hard split beyond shared `finance.write`
  (workflow statuses exist; any finance writer can approve/pay)
- No payroll correction after period close
- No taxes/VAT / full ledger
- No bulk payroll payment UI

### Reports / notifications

- No generated report files, Excel, or PDF export
- Notification center is a placeholder shell (use domain screens for low stock /
  advances)

### Mobile / bot

- Mobile and Telegram remain secondary surfaces; web is primary for operators

## Zone name note

Warehouse and sales resolve finished-goods zone by canonical English name
`Finished Products` (and legacy `Tayyor mahsulot` for older platform tenants).
UI maps zone names to Uzbek for operators. New tenants seed English zone names
and warehouse name `Asosiy ombor`.
