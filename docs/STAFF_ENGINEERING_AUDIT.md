# Paypoq OS Staff Engineering Audit

**Audit date:** 2026-08-06  
**Repository:** Paypoq OS (`main`)  
**Method:** repository-wide staff engineering review, static source tracing, local build/test execution, and non-production database acceptance checks

## Executive decision

**Engineering recommendation (ASSUMPTION / risk judgment, not a repository-verifiable fact): NO-GO for an uncontrolled production launch; CONDITIONAL GO for a single-factory, supervised pilot after the P0 gates below are closed.**

Source review found a modular-monolith structure and implementations for tenant/factory context, DTO validation, supplier-payment idempotency, secret validation, refresh cookies and audit records. The commands recorded in this audit reported successful builds and selected business-rule suites. The broader phrase “materially sound” from the first edition was removed because it was an assessment, not a directly provable statement.

The release recommendation is based on two source-verified High findings (Factory TV context and finance separation of duties), seven source/document/command-verified Medium findings, and three High-risk concurrency candidates that still require controlled reproduction. The delivery policy contradiction is documentation-verified. The acceptance seed failure was command-verified in this session.

## Scope and evidence standard

Reviewed:

- product requirements, domain model, page map, UI specification, master context, user guide, business acceptance walkthrough, active correction/delivery/payment policies, known limitations and GO decision;
- NestJS modules, guards, permissions, DTO validation, auth/session paths, tenant/factory scoping, Prisma schema/migrations and transaction-heavy finance/stock flows;
- Next.js API integration and selected client-side calculations;
- Telegram bot linking, identity checks, internal API boundary and privacy handling;
- Expo mobile authentication/session foundation;
- Docker, PM2, secrets, backup/restore, pilot and Telegram runbooks;
- local builds, lint, targeted tests, database migrations, API acceptance and browser smoke harnesses.

A finding is marked **confirmed** only where the repository or an executed local test demonstrates the failure path. Production infrastructure, external Telegram delivery, real-device cookie behavior, off-host backups and live restore were not available and are not represented as verified.

### Self-audit classification rules

This revision audits the evidence language of the first edition. The following rules classify **every statement in this report**, including statements without a repeated inline label:

- Metadata describing the audit date, repository and review method is **VERIFIED** by this task record.
- A finding’s `Classification` governs its title, evidence, source-observed/actual behavior and root-cause statement. Mixed classifications are explicitly split.
- File/line citations are **VERIFIED BY SOURCE CODE** or **VERIFIED BY DOCUMENTATION**. They identify evidence reviewed in the original audit; this self-audit did not reopen application code.
- A quoted command result is **VERIFIED BY COMMAND OUTPUT** from this task session. Unless stated otherwise, raw logs were not persisted in the repository, so the claim is not independently provable from the two reviewed Markdown files alone.
- An unexecuted reproduction scenario is **REQUIRES MANUAL TEST**. It is not proof that the proposed outcome occurred.
- Severity, business impact, prioritization, expected behavior, recommended fixes, regression-test proposals and the GO/NO-GO decision are **ASSUMPTION**: engineering judgments derived from evidence, not facts mechanically proved by the repository.
- “Affected scope” is **VERIFIED BY SOURCE CODE** only to the extent expressed by the cited tenant/factory predicates; claims about real deployed users or tenants are **REQUIRES MANUAL TEST**.
- Statements that no issue was found across an entire category are **NOT SUPPORTED** unless an exhaustive method and artifact are provided. This audit makes no such exhaustive claim.
- Deferred attack possibilities are **SPECULATION** until a separate scan or manual test validates them; they are listed as test scope, not findings.

## Audit Environment Limitations

Codex Security Deep Scan was not part of this audit because it requires a separate managed read-only filesystem session. This report is **not an exhaustive security scan**. It includes an evidence-based manual review of authentication, authorization, tenant isolation, DTO validation, sensitive endpoints, secret handling, cookies/JWTs, CORS/CSRF, Prisma usage and sensitive logging.

Tests used only the local development PostgreSQL database at `localhost:55432/paypoq_os`. No production database was contacted. Existing development processes on ports 3000 and 3001 were preserved. Browser suites could not be accepted as current UI evidence because the existing port-3000 Next process served stale build assets; a temporary fresh web process on port 3020 was then rejected by the configured CORS allowlist. No conclusion below relies on those browser failures as proof of an application defect.

