# Paypoq OS — 8 haftalik pilot product roadmap

**Jamoa:** 1 developer, 1 product owner, 1 designer  
**Sprint:** 2 hafta  
**Maqsad:** 8-haftada birinchi to‘lovchi mijoz bilan bitta fabrika/bitta smenali nazoratli pilot

## Roadmap qarori

Sakkiz haftada Paypoq OSni “to‘liq ERP”ga aylantirmaymiz. Faqat birinchi mijozning kundalik zanjirini ishonchli va o‘rgatish oson qilamiz:

> Stanokdan chiqdi → bosqichlar bo‘ylab yurdi → omborga tushdi → sotildi → qarz ko‘rindi → ish haqi hisoblandi.

Pilot scope:

- bitta tenant;
- bitta fabrika;
- bitta asosiy ombor;
- DAY/NIGHT smena;
- web orqali Owner, Manager/Smena nazoratchisi, Omborchi, Seller va Accountant;
- oldindan tayyorlangan master data;
- production, warehouse, sales/debt, supplier debt va piece-rate payroll;
- joyida onboarding va yozma fallback.

Pilotdan olib tashlanadi yoki yashiriladi: Factory TV, attendance, mobile employee self-service, generic reports hub, alohida Audit menyusi, advanced mechanic quality workflow, multi-factory UX va Super Admin demo.

## Prioritizatsiya qoidasi

Har recommendation quyidagi besh savol bilan baholandi:

1. Real mijoz og‘rig‘ini yechadimi?
2. Operator xatosini kamaytiradimi?
3. Treningni soddalashtiradimi?
4. Biznes qiymatini oshiradimi?
5. Birinchi pilot bu funksiyasiz yashay oladimi?

Effort:

- **S:** 1 developer kuni yoki kamroq
- **M:** 2–4 developer kuni
- **L:** 5–8 developer kuni
- **XL:** 8 kundan ko‘p

`UX`, `Risk`, `Training`: High / Medium / Low. “Pilot yashaydi?” ustuni **Yo‘q** bo‘lsa item pilot gate hisoblanadi.

# Top 10 changes before pilot

ROI = biznes qiymati va xato/trening kamayishi effortga nisbatan. Reyting implementation ketma-ketligini to‘liq anglatmaydi; dependencylar sprint rejasida hisobga olingan.

| ROI | O‘zgarish | Category | Value | Effort | UX | Risk | Training | Dependency |
|---:|---|---|---:|---|---|---|---|---|
| 1 | Barcha operator copy’sini oddiy o‘zbekchaga o‘tkazish | MUST DO before pilot | 10 | M | High | Medium | High | PO terminology sign-off |
| 2 | Rolga mos qisqa menyu; pilotdan tashqari modullarni yashirish | MUST DO before pilot | 10 | M | High | Medium | High | Pilot scope lock |
| 3 | Delivery siyosatini tanlash va UI/guide/acceptance’da yagona qilish | MUST DO before pilot | 10 | M | High | High | High | Customer policy decision |
| 4 | Production’da “chiqdi / o‘tkazildi / bajarildi”ni uch aniq amal qilish | MUST DO before pilot | 10 | M | High | High | High | Terminology, flow decision |
| 5 | Production, stock, client payment va worker activity uchun ko‘rinadigan correction/SOP | MUST DO before pilot | 10 | L | High | High | High | Correction policy; scope cap |
| 6 | Finance approver va payer’ni alohida qilish | MUST DO before pilot | 10 | M | Medium | High | Medium | Role decision |
| 7 | Payroll readiness checklist, approval va safe payment gate | MUST DO before pilot | 10 | L | High | High | High | Finance roles; payroll integrity |
| 8 | Customer-specific onboarding: stage, unit, role, opening data + sign-off | MUST DO before pilot | 10 | M | High | High | High | Customer workshop |
| 9 | Operator form simplification: smart defaults, allowed next stage, max qty, result feedback | MUST DO before pilot | 9 | M | High | High | High | Production copy |
| 10 | Real operator usability test va top task acceptance gate | MUST DO before pilot | 9 | M | High | High | High | Stable pilot build/data |

