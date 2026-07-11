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
| Sales orders | 5 | Seller UI |
| Suppliers | 3 | Accountant UI |
| Payroll periods | 1 | Status CALCULATED, work amount 126000 |
| Client payments | 0–pending | Form requires full allocation rows (see below) |
| Expenses / advances | partial | Fixed category permission mid-run |

Screenshots: `docs/demo-walkthrough/`  
Scripts: `scripts/ui-demo-factory-walkthrough.mjs`, `scripts/ui-demo-factory-continue.mjs`

## Staff findings fixed during the run

1. **Drawer backdrop ate clicks** — panel now `z-10`, backdrop separate layer (`drawer.tsx`).
2. **Warehouse Operator could not open Materials page** — `GET /product/materials` required `settings.view` only.  
   → Added `RequireAnyPermissions` so warehouse/sales/production can **read** catalog.
3. **Same for products/colors/seasons/stages** used by order/production UIs.
4. **Accountant expense form** needed `GET /settings/expense-categories` without full settings access.  
   → Allowed with `finance.view` / `finance.write`.

## Product limitations observed (not fully “2–3 months of history”)

- Most production/sales timestamps are **“now”** — UI does not backdate stage moves/batches.
  True multi-month history still needs either date fields in forms or a controlled seed.
- **Finished goods receipt** stays disabled until stock sits in packing/ombor stage (pipeline only partly advanced).
- **Client payment form** requires full allocation lines (client + order + split = amount); simple amount-only path is not enough.
- Nested product drawer (detail + variant form) is easy to leave open and block the page for automation/humans.

## How to re-run

```bash
ALLOW_DEMO_RESET=true pnpm db:reset:empty
# start API + web
PLAYWRIGHT_PKG=/tmp/paypoq-pw node scripts/ui-demo-factory-walkthrough.mjs
PLAYWRIGHT_PKG=/tmp/paypoq-pw node scripts/ui-demo-factory-continue.mjs
```

## Verdict

The empty factory was bootstrapped **only via UI** into a realistic single-branch operation with full operator set, catalog, employees, production volume, clients/orders, suppliers, and a calculated payroll period.  
RBAC/catalog permission gaps found in real operator paths were fixed in code.  
Remaining gaps are known product UX constraints (backdating, payment allocation UI, packing→warehouse step), not bootstrap failures.