Dependency audit results identify vulnerable packages in the resolved graph; they do not by themselves establish reachable exploitation. A separate Deep Security Scan must perform reachability and attack-path validation.

## Architecture and product consistency

The repository follows the intended modular monolith: business ownership remains in production, warehouse, sales, supplier, finance, employee and machine modules; dashboard/report/TV paths are read-oriented. Prisma tenant-aware compound keys and explicit `tenantId`/`factoryId` filters are used consistently in the sampled sensitive services. The production and supplier suites demonstrate meaningful negative-stock, over-allocation, idempotency, locking and rollback coverage.

Material deviations are recorded as findings. The largest architecture violation is the public Factory TV projection’s dependency on `DevContextService`; the largest product-policy divergence is inconsistent unpaid-delivery documentation. The web also calculates a finance KPI from the currently loaded collection, contrary to the backend-authoritative totals rule.

## Findings and validation status

### F-01 — Factory TV is bound to the deterministic demo tenant and factory

- **Severity:** High
- **Confidence:** High
- **Classification:** VERIFIED BY SOURCE CODE
- **Command output:** Not applicable; the no-demo and cross-tenant runtime scenarios were not executed.
- **Area:** tenant isolation / production architecture
- **Evidence:** `apps/api/src/modules/dashboard/dashboard.service.ts:232-241`; `apps/api/src/common/dev-context/dev-context.service.ts:4-5,15-20,26-64`
- **Relevant path:** token-protected `GET /dashboard/factory-tv` → `DashboardService.getFactoryTvSummary()` → `DevContextService.getFactoryContext()` → tenant id `seed-demo-paypoq-factory` and factory name `Main Factory` → production/warehouse summaries.
- **Reproduction/failure scenario:** source inspection shows that no-demo data reaches an explicit `ServiceUnavailableException`, while existing demo data resolves the fixed demo context. The HTTP-level no-demo and two-tenant scenarios still require manual execution.
- **Expected:** a TV credential is bound server-side to one explicit active tenant/factory, and cannot resolve another tenant.
- **Actual:** a single global token authorizes a hard-coded development context.
- **Affected scope:** every production tenant using Factory TV; multi-tenant installations are especially affected.
- **Business impact:** unavailable or wrong-factory production/stock data on the factory floor; potential cross-tenant display if demo records coexist with real data.
- **Root cause:** a temporary development resolver remained in a production-facing read model.
- **Recommended fix:** replace the global token with hashed, revocable TV credentials carrying tenant/factory scope; resolve only that scope, support rotation/expiry, and audit use without logging the token.
- **Regression tests:** no-demo production context returns a configuration-safe error; two tenants/two TV credentials never cross; revoked/expired/wrong token fails; browser bundle remains token-free.

### F-02 — Required manager/accountant separation of duties is not enforced

- **Severity:** High
- **Confidence:** High
- **Classification:** VERIFIED BY SOURCE CODE and VERIFIED BY DOCUMENTATION
- **Command output:** Not applicable; the same-actor end-to-end workflow was not executed during this audit.
- **Area:** RBAC / financial control
- **Evidence:** `docs/product-requirements.md` (manager approval/accountant payment); `apps/api/src/common/role-permissions.ts:38-60`; `apps/api/src/modules/finance/finance.controller.ts:45-69,100-124`; `apps/api/src/modules/finance/finance.service.ts:219-255,1277-1348`; acknowledged in `docs/MVP_KNOWN_LIMITATIONS_V2.md`.
- **Reproduction/failure scenario:** a Manager or Accountant with `finance.write` creates, approves and pays the same expense/advance using the three endpoints.
- **Expected:** Manager approves; Accountant pays only after approval; the requester/approver/payer constraints follow policy.
- **Actual:** all mutations require the same `finance.write` permission and transitions do not verify actor role or actor separation.
- **Affected scope:** all tenants and finance users with `finance.write`.
- **Business impact:** one compromised or dishonest account can originate and complete a cash outflow without independent approval.
- **Root cause:** coarse permission design represents a workflow with one capability.
- **Recommended fix:** introduce explicit `finance.request`, `finance.approve`, and `finance.pay` permissions; enforce allowed actor combinations in the service transaction; preserve immutable approval/payment evidence.
- **Regression tests:** role matrix for every transition; same-actor rejection where policy requires; approve-before-pay; tenant/factory isolation; audit actor assertions.

### F-03 — Payroll payment code has a concurrency-risk pattern