## Four-sprint delivery plan

### Sprint 1 — Scope va tushunarlilik (1–2-hafta)

**Maqsad:** operator faqat o‘z ishini ko‘radi va bir xil biznes tilini eshitadi.

Developer:

- rolga mos qisqa pilot menyusi;
- Factory TV, attendance, reports hub, advanced mechanic, mobile employee self-service va boshqa pilotdan tashqari kirishlarni feature flag/hide;
- Top 10 terminology va asosiy status/button copy;
- delivery qoidasini tanlangan siyosatga moslash;
- production uch amalining nomi va yordamchi copy’si.

Designer:

- production quick-action hierarchy;
- role navigation;
- confirmation, success va error patterns;
- 5 operator bilan terminology card-sort.

Product owner:

- mijoz bilan delivery, correction, payroll approval va stage nomlarini imzolash;
- pilot scope va “not included”ni shartnomaga kiritish.

**Exit:** bir operator menyudan adashmasdan o‘z 3 asosiy taskini topadi; barcha pilot hujjatlarda delivery qoidasi bir xil.

### Sprint 2 — Xatoga chidamli operatsiyalar (3–4-hafta)

**Maqsad:** noto‘g‘ri stock, production va pul yozuvini kamaytirish.

Developer:

- allowed next stage, current/max qty, unit, factory/smena va employee defaultlari;
- duplicate/large-deviation warning hamda aniq success state;
- production/stock/payment/activity correctionning eng kichik tasdiqlangan scope’i;
- finance requester/approver/payer ajratilishi;
- payroll/finance concurrency va refresh rotation bo‘yicha audit P0 integrity pack;
- demo seed/smoke repeatability tuzatish.

Designer:

- correction confirmation;
- before/after preview;
- pul jadvallarida Jami/To‘landi/Qoldi patterni.

Product owner:

- correction vakolati va sabab kategoriyalari;
- pilotda kim approve/pay qilishi;
- operator escalation SOP.

**Exit:** ortiqcha miqdor, noto‘g‘ri stage, duplicate submit va ruxsatsiz finance transition task testda ushlanadi; correction auditli va operatorga tushunarli.

### Sprint 3 — Smena yakuni va pul nazorati (5–6-hafta)

**Maqsad:** kun oxirida fabrika tizim raqamiga ishonishi.

Developer:

- shift-end reconciliation va handover checklist;
- payroll readiness: missing rate/activity/adjustment exceptionlari, manager approval, close confirmation;
- purchase’dan material receiptga aniq link; pilot uchun qisman receipt zarur bo‘lsa minimal support;
- kunlik production, warehouse balance va debt uchun printable/CSV-safe minimal output;
- order/delivery uchun printable yoki ulashiladigan tasdiq.

Designer:

- exception-first payroll wizard;
- smena topshirish sahifasi;
- bir sahifalik print layouts.

Product owner:

- opening balance reconciliation;
- payslip/print minimum content;
- first customer training roster.

**Exit:** smena nazoratchisi, omborchi va accountant kunni checklist bilan yopadi; owner uch asosiy raqamni print/export qilishi mumkin.

### Sprint 4 — Customer setup, rehearsal va release buffer (7–8-hafta)

**Maqsad:** yangi feature emas, haqiqiy mijoz bilan ishlaydigan pilot.

Developer:

- customer data import va validation;
- onboarding topilgan faqat blocker buglar;
- production backup/restore rehearsal va release smoke;
- Factory TV o‘chiq; production tenantga tayyor bo‘lmasa umuman chiqarilmaydi;
- 20–25% sprint buffer.

Designer:

- 5–8 real operator bilan moderated test;
- faqat task-failing UX fixes;
- print/SOP vizual tekshiruvi.

Product owner:

- opening data ikki tomonlama sign-off;
- role-based 60–90 daqiqalik training;
- go-live day plan, qog‘oz fallback va daily review;
- acceptance walkthroughni tanlangan policyga mos yurish.

**Exit:** kamida 4/5 operator 10 core taskni ≥90% muvaffaqiyat, 0 kritik xato va taskga ≤1 yordam bilan bajaradi; backup restore isboti bor; customer GO imzolaydi.

