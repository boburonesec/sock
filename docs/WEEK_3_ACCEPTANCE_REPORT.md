# Week 3 Acceptance Report

**Date:** 2026-08-10  
**Scope:** Week 3 changes #5, #6 and #8 only  
**Final gate:** **WEEK 3 FAIL**

## Acceptance environment

- Disposable PostgreSQL database: `paypoq_w3_acceptance_20260810`.
- All 17 migrations applied from an empty database.
- Acceptance/demo fixture seeded successfully.
- Isolated API: port 3061; isolated web: port 3060; disposable same-origin browser proxy: port 3062.
- No production database or service was used.
- Delivery, debt, return and customer-credit behavior was not changed.

## Shift reconciliation browser acceptance

| Requirement | Persona | Test steps | Expected | Actual | Result | API/DB evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Current shift visible | Shift Receiver | Login; open Production; inspect Smena yakuni | Current shift visibly selected | Shift select initially showed `Smenani tanlang`; operator had to choose manually | **FAIL** | Browser DOM, `/production` |
| Readiness understandable | Shift Receiver | Inspect OPEN shift before action | Checklist with blockers and warnings | Only `Holat: OPEN` and generic explanatory sentence were visible; no readiness checklist | **FAIL** | Browser DOM |
| Hard blocker displayed clearly | Shift Receiver | Select Kunduzgi smena; submit while 350 units wait at handoff | Clear warehouse blocker with quantity and required action | UI displayed exact opaque status `350: qiymat noto‘g‘ri` | **FAIL** | API correctly returned 409; DB had 350 at configured handoff stage |
| Submit only when permitted | Shift Receiver | Submit with finished stock waiting | Submission blocked | Backend blocked with 409; state remained OPEN | **PASS** | Week 3 policy suite and real browser request |
| Warning distinct from blocker | Shift Receiver/Manager | Inspect screen and warning flow | Warning list visibly distinct from hard blockers | No preflight warning list or visual warning category exists | **FAIL** | Browser DOM; API suite verifies acknowledgement technically |
| READY visible to Manager | Manager | Persona browser walkthrough | Submitted shift and next action visible | Manager browser session could not be completed reliably in the disposable proxy after the Shift Receiver session; API transition is covered, UI remains unverified | **BLOCKED** | Manager API login returned 200; browser workflow not established |
| Warning acknowledgement reason | Manager | Accept warning case | Warning text and mandatory reason | Backend requires and audits reason; browser does not show the warning being acknowledged | **UX GAP** | `SHIFT_RECONCILIATION_ACCEPTED` audit verified by policy suite |
| Return READY to OPEN | Manager | Return with empty and valid reason | Empty rejected; valid reason succeeds | API behavior passes; browser interaction unverified | **BLOCKED** | Targeted policy suite |
| Accept clean shift | Manager | Submit clean shift; accept | ACCEPTED | API behavior passes; browser interaction unverified | **BLOCKED** | Targeted policy suite and DB state |
| Accepted immutable | Shift Receiver/Manager | Attempt resubmit/reopen | Rejected | API rejects accepted-shift resubmission | **PASS** | Targeted policy suite |

## Warehouse handoff configuration

| Requirement | Persona | Steps | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Authorized configuration | Manager/setup | Configure active same-factory stage | Saved and visible | API and UI control exist; configured stage rendered as `Ombor` | **PASS** | Browser DOM plus policy suite |
| Inactive stage rejected | Manager | Configure inactive stage | 400/rejected | Rejected | **PASS** | Policy suite |
| Cross-factory stage rejected | Manager | Configure foreign-factory stage | Rejected | Rejected | **PASS** | Policy suite |
| Missing configuration blocks | Shift Receiver | Clear configuration; submit | Rejected, no fallback | Rejected | **PASS** | Policy suite |
| Selected stage identified | Operator | Inspect shift panel | Configured name visible | `Omborga topshirish bosqichi: Ombor` visible | **PASS** | Browser DOM |
| Receipt uses configured stage | Warehouse/API | Receive against configured stage inventory | Exactly configured stage decremented | Backend lookup uses factory configuration; fresh MVP smoke stopped because its fixture attempted receipt without first moving that variant into the configured stage | **FAIL** | Smoke: `POST /warehouse/finished-product-receipts` 409, `Ombor bosqichida yetarli miqdor yo‘q.` |

## Controlled correction acceptance

| Domain | Requirement/persona | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Production movement | Shift Receiver identifies and requests correction | Ordinary operator can select the incorrect record and track request | No dedicated frontend workspace or record-level correction action; API requires a raw record ID | **FAIL** | `/recovery/correction-requests` API exists; no web client/workspace |
| Worker activity | Shift Receiver identifies and requests correction | Select activity, enter reason, track status | No practical operator UI; raw API only | **FAIL** | API suite validates immutable original and mandatory reason |
| Supplier payment | Accountant identifies and requests correction | Select payment, enter reason, track Manager resolution | Supplier screen has no correction/escalation action or queue | **FAIL** | API supports domain but frontend has no path |
| Original and totals unchanged | All three domains | Request does not mutate business fact or totals | Verified for production movement; service only creates escalation records | **PASS** | Before/after DB comparison in policy suite |
| Unauthorized resolution | Accountant/non-Manager | Rejected | Rejected with 403 | **PASS** | Policy suite |
| Manager resolution audited | Manager | Resolution with note and audit | Passed | **PASS** | `CORRECTION_REQUEST_RESOLVED` audit row |

