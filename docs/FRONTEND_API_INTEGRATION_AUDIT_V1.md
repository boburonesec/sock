# Paypoq OS — Frontend API Integration Audit v1

Status: Completed  
Scope: `apps/web` audit only  
Date: 2026-06-25

## 1. Summary

All previously tracked MVP overview/mock pages in `apps/web` are now connected
to real read APIs or have their feature mocks removed.

Executive Dashboard has since been connected to `GET /dashboard/executive-summary`
and its feature mock has been removed.
Factory TV has since been connected to `GET /dashboard/factory-tv-summary`
and its feature mock has been removed.
Settings Overview has since been connected to `GET /settings/overview` and its
feature mock has been removed.
Reports Overview has since been connected to `GET /reports/overview` and its
feature mock has been removed.

## 2. API-connected pages

The following routes are connected to real read APIs and do not use feature mock data:

| Route | API source | Status |
| --- | --- | --- |
| `/dashboard/executive` | `dashboardApi.getExecutiveSummary` | Connected |
| `/tv` | `dashboardApi.getFactoryTvSummary` | Connected |
| `/settings` | `settingsApi.getOverview` | Connected |
| `/reports` | `reportsApi.getOverview` | Connected |
| `/settings/colors` | `productApi.getColors` | Connected |
| `/settings/materials` | `productApi.getMaterials` | Connected |
| `/settings/seasons` | `productApi.getSeasons` | Connected |
| `/settings/stages` | `productApi.getStages` | Connected |
| `/dashboard/operations` | `productionApi.getOperationsSummary` | Connected |
| `/production` | `productionApi.getOperationsSummary`, `getStageInventory`, `getRecentMovements` | Connected |
| `/warehouse` | `warehouseApi.getStockSummary`, `getStock`, `getMaterialStock` | Connected |
| `/warehouse/materials` | `warehouseApi.getMaterialStock` | Connected |
| `/warehouse/movements` | `warehouseApi.getMovements` | Connected |
| `/warehouse/zones` | `warehouseApi.getStockSummary`, `getZones`, `getStock`, `getMaterialStock`, `getMovements` | Connected |
| `/sales` | `salesApi.getSummary` | Connected |
| `/sales/clients` | `salesApi.getClients` | Connected |
| `/sales/orders` | `salesApi.getOrders` | Connected |
| `/sales/payments` | `salesApi.getPayments` | Connected |
| `/sales/debts` | `salesApi.getDebts` | Connected |
| `/finance` | `financeApi.getSummary` | Connected |
| `/finance/expenses` | `financeApi.getExpenses` | Connected |
| `/finance/advances` | `financeApi.getAdvances` | Connected |
| `/finance/payroll` | `financeApi.getPayrollPeriods`, `getPayrollPeriodItems` | Connected |
| `/finance/suppliers` | `supplierApi.getSuppliers`, `getPurchases`, `getPayments`, `getDebts` | Connected |
| `/employees` | `employeesApi.getEmployees` | Connected |

## 3. Remaining mock files

No remaining `mock.ts` files were found under `apps/web/src/features`.

## 4. Remaining placeholder/demo pages

| Page | Current status | Notes |
| --- | --- | --- |
| Catch-all placeholder routes | Placeholder | Routes such as `/dashboard/finance`, `/dashboard/sales`, `/production/stages`, `/reports/*`, and some settings subroutes still render `PlaceholderPage` via `[[...slug]]`. |

## 5. Business calculation findings

No forbidden frontend business calculation was found on API-connected pages.

### Allowed display-only formatting

These cases convert backend-provided strings/numbers only for display formatting:

- `formatNumber(Number(summary.kpis.*))` in Operations, Production, and Warehouse pages.
- `formatNumber(item.quantity)` where quantity is already returned by API.
- Date formatting with `Intl.DateTimeFormat`.

### Allowed record counts

Several pages show API record counts using `.length`, for example:

- `/finance/expenses` expense record count
- `/finance/advances` advance record count
- `/finance/suppliers` supplier/debt/purchase/payment record counts
- `/warehouse/materials` material stock record count
- `/warehouse/movements` movement record count
- `/employees` table empty-state branching

These are display counts, not business totals.

### Allowed presentation-only filtering

The following client-side filtering is presentation-only:

- `/production` filters stage inventory by selected stage to show product breakdown.
- `/finance/suppliers` filters purchases/payments by selected supplier for drawer display.
- `/warehouse/zones` filters stock/movements by selected zone for drawer display.

These do not calculate totals or business-critical values.

### Allowed chart scaling

`/dashboard/operations` computes a visual bar height ratio for the production trend chart. This is not a business calculation because it does not alter, aggregate, or derive business values; it only controls CSS bar height.

### Remaining mock business values

Factory TV no longer contains mock business values. It uses backend operational
summary data and intentionally excludes salary, payroll, debt, expenses, and
other sensitive finance values.
Reports Overview now uses backend metadata only. It does not fake generated
report files.

## 6. Navigation check

Main sidebar targets are correct:

| Item | Target | Status |
| --- | --- | --- |
| Sales | `/sales` | OK |
| Finance | `/finance` | OK |
| Warehouse | `/warehouse` | OK |
| Production | `/production` | OK |
| Employees | `/employees` | OK |
| Settings | `/settings` | OK |
| Reports | `/reports` | OK |

Active navigation logic supports exact route matches and nested module routes through `pathname.startsWith(`${href}/`)`.

## 7. Cleanup recommendations

### Must-fix items

None for this audit.

### Can-defer items

1. Consider adding dedicated detail endpoints to avoid presentation filtering for drawers when datasets grow:
   - `/warehouse/zones/:id/details`
   - `/supplier/:id/summary`
   - `/production/stages/:id/inventory`
2. Localize backend enum values in UI through a shared label map after API contracts stabilize.

## 8. Senior Engineering Review

### Implemented

Created this audit document and later updated it after Executive Dashboard was
connected to `GET /dashboard/executive-summary`.
It was updated again after Factory TV was connected to
`GET /dashboard/factory-tv-summary`.
It was updated again after Settings Overview was connected to
`GET /settings/overview`.
It was updated again after Reports Overview was connected to
`GET /reports/overview`.

### Architecture / design decisions

The audit preserves the current staged integration strategy:

- API-connected feature pages use TanStack Query and local feature hooks.
- Remaining mocks are isolated to demo/placeholder pages.
- Frontend does not calculate business-critical values.

### Risks and edge cases noticed

- Some API-connected drawer views filter already-fetched arrays client-side for display. This is acceptable for current dev data, but can become inefficient with real production volume.
- Status values are often backend enums and not yet fully localized.

### Suggestions / alternatives

- Add detail endpoints once drawer data grows beyond small read-only lists.
- Keep the “no API/mock mixing” rule as a release gate.

### What was intentionally not implemented

- No generated report files or export implementation.
- No mutations.
- No forms.
- No business calculations.
