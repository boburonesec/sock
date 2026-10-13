# Web ↔ Native Mobile Parity Matrix (V1)

**Invariant.** If an authenticated tenant user can perform a business operation
in Paypoq Web, they can perform the equivalent operation in Paypoq Native
Mobile, subject to the same role/permission and business rules. UI does not have
to match; capability, permissions, validation, state transitions and business
outcomes do. The API is the single source of business truth for both clients.

This document is the **release checklist for cross-client capability**. A change
that adds or alters a tenant-facing capability updates the row here in the same
PR (see `AGENTS.md` §15).

Out of scope by decision: Factory TV kiosk (`/tv`), Platform Super Admin
(`/admin`).

## Definition of COMPLETE

A row is `COMPLETE` only when Mobile has every piece Web has:

| Required | Meaning |
| --- | --- |
| List / overview, detail | Same data the Web screen shows (layout may differ) |
| Create / edit / business actions | Every state transition Web offers, same API endpoint |
| Validation | Same backend validation; client checks only pre-explain it |
| Permissions | Affordance hidden without permission; deep route shows an explicit denied state |
| States | Loading, empty, API error with the server's message, success feedback |
| Safety | Confirmation for irreversible actions; double-submit guard; refetch after write |

`PARTIAL` = some of the above exists (a read-only summary never counts as parity
for a Web write workflow). `MISSING` = nothing on Mobile. `NOT APPLICABLE` = no
tenant Web capability to match, or excluded by product decision.

## Baseline (after Wave 1)

| Domain | Groups | COMPLETE | PARTIAL | MISSING | N/A |
| --- | ---: | ---: | ---: | ---: | ---: |
| Identity / common | 6 | 2 | 2 | 1 | 1 |
| Dashboards | 2 | 2 | 0 | 0 | 0 |
| Attendance | 1 | 0 | 0 | 1 | 0 |
| Employees | 5 | 0 | 0 | 5 | 0 |
| Production | 12 | 11 | 0 | 0 | 1 |
| Machines / Mechanic | 16 | 15 | 0 | 0 | 1 |
| Warehouse | 6 | 6 | 0 | 0 | 0 |
| Sales | 11 | 1 | 0 | 10 | 0 |
| Finance | 11 | 1 | 0 | 10 | 0 |
| Reports / Audit | 2 | 0 | 0 | 2 | 0 |
| Settings | 13 | 0 | 0 | 13 | 0 |
| Excluded surfaces | 4 | 0 | 0 | 0 | 4 |
| **Total** | **89** | **38** | **2** | **42** | **7** |

The original source baseline counted 6 `COMPLETE` groups (login/session, navigation, two
dashboards, sales and finance overviews) and every Production, Warehouse and
Machines/Mechanic group was `MISSING` or a read-only summary. Login/session is
now conservatively `PARTIAL` until native runtime acceptance is recorded.

## Matrix

Mobile routes are relative to `apps/mobile/app/(app)/`. Permissions are the
effective API permission (`packages/shared/src/endpoints.ts` for Wave 1).

### Identity / common

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Login, logout, session refresh/restore | `/login`, `stores/auth-store.ts` | Web: cookie `/auth/*`; Native: `POST /auth/native/login`, `/auth/native/refresh`, `/auth/native/logout`; shared `GET /auth/me` | credential/session validated by AuthService | PARTIAL | PR 01 source + local gates implemented; native OS/device acceptance pending |
| Permission-aware navigation + deep-route guard | `lib/access-control.ts`, `lib/pilot-scope.ts` | `GET /auth/me` | per area | COMPLETE | Rules shared via `@paypoq/shared` (`access.ts`) |
| Active factory switch | sidebar, topbar, `/profile` | `X-Factory-Id` header | accessible factory | COMPLETE | `more/profile` |
| Profile | `/profile` | `GET /auth/me`, `POST /telegram/link-tokens/me` | authenticated | PARTIAL | Wave 4: personal Telegram link code |
| Notifications | `/notifications` | `GET /notifications`, `PATCH /notifications/:id/read` | authenticated | MISSING | Wave 4 |
| Employee self-service (own work, payroll, advances) | — (Telegram bot) | `GET /mobile/employee/*` | linked employee | NOT APPLICABLE | Mobile-only capability; no Web screen to match |

### Dashboards

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Executive dashboard | `/dashboard/executive` | `GET /dashboard/executive-summary` | `dashboard.view` | COMPLETE | `home/executive` |
| Operations dashboard | `/dashboard/operations` | `GET /production/operations-summary` | `dashboard.view` + `production.view` | COMPLETE | `home/operations-summary` |