- **Severity:** High
- **Confidence:** Medium pending reproduction
- **Classification:** REQUIRES MANUAL TEST
- **Command output:** None; no barrier-controlled concurrent payroll test was run.
- **Area:** payroll correctness / concurrency
- **Evidence:** `apps/api/src/modules/finance/finance.service.ts:997-1124`
- **Source-to-sink:** `POST /finance/payroll-periods/:id/pay` → read `PayrollItem.remainingAmount` → validate amount → create `PayrollPayment` → unconditional item snapshot update → aggregate period totals.
- **Reproduction/failure scenario:** send two parallel payments for the same item, each small enough for the same pre-read remaining balance. Both transactions can create payment rows and write totals derived from stale values.
- **Expected:** payments serialize; sum of immutable payments equals item `paidAmount`; remaining never becomes inaccurate or negative.
- **Source-observed behavior:** the cited path shows no explicit row lock, serializable isolation, conditional compare-and-set, or idempotency key. Whether the proposed interleaving produces the stated database result must be established by a controlled concurrent test.
- **Affected scope:** one payroll item and its period within one tenant/factory.
- **Business impact:** duplicate salary disbursement, incorrect outstanding payroll and irreconcilable financial records.
- **Root cause:** read-check-write over mutable balances without concurrency control.
- **Recommended fix:** lock the payroll item in stable order or use serializable retry/atomic conditional update; derive totals from the payment ledger; require idempotency keys.
- **Regression tests:** barrier-controlled parallel equal/overlapping payments; duplicate-key replay; invariant `SUM(payment)=paidAmount`; rollback and Decimal boundary cases.

### F-04 — Expense and advance transitions have a concurrency-risk pattern

- **Severity:** High
- **Confidence:** Medium pending reproduction
- **Classification:** REQUIRES MANUAL TEST
- **Command output:** None; no parallel approve/reject test was run.
- **Area:** finance state integrity
- **Evidence:** `apps/api/src/modules/finance/finance.service.ts:1277-1348` and `:1351-1430`
- **Reproduction/failure scenario:** concurrently approve and reject the same REQUESTED advance/expense. Both transactions can read REQUESTED, both write, and both create audit records; last commit determines the visible state.
- **Expected:** exactly one transition wins and the loser receives 409.
- **Source-observed behavior:** status is checked on a prior read, followed by `update` keyed only by id. A contradictory committed outcome was not reproduced in this audit.
- **Affected scope:** one financial record in a tenant/factory.
- **Business impact:** contradictory approval evidence, incorrect payment eligibility and unreliable audit history.
- **Root cause:** state transition lacks a conditional `where status=fromStatus`, lock, or serializable retry.
- **Recommended fix:** atomic conditional transition (`updateMany` plus affected-row check) or row lock; keep audit creation in the same transaction.
- **Regression tests:** parallel approve/reject and approve/cancel; one success only; final state/audit consistency.

### F-05 — Refresh-token rotation has a concurrent-reuse risk pattern

- **Severity:** High
- **Confidence:** Medium pending reproduction
- **Classification:** REQUIRES MANUAL TEST
- **Command output:** None; no parallel refresh-rotation test was run.
- **Area:** authentication / session replay
- **Evidence:** `apps/api/src/modules/identity/auth/auth.service.ts:153-202` (equivalent platform-auth flow also requires review).
- **Source-to-sink:** refresh cookie → token hash/session lookup → validity check → unconditional session revocation update → new refresh session creation.
- **Reproduction/failure scenario:** submit the same valid refresh cookie in two parallel requests before either transaction commits. Both can pass the precondition and mint distinct live successor sessions.
- **Expected:** refresh tokens are single-use; exactly one rotation succeeds and reuse triggers rejection/family response.
- **Source-observed behavior:** revocation is not expressed as a conditional consume and the transaction does not explicitly request serializable isolation or a row lock. Multiple live successors were not reproduced in this audit.
- **Affected scope:** the compromised user session; platform-admin sessions may share the pattern.
- **Business impact:** a stolen refresh token can retain access after the legitimate client rotates it.
- **Root cause:** non-atomic check-and-consume.
- **Recommended fix:** conditional consume on `revokedAt IS NULL` or row lock/serializable transaction; model token families and revoke the family on detected reuse.
- **Regression tests:** two parallel rotations yield one 200/one 401; old-token replay; family revocation; logout race; repeat for platform auth.

### F-06 — Tenant-valid duplicate emails lock both users out