### Developer capacity budget

Bir developer uchun 8 haftada taxminan 32 fokuslangan developer kuni rejalashtiriladi; qolgan vaqt review, release va kutilmagan customer blockerlariga ketadi.

| Sprint | Planned dev days | Asosiy bundle |
|---|---:|---|
| Sprint 1 | 6 | scope hide, navigation, terminology, delivery policy |
| Sprint 2 | 9 | core validation/correction, finance roles, integrity fixes |
| Sprint 3 | 8 | shift close, payroll readiness, receipt handoff, minimum outputs |
| Sprint 4 | 3 | customer import/onboarding blockers |
| Release/customer buffer | 6 | acceptance, restore, rollout defects |
| **Total** | **32** | |

Bu budget faqat **minimal pilot scope** uchun. M06, M09 va M17 to‘liq universal platforma sifatida emas, birinchi customerning kelishilgan case’lari bilan cheklanadi. Must item budgetga sig‘masa, yangi feature olinmaydi; go-live suriladi yoki product owner imzolagan manual SOP qo‘llanadi. Data integrity va pul gate’lari manual workaround bilan bekor qilinmaydi.

## Complete recommendation backlog

Quyidagi backlog oldingi hujjatlardagi takroriy recommendationlarni bitta execution itemga birlashtiradi. Har item **faqat bitta** categoryga ega.

### MUST DO before pilot

| ID | Recommendation | Pain | Mistake | Training | Value | Pilot yashaydi? | BV | Effort | UX | Risk | Train | Dependencies |
|---|---|---|---|---|---|---|---:|---|---|---|---|---|
| M01 | ~~Delivery policy’ni paid-only yoki debt-enabled sifatida imzolash va hamma joyda bir xil qilish~~ — DONE 2026-08-29: debt-enabled, mijoz uchun bepul yetkazish | Ha | Ha | Ha | Ha | Yo‘q | 10 | M | High | High | High | Resolved |
| M02 | Top operator atamalari va statuslarni oddiy o‘zbekchaga almashtirish | Ha | Ha | Ha | Ha | Yo‘q | 10 | M | High | Medium | High | Terminology workshop |
| M03 | Role-based pilot menu; ortiqcha modullarni yashirish | Ha | Ha | Ha | Ha | Yo‘q | 10 | M | High | Medium | High | Scope lock |
| M04 | Production uch amalini ajratish: stanokdan chiqdi, bosqichga o‘tdi, ishchi bajardi | Ha | Ha | Ha | Ha | Yo‘q | 10 | M | High | High | High | M02 |
| M05 | Smart defaults, next-stage restriction, max qty/unit va clear feedback | Ha | Ha | Ha | Ha | Yo‘q | 9 | M | High | High | High | M04 |
| M06 | Production/stock/payment/activity correctionning minimal operator-visible oqimi | Ha | Ha | Ha | Ha | Yo‘q | 10 | L | High | High | High | Signed correction policy |
| M07 | Smena yakuni reconciliation, handover va imzo | Ha | Ha | Ha | Ha | Yo‘q | 10 | M | High | High | High | M04–M06 |
| M08 | Finance request/approve/pay vazifalarini ajratish | Ha | Ha | O‘rta | Ha | Yo‘q | 10 | M | Medium | High | Medium | Role owner |
| M09 | Payroll readiness checklist, manager approval, close confirmation va correction SOP | Ha | Ha | Ha | Ha | Yo‘q | 10 | L | High | High | High | M08, data rules |
| M10 | Payroll/finance concurrent write integrity fix va regression test | Ha | Ha | Yo‘q | Ha | Yo‘q | 10 | L | Low | High | Low | Audit candidates reproduce |
| M11 | Refresh rotation integrity fix | Bilvosita | Yo‘q | Yo‘q | Ha | Yo‘q | 9 | M | Low | High | Auth regression |
| M12 | Factory TV’ni pilotda o‘chirish | Ha | Ha | Ha | Ha | Yo‘q | 9 | S | Medium | High | Feature flag |
| M13 | Customer stage/unit/role/delivery/correction workshop | Ha | Ha | Ha | Ha | Yo‘q | 10 | S | High | High | High | Customer availability |
| M14 | Opening master data va balances import + ikki tomonlama sign-off | Ha | Ha | Ha | Ha | Yo‘q | 10 | M | High | High | High | M13, import template |
| M15 | Uch minimal output: kunlik production, warehouse balance, debts | Ha | Ha | Ha | Ha | Yo‘q | 9 | M | High | Medium | High | Final data definitions |
| M16 | Order/delivery printable yoki ulashiladigan tasdiq | Ha | Ha | Ha | Ha | Yo‘q | 8 | M | High | Medium | Medium | Delivery policy |
| M17 | Purchase’dan material receiptga yo‘naltirilgan link; ordered/received/remaining | Ha | Ha | Ha | Ha | Yo‘q | 9 | L | High | High | High | Receipt policy |
| M18 | Real operator usability test va top-task gate | Ha | Ha | Ha | Ha | Yo‘q | 9 | M | High | High | High | Stable build/data |
| M19 | Bir sahifalik role SOP va qog‘oz fallback | Ha | Ha | Ha | Ha | Yo‘q | 9 | S | High | Medium | High | Final flows |
| M20 | Demo seed/smoke repeatability va fresh-environment acceptance | Bilvosita | Yo‘q | Yo‘q | Ha | Yo‘q | 8 | M | Low | High | Low | Fixture cleanup |
| M21 | Encrypted off-host backup va clean restore rehearsal | Ha | Yo‘q | Yo‘q | Ha | Yo‘q | 10 | M | Low | High | Low | Production environment |
| M22 | Production configuration/secrets/TLS release gate | Bilvosita | Yo‘q | Yo‘q | Ha | Yo‘q | 10 | M | Low | High | Low | Hosting owner |