### Attendance

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Attendance overview | `/attendance` | `GET /attendance/overview` | `attendance.view` | MISSING | Wave 3 |

### Employees

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Employee list + details (work, payroll, bonuses, penalties, advances tabs) | `/employees` | `GET /employees`, finance reads | `employees.view` | MISSING | Wave 3 |
| Create / edit / inactivate employee | `/employees` drawer | `POST /employees`, `PATCH /employees/:id`, `POST /employees/:id/inactivate` | `employees.write` | MISSING | Wave 3 |
| Employee Telegram link code | employee drawer | `POST /telegram/link-tokens/employees/:id` | `employees.write` | MISSING | Wave 3 |
| Bonuses list | `/employees/bonuses` | `GET /finance/bonuses` | `finance.view` | MISSING | Wave 3 |
| Penalties list | `/employees/penalties` | `GET /finance/penalties` | `finance.view` | MISSING | Wave 3 |

### Production — Wave 1

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Production board (KPIs, stage flow) | `/production` `production-board.tsx` | `GET /production/operations-summary`, `/stage-inventory` | `production.view` | COMPLETE | `operations/production` |
| Product breakdown per stage | `product-breakdown.tsx` | `GET /production/stage-inventory` | `production.view` | COMPLETE | `operations/production/stage/[stageId]` |
| Move to next stage (worker shares) | action drawer `move-stage` | `POST /production/stage-movements` | `production.write` | COMPLETE | `operations/production/move` |
| Additional worker activity | action drawer `add-activity` | `POST /production/worker-activities` | `production.write` | COMPLETE | `operations/production/activity` |
| Register defect | action drawer `register-defect` | `POST /production/defects` | `production.write` | COMPLETE | `operations/production/defect` |
| Receive finished goods into warehouse | action drawer `receive-finished` | `POST /warehouse/finished-product-receipts` | `warehouse.write` | COMPLETE | `operations/production/receive-finished` |
| Recent movements + worker activity | board sections | `GET /production/recent-movements`, `/worker-activities` | `production.view` | COMPLETE | `operations/production/history` |
| Report a mistake (correction request) | `CorrectionRequestButton` | `POST /recovery/correction-requests` | `production.write` | COMPLETE | sheet on `history` |
| Correction manager queue (resolve) | `CorrectionManagerQueue` | `GET /recovery/correction-requests`, `POST …/:id/resolve` | `production.approve` (supplier: `expense.approve`) | COMPLETE | `operations/production/corrections` |
| Shift close: readiness, submit, accept, return | `shift-reconciliation-panel.tsx` | `GET/POST /production/shift-reconciliations/*`, `/shift-context` | `production.write`; accept: `production.approve` | COMPLETE | `operations/production/shift-close` |
| Warehouse handoff stage setting | shift panel | `GET/PATCH /production/warehouse-handoff-stage` | `production.approve` | COMPLETE | `operations/production/shift-close` |
| Legacy manual batch intake | no Web entry point | `POST /production/batches` | `production.write` | NOT APPLICABLE | Not reachable in Web; do not add |

### Machines / Mechanic — Wave 1

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Machines, state, assignments | `/machines` (pickers) | `GET /machines` | `machines.view` | COMPLETE | `operations/machines`, `machines/[machineId]` |
| Active production runs | `/machines#machine-output` | `GET /production/runs` | `production.view` | COMPLETE | `operations/machines` |
| Start machine run | workflow `start-run` | `POST /production/runs` | `production.write` | COMPLETE | `machines/start-run` |
| Receive machine output (idempotent) | run row | `POST /production/runs/:id/intakes` | `production.write` | COMPLETE | `machines/run/[runId]` |
| Complete run (confirmed) | run row + confirm dialog | `PATCH /production/runs/:id/status` | `production.write` | COMPLETE | `machines/run/[runId]` |
| Create machine | workflow `create-machine` | `POST /machines` | `machines.write` | COMPLETE | `machines/new` |
| Assign mechanic to machine + shift | workflow `assign-mechanic` | `POST /machines/assignments` | `machines.write` | COMPLETE | `machines/assign` |
| Machine piece rate | workflow `piece-rate` | `POST /machines/piece-rates` | `machines.write` | COMPLETE | `machines/piece-rate` |
| Assign maintenance task | workflow `maintenance-task` | `POST /machines/tasks` | `maintenance.write`, not Mechanic | COMPLETE | `machines/task` |
| Inspection slot schedule | workflow `inspection-slots` | `POST /machines/inspection-slots` | `quality.write`, not Mechanic | COMPLETE | `machines/inspection-slots` |
| Measurement specification (create + activate) | workflow `measurement-spec` | `POST /machines/products/:id/specifications`, `…/activate` | `quality.write`, not Mechanic | COMPLETE | `machines/measurement-spec` |
| Mechanic workspace: today's rounds, results | `/mechanic` | `GET /machines/inspection-rounds/mine` | `quality.view` | COMPLETE | `operations/mechanic` |
| Enter measurements | `InspectionForm` | `POST /machines/inspection-rounds/:id/measurements` | `quality.write` | COMPLETE | `mechanic/round/[id]` |
| Quality issue recheck + hold run (confirmed) | `RecheckForm` | `GET /machines/quality-issues`, `POST …/recheck`, `…/hold` | `quality.write`; hold: `production.write` | COMPLETE | `mechanic/issue/[id]` |
| Maintenance tasks: start, complete (confirmed) | `/mechanic` tasks | `GET /machines/tasks`, `PATCH /machines/tasks/:id` | `maintenance.view` / `maintenance.write` | COMPLETE | `mechanic/task/[id]` |
| Mechanic Master scope | — | — | — | NOT APPLICABLE | Unresolved product role; not implemented on either client |

