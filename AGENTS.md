# Paypoq OS — AI Agent Instructions

**This file is the canonical instruction set for every AI agent working in this
repository** (Claude Code, Codex, Antigravity, Copilot, Cursor, or a human
following the same rules). Tool-specific files (`CLAUDE.md`,
`.github/copilot-instructions.md`) only point here — never duplicate rules into
them.

Precedence when instructions conflict:

1. The user's explicit request in the current task
2. This file (`AGENTS.md`)
3. `docs/` source-of-truth documents
4. Existing code conventions

If a rule here is wrong or outdated, say so and propose the fix. Do not silently
work around it.

---

## 1. Quick start (first 5 minutes in a new session)

```bash
# 1. Where are we?
git status --short && git log --oneline -5 && git branch --show-current

# 2. Dependencies (pnpm 11.7.0, Node 22.x is the pinned target)
pnpm install

# 3. Database (Docker, already running in most dev setups)
docker ps --format '{{.Names}} | {{.Ports}}'      # expect: sockai-postgres-1 | 55432->5432

# 4. Dev servers (two terminals, or background)
pnpm api:dev     # NestJS on :3001
pnpm dev         # Next.js dev on :3000

# 5. Fast sanity check
curl -s localhost:3001/health && curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/login
```

Local demo logins (**development database only**, never production):
`platform@paypoq.local`, `owner@paypoq.local`, `manager@paypoq.local`,
`seller@paypoq.local`, `warehouse@paypoq.local`, `shift@paypoq.local`,
`accountant@paypoq.local`, `mechanic@paypoq.local` — password `ChangeMe123!`.

---

## 2. Project status

Check `git log --oneline -5` first; this section states the stable picture, not a
commit SHA.

| Area | Status |
| --- | --- |
| Product scope (pilot) | **Closed** — Mobile UX phases 1–8, Day-0 onboarding, production run closure, mechanic provisioning, tenant suspension, payroll UI lifecycle, supplier lifecycle all accepted |
| Deployment/infrastructure | **Hardened** — see §7 invariants and `docs/RELEASE_RUNBOOK_V1.md` |
| Real deployment | **Not performed.** No provider selected; no production environment exists yet |
| Open product decision | **Mechanic Master** role — unresolved product/scope decision, do not implement |
| Physical devices | iPhone Safari / Android Chrome — never tested on real hardware |

Known non-blocking follow-ups: audit event-label localization (P2), payment date
`05:00` display (P3), in-memory auth rate limiter (P2, multi-instance only),
no HSTS on web (P2), no structured logging / error reporting (P2).

---

## 3. Product boundary and source of truth

Paypoq OS is a Manufacturing Operations Platform for sock factories.
It is **not** a generic ERP, **not** a full accounting ledger, **not** an IoT
platform in V1.

Focus: production stage inventory · worker activity · warehouse stock · sales
orders · client debt · supplier debt · payroll · operational dashboards.

Read before any product or architecture decision:

- `docs/product-requirements.md`
- `docs/DOMAIN_MODEL_V1.md`
- `docs/page-map-v1.md`
- `docs/ui-specification-v1.md`
- `docs/codex-master-context-v1.md` (condensed business contract)
- `docs/USER_GUIDE_V1.md` (how the product is installed and operated)
- `docs/BUSINESS_ACCEPTANCE_WALKTHROUGH_V1.md` (requirements vs reality)
- `docs/MVP_KNOWN_LIMITATIONS_V2.md` (what is intentionally missing)
- `docs/RELEASE_RUNBOOK_V1.md` (release, rollback, backup, admin recovery)

If a required rule is missing or ambiguous, **ask** — do not invent business
logic. Do not recreate deleted historical QA/audit docs; keep `docs/` lean.

---

## 4. Repository structure

```text
paypoq-os/
├── docs/                 # product source-of-truth, user guide, runbooks, policies
├── apps/
│   ├── api/              # NestJS + Prisma backend (:3001)
│   ├── web/              # Next.js App Router frontend (:3000)
│   ├── bot/              # Telegram employee/client bot
│   └── mobile/           # Expo React Native foundation
├── packages/shared/      # shared types, constants, Zod schemas, enums
├── scripts/              # acceptance suites, smoke tests, backup/restore
├── configs/              # nginx / PM2 / backup-cron examples
├── docker-compose.yml    # self-hosted runtime (supported)
├── render.yaml           # example manifest only (NOT the pilot target)
└── AGENTS.md
```

---

## 5. Environment facts