### SHOULD DO before pilot

Bu itemlar yuqori qiymatli, lekin vaqt siqilsa documented workaround bilan pilot boshlanishi mumkin.

| ID | Recommendation | Pain | Mistake | Training | Value | Pilot yashaydi? | BV | Effort | UX | Risk | Train | Dependencies |
|---|---|---|---|---|---|---|---:|---|---|---|---|---|
| S01 | Brak disposition: rework/scrap/second-grade | Ha | Ha | Ha | Ha | Ha, qo‘lda SOP bilan | 9 | L | High | High | Medium | Defect policy |
| S02 | Warehouse cycle-count/inventory session | Ha | Ha | Ha | Ha | Ha, daily manual count bilan | 9 | L | High | High | Medium | Correction flow |
| S03 | Payroll vedomosti/payslip printable output | Ha | Ha | Ha | Ha | Ha, signed spreadsheet bilan | 8 | M | High | Medium | Medium | M09 |
| S04 | Factory/smena/employee kontekstini har write formda ko‘rsatish | Ha | Ha | Ha | Ha | Ha | 8 | M | High | High | Medium | Shared form shell |
| S05 | Duplicate/large deviation warnings across core forms | Ha | Ha | O‘rta | Ha | Ha, supervision bilan | 8 | M | High | High | Medium | Event matching rules |
| S06 | Client/supplier duplicate warning va phone mask | Ha | Ha | Ha | Ha | Ha | 7 | M | Medium | Medium | Medium | Search normalization |
| S07 | Pul jadvallarida Jami/To‘landi/Qoldi va clear formula breakdown | Ha | Ha | Ha | Ha | Ha | 8 | M | High | Medium | High | Summary contracts |
| S08 | Finance KPI’ni authoritative summaryga o‘tkazish | Ha | Ha | Yo‘q | Ha | Ha, KPI hide bilan | 7 | M | Medium | Medium | Low | Summary value |
| S09 | Supplier payment correction/reversal SOP; UI bo‘lmasa controlled admin process | Ha | Ha | Ha | Ha | Ha | 8 | L | High | High | Medium | Finance policy |
| S10 | Customer-specific size decision; kerak bo‘lsa pilot catalogue workaround | Ha | Ha | Ha | Ha | Ha, faqat size relevant bo‘lmasa | 9 | S | High | High | High | Customer catalogue |