### Warehouse — Wave 1

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Stock overview (KPIs, low stock, product + material stock) | `/warehouse` | `GET /warehouse/stock-summary`, `/stock`, `/material-stock` | `warehouse.view` | COMPLETE | `operations/warehouse` |
| Materials list + details | `/warehouse/materials` | `GET /warehouse/material-stock` | `warehouse.view` | COMPLETE | `warehouse/materials`, `warehouse/material/[id]` |
| Material receipt | receipt drawer | `POST /warehouse/material-receipts` | `warehouse.write` | COMPLETE | `warehouse/receive-material` |
| Stock correction (confirmed) | correction drawer | `POST /warehouse/stock-corrections` | `warehouse.write` | COMPLETE | `warehouse/correct` |
| Movements list + details | `/warehouse/movements` | `GET /warehouse/movements` | `warehouse.view` | COMPLETE | `warehouse/movements`, `warehouse/movement/[id]` |
| Zones list + details | `/warehouse/zones` | `GET /warehouse/stock-summary`, `/zones` | `warehouse.view` | COMPLETE | `warehouse/zones`, `warehouse/zone/[id]` |

### Sales — Wave 2

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Sales overview | `/sales` | `GET /sales/summary` | `sales.view` | COMPLETE | `sales` |
| Clients list + details | `/sales/clients` | `GET /sales/clients` | `sales.view` | MISSING | Wave 2 |
| Create / edit / archive client | client drawer | `POST /sales/clients`, `PATCH …/:id`, `POST …/:id/archive` | `sales.write` | MISSING | Wave 2 |
| Client Telegram link code | client drawer | `POST /telegram/link-tokens/clients/:id` | `sales.write` | MISSING | Wave 2 |
| Orders list + details | `/sales/orders` | `GET /sales/orders` | `sales.view` | MISSING | Wave 2 |
| Create / edit order (historical price) | order drawer | `POST /sales/orders`, `PATCH …/:id`, `GET /product/variants/:id/active-price` | `sales.write` | MISSING | Wave 2 |
| Cancel order | orders module | `POST /sales/orders/:id/cancel` | `sales.write` | MISSING | Wave 2 |
| Delivery confirmation / delivery return | delivery drawer | `POST /sales/orders/:id/deliver`, `…/return-delivery` | `sales.write` | MISSING | Wave 2 |
| Payments list, details, create | `/sales/payments` | `GET/POST /sales/payments` | `sales.view` / `sales.write` | MISSING | Wave 2 |
| Payment reversal | reverse dialog | `POST /sales/payments/:id/reverse` | `sales.write` | MISSING | Wave 2 |
| Client debts | `/sales/debts` | `GET /sales/debts` | `sales.view` | MISSING | Wave 2 |

