# Weeks 1–2 Acceptance Report

**Sana:** 2026-08-10  
**Yakuniy gate:** **TECHNICAL PASS; overall pilot readiness CONDITIONAL**  
**Chegara:** faqat Week 1 pilot navigation/terminologiya va Week 2 core
guardrails/finance separation. Week 3 hamda delivery qoidalari o‘zgartirilmadi.

## Muhit

- Disposable database: `paypoq_w12_acceptance_20260810`, local PostgreSQL.
- Blocker retest database: `paypoq_w12_fix_acceptance_20260810`, local PostgreSQL;
  migrated and acceptance-seeded repeatedly, then removed after verification.
- API: isolated port 3031; web: isolated port 3030.
- In-app browser uchun disposable same-origin proxy: port 3040.
- API CORS faqat acceptance web originlariga moslangan process env orqali.
- Customer/developer database o‘chirilmadi yoki reset qilinmadi.
- Parol, token va boshqa secretlar ushbu hisobotda saqlanmagan.

## Muhit muammolari va ildiz sabablar

| Muammo | Ildiz sabab | Amal | Natija |
| --- | --- | --- | --- |
| Eski browser testlari | 3000/3001 portlarida stale, boshqa build/processlar | Alohida DB va 3030/3031 processlar | PASS |
| Temporary-port CORS | API faqat port 3000 originini qabul qilgan | Process-level acceptance CORS allowlist | PASS |
| In-app browser cross-port auth | Browser webni ko‘rdi, ikkinchi localhost portiga request yubormadi | Disposable same-origin proxy; cookie path faqat proxyda moslandi | PASS |
| Demo reseed P2003 | `SupplierPayment` idempotency yozuvidan oldin o‘chirilgan | Fixture cleanup ordering tuzatildi; regression qo‘shildi | PASS |

## Test evidence

| Requirement | Environment/persona | Test steps | Expected | Actual | Status | Automated/API evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Repeatable fixture | Isolated DB | 16 migrations; acceptance seed ikki marta | Har safar clean deterministic fixture | Ikkala seed muvaffaqiyatli | PASS | `test:demo-seed-safety`: 6/6 |
| Pilot navigation | Browser; Owner, Manager, Shift Receiver, Warehouse Operator, Seller, Accountant | Login; landing; sidebar; allowed route; Profile; Notifications | Role matrixga mos | 6/6 login, landing, menu va allowed routes mos | PASS | `test:pilot-scope`: 6/6; hidden paths 5/5 |
| Pilot-hidden direct URL | Browser; barcha 6 persona | operations/reports/audit/mechanic/attendance URLlarini ochish | Domain screen mount bo‘lmasin | Har birida `403 · Ruxsat yo‘q` pilot gate ko‘rindi | PASS | Frontend gate; backend authorization deb talqin qilinmadi |
| Production form context | Browser; Owner | Movement drawer; product va Dazmol source tanlash | Factory/product/source/available/next/shift context | Main Factory, product, Dazmol, 1200, faqat disabled Sifat destination va worker/shift context ko‘rindi | PASS | Stage quantity 4/4; deep business rules 35 PASS |
| Production duplicate mutation | Isolated browser suite; Owner | Pending request paytida rapid submit | Bitta POST | Request count 1; success refresh 2 | PASS | `ui-transactional-mutation-test.mjs` scoped production checks |
| Production zero/negative/excess | Isolated browser + API | Invalid quantities | Mutation bloklansin | Dastlab browser dalili yetishmagan. Retestda zero, negative va excess alohida bloklandi; 0 POST | PASS | `test:week12-invalid-browser`; quantity 4/4; deep rules 35 PASS |
| Material receipt context/success | Browser; Owner | Material, Raw Materials joyi, 1 kg; double click | Summary, bitta receipt, backend stock refresh | 85.5 → 86.5; StockMovement count 2 → 3 | PASS | DB mutation count + backend-returned toast |
| Material zero/negative | Isolated browser | 0 va manfiy quantity | Submit bloklansin | Dastlab bajarilmagan. Retestda ikkala qiymat native/form guard bilan bloklandi; 0 POST | PASS | `test:week12-invalid-browser` |
| Client payment summary | Browser; Owner | Payment drawer ochish | Client/debt/entered/allocated/unallocated ko‘rinsin | Summary barcha maydonlarni ko‘rsatdi | PASS | Real debts endpoint orqali render |
| Client payment duplicate/success | Isolated browser suite; Owner | Rapid submit, keyin real success | Bitta POST va refresh | Request count 1; payments refresh 1 | PASS | `ui-transactional-mutation-test.mjs` scoped payment checks |
| Client payment incomplete/zero/negative | Isolated browser | Invalid entry cases | Submit bloklansin | Dastlab tugallanmagan. Retestda zero/negative bloklandi; incomplete allocationda button disabled va `Taqsimlanmagan: 1 so‘m` ko‘rindi; 0 POST | PASS | `test:week12-invalid-browser` |
| Payroll context/overpayment | Browser; Accountant | 2026-08; Ali; 36,401 kiritish | Period/employee/final/paid/remaining; overpayment blocked | 86,400 / 50,000 / 36,400 ko‘rindi; check button disabled | PASS | Existing backend over-remaining rule |
| Payroll duplicate confirmation | Browser + DB; Accountant | 1 so‘m; confirmationni double click | Bitta payment | PayrollPayment count 4 → 5 | PASS | DB mutation count |
| Payroll authoritative refresh | API/DB + browser; Accountant | 1 so‘m paymentdan keyin period va itemni refetch | Period remaining 1 ga kamayishi va item bilan mos bo‘lishi | Original failure: 50,200 → 65,199. Fixdan keyin consistent fixture 65,200 → 65,199; employee 36,400 → 36,399; repeated GET stable | PASS | `test:payroll-payment-integrity`: 12 assertions; payroll workspace 11/11 |
| Accountant payroll page | Browser; Accountant | Payroll sahifasini ochish | Ruxsatsiz amal alerti bo‘lmasin | Original failure preserved. Fixdan keyin page, 115,200/50,003/65,197 totals va payment action bannersiz render bo‘ldi | PASS | `/finance/payroll-employees` 200; direct `/employees` 403 |
| Finance UI separation | Browser; Manager + Accountant | Manager approve; Accountant pay | Managerda approve/reject, pay yo‘q; Accountantda approve/reject yo‘q, approved pay bor | Manager real approve qildi; Accountant real pay qildi; action visibility mos | PASS | Real backend transitions |
| Finance direct API matrix | Isolated API | 11 role/requester cases | Barcha blok/ruxsatlar mos | 11/11 | PASS | `smoke:finance-rbac` |
| Operator terminology | 5 real factory operators | Uch production amalini tushuntirish/topish/bajarish | Kamida 4/5 tushunadi va topadi | Real natija berilmagan | PENDING HUMAN VALIDATION | `PILOT_OPERATOR_VALIDATION_SHEET_UZ.md` |
| Delivery policy | Pilot customer | 5 savolga yozma javob/sign-off | Bitta tasdiqlangan siyosat | Qaror berilmagan; kod o‘zgarmadi | BLOCKED | `PILOT_DELIVERY_POLICY_DECISION_SHEET_UZ.md` |