The controlled-correction backend is technically bounded, but the pilot recovery pack is not practically usable by ordinary operators. It is not accepted as a completed Week 3 workflow.

## Existing correction/reversal regression

| Flow | Steps | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Stock correction | Real owner API correction; re-read stock | Transaction and authoritative total update | Passed | **PASS** | `stock correction regression: PASS` |
| Client payment reversal | Create/pay/deliver/return/reverse business-rule flow | Existing reversal behavior preserved | Passed | **PASS** | Business-rule suite client reversal cases |

## Payroll acceptance

| Requirement | Persona | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| DRAFT → calculate → approve → pay → PAID → CLOSED | Manager/Accountant | Complete browser flow | Complete API/DB flow passed; Manager/Accountant browser flow was not completed | **BLOCKED** | Week 3 policy suite |
| Readiness visible | Manager/Accountant | Explicit blockers/readiness before approve/pay | Payroll UI shows revision and approval, but no explicit readiness checklist | **UX GAP** | Browser implementation inspection/build |
| Totals visible | Accountant | Final/paid/remaining visible | Existing payroll UI renders authoritative totals | **PASS** | API totals and prior Week 1–2 browser evidence |
| Manager approval visible | Manager/Accountant | Revision and approval clearly visible | UI text shows revision and whether Manager approved | **PASS** | Web build/source contract |
| Accountant cannot approve | Accountant | No UI action; API 403 | Backend role check passes; browser persona unverified | **PASS** | Policy suite/API |
| Unapproved/stale payment blocked | Accountant/Owner | Both rejected | Both rejected | **PASS** | Policy suite |
| Recalculation invalidates approval | Manager/Accountant | Approval cleared and audited | Passed | **PASS** | `PAYROLL_APPROVAL_INVALIDATED` evidence |
| Payment preserves approval | Accountant | Current approval remains | Passed | **PASS** | Payroll integrity suite |
| Partial payment | Accountant | PARTIALLY_PAID | Passed | **PASS** | Payroll integrity and policy suites |
| PARTIALLY_PAID cannot close | Accountant | Rejected | Rejected | **PASS** | Policy/service gate |
| Paid zero balance closes | Accountant | Explicit confirmation then CLOSED | Passed | **PASS** | Policy suite |
| CLOSED immutable | Finance users | Normal calculation/payment blocked | Status gates reject modification | **PASS** | API state-machine checks |

## Authorization and isolation

| Case | Result | Evidence |
| --- | --- | --- |
| Shift Receiver submits but cannot accept | **PASS** | API policy suite; browser submit observed |
| Manager accept/return/warning acknowledgement | **PASS technically; browser BLOCKED** | API and audit evidence |
| Manager payroll approval | **PASS technically; browser BLOCKED** | API evidence |
| Accountant payment; cannot approve | **PASS** | API evidence and finance RBAC 11/11 |
| Owner cannot bypass current-revision approval | **PASS** | Policy suite |
| Cross-factory shift/configuration access | **PASS** | Policy suite |
| Cross-tenant/factory recovery source access | **PASS by scoped service query; no separate second-tenant browser walkthrough** | Source and API policy evidence |

## UX conclusions

- Next action is not obvious before attempting shift submission because no readiness evaluation is displayed.
- Hard blockers are technically enforced but not presented in operator language.
- Warnings and blockers are not visually distinguishable.
- The user cannot see who must resolve each blocker.
- `OPEN` and `READY_FOR_HANDOVER` remain technical English statuses.
- Correction escalation does not explain immutability in the UI because no correction UI exists.

## Command results

- Fresh database migration: **PASS**, 17 migrations.
- Acceptance/demo seed: **PASS**.
- Week 3 policy API suite: **PASS**, all assertions.
- Payroll concurrent-payment integrity: **PASS**, all assertions.
- Finance RBAC: **PASS**, 11/11.
- Pilot navigation: **PASS**, 6/6 personas and 5/5 hidden paths per persona.
- Full operator/API suite: **PASS**, 66/66.
- Business-rule deep suite: **34 PASS, 0 FAIL, 2 notes**. Payroll close probe now receives the required `confirm` validation error.
- MVP smoke: **FAIL** at finished-product receipt with 409: `Ombor bosqichida yetarli miqdor yo‘q.` Later smoke cases did not execute and are not reported as passed.
- Stock-correction focused API regression: **PASS**.
- API typecheck/build: **PASS**.
- Web build: **PASS**, 51 routes.
- Web lint/type validation: **PASS**.
- `git diff --check`: **PASS**.

## Final gate

# WEEK 3 FAIL

The backend policy invariants are substantially correct, but Week 3 is not accepted because:

1. shift readiness, warnings and blockers are not practically understandable in the browser;
2. the real warehouse blocker renders as `350: qiymat noto‘g‘ri`;
3. controlled correction has no practical operator/Manager frontend workflow;
4. the required Manager and Accountant browser flows are not fully verified;
5. the fresh MVP smoke suite now fails in the configured-stage finished-receipt chain.

## External blockers kept separate

**PENDING HUMAN VALIDATION** — real factory operators have not completed the signed usability walkthrough.

**DELIVERY POLICY — BLOCKED BY CUSTOMER CONFIRMATION** — this acceptance gate did not change delivery behavior.

Week 4 was not started.

## Week 3 remediation retest — 2026-08-10

This section preserves the original failure evidence above and records only the subsequent remediation and retest outcome.

| Original blocker | Root cause | Implemented correction | Retest evidence | Outcome |
| --- | --- | --- | --- | --- |
| Shift readiness was not visible or understandable | The UI attempted submission before asking the backend for a structured readiness result | Added an authoritative readiness endpoint and three visible Uzbek groups: blockers, warnings and ready checks. Every check includes a stable code, detail and next action. Submission/acceptance is disabled while blockers exist. | Real Shift Receiver browser session displayed an open-run blocker, `350 dona` warehouse-receipt blocker, defect warning, and three ready checks with next actions. | **PASS** |
| Current shift was guessed/blank | No reliable employee-to-shift context endpoint existed | Added employee-assignment-based shift context. No time-based guess is made; an unassigned account receives a clear selection instruction. | Real browser showed `Akkauntingizga faol smena biriktirilmagan. Davom etish uchun smenani tanlang.` and allowed explicit shift selection. | **PASS** |
| Technical English statuses were exposed | Raw enum values were rendered | Mapped shift states to `Ochiq`, `Topshirishga tayyor`, and `Qabul qilingan`. | Real browser rendered `Holat: Ochiq`. | **PASS** |
| Controlled correction was API-only | No record-level entry point or Manager workspace existed | Added record-level correction requests for production movement, worker activity and supplier payment; added immutable-record explanation, mandatory reason, request reference/status, and a Manager resolution queue with mandatory note. No reversal semantics were added. | Real production browser displayed 34 record actions. A movement request showed source details and immutable explanation; submission returned `Manager ko‘rib chiqishini kutmoqda` and reference `cmsn8egz`. Backend policy suite verified authorization, immutable source and audited resolution. | **PASS**, with Manager queue visual interaction not separately completed |
| Payroll readiness was implicit | Revision/approval data existed but was not exposed as an authoritative readiness contract | Added payroll readiness endpoint and UI cards for current revision, Manager approval/approver, and hard blockers. | API policy and payment-integrity suites passed; production web build/type validation passed. | **PASS technically; Accountant browser flow remains unverified** |
| MVP receipt chain failed | Smoke attempted warehouse receipt before moving the test variant to the configured handoff stage | Smoke now discovers the ordered stage chain, moves the exact quantity through every stage, proves receipt fails before handoff, then proves receipt succeeds and decrements the configured handoff balance exactly. | Fresh disposable DB: all 17 migrations, seed and MVP smoke passed; `passedCount: 12`. | **PASS** |

### Remediation command results

- Fresh disposable database `paypoq_w3_retest_20260810`: **PASS**, all 17 migrations applied and seed completed.
- Corrected MVP smoke: **PASS**, 12/12 reported cases, including pre-handoff rejection, configured-handoff movement, successful receipt and exact decrement.
- API typecheck: **PASS** (`tsc --noEmit`).
- Web production build, lint and type validation: **PASS**, 51 routes.
- Pilot navigation: **PASS**, 6/6 personas and 5/5 pilot-hidden paths per persona.
- Demo-seed safety: **PASS**, 6 passed and 0 failed.
- Week 3 policy gates: **PASS**, all assertions.
- Payroll payment integrity: **PASS**, all assertions.
- Finance RBAC: **PASS**, 11/11 checks.
- Full operator/API acceptance: **PASS**, 66/66.
- Business rules: **PASS**, 34 passed, 0 failed, 2 documented notes.
- `git diff --check`: **PASS**.
- UI transactional suite: **NOT VERIFIED in this retest environment**. It timed out waiting for `/auth/refresh` through the disposable proxy before executing its cases; no case result is claimed.

### Retest gate

# WEEK 3 FAIL

All previously confirmed backend, smoke and Shift Receiver usability blockers were remediated. Week 3 remains unaccepted for one required acceptance condition: the complete Manager shift workflow and the complete Manager-to-Accountant payroll workflow were not successfully exercised in a real browser session. API coverage and source/build evidence do not substitute for that browser requirement.

### External blockers kept separate after retest

- **PENDING HUMAN VALIDATION** — real factory operators have not completed the signed usability walkthrough.
- **DELIVERY POLICY — BLOCKED BY CUSTOMER CONFIRMATION** — unchanged; no delivery, debt, return or customer-credit behavior was modified.
- Week 4 was not started.