| Item | Value |
| --- | --- |
| Package manager | pnpm `11.7.0` (`packageManager` field; use corepack) |
| Node | 22.x is the pinned target (Docker images + CI). Newer local versions usually work |
| API | `http://localhost:3001` (NestJS) |
| Web | `http://localhost:3000` (Next.js) |
| Postgres | Docker container `sockai-postgres-1`, host port **55432** |
| API env | `apps/api/.env` (see `.env.example`) |
| Web env | `apps/web/.env.local` (see `.env.example`) |
| Browser tests | Playwright (`playwright` at repo root); Chromium **and** WebKit |

`NEXT_PUBLIC_*` values are **baked into the browser bundle at build time**. A
runtime env change cannot alter an already-built web bundle — rebuild instead.

---

## 6. Engineering principles

Business first · MVP first · simplicity over complexity · operator-friendly UX ·
Uzbek-first UI · dark mode first · human before IoT · no premature automation.

Avoid: microservices, CQRS, event sourcing, workflow engines, premature Kafka,
unnecessary abstractions.

### Frontend (`apps/web`)

Next.js App Router · TypeScript · Tailwind · shadcn/ui · Zustand for UI state ·
TanStack Query for API state.

- Never calculate business-critical values (payroll, debt, stock totals, finance)
  in the UI. Render backend-calculated values.
- Reuse existing design-system components before creating new primitives.
- Do not add forms, mutations, API calls or business logic unless requested.
- Mobile surfaces: card lists at small widths, desktop tables hidden — see the
  phase suites in §10 before touching list rendering.

### Backend (`apps/api`)

NestJS · PostgreSQL · Prisma · Redis only when genuinely needed.

- Modular monolith; modules aligned with the domain model.
- All business calculations live here.
- Tenant isolation is mandatory on every query.
- Audit important actions (`AuditService.createWithTransaction`) inside the same
  transaction as the mutation.
- No microservices, no Kafka, no IoT in V1.

### Shared (`packages/shared`)

Only shared types, constants, Zod schemas, domain enums. No business services, no
React components, no database logic.

### Cross-domain read models

Read-only projections (dashboards, executive summary, TV, reports) may live in
their own modules (`DashboardModule`, `ReportsModule`, `TvModule`). Read-only
only: no mutations, no orchestration, no ownership transfer.

---

## 7. Production & security invariants (NEVER regress)

These were closed as release blockers after a production readiness audit. Any
change that reintroduces one is a **P0 defect**. `scripts/production-hardening-acceptance.mjs`
enforces them — run it after touching anything in this section.

1. **No mutating or disclosing public health routes.** Only `GET /health`
   (liveness + build SHA) and `GET /health/readiness` are public. There must be
   no HTTP route that runs migrations, creates/resets a platform admin, seeds
   demo data, or discloses tenant/user counts.
2. **No automatic seeding in the API image.** The container entrypoint starts the
   API only. `ALLOW_DEMO_SEED` must never appear in an image or manifest.
   `seed.ts`, `demo-seed.ts` and `empty-seed.ts` refuse `NODE_ENV=production`.
3. **One migration mechanism.** `prisma migrate deploy`, run as an explicit
   release step. `main.ts` must never run migrations; no boot-time migration
   runner; no `|| true` around release commands.
4. **Readiness proves the schema.** `/health/readiness` checks DB connectivity,
   essential tables + migration history, and production secret validity. It must
   return 503 on schema drift, and must never leak table names, SQL or secrets.
   Migration history is compatible only when no migration is failed/unfinished
   and every migration shipped with the build is applied (the database may be
   ahead, for app-only rollback). A **production** API runs the same read-only
   check before `app.listen` and exits non-zero instead of listening when it
   fails or cannot be verified; development/test only warn.
5. **Traffic health checks target `/health/readiness`**, not `/health`.
6. **CORS fails closed in production.** `*`, localhost, empty and non-https
   origins are rejected at startup. Only an explicit https allowlist is valid.
7. **No hosted URL fallbacks.** No hardcoded `onrender.com` (or any host) in
   `client.ts`, `platform-client.ts`, `auth-proxy.ts`, or Dockerfiles. The web
   image refuses to build without `NEXT_PUBLIC_API_URL`.
8. **No default passwords anywhere in a production path.** First platform admin
   is created by `pnpm --filter @paypoq/api bootstrap:platform-admin` with an
   operator-supplied email and password. UI forms must not pre-fill passwords.
9. **Production smoke uses no demo credentials** — all inputs come from env.

### Financial semantics are frozen

Do not change without an explicit, separate approval:

- Expense: requester cannot approve/pay their own request where SoD prohibits it
- Advance: approval and payment separation
- Payroll: calculation, advance deduction floor (final never below 0), approval,
  payment semantics
- Supplier debt formula: purchases − allocated payments
- Pricing: historical price preservation on orders

---

## 8. Release & deployment contract