### AFTER first customer

| ID | Recommendation | Pain | Mistake | Training | Value | Pilot yashaydi? | BV | Effort | UX | Risk | Train | Dependencies |
|---|---|---|---|---|---|---|---:|---|---|---|---|---|
| A01 | Warehouse bitta tabbed workspace | Ha | Ha | Ha | Ha | Ha | 8 | L | High | Medium | High | Pilot observation |
| A02 | Sales client/order/payment/debt unified workspace | Ha | Ha | Ha | Ha | Ha | 8 | XL | High | Medium | High | Pilot navigation data |
| A03 | Supplier unified timeline | Ha | Ha | Ha | Ha | Ha | 8 | L | High | Medium | High | M17 |
| A04 | Production read board va write workspace split | Ha | Ha | Ha | Ha | Ha | 9 | L | High | Medium | High | Pilot task data |
| A05 | Bulk/brigada worker activity, clone va numpad | Ha | Ha | Ha | Ha | Ha | 9 | L | High | Medium | High | Actual wage practice |
| A06 | QR/barcode for partiya, stanok va warehouse | Ha | Ha | Ha | Ha | Ha | 8 | XL | High | Medium | High | Labels/devices |
| A07 | Partial material receipt, supplier return va unit conversionning full flowi | Ha | Ha | Ha | Ha | Ha | 8 | XL | High | High | Medium | Supplier pilot data |
| A08 | Partial delivery/return, pick-pack va reservation | Ha | Ha | Ha | Ha | Ha | 8 | XL | High | High | Medium | Delivery policy |
| A09 | Quotation, invoice/waybill va richer print pack | Ha | O‘rta | Ha | Ha | Ha | 7 | XL | High | Medium | Medium | Customer document needs |
| A10 | Credit limit, overdue collection task, payment credit/overpay | Ha | Ha | O‘rta | Ha | Ha | 7 | XL | Medium | Medium | Medium | Customer credit policy |
| A11 | Expense attachment, cash/bank, cost center va advance settlement | Ha | Ha | O‘rta | Ha | Ha | 7 | XL | Medium | Medium | Medium | Finance adoption |
| A12 | Payroll partial payment, correction period, rounding, salaried/leave support | Ha | Ha | Ha | Ha | Ha | 8 | XL | High | High | High | First payroll learning |
| A13 | Employee import, brigada, documents, leave/transfer history | Ha | Ha | Ha | Ha | Ha | 7 | XL | Medium | Medium | Medium | HR scope decision |
| A14 | Real generated reports, filters, Excel/PDF exports | Ha | O‘rta | Ha | Ha | Ha | 8 | XL | High | Medium | High | Report usage data |
| A15 | Object-level human-readable change history | Ha | Ha | Ha | Ha | Ha | 7 | L | High | Medium | Medium | Audit event mapping |
| A16 | Settingsni 3 guruh/onboarding wizardga birlashtirish | Ha | Ha | Ha | Ha | Ha, PO setup bilan | 7 | L | High | Medium | High | Onboarding learnings |
| A17 | Factory TV’ni tenant/factory-bound credential bilan qaytarish | O‘rta | Ha | O‘rta | O‘rta | Ha | 5 | L | Medium | High | Credential design |
| A18 | Attendance only after real Trunket ingestion contract | O‘rta | Ha | O‘rta | O‘rta | Ha | 5 | XL | Medium | Medium | Vendor payload |
| A19 | Real-device manager mobile | O‘rta | Yo‘q | O‘rta | O‘rta | Ha | 5 | XL | Medium | Medium | Device tests |
| A20 | Telegram real pilot, privacy/unlink va shared rate control | Ha | Ha | Ha | Ha | Ha, web fallback bilan | 7 | L | Medium | Medium | Medium | Bot owner/token |
| A21 | Advanced mechanic measurements/recheck/HOLD | Mijozga bog‘liq | Ha | Yo‘q | Mijozga bog‘liq | Ha | 5 | XL | Medium | Medium | Low | Quality process validation |
| A22 | Multi-factory consolidated UX va login identity decision | Keyin | Ha | Ha | Ha | Ha | 6 | XL | Medium | High | Medium | Second factory/customer |
| A23 | Shared rate limits, pagination, reconciliation alerts, observability | Bilvosita | Yo‘q | Yo‘q | Ha | Ha, one-instance pilotda | 6 | XL | Low | Medium | Low | Scale signal |
| A24 | Dependency/SBOM/advisory program | Bilvosita | Yo‘q | Yo‘q | Ha | Ha, explicit release assessment bilan | 6 | L | Low | Medium | Low | Release policy |
| A25 | Automated encrypted immutable backups and scheduled drills | Ha | Yo‘q | Yo‘q | Ha | Ha, manual verified process bilan | 8 | L | Low | High | Low | M21 |