- **Severity:** Medium
- **Confidence:** High
- **Classification:** VERIFIED BY SOURCE CODE
- **Command output:** None; the result follows from the cited uniqueness and login-query branches, but an end-to-end duplicate-email test was not run.
- **Area:** authentication / multi-tenancy
- **Evidence:** `apps/api/prisma/schema.prisma:426-485`; `apps/api/src/modules/identity/auth/auth.service.ts:83-109`
- **Reproduction/failure scenario:** create the same normalized email in two tenants (allowed by `@@unique([tenantId,email])`), then log in using email/password. The global lookup takes two rows and rejects ambiguity.
- **Expected:** every database-valid active user has an unambiguous login method.
- **Actual:** the login identifier omits tenant while the uniqueness boundary includes tenant.
- **Affected scope:** every user sharing an email across tenants.
- **Business impact:** account lockout and support escalation during multi-tenant onboarding.
- **Root cause:** authentication identity model and database uniqueness model disagree.
- **Recommended fix:** product decision required: add tenant slug/code to login, or enforce global normalized-email uniqueness with migration and onboarding validation.
- **Regression tests:** same-email cross-tenant login contract; normalization/case; deleted/inactive users; migration collision handling.

### F-07 — Demo/acceptance seed is not repeatable after supplier payments

- **Severity:** Medium
- **Confidence:** High
- **Classification:** VERIFIED BY COMMAND OUTPUT and VERIFIED BY SOURCE CODE
- **Command output:** `PrismaClientKnownRequestError`, code `P2003`, constraint `SupplierPaymentIdempotency_paymentId_fkey`; command exited 1.
- **Area:** QA / deployment safety
- **Evidence:** `apps/api/prisma/demo-seed.ts:612-621`; `apps/api/prisma/schema.prisma:1550-1567`; live `P2003 SupplierPaymentIdempotency_paymentId_fkey` from `test:demo-seed-safety` and subsequent smoke commands.
- **Reproduction/failure scenario:** seed, create a supplier payment with idempotency, then run `pnpm acceptance:seed` or `pnpm --filter @paypoq/api test:demo-seed-safety` again.
- **Expected:** documented acceptance fixture is deterministic and repeatable in development.
- **Actual:** allocations and payments are deleted before their Restrict-linked idempotency row.
- **Affected scope:** local/demo/acceptance environments only; production seed guard correctly refuses production.
- **Business impact:** CI and release smoke chains fail depending on prior test order; stale data can mask regressions.
- **Root cause:** cleanup order was not updated when `SupplierPaymentIdempotency` was added.
- **Recommended fix:** delete tenant-scoped idempotency rows before supplier payments, within the seed transaction; retain foreign-tenant safety checks.
- **Regression tests:** seed twice; seed after idempotent payment; forced rollback; foreign-tenant rows unchanged.

### F-08 — Root smoke commands do not reliably load the API database environment

- **Severity:** Medium
- **Confidence:** High
- **Classification:** VERIFIED BY COMMAND OUTPUT and VERIFIED BY SOURCE CODE
- **Command output:** initial login returned HTTP 500 with Prisma `ECONNREFUSED`; after explicitly exporting `apps/api/.env`, MVP smoke reported 12/12. Full raw stdout was not persisted in the repository.
- **Area:** test harness / operations
- **Evidence:** `package.json:46-50`; `apps/api/src/prisma/client.ts`; observed `POST /auth/login` 500 with Prisma `ECONNREFUSED`, while the same MVP smoke passed 12/12 after explicitly exporting `apps/api/.env`.
- **Reproduction/failure scenario:** from repository root with configuration only in `apps/api/.env`, run `pnpm smoke:mvp`, `pnpm smoke:telegram`, or `pnpm smoke:platform-auth`.
- **Expected:** documented root commands load the project’s documented environment or fail fast with an explicit missing-variable message.
- **Actual:** scripts start/import from root, where `dotenv/config` does not load `apps/api/.env`; the database falls back to an unusable connection context.
- **Affected scope:** developers, CI and release operators.
- **Business impact:** false release failures, inconsistent evidence and wasted incident time.
- **Root cause:** command working directory and env-file ownership are implicit and inconsistent.
- **Recommended fix:** centralize explicit env loading or run API scripts with package cwd; validate `DATABASE_URL` before starting.
- **Regression tests:** root invocation with only `apps/api/.env`; missing-env fail-fast; CI sanitized environment.

