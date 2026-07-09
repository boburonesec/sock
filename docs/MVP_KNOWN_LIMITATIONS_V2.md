# MVP Known Limitations v2

Status: Active

Date: 2026-06-30

## Purpose

This document updates MVP limitations after stock correction, sales payment
reversal, and delivery return flows were verified.

The MVP is ready for controlled demo and factory validation. It is not yet a
fully hardened production deployment.

## Auth and RBAC

- Demo seed creates Owner plus limited-role users (`manager`, `seller`,
  `warehouse`, `shift`, `accountant`) and a platform admin
  (`platform@paypoq.local`).
- RBAC is exercised by `pnpm smoke:mvp` and related smoke scripts; full
  automated integration suite beyond smoke is still limited.
- No password reset flow.
- No invite user flow.
- No factory switcher UI yet.
- Factory TV requires `FACTORY_TV_ACCESS_TOKEN` on the API summary endpoint;
  the `/tv` frontend route is still a display-only screen without tenant login.

## Settings and Master Data

- Product model, variant, price, salary rate, stage, color, material, and season
  flows exist.
- No bulk import/export.
- Product price history is append-only; there is no price reversal UI.
- Salary rates support:
  - factory + stage
  - factory + stage + product variant
- Employee-specific salary rates are intentionally not in v1/v2.

## Production

- Production batch creation exists.
- Stage movement exists.
- Worker activity exists.
- Defect recording exists.
- Finished product warehouse receipt exists.
- No production stage movement correction flow yet.
- No batch cancellation.
- No automatic material consumption.
- Defects do not automatically reduce StageInventory.
- Defects do not automatically create penalties.
- No IoT integration.

## Warehouse

- Finished product receipt exists.
- Material receipt exists.
- Order delivery deducts finished product stock.
- Delivery return restores finished product stock.
- Stock correction exists for product/material snapshots.
- StockMovement history exists.
- No stock transfer flow yet.
- No material receipt reversal/correction flow beyond setting current stock via
  stock correction.
- No production material consumption flow.
- No multi-warehouse UI optimization beyond schema support.
- No stock reservation system before order delivery.

## Sales

- Client create/edit/archive exists.
- Order creation exists.
- Payment allocation exists.
- Delivery deducts stock after full payment.
- Full delivery return exists.
- Sales payment reversal exists after safe policy checks.
- Client debt projection excludes reversed payments.
- No partial payment reversal.
- No refund flow.
- No client credit / unallocated payment concept.
- No order edit/cancel flow after creation.
- No partial delivery.
- No partial delivery return.
- No delivery address/shipping module.
- No invoice/print flow.
- Paid-only delivery remains intentionally conservative.

## Supplier

- Supplier create/edit/archive exists.
- Supplier purchase exists.
- Supplier payment allocation exists.
- Supplier debt projection exists.
- Supplier purchase does not automatically create material stock.
- No supplier payment reversal yet.
- No supplier purchase edit/cancel.
- No procurement approval workflow.

## Finance and Payroll

- Expense read UI exists, but complete expense write workflow is not part of the
  verified MVP write path.
- Advances, bonuses, and penalties can be created for payroll.
- Payroll period create/calculate/pay/close exists.
- Payroll calculation is backend-owned.
- Closed payroll is immutable.
- No payroll correction/reversal after close yet.
- No bulk payroll payment.
- No taxes/VAT.
- No full accounting ledger.
- Advance approval/payment workflow is simplified in v1/v2.

## Dashboards and Reports

- Executive, operations, finance, sales, warehouse, settings, reports, and TV
  summaries are connected to backend read endpoints.
- Dashboards reflect corrected backend values through read projections.
- Reports overview is metadata-only.
- No Excel/PDF export yet.
- No scheduled reports.
- No advanced analytics.

## Frontend

- Dark-mode-first shell is implemented.
- Core pages build.
- Loading/error/empty states exist for API-connected pages.
- Some convenience display logic exists for UX only.
- Frontend must not become source of truth for debt, payroll, stock, or finance
  values.

## Operational Risks

- There is no automated end-to-end test suite yet; representative smoke tests
  are still manual scripts run during QA.
- Concurrent high-volume stock/payment operations need dedicated stress and
  isolation testing before production rollout.
- AuditLog exists, but there is no full audit browsing UI yet.
- Recovery flows now cover the primary sales return path, but supplier and
  production correction coverage is still incomplete.

## Recommended Next Milestones

1. Supplier payment reversal policy and implementation.
2. Production stage movement correction.
3. Material receipt correction.
4. Audit browsing UI.
5. Limited-role seed users and RBAC smoke automation.
6. Automated integration test suite for MVP smoke paths.