### NEVER (remove from roadmap)

| ID | Recommendation | Pain | Mistake | Training | Value | Pilot yashaydi? | BV | Effort | UX | Risk | Train | Why never |
|---|---|---|---|---|---|---|---:|---|---|---|---|---|
| N01 | Full accounting/general ledger/tax ERP | Yo‘q, core segment emas | Yo‘q | Yo‘q | Fokusni kamaytiradi | Ha | 2 | XL | Low | Low | Negative | Mahsulot Manufacturing OS bo‘lib qoladi |
| N02 | Generic workflow engine | Yo‘q | Yo‘q | Yo‘q | Yo‘q | Ha | 1 | XL | Low | Low | Negative | Real tasdiqlangan oqimlarni bevosita qurish osonroq |
| N03 | Generic notification-rule builder | Yo‘q | Yo‘q | Yo‘q | Past | Ha | 2 | XL | Low | Low | Negative | Faqat aniq biznes triggerlari kerak |
| N04 | Alohida texnik Audit menyusini operatorga berish | Yo‘q | Yo‘q | Yo‘q | Past | Ha | 2 | L | Low | Low | Negative | History obyekt ichida bo‘lishi kerak |
| N05 | Linklardan iborat “Reports” hubini saqlash | Yo‘q | Ha | Yo‘q | Past | Ha | 2 | S | Low | Low | Negative | Real hisobot bilan almashtiriladi |
| N06 | Parallel employee mobile va Telegram self-service kanallari | Yo‘q | Ha | Yo‘q | Past | Ha | 3 | XL | Low | Medium | Negative | Bitta kanalni tanlash supportni kamaytiradi |
| N07 | Har bir operatorga barcha Settings sahifalarini ko‘rsatish | Yo‘q | Ha | Yo‘q | Negative | Ha | 1 | S | Low | High | Negative | Setup PO/admin vazifasi |
| N08 | MVPda avtomatik IoT data bilan stock/payrollni bevosita o‘zgartirish | Yo‘q | Ha | Yo‘q | Past | Ha | 2 | XL | Low | High | Negative | Manual process barqarorlashgandan keyingina |
| N09 | Ikki parallel bosh sahifa har bir rolga | Yo‘q | Ha | Yo‘q | Past | Ha | 2 | M | Low | Low | Negative | Har rolga bitta home |
| N10 | Employee drawer va finance’da bir xil bonus/penalty/advance mutationlari | Yo‘q | Ha | Yo‘q | Past | Ha | 3 | M | Medium | Medium | Negative | Bitta owning workflow qoladi |

# Top 10 terminology improvements

Faqat operatorni eng ko‘p chalg‘itadigan so‘zlar:

| # | Hozirgi | Pilot copy |
|---:|---|---|
| 1 | Stage Inventory | **Bosqichdagi qoldiq** |
| 2 | Production Run | **Stanok ishi** |
| 3 | Shift Receiver | Mijoz tanlagan real lavozim: **Smena nazoratchisi** (placeholder) |
| 4 | Intake / Output | **Stanokdan chiqqan mahsulotni qabul qilish** |
| 5 | Activity | **Bajarilgan ish** |
| 6 | Move Stage / Movement | **Keyingi bosqichga o‘tkazish** |
| 7 | Payroll | **Ish haqi hisob-kitobi** |
| 8 | Allocation | **To‘lovni taqsimlash** |
| 9 | Supplier Purchase / Debt | **Yetkazib beruvchidan xarid / Yetkazib beruvchiga qarzimiz** |
| 10 | Correction / Reversal | **Qoldiqni tuzatish / To‘lovni bekor qilish** |