### F-09 — Delivery/payment policy documents contradict implemented behavior

- **Severity:** Medium
- **Confidence:** High
- **Classification:** VERIFIED BY DOCUMENTATION; the stated current behavior is also VERIFIED BY COMMAND OUTPUT
- **Command output:** `full-manual-case-test.mjs` reported 64/64; `business-rules-deep-test.mjs` reported 35 PASS, 0 FAIL, 1 NOTE and included unpaid-delivery coverage. Full raw stdout was not persisted in the repository.
- **Area:** business policy / documentation
- **Evidence:** `docs/BUSINESS_ACCEPTANCE_WALKTHROUGH_V1.md` AC SC-06/W5 require paid-only delivery; `docs/USER_GUIDE_V1.md` contains both payment-optional and paid-only statements; current acceptance suites (`full-manual-case-test.mjs`, `business-rules-deep-test.mjs`) confirm unpaid delivery is allowed; known limitations state the same.
- **Reproduction/failure scenario:** train an operator using the paid-only section, then execute the application’s allowed unpaid delivery flow.
- **Expected:** one approved policy is consistent across requirements, tests and operator guidance.
- **Actual:** active documents specify mutually exclusive rules.
- **Affected scope:** sellers, accountants, owners and QA across all tenants.
- **Business impact:** shipment/debt disputes, incorrect acceptance sign-off and inconsistent factory practice.
- **Root cause:** policy changed in code/tests without retiring all earlier acceptance text.
- **Recommended fix:** obtain business-owner sign-off for paid-only vs debt-enabled delivery, then update every source-of-truth, acceptance case and guide in one change. This audit does not invent the decision.
- **Regression tests:** one canonical delivery policy test matrix covering unpaid/partial/paid, return and payment reversal.
- **RESOLVED 2026-08-29:** Business owner sign-off obtained — delivery is
  performed by the sex (factory) itself, is free to the client, and does not
  require full payment (debt remains and is paid later). This matches the
  behavior already implemented and tested (`business-rules-deep-test.mjs`
  BR-03 "unpaid delivery allowed"). `BUSINESS_ACCEPTANCE_WALKTHROUGH_V1.md`
  (SC-06, W5), `USER_GUIDE_V1.md` §21, `CLIENT_USAGE_GUIDE_UZ.md`,
  `CLIENT_DEMO_PLAYBOOK_UZ.md`, and `PRODUCT_VALIDATION_REVIEW.md` were
  updated to state this one policy consistently. No code change was required.

### F-10 — Finance KPI is calculated in the browser from the loaded list

- **Severity:** Medium
- **Confidence:** High
- **Classification:** VERIFIED BY SOURCE CODE
- **Command output:** Not applicable.
- **Area:** frontend/domain boundary
- **Evidence:** `apps/web/src/features/finance/expenses/expenses-module.tsx:100-126`; AGENTS.md frontend rule that finance totals are backend-calculated.
- **Reproduction/failure scenario:** render expenses when the collection is filtered, eventually paginated, partially fetched, or contains large Decimal values.
- **Expected:** authoritative paid total comes from the API using database Decimal aggregation.
- **Actual:** the browser filters/reduces `Number(item.amount)` over the current collection.
- **Affected scope:** finance users viewing expense KPIs.
- **Business impact:** misleading money totals and precision/page-scope discrepancies.
- **Root cause:** presentation component owns a business-critical aggregate.
- **Recommended fix:** return the KPI from the finance summary/read model as a decimal string and render it only.
- **Regression tests:** multi-page/filter totals; large decimals; backend/UI contract parity.

### F-11 — Resolved production dependency graph contains known vulnerabilities

- **Severity:** Medium
- **Confidence:** High for package presence; Low/Medium for exploit reachability
- **Classification:** VERIFIED BY COMMAND OUTPUT for advisory counts; REQUIRES MANUAL TEST for exploit reachability
- **Command output:** `pnpm audit --prod` exited 1 and reported 16 advisories: 9 high and 7 moderate. The complete advisory output was not persisted in the repository.
- **Area:** supply chain
- **Evidence:** `pnpm audit --prod` exited 1 with 16 advisories (9 high, 7 moderate), including `sharp/libvips` through Next and PostCSS/brace-expansion/undici/Hono advisories through resolved chains.
- **Reproduction/failure scenario:** run `pnpm audit --prod` at the audited lockfile.
- **Expected:** production artifact has an assessed, patched or explicitly accepted advisory set.
- **Actual:** the package manager reports unresolved advisories.
- **Affected scope:** depends on which vulnerable code is included and reachable in deployed web/mobile tooling.
- **Business impact:** possible denial of service, path/file exposure or request parsing weaknesses; exploitability was not established in this audit.
- **Root cause:** stale/transitive versions and lack of a documented advisory disposition gate.
- **Recommended fix:** export the full advisory list, map runtime/build-only reachability, upgrade direct parents, add lockfile monitoring and record time-bounded risk acceptances.
- **Regression tests:** clean/allowlisted production audit; SBOM; focused PoCs only for confirmed reachable paths.