Full procedure: **`docs/RELEASE_RUNBOOK_V1.md`**. Summary:

```text
accepted SHA → backup (+verify) → prisma migrate deploy (exactly once)
→ [first release only] bootstrap:platform-admin → start API → /health/readiness 200
→ start Web → start Bot last → production smoke → verify BUILD_SHA
```

Deployment model status (do not blur these):

| Config | Status |
| --- | --- |
| `docker-compose.yml` + Dockerfiles | **Supported** (local + single-host pilot) |
| `configs/pm2.ecosystem.config.cjs` + nginx example | **Supported**, example values |
| `render.yaml` | **Example only — not the pilot target** (free plans, no backups) |

No provider has been chosen. Do not deploy anything without an explicit request.
Pilot releases run in a maintenance window; zero-downtime is not supported.

---

## 9. Testing & acceptance discipline

**These rules exist because violating them produced hours of false failures.**

### Always test against a production build, never a long-lived dev server

Browser acceptance suites must run against the built web app:

```bash
# stop `next dev` first — it shares .next with the build
pnpm --filter @paypoq/web build
BUILD_SHA=$(git rev-parse HEAD) PORT=3000 HOSTNAME=127.0.0.1 \
  node apps/web/.next/standalone/apps/web/server.js
```

A `next dev` server that has been running for days recompiles per request and
collapses under sustained multi-browser load: symptoms are
`ERR_NETWORK_IO_SUSPENDED`, `networkidle`/`page.type` timeouts, expired-token
401s, and gate runtimes inflated ~15x. Those are **environment failures, not
product regressions**.

If you rebuild the web app, fully stop the old standalone server (`lsof -nP
-iTCP:3000 -sTCP:LISTEN -t`, then kill by PID) before starting the new one —
a failed restart (`EADDRINUSE`) silently leaves a stale server serving.

### Classify before retrying

Never "retry until green". When a gate fails, classify it:

- **PRODUCT DEFECT** — assertion fails deterministically with correct data
- **HARNESS/LOCATOR DEFECT** — strict-mode violations, ambiguous selectors
- **ENVIRONMENT/TIMING** — timeouts, inflated runtimes, network aborts
- **FIXTURE CONTAMINATION** — leftover rows from an earlier failed run

Fix the correct layer only. Preserve the failing logs as evidence.

### Test authoring rules

- Chromium **and** WebKit for anything user-facing.
- Fixtures own their lifecycle: a suite must be runnable **twice in a row** with
  no manual cleanup. Create disposable tenants and suspend them at the end.
- No `force: true`. No `requestSubmit()`/JS `click()` substituting for a real
  user interaction. The business action under test must be performed through the
  UI; API calls may set up fixtures and verify state afterwards.
- No arbitrary `.first()` / `.nth()` on lists shared with other runs — scope to a
  locator containing that run's unique tag.
- Never mutate the shared demo tenant for infrastructure experiments; create a
  disposable database instead.
- Mobile checks: page-level `scrollWidth === clientWidth`, primary action visible,
  not covered by a footer, hit-testable.

### Fixture contamination (real example)

A crashed run left two ACTIVE `PILOT-Mechanic-*` employees in the demo tenant.
`/production/lookups/employees` orders ACTIVE employees by name, a gate picked
"the first MECHANIC", and "PILOT-…" sorts before "Rustam Mexanik" — so an
unrelated suite failed reproducibly. Clean up via supported endpoints
(`POST /employees/:id/inactivate`, `PATCH /machines/tasks/:id` with a
`resolution`), never direct SQL.

---

## 10. Acceptance gate catalogue

Run with API (:3001) + production web (:3000) up, unless marked static.

| Gate | Command | Notes |
| --- | --- | --- |
| API build | `pnpm --filter @paypoq/api build` | static |
| Web build | `pnpm --filter @paypoq/web build` | static |
| API types | `pnpm --filter @paypoq/api typecheck` | static |
| Web types | `cd apps/web && npx tsc --noEmit` | static |
| Web lint | `pnpm --filter @paypoq/web lint` | static |
| Pilot scope | `pnpm --filter @paypoq/web test:pilot-scope` | static |
| Guide role isolation | `pnpm --filter @paypoq/web test:guide-role` | static |
| Stage movement | `pnpm --filter @paypoq/web test:stage-movement-quantity` | static |
| UI routes | `node scripts/ui-route-case-test.mjs` | |
| Form UX | `node scripts/form-ux-lifecycle-test.mjs` | |
| Mobile E2E | `node scripts/mobile-e2e-suite.mjs` | |
| Hardened mobile UI | `node scripts/mobile-ui-acceptance.mjs` | Chromium + WebKit |
| Mobile business | `node scripts/mobile-business-acceptance.mjs` | |
| Business API/RBAC | `node scripts/business-api-rbac-acceptance.mjs` | Chromium + WebKit |
| Pricing RBAC | `node scripts/pricing-rbac-test.mjs` | |
| Pricing semantics | `node scripts/pricing-semantics-test.mjs` | |
| Phase 2/3/4/5/6/8 | `node scripts/phase{2,3,4,5,6,8}-*.mjs` | mobile surfaces |
| Production run closure | `node scripts/pilot-production-run-closure-acceptance.mjs` | |
| Mechanic provisioning | `node scripts/pilot-mechanic-provisioning-acceptance.mjs` | |
| Tenant suspension | `node scripts/pilot-tenant-suspension-acceptance.mjs` | |
| Day-0 onboarding closure | `node scripts/day0-onboarding-closure-acceptance.mjs` | fresh tenants |
| **Production hardening** | `pnpm test:prod-hardening` | static + disposable DB |