### Finance — Wave 3

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Finance overview | `/finance` | `GET /finance/summary` | `finance.view` | COMPLETE | `finance` |
| Expenses: list, create, cancel | `/finance/expenses` | `GET/POST /finance/expenses`, `…/:id/cancel` | `finance.view` / `finance.write` | MISSING | Wave 3 |
| Expenses: approve, reject, pay (SoD) | expense card | `POST /finance/expenses/:id/approve`, `/reject`, `/pay` | `expense.approve`, `expense.pay` | MISSING | Wave 3 |
| Advances: list, create | `/finance/advances` | `GET/POST /finance/advances` | `finance.view` / `finance.write` | MISSING | Wave 3 |
| Advances: approve, reject, pay | advances table | `POST /finance/advances/:id/approve`, `/reject`, `/pay` | `expense.approve`, `expense.pay` | MISSING | Wave 3 |
| Payroll periods: create, calculate, close, approve | `/finance/payroll` | `POST /finance/payroll-periods…` | `finance.write`, `payroll.approve` | MISSING | Wave 3 |
| Payroll items + readiness | payroll module | `GET /finance/payroll-periods/:id/items`, `/readiness` | `finance.view` | MISSING | Wave 3 |
| Payroll payment | payment drawer | `POST /finance/payroll-periods/:id/pay` | `expense.pay` | MISSING | Wave 3 |
| Bonus / penalty adjustments | adjustment drawer | `POST /finance/bonuses`, `/penalties` | `finance.write` | MISSING | Wave 3 |
| Suppliers + purchases | `/finance/suppliers` | `GET/POST /supplier/suppliers`, `PATCH`, `/archive`, `/purchases` | `finance.view` / `finance.write` | MISSING | Wave 3 |
| Supplier payments, debts, payment correction request | supplier drawers | `GET/POST /supplier/payments`, `GET /supplier/debts`, `POST /recovery/correction-requests` | `finance.view` / `finance.write` | MISSING | Wave 3 |

### Reports / Audit — Wave 4

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Reports overview | `/reports` | `GET /reports/overview` | `reports.view` | MISSING | Wave 4 |
| Audit log | `/audit` | `GET /audit/logs` | `audit.view` | MISSING | Wave 4 |

### Settings — Wave 4

| Capability | Web route / component | API | Permission | Mobile | Parity action |
| --- | --- | --- | --- | --- | --- |
| Settings overview | `/settings` | `GET /settings/overview` | `settings.view` | MISSING | Wave 4 |
| Company: factories, users, managers, password reset, employee link, factory access | `/settings/company` | `/organization/*` | Owner only | MISSING | Wave 4 |
| Products, variants, prices | `/settings/products` | `/product/products`, `/variants`, `/prices` | `settings.view` / `settings.write` | MISSING | Wave 4 |
| Materials | `/settings/materials` | `/product/materials` | `settings.write` | MISSING | Wave 4 |
| Colors | `/settings/colors` | `/product/colors` | `settings.write` | MISSING | Wave 4 |
| Seasons | `/settings/seasons` | `/product/seasons` | `settings.write` | MISSING | Wave 4 |
| Stages | `/settings/stages` | `/product/stages` | `settings.write` | MISSING | Wave 4 |
| Work shifts | `/settings/shifts` | `GET/PUT /settings/work-shifts` | `settings.write` | MISSING | Wave 4 |
| Zones (read-only) | `/settings/zones` | `GET /warehouse/zones` | `settings.view` | MISSING | Wave 4 (data already under Warehouse → Zonalar) |
| Low-stock thresholds | `/settings/thresholds` | `GET/PUT /warehouse/low-stock-thresholds` | `warehouse.write` | MISSING | Wave 4 |
| Salary rates | `/settings/salary-rates` | `GET/POST /settings/salary-rates`, `…/archive` | `settings.write` | MISSING | Wave 4 |
| Expense categories + roles/permissions (read-only) | `/settings/expense-categories`, `/settings/roles` | `GET /settings/expense-categories`, `/roles`, `/permissions` | `settings.view` | MISSING | Wave 4 |
| Telegram settings + Factory TV credential | `/settings/telegram`, `/settings/factory-tv` | `/telegram/*`, `/dashboard/factory-tv-credential` | `settings.view` / `settings.write`, `dashboard.view` | MISSING | Wave 4 |

### Excluded surfaces

| Capability | Web route | Mobile | Reason |
| --- | --- | --- | --- |
| Factory TV kiosk | `/tv` | NOT APPLICABLE | Excluded from phone parity |
| Platform Super Admin | `/admin/*` | NOT APPLICABLE | Not tenant-facing |
| Web onboarding guide | `/guide` | NOT APPLICABLE | Describes Web navigation; revisit if a Mobile guide is wanted |
| Design system page | `/design-system` | NOT APPLICABLE | Developer reference |

## Deliberate differences (same outcome, different UX)