### F-12 — Backup artifacts are created without built-in encryption or off-host enforcement

- **Severity:** Medium
- **Confidence:** High
- **Classification:** VERIFIED BY SOURCE CODE for the script behavior; VERIFIED BY DOCUMENTATION for operator-owned controls; REQUIRES MANUAL TEST for the real production backup system
- **Command output:** None; no backup or restore was executed.
- **Area:** backup/security/operations
- **Evidence:** `scripts/backup-db.sh:15-45`; `docs/BACKUP_AND_RECOVERY_V1.md` treats encryption/off-site retention and restore rehearsal as operator responsibilities.
- **Reproduction/failure scenario:** run `pnpm backup:db` with default settings; a readable custom-format database dump is written to `./backups` on the same host.
- **Expected:** production backup workflow guarantees encryption, restricted permissions, off-host copy, retention and verified restore.
- **Actual:** the script validates non-empty output only; storage protection is external and was not evidenced in this session.
- **Affected scope:** all tenant business, employee, payroll and financial data in a production backup.
- **Business impact:** host compromise or file leakage exposes the complete database; local-only backups do not cover host loss.
- **Root cause:** the repository provides a dump primitive, not an end-to-end protected backup system.
- **Recommended fix:** integrate encrypted object storage/KMS, least-privilege backup identity, checksums, retention/immutability and scheduled restore drills. Keep the restore safety confirmations already present.
- **Regression tests:** encrypted artifact check, restore into isolated clean DB, checksum failure, retention and access-control test.

## Manual security review: positive controls and deferred concerns

- **VERIFIED BY SOURCE CODE (sampled, not exhaustive):** validation, permission, tenant/factory predicates and production secret validation were observed in sampled paths. The first edition did not provide enough exact citations here to support repository-wide coverage; therefore “no mass assignment” and “no other cross-tenant IDOR” are **NOT SUPPORTED** and are withdrawn.
- **VERIFIED BY SOURCE CODE:** mobile access-token persistence uses Expo SecureStore at `apps/mobile/src/lib/auth/session-storage.ts:1-49`. Claims about real-device refresh-cookie persistence are **REQUIRES MANUAL TEST**.
- **VERIFIED BY COMMAND OUTPUT:** the Factory TV browser-secret boundary command reported 80 assets checked. That result does not prove tenant binding.
- **VERIFIED BY DOCUMENTATION:** no production secret value appears in this report. Whether secrets exist in history, runtime logs, images or external systems is **NOT SUPPORTED** here.
- Telegram identity/rate-limit assertions in the first edition lack exact evidence in this report and are downgraded to **NOT SUPPORTED** pending a focused evidence table or manual test.

## Prisma, indexes and transaction assessment

- **VERIFIED BY SOURCE CODE (sampled):** tenant-aware composite keys, indexes and transactions were observed; “widespread” is qualitative and therefore an **ASSUMPTION**.
- **VERIFIED BY COMMAND OUTPUT:** the supplier-payment integrity command reported 18 passing scenarios, including replay/concurrency/rollback cases; Prisma migration deploy reported 16 migrations and none pending. Raw logs are not persisted in this report.

Gaps:

- F-03 and F-04 remediation is an **ASSUMPTION** pending reproduction.
- Unpaginated finance query behavior was source-observed but lacks exact citations in this report; it is **NOT SUPPORTED** as a formal finding and remains a review note.
- The demo seed’s deletion graph is incomplete after the idempotency-table migration (F-07).
- Database-level reconciliation is an **ASSUMPTION / recommendation**.

## Client, bot and mobile usability assessment

The web-language, route-alignment and permission-aware navigation statements from the first edition lack exact citations here and are **NOT SUPPORTED** by this report. The Next build’s 51-route result is **VERIFIED BY COMMAND OUTPUT**. The named usability risks are engineering judgments based on F-01, F-09 and F-10.