Full regression = every row above exits 0. Report the table with exit codes; use
"FULL REGRESSION GREEN" only when all rows are 0.

CI (`.github/workflows/ci.yml`) enforces three jobs: `build-and-smoke`,
`production-hardening`, and `pilot-acceptance` (Chromium + WebKit browser gates,
PRs into `main` and pushes to `main`).

---

## 11. Data hygiene

Before finishing any task that ran suites:

- No `PLANNED`/`RUNNING`/`HOLD`/`STOPPED` disposable ProductionRuns left
- No `OPEN`/`IN_PROGRESS` disposable maintenance tasks left
- Disposable tenants suspended through the Platform Admin API
- Disposable databases dropped
- Shared demo tenant not used for infrastructure experiments
- No debug scripts, screenshots, dumps or credentials committed
  (`backups/`, `*.dump`, `.env*` are gitignored — keep it that way)

Scratch files belong in the session scratch directory, not the repo.

---

## 12. Git & CI workflow

- Work on a dedicated branch: `feature/…`, `fix/…`, `docs/…`, `infra/…`.
- Small, focused commits; explain **why**, not only what.
- Commit/push only when asked. Never force push.
- Fast-forward `main` only (`git merge --ff-only`), verify with
  `git merge-base --is-ancestor origin/main HEAD` before pushing.
- `main` protection: verify current state with
  `gh api repos/boburonesec/sock/branches/main/protection` (or the REST API).
  Required checks should be the three CI jobs above.
- After pushing, verify `git rev-parse HEAD` equals `git rev-parse origin/main`.

---

## 13. Senior engineering behavior

Agents must not act as blind code generators. For every task:

1. Execute the requested scope exactly — nothing extra.
2. Identify risks, edge cases and better approaches.
3. Separate implemented work from recommendations; never implement
   recommendations without approval.
4. Challenge unclear requirements instead of inventing business logic.
5. Warn about over- and under-engineering, with issue / risk / alternative.
6. Stop and explain if a request conflicts with this file or the product spec.
7. Say when a task should be split.

Report honestly: if a test fails, show the output; if a step was skipped, say so.
Never mask failures, weaken assertions, or claim automation that is not installed.

### Reporting format

- Implemented
- Changed files
- Architecture / design decisions
- Risks and edge cases
- Suggestions (not implemented)
- Intentionally not implemented
- Assumptions
- Build/test results (gate table with exit codes)

---

## 14. Factory zero-setup sequence (no mock data)

1. **Database:** `prisma migrate deploy`, then
   `bootstrap:platform-admin` (production) or `pnpm db:reset:empty` (development).
2. **Platform Admin (`/admin/login`):** create Tenant, Factory, Tenant Owner.
   The system auto-provisions warehouse `Asosiy ombor`, 5 zones, 10 production
   stages, expense categories and RBAC roles.
3. **Master data (`/settings`):** save `DAY` and `NIGHT` work shifts (they are not
   persisted until saved), colors, materials, seasons, products, variants, prices.
4. **Machines & quality (`/machines`):** machines, measurement specifications.
5. **Workforce (`/employees`, `/settings`, `/machines`):** employees, mechanic
   assignments, machine piece rates, stage salary rates.
6. **Warehouse & counterparties:** clients, suppliers, raw-material intake.
7. **Production (`/production`):** select the warehouse handoff stage in
   "Smena yakuni" **before the first shift close**, start runs, receive intake,
   move through stages, hand off to warehouse, then sales → payments → payroll.

Default stage chain:
`Averlog → Dazmol → Sifat → Kiydirish → Par Dazmol → Parlash → Bezak → Etiketka → Qadoqlash → Ombor`

---

## Golden rule

Do not build a generic ERP. Build Paypoq OS according to the product
specification — and never regress §7.