## Command results

- Prisma migrate deploy: 16 migrations, PASS.
- Acceptance seed twice on isolated DB: PASS.
- Demo seed safety: 6 passed, 0 failed.
- API build: PASS.
- Web production build: PASS, 51 routes.
- Finance RBAC endpoint matrix: 11/11 PASS.
- Transaction browser suite relevant checks: production and client-payment
  duplicate/success checks: 7/7 PASS under `UI_TEST_SCOPE=week12`.
- The unscoped transactional suite was also attempted and stopped at its
  unrelated deterministic order-cancellation fixture (`deterministic
  cancellable order is not visible`); it is not reported as a full-suite PASS.
- Payroll payment integrity: 12 assertions PASS, including exact 1-so‘m deltas,
  unrelated employee stability, repeated GET stability and two concurrent payments.
- Missing invalid-input browser suite: 9 cases PASS with 0 mutation POSTs.
- Full operator/API cases: 66 PASS, 0 FAIL.
- Business-rule deep suite: 35 PASS, 0 FAIL, 1 informational note.
- API typecheck, web TypeScript check, web lint and `git diff --check`: PASS.

## Technical blocker resolution

### 1. Payroll period aggregate

- **Original failure:** stored period remaining was 50,200, while the four item
  remaining amounts summed to 65,200. A 1-so‘m payment re-aggregated items and
  exposed 65,199.
- **Exact 15,000 source:** the demo period snapshot omitted Dilshod Sifat
  nazorati's 15,000 final/remaining item. The frontend did not calculate or mix
  values: period cards use `GET /finance/payroll-periods`; employee rows use
  `GET /finance/payroll-periods/:id/items`.
- **Fix:** fixture totals now sum item snapshots. Payment aggregation also
  re-sums final, paid and remaining amounts. A period-row `FOR UPDATE` lock
  serializes payments before the authoritative item re-read and update.
- **Derived invariants:** per employee `final = max(worked + bonus - penalty -
  advance, 0)`, `remaining = final - paid`; per period final/paid/remaining are
  the respective item sums, therefore period remaining equals period final
  minus period paid.

### 2. Accountant false authorization banner

- **Original failure:** payroll eagerly requested `GET /employees`. Accountant
  correctly lacks `employees.view`, so that optional request returned 403 and
  the shared API client broadcast the global banner.
- **Fix:** payroll now requests minimal active employee choices from
  `GET /finance/payroll-employees`, protected by existing `finance.view` and
  scoped to active tenant/factory. General `GET /employees` remains 403 for
  Accountant; no permission was added.

### 3. Missing browser cases

- Production: zero, negative, excess and manipulated same-stage destination —
  PASS, 0 stage-movement POSTs.
- Material receipt: zero and negative — PASS, 0 material-receipt POSTs.
- Client payment: zero, negative and incomplete 10/9 allocation — PASS, 0
  payment POSTs; incomplete amount is visible as 1 so‘m unallocated.

## Final gate

### TECHNICAL PASS

All three recorded Week 1–2 technical blockers were fixed and retested. Week 3
was not started and delivery/Owner-bypass behavior was not changed.

### HUMAN VALIDATION REQUIRED

`PENDING HUMAN VALIDATION` — five real operators must complete the attached
Uzbek validation sheet; Codex did not simulate results.

### CUSTOMER BUSINESS DECISION REQUIRED

`DELIVERY POLICY — BLOCKED BY CUSTOMER CONFIRMATION` — customer must answer and
sign the five-question decision sheet. No delivery behavior was changed.

**Classification: TECHNICAL PASS; overall pilot readiness CONDITIONAL** — the
technical Week 1–2 gate is complete. Real operator validation and the customer
delivery-policy decision remain external blockers. Week 3 was not started.