# Top 10 UI simplifications

| # | Simplification | Category | Qaror/klik kamayishi |
|---:|---|---|---|
| 1 | Rolga mos faqat 4–7 menyu | MUST DO before pilot | Keraksiz modullar yo‘q |
| 2 | Production’da uchta katta, aniq primary action | MUST DO before pilot | 5 quick action orasida tanlash yo‘q |
| 3 | Source partiya/stage’dan avtomatik; destination faqat keyingi stage | MUST DO before pilot | 2 tanlov kamayadi |
| 4 | Factory, smena, employee/stage smart default | MUST DO before pilot | Takroriy dropdownlar kamayadi |
| 5 | Max quantity va unit maydon yonida | MUST DO before pilot | Qoldiqni boshqa joydan izlash yo‘q |
| 6 | Success’dan keyin oldin/keyin qoldiq | MUST DO before pilot | Tekshirish uchun reload/navigatsiya yo‘q |
| 7 | Attendance/TV/reports/audit/advanced mechanicni yashirish | MUST DO before pilot | O‘rganiladigan scope kamayadi |
| 8 | Pul jadvallarida Jami/To‘landi/Qoldi yonma-yon | SHOULD DO before pilot | Mental hisob yo‘q |
| 9 | Purchase kartasidan “Kelgan tovarni qabul qilish” | MUST DO before pilot | Finance→warehouse qidiruvi yo‘q |
| 10 | Payroll exception-first 4 step flow | MUST DO before pilot | Qachon calculate/close qilish qarori soddalashadi |

# Top 10 workflow improvements

| # | Workflow | Category | Kundalik foyda |
|---:|---|---|---|
| 1 | Smena topshirish/yopish va reconciliation | MUST DO before pilot | Kechikkan/missing yozuv shu kuni topiladi |
| 2 | Minimal correction/reversal flow | MUST DO before pilot | Xato yashirilmaydi va parallel daftar kamayadi |
| 3 | Delivery policy hard gate | MUST DO before pilot | Seller har safar rahbardan so‘ramaydi |
| 4 | Payroll readiness + manager approval | MUST DO before pilot | Noto‘liq ma’lumot bilan hisoblash kamayadi |
| 5 | Purchase → receipt → remaining | MUST DO before pilot | Qarz va real kelgan tovar bog‘lanadi |
| 6 | Opening-data import va sign-off | MUST DO before pilot | Birinchi kundan noto‘g‘ri qoldiq tarqalmaydi |
| 7 | Brak disposition | SHOULD DO before pilot | Brak qayerga ketgani aniq |
| 8 | Cycle count session | SHOULD DO before pilot | Real va tizim qoldig‘i solishtiriladi |
| 9 | Printable order/delivery va daily summaries | MUST DO before pilot | Mijoz/rahbar bilan ulashish mumkin |
| 10 | Guided top-task training va acceptance | MUST DO before pilot | “Training o‘tdi” emas, real task isboti |

# Features to remove from MVP

| Feature | Disposition | Nega mahsulot kuchayadi |
|---|---|---|
| Factory TV | AFTER first customer | Asosiy write workflowga qiymat bermaydi; pilot riski va demo chalg‘itishi yo‘qoladi |
| Attendance without ingestion | AFTER first customer | Bo‘sh/read-only ekran o‘rniga core productionga fokus |
| Reports link hub | NEVER | “Hisobot” va’dasini buzmaydi; keyin real reportlar quriladi |
| Separate technical Audit menu | NEVER | Operator texnik tarixni o‘rganmaydi; human history obyektga ko‘chadi |
| Generic notification builder | NEVER | Faqat ishlaydigan biznes xabarlari qoladi |
| Advanced mechanic quality flow | AFTER first customer | Birinchi pilotda Stage Inventory va output adoptioniga fokus |
| Partial payroll payment | AFTER first customer | Eng xavfli pul oqimidagi status va qarorlar kamayadi |
| Multi-factory consolidated UI | AFTER first customer | Birinchi mijoz bitta factoryda isbotlanadi |
| Employee mobile self-service | NEVER | Telegram bilan parallel support/training kanali yaratilmaydi |
| Super Admin customer demo | AFTER first customer | Platform boshqaruvi factory operator mahsulotiga aralashmaydi |
| 10+ visible Settings pages | NEVER | Onboarding admin/POga, operatorga esa kundalik ish qoladi |