The qualitative phrase “credible identity-link foundation” is **NOT SUPPORTED** and withdrawn. A real deployed Telegram smoke and privacy/support checks **REQUIRES MANUAL TEST**.

SecureStore persistence is **VERIFIED BY SOURCE CODE** at `apps/mobile/src/lib/auth/session-storage.ts:1-49`. Other mobile implementation claims lack exact citations in this report and are **NOT SUPPORTED** here. Real iOS/Android session behavior **REQUIRES MANUAL TEST**.

`docs/CLIENT_USAGE_GUIDE_UZ.md` is the audit-produced client guide. It follows current observed behavior and flags the unpaid-delivery policy decision instead of silently choosing a conflicting rule.

## Documentation accuracy

The first-edition statement that README, deployment, secrets and backup documents “generally match” was too broad and is **NOT SUPPORTED**. The following narrower corrections are supported as indicated:

1. resolve paid-only vs unpaid delivery across USER_GUIDE, BUSINESS_ACCEPTANCE and policy documents (F-09);
2. resolve contradictory production-run payroll wording in USER_GUIDE: current run intake does not create payroll worker activity automatically;
3. document explicit env loading for root smoke commands (F-08);
4. describe backup scripts as primitives, not proof of encrypted/off-site recovery;
5. do not advertise Factory TV for arbitrary production tenants until F-01 is fixed.

## Commands executed and real results

Every row is **VERIFIED BY COMMAND OUTPUT** observed in this task session. The repository does not contain a raw command transcript, so these results are session evidence rather than independently reproducible documentary evidence. “Exact output” below is limited to the final status/count retained in the task record; no omitted stdout is reconstructed.

| Command | Exact retained output/result | Evidence limitation |
|---|---|---|
| `pnpm prisma:generate` | exit 0 | Full stdout not retained here |
| `pnpm api:build` | exit 0 | Full stdout not retained here |
| `pnpm bot:build` | exit 0 | Full stdout not retained here |
| `pnpm mobile:typecheck` | exit 0 | Full stdout not retained here |
| `pnpm build` | exit 0; Next 15.5.21; 51 routes generated | Full stdout not retained here |
| `pnpm lint` | exit 0 | Full stdout not retained here |
| `pnpm mobile:lint` | exit 0 | Full stdout not retained here |
| `docker compose --env-file .env.docker.example config --quiet` | exit 0 | Quiet command intentionally emitted no substantive output |
| `pnpm prisma:migrate:deploy` | exit 0; 16 migrations; no pending migration | Full stdout not retained here |
| `pnpm --filter @paypoq/api test:supplier-payment-integrity` | exit 0; 18 scenarios passed | Full stdout not retained here |
| `pnpm test:factory-tv-secret` | exit 0; 80 browser assets checked | Full stdout not retained here |
| `pnpm test:notification-contract` | exit 0; 6 documents checked | Full stdout not retained here |
| `pnpm --filter @paypoq/bot test:shutdown` | exit 0; 4/4 | Full stdout not retained here |
| `pnpm --filter @paypoq/web test:stage-movement-quantity` | exit 0; 4/4 | Full stdout not retained here |
| `node scripts/full-manual-case-test.mjs` | exit 0; 64/64 | Against the local API; full stdout not retained here |
| `node scripts/business-rules-deep-test.mjs` | exit 0; 35 PASS, 0 FAIL, 1 NOTE | Full stdout not retained here |
| `pnpm smoke:mvp` | initial run: login HTTP 500 / Prisma `ECONNREFUSED`; rerun with exported `apps/api/.env`: 12/12 | The environment-cause attribution is supported by the controlled rerun but remains specific to this session |
| `pnpm smoke:telegram` | stopped before scenarios by seed `P2003` | This is not a Telegram behavior result |
| `pnpm smoke:platform-auth` | stopped before scenarios by seed `P2003` | This is not a platform-auth behavior result |
| `pnpm --filter @paypoq/api test:demo-seed-safety` | exit 1; Prisma `P2003`; `SupplierPaymentIdempotency_paymentId_fkey` | Exact error also appeared in this task transcript |
| `pnpm test:ui-routes` | stale port-3000 assets returned HTML/500 for JS/CSS | **NOT VALID** as current application evidence |
| `pnpm test:ui-transactions` | timed out waiting for auth refresh | **NOT VALID** as transaction behavior evidence |
| `pnpm test:ui-stage-stock` | timed out waiting for auth refresh | **NOT VALID** as stock behavior evidence |
| fresh web on port 3020 + route test | rejected by API CORS configured for port 3000 | **NOT VALID** as UI correctness evidence |
| `pnpm audit --prod` | exit 1; 16 advisories: 9 high, 7 moderate | Counts verified; exploit reachability **REQUIRES MANUAL TEST** |

