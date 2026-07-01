# MVP Known Limitations v1

Status: Active

Date: 2026-06-29

## Purpose

This document lists known MVP limitations for Paypoq OS. These are intentional
scope boundaries unless marked as must-fix.

The MVP is designed for controlled factory validation, not broad production
deployment.

## Auth and RBAC

- Only the demo Owner user is seeded by default.
- Limited-role `403` smoke testing is not yet automated.
- No password reset flow.
- No invite user flow.
- No factory switcher UI yet.
- Factory TV remains intentionally public at the frontend route level.

## Settings and Master Data

- Product model, variant, price, salary rate, stage, color, material, and season
  flows exist.
- No bulk import/export.
- No advanced duplicate cleanup tooling.
- Product price correction history is append-only; no price reversal UI.
- Salary rates support:
  - factory + stage
  - factory + stage + product variant
- Employee-specific salary rates are intentionally not in v1.

## Production

- Production batch creation exists.
- Stage movement exists.
- Worker activity exists.
- Defect recording exists.
- Finished product warehouse receipt exists.
- No production correction/reversal flow yet.
- No batch cancellation.
- No automatic material consumption.
- Defects do not automatically reduce StageInventory.
- Defects do not automatically create penalties.
- No IoT integration.

## Warehouse

- Finished product receipt exists.
- Material receipt exists.
- Order delivery deducts finished product stock.
- StockMovement history exists.
- No generic stock correction flow yet.
- No stock transfer flow yet.
- No return flow yet.
- No material consumption flow yet.
- No multi-warehouse UI optimization beyond schema support.
- No reservation system before order delivery.

## Sales

- Client create/edit/archive exists.
- Order creation exists.
- Payment allocation exists.
- Delivery deducts stock after full payment.
- Client debt projection exists.
- No order edit/cancel flow after creation.
- No payment reversal or refund.
- No partial delivery.
- No delivery address/shipping module.
- No invoice/print flow.
- Paid-only delivery is intentionally conservative for v1.

## Supplier

- Supplier create/edit/archive exists.
- Supplier purchase exists.
- Supplier payment allocation exists.
- Supplier debt projection exists.
- Supplier purchase does not automatically create material stock.
- No supplier payment reversal.
- No supplier purchase edit/cancel.
- No procurement approval workflow.

## Finance and Payroll

- Expense read UI exists, but complete expense write workflow is not part of the
  verified MVP write path.
- Advances, bonuses, and penalties can be created for payroll.
- Payroll period create/calculate/pay/close exists.
- Payroll calculation is backend-owned.
- Closed payroll is immutable.
- No payroll correction/reversal yet.
- No bulk payroll payment.
- No taxes/VAT.
- No full accounting ledger.
- Advance approval/payment workflow is simplified in v1.

## Dashboards and Reports

- Executive, operations, finance, sales, warehouse, settings, reports, and TV
  summaries are connected to backend read endpoints.
- Reports overview is metadata-only.
- No Excel/PDF export yet.
- No scheduled reports.
- No advanced analytics.

## Frontend

- Dark-mode-first shell is implemented.
- Core pages build.
- Loading/error/empty states exist for API-connected pages.
- Some convenience display logic exists for UX only.
- Frontend must still not become source of truth for debt, payroll, stock, or
  finance values.

## Operational Risks

- Correction/reversal flows are the biggest remaining gap before production use.
- Concurrent high-volume stock/payment operations may require stronger locking
  or isolation after real usage data.
- AuditLog exists, but there is no full audit browsing UI yet.
- No automated end-to-end test suite yet; smoke tests are currently manual
  scripts run during QA.

## Recommended Next Milestones

1. Correction/reversal policy design:
   - stock correction
   - order delivery return
   - payment reversal
   - payroll correction
2. Limited-role seed users and RBAC smoke automation.
3. Expense write workflow completion.
4. Real factory validation and operator feedback.