| Area | Web | Mobile | Why |
| --- | --- | --- | --- |
| Stage movement field order | product → source stage | source stage → product | Entry from a stage card; same payload |
| Shift accept | immediate | confirmation sheet | Accepted shifts cannot be reopened |
| Stock correction | immediate | confirmation sheet with current vs new quantity | Overwrites stock quantity |
| Machine output intake retry | new idempotency key per click | key reused until the quantity is edited | A timed-out request that reached the API is not recorded twice |
| Cancelled maintenance task | still offers "complete" | read-only | Web behaviour looks unintended; API unchanged |
| Machines list | only inside pickers | list + detail screen | Brief asks for machine state/details; same `GET /machines` data |
| Active factory after token refresh | resets to the default factory | keeps the selected factory | Avoids writing to the wrong factory mid-task |

## Anti-drift mechanics

| Mechanism | Where | Enforced by |
| --- | --- | --- |
| Permission keys, role names | `packages/shared/src/permissions.ts` | `pnpm test:shared-contracts` vs `apps/api/src/common/role-permissions.ts` |
| Area permissions + pilot role scope | `packages/shared/src/access.ts` | Used by Web (`access-control.ts`, `pilot-scope.ts`) and Mobile (`useAccess`) |
| Endpoint → permission contract | `packages/shared/src/endpoints.ts` | `pnpm test:shared-contracts` vs API controller decorators; unclassified new routes fail |
| Request/response types, status enums | `packages/shared/src/contracts/*` | Imported by both clients; enums checked against `schema.prisma` |
| Uzbek status labels | `packages/shared/src/labels.ts` | Web re-exports, Mobile imports |
| Mobile deep-route guards, route integrity | `apps/mobile/scripts/unit-test.mjs` | `pnpm mobile:test` |

## Release checklist (per PR that touches a tenant capability)

1. Backend contract / business rule (if needed).
2. `packages/shared`: types, endpoint permission entry.
3. Web implementation.
4. Mobile implementation — or an explicit exemption recorded in this file.
5. This matrix updated (state + route).
6. Gates: `pnpm test:shared-contracts`, `pnpm mobile:typecheck`, `pnpm mobile:lint`,
   `pnpm mobile:test`, plus the Web gates the change affects.

## PR 01 session readiness — 12 October 2026 (Asia/Tashkent)

This section describes the uncommitted working tree on
`feature/mobile-parity-wave1`, based on HEAD
`270e111cf2c26691ed5b28d284d16c0398e00d06`; HEAD alone does not identify the
implementation. Other matrix classifications describe source capabilities,
not native release/device acceptance.

Verified source failures were unconditional logout on refresh network/5xx,
unfenced late login/refresh responses, account-unsafe request replay and
employee-profile-dependent logout UI. Native cookie persistence was unverified,
not proven broken. The native JSON adapter makes refresh persistence explicit
in SecureStore while preserving the Web cookie controller/BFF behavior.
Shared auth context includes `branchMode`; no schema or business-rule changes.

Local evidence: 36 production store/client/storage integration checks plus 15
existing Mobile checks, 13 shared-contract checks, API types/build, Mobile
types/lint, Web types/lint/build/proxy checks, Android Metro export, 70 production
hardening checks, and disposable-database native API + production-built Web
Chromium/WebKit auth acceptance. The live suite passes twice consecutively;
tenants are suspended and databases dropped. These are local checks under Node
24.18.0 / pnpm 11.7.0, not CI or Node 22 results. Early harness failures were
classified and corrected (ambiguous logout locator; suspended refresh expects
403); assertions were not relaxed and timeouts were not increased.

Pending native acceptance on **both** iOS and Android: HTTPS login, access expiry,
background renewal, process kill/relaunch, rotated credential persistence,
network loss/5xx recovery, concurrent 401, logout during login/refresh, offline
logout followed by restart, OS storage rejection/lock, and account switching
with pending writes. No usable Xcode simulator tooling or Android SDK/adb was
available for this session. No physical-device test or signed release build is
claimed. An Android Metro export proves module resolution only.

Offline logout cannot guarantee server revocation. Lost rotation responses may
require fresh login; the server successor expires under the existing policy.
If every OS persistence operation fails, local memory is cleared but durable
logout cannot be guaranteed; the recovery warning makes this explicit. See
`apps/mobile/README.md` for the storage timeout/late-write behavior and upgrade
login requirement.

**PR 01:** implementation and local evidence complete; strict runtime Definition
of Done remains open. **PR 02:** source work can begin on this foundation;
factory persistence, session/factory query identities, stale drafts and native
context acceptance must still be implemented and verified before release.
PR 03 and new business-feature waves were not implemented in this change.