## Finding counts by severity and validation status

Counts are **VERIFIED** by recounting F-01 through F-12 in this document. Severity itself remains an **ASSUMPTION / risk judgment**.

| Status | Critical | High | Medium | Low | Total |
|---|---:|---:|---:|---:|---:|
| Source/document/command verified | 0 | 2 | 7 | 0 | 9 |
| Requires manual concurrency test | 0 | 3 | 0 | 0 | 3 |
| **All reported findings/candidates** | **0** | **5** | **7** | **0** | **12** |

## Top 10 verified risks and test-required candidates

1. Factory TV resolves a hard-coded demo tenant/factory.
2. Finance requester/approver/payer separation is absent.
3. Payroll payment concurrency-risk pattern — **REQUIRES MANUAL TEST**.
4. Expense/advance transition concurrency-risk pattern — **REQUIRES MANUAL TEST**.
5. Refresh rotation concurrent-reuse pattern — **REQUIRES MANUAL TEST**.
6. Duplicate cross-tenant emails create valid but unusable accounts.
7. Delivery/payment policy is contradictory across active sources of truth.
8. Acceptance/demo seed is not repeatable after supplier payments.
9. Root smoke commands depend on implicit, incorrect env loading.
10. Finance KPI totals are computed from browser-loaded rows.

## Remediation plan

### P0 — before any production pilot

- Fix F-01 tenant-bound Factory TV or disable it in production.
- Fix F-02 separation of duties or explicitly remove the requirement with signed business-risk acceptance.
- Fix F-03/F-04 concurrency invariants and run parallel regression suites.
- Fix F-05 atomic refresh rotation for tenant and platform auth.
- Decide and canonicalize the delivery/payment policy (F-09).
- Configure strong production secrets/CORS/TLS; perform an encrypted off-host backup and isolated restore rehearsal.

### P1 — release-candidate gate

- Fix F-06 identity ambiguity, F-07 seed order and F-08 env loading.
- Rerun every API, Telegram, platform-auth and fresh-browser smoke from a clean fixture.
- Triage/upgrade reachable production dependencies (F-11).
- Move finance KPI aggregation to the backend (F-10).

### P2 — controlled pilot hardening

- Add pagination and query budgets to unbounded finance/read collections.
- Add ledger reconciliation jobs/alerts and centralized structured observability with PII redaction.
- Run real Telegram and physical iOS/Android auth/session tests.
- Automate encrypted immutable backups and scheduled restore drills (F-12).

### P3 — scale readiness

- Move auth/Telegram rate limiting to shared edge/Redis controls before multi-instance deployment.
- Add tenant-isolation property tests and multi-factory TV credential lifecycle tests.
- Add SBOM/provenance and advisory disposition to CI.

## Final recommendation

**Classification: ASSUMPTION / engineering risk judgment.** The repository cannot prove a GO/NO-GO decision because production infrastructure, operational controls and the three concurrency candidates were not tested. The conservative recommendation remains **NO-GO** for general or unattended production and **CONDITIONAL GO** for one supervised factory only after every P0 item has objective evidence, a clean fresh-environment smoke run, a successful restore rehearsal, and signed confirmation of the delivery/payment policy. This recommendation is not presented as a verified fact.

## Items deferred to a separate Deep Security Scan

- exhaustive auth/RBAC/IDOR endpoint matrix and multi-tenant attack-path validation;
- dependency advisory reachability and exploitability;
- JWT algorithm/key confusion, refresh-family replay and cookie/CSRF browser attack testing;
- Factory TV token discovery, caching, referrer and deployment exposure paths;
- Telegram spoofing/link-code brute force, webhook authenticity and cluster-rate-limit testing;
- unsafe Prisma/raw-query and mass-assignment whole-repository passes;
- secret history, image/layer, CI artifact and log-leak scanning;
- CORS proxy/CDN edge behavior and internal endpoint exposure;
- deployment, backup storage, cloud IAM and live restore security validation.

These are deferred, not assumed vulnerabilities.
