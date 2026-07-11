# Demo UI walkthrough result (frontend-driven)

Date: 2026-07-11  
Method: Playwright against real Next.js UI (not seed scripts for business data)  
Factory: **Andijon Paypoq Fabrikasi** (`branchMode=SINGLE`, no extra branches)

## Login accounts created via UI

| Rol | Email | Parol |
| --- | --- | --- |
| Platform admin | `platform@paypoq.local` | `ChangeMe123!` |
| Owner | `owner@andijon-paypoq.local` | `ChangeMe123!` |
| Manager | `manager@andijon-paypoq.local` | `ChangeMe123!` |
| Seller | `seller@andijon-paypoq.local` | `ChangeMe123!` |
| Warehouse | `warehouse@andijon-paypoq.local` | `ChangeMe123!` |
| Shift Receiver | `shift@andijon-paypoq.local` | `ChangeMe123!` |
| Accountant | `accountant@andijon-paypoq.local` | `ChangeMe123!` |

Open: `http://localhost:3000/login` (API `:3001`, web `:3000`)

## Data created through the browser (counts after walkthrough)

| Entity | Count | Notes |
| --- | ---: | --- |
| Users (operators) | 6 | Owner + 5 roles |
| Employees (piece-rate) | 8 | With stage assignments |
| Products | 3 | Klassik / Sport / Premium |
| Product variants | 6 | 2 per product |
| Production batches | 6 | 500 pcs each → Averlog WIP |
| Stage movements | 36+ | Averlog → Dazmol style moves |
| Worker activities | 30+ | Auto from stage moves |
| Material stock rows | 1+ | Material receipts |
| Clients | 4 | Seller UI |
| Sales orders | 5 | All **DELIVERED** + **PAID** |
| Suppliers | 3 | Accountant UI |
| Payroll periods | 1 | Status CALCULATED, work amount 126000 |
| Client payments | 5 | Full allocation per order (7 500 000 so‘m total) |
| Finished Products stock | 20 | After deliveries (Klassik Paypoq · Ko‘k) |
| Client debt (Andijon Savdo) | 0 | totalOrders = totalPaid = 7 500 000 |

Screenshots: `docs/demo-walkthrough/`  
Scripts:
- `scripts/ui-demo-factory-walkthrough.mjs`
- `scripts/ui-demo-factory-continue.mjs`
- `scripts/ui-demo-payments-delivery.mjs` (payment allocation → stock correction → deliver)

## Payments + delivery chain (UI)

Closed via Playwright as real roles:

1. **Seller** — 5× “To‘lov qayd qilish” with client + amount + method + order allocation = full order total.
2. **Warehouse** — “Qoldiqni tuzatish” for ordered variant into **Finished Products** (delivery requires FP stock).
3. **Seller** — order detail → “Yetkazildi qilish” → confirm dialog → stock deducted.

Final: 5/5 orders `DELIVERED` / `PAID`, 5 payments, debt 0.

## Staff findings fixed during the run

1. **Drawer backdrop ate clicks** — panel now `z-10`, backdrop separate layer (`drawer.tsx`).
2. **Warehouse Operator could not open Materials page** — `GET /product/materials` required `settings.view` only.  
   → Added `RequireAnyPermissions` so warehouse/sales/production can **read** catalog.
3. **Same for products/colors/seasons/stages** used by order/production UIs.
4. **Accountant expense form** needed `GET /settings/expense-categories` without full settings access.  
   → Allowed with `finance.view` / `finance.write`.
5. **Confirm dialog under drawer** — `ConfirmDialog` was `z-50` while `Drawer` is `z-[100]`, so “Yetkazildi qilish” confirm never received clicks from an open order drawer.  
   → Confirm layer raised to `z-[200]` (`confirm-dialog.tsx`).

## Product limitations observed (not fully “2–3 months of history”)

- Most production/sales timestamps are **“now”** — UI does not backdate stage moves/batches.
  True multi-month history still needs either date fields in forms or a controlled seed.
- **Finished goods receipt** stays disabled until stock sits in packing/ombor stage; demo used **stock correction** into Finished Products so delivery rules could be exercised.
- **Client payment form** requires full allocation lines (client + order + split = amount); simple amount-only path is not enough (by design).
- Nested product drawer (detail + variant form) is easy to leave open and block the page for automation/humans.

## How to re-run

```bash
ALLOW_DEMO_RESET=true pnpm db:reset:empty
# start API + web
PLAYWRIGHT_PKG=/tmp/paypoq-pw node scripts/ui-demo-factory-walkthrough.mjs
PLAYWRIGHT_PKG=/tmp/paypoq-pw node scripts/ui-demo-factory-continue.mjs
PLAYWRIGHT_PKG=/tmp/paypoq-pw node scripts/ui-demo-payments-delivery.mjs
```

## Verdict

The empty factory was bootstrapped **only via UI** into a realistic single-branch operation with full operator set, catalog, employees, production volume, clients/orders, suppliers, calculated payroll, **full payment allocation**, and **delivered orders**.  
RBAC/catalog and overlay z-index gaps found in real operator paths were fixed in code.  
Remaining gaps are known product UX constraints (backdating, packing→warehouse receipt path), not bootstrap failures.