# Features to postpone

- QR/barcode: yuqori qiymat, ammo labels/devices va real task data kerak; manual flow avval soddalashadi.
- Partial delivery/return: birinchi mijoz siyosati va pick/pack amaliyoti kuzatilgach quriladi.
- Supplier return, prepayment, currency va statement reconciliation: pilotda documented manual process yetarli.
- Full payslip/partial payroll/correction period: birinchi real payroll natijasidan keyin scope aniqlanadi.
- Employee HR documents, leave va transfer history: MES core’ga to‘g‘ridan-to‘g‘ri blocker emas.
- Full Excel/PDF report suite: avval qaysi uch report ishlatilishi o‘lchanadi.
- Telegram production rollout: web core uchun fallback bor; real bot privacy/support tayyor bo‘lgach.
- Manager mobile: responsive web birinchi pilotni qoplaydi.
- Factory TV: tenant/factory credential lifecycle tugamaguncha.
- Attendance/Trunket: vendor payload va customer jarayoni aniq bo‘lgach.
- Multi-factory: ikkinchi factory haqiqiy ehtiyoj bo‘lgach.
- IoT: manual operatsiya va reconciliation barqaror bo‘lgach.

# Final recommendation

## Agar faqat 8 hafta bo‘lsa, aynan nima quriladi

1. **Scope containment:** bitta factory, web-only core, pilotdan tashqari modullar yashiriladi.
2. **Language and navigation:** to‘liq operatorcha o‘zbek tili, rolga mos menyu, uch aniq production amali.
3. **Business policy:** delivery, correction, finance approval va payroll close qoidalari yozma va UI’da bir xil.
4. **Mistake prevention:** smart defaults, allowed stage, max quantity/unit, duplicate/deviation warning, before/after feedback.
5. **Correction and daily close:** production/stock/payment/activity minimal correction; smena handover/reconciliation.
6. **Money integrity:** approver/payer ajratish, payroll readiness/approval, auditdagi concurrency/session P0lar.
7. **Cross-module handoff:** purchase’dan material receipt, order/delivery print, uch minimal management output.
8. **Customer readiness:** opening data import/sign-off, role SOP, paper fallback, operator usability test.
9. **Operational gate:** repeatable fresh acceptance, encrypted off-host backup va restore rehearsal.
10. **Buffer:** oxirgi sprintning kamida 20–25%i customer blockerlariga qoldiriladi.

## Nima postponeda qoladi

Full reports, advanced quality, QR/barcode, partial delivery, broad supplier exceptions, full HR, attendance, mobile, Telegram production rollout, Factory TV, multi-factory va IoT. Ular qiymatsiz emas; lekin birinchi customer uchun core adoptionni isbotlamaydi va bitta developerning 8 haftalik capacity’sini yutadi.

## Nega

Birinchi to‘lovchi mijoz “ko‘p modul” uchun emas, quyidagi uch natija uchun pul to‘laydi:

1. har bosqichda nechta mahsulot borligini bilish;
2. stock, buyurtma va qarz raqamiga ishonish;
3. ish haqi hisobini tushuntira olish.

Roadmap shu uch natijani oson kiritish, xatodan qaytarish va kun oxirida solishtirishga qaratiladi. Qolgan hamma narsa birinchi mijozning real foydalanish ma’lumoti bilan keyin prioritetlanadi.

**CPO qarori:** to‘rt sprintda feature breadth emas, operator ishonchi quriladi. Agar Sprint 3 oxirida correction, shift close, payroll readiness va opening-data reconciliation tayyor bo‘lmasa, go-live sanasi suriladi; qo‘shimcha modul qo‘shilmaydi.
