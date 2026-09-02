# Paypoq OS — Business Acceptance Walkthrough v1

Status: Active  
Audience: Owner, Operator, QA, Security reviewer, Staff engineer  
Source of truth: `docs/product-requirements.md` §20 Acceptance Criteria  
Related: `docs/USER_GUIDE_V1.md`, `docs/MVP_SMOKE_TEST_SUITE_V1.md`, policy docs

---

## 0. Nima uchun bu fayl bor?

**“API 200 qaytardi” yoki “men skrinshot ko‘rdim” = tayyor emas.**

Bu hujjat:

1. Business requirementlar bo‘yicha **qabul mezonlari**
2. Siz o‘zingiz bosqichma-bosqich **yurib chiqadigan** operator walkthrough
3. QA test case matritsasi (expected result bilan)
4. Pentester / security checklist
5. Har case uchun **PASS / FAIL / BLOCKED / N/A** belgilash joyi

**Golden rule:** Har case da “nima ko‘rishim kerak?” aniq. Agar son/mantiq noto‘g‘ri bo‘lsa — FAIL, hatto UI chiroyli bo‘lsa ham.

---

## 1. Test muhiti (boshlashdan oldin)

```bash
# Root dan
pnpm install
# apps/api/.env va apps/web/.env.local tayyor

pnpm prisma:generate
pnpm prisma:migrate:deploy
ALLOW_DEMO_RESET=true pnpm demo:prepare   # toza demo

pnpm api:dev    # :3001
pnpm dev        # :3000
```

Tekshiruv:

```bash
curl http://localhost:3001/health
# {"status":"ok",...}
```

### Demo akkauntlar (faqat local/pilot)

| Rol | Email | Parol | Kirish |
| --- | --- | --- | --- |
| Owner | `owner@paypoq.local` | `ChangeMe123!` | `/login` |
| Manager | `manager@paypoq.local` | `ChangeMe123!` | `/login` |
| Shift Receiver | `shift@paypoq.local` | `ChangeMe123!` | `/login` |
| Warehouse | `warehouse@paypoq.local` | `ChangeMe123!` | `/login` |
| Seller | `seller@paypoq.local` | `ChangeMe123!` | `/login` |
| Accountant | `accountant@paypoq.local` | `ChangeMe123!` | `/login` |
| Platform | `platform@paypoq.local` | `ChangeMe123!` | `/admin/login` |

### Avtomatik yordamchi (o‘rnini bosmaydi)

```bash
# Fresh DB: migrations → data-free baseline → baseline smoke → acceptance fixture
pnpm prisma:migrate:deploy
pnpm prisma:seed
curl -fsS http://localhost:3001/health
pnpm verify:acceptance-fixture

# API smoke (business chain)
MVP_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:mvp

# Keng API case
node scripts/full-manual-case-test.mjs

# UI route + mobile viewport
pnpm playwright:install
pnpm test:ui-routes

# Business-rule deep check (sonlar, bloklar)
node scripts/business-rules-deep-test.mjs
```

> Avtomatik test = **yordam**. Qabul = **sizning walkthrough belgilashingiz**.

### Notification MVP contract

1. Mexanikka task bering va `/notifications` inbox’da persistent xabar
   yaratilganini tekshiring.
2. O‘qilmagan xabarni `O‘qildi` deb belgilang; reload’dan keyin `readAt` holati
   saqlanishi kerak.
3. Telegram outbox delivery yozuvi lease/attempt/retry/dedupe holati bilan
   mavjud bo‘lishi kerak; Telegram uzilishi inbox’ni yo‘qotmasligi kerak.
4. Quality recheck due hamda inspection upcoming/summary xabarlari tasdiqlanadi.

Low stock, order deadline, pending advance, generic defect, stalled batch va
overdue debt notification triggerlari bu MVP acceptance’iga kirmaydi. Ularni
PASS deb belgilamang va generic defect qaydini quality recheck produceri bilan
aralashtirmang.

---

## 2. Acceptance Criteria xaritasi (product-requirements §20)

Har mezon: **nima tekshiriladi**, **qayerda**, **kutilgan natija**, **natija**.

| # | Business mezon | Qayerda | Kutilgan | Natija (□) |
| --- | --- | --- | --- | --- |
| AC-01 | Manager bosqich qoldig‘ini ko‘radi | `/production`, `/dashboard/operations` | Stage kartalarda dona > 0 yoki 0 aniq; demo seed da qiymatlar bor | □ PASS □ FAIL |
| AC-02 | Shift Receiver partiya + barcha bosqichlar bo‘ylab ko‘chiradi | `/production` | Partiya → stage move zanjiri ishlaydi; manfiy bo‘lmaydi | □ PASS □ FAIL |
| AC-03 | Manfiy stage/stock yo‘q | Production move, delivery, ombor | Ortiqcha miqdor → xato (4xx), qoldiq manfiy emas | □ PASS □ FAIL |
| AC-04 | Worker activity (bosqich + dona) | `/production` tezkor amal | Activity yoziladi; **stage inventory o‘zgarmaydi** | □ PASS □ FAIL |
| AC-05 | Payroll dona × tarixiy stavka | `/finance/payroll` | Calculate → item > 0; stavka snapshot ishlatiladi | □ PASS □ FAIL |
| AC-06 | Buyurtma + mustaqil to‘lov | `/sales/orders`, `/sales/payments` | Order ochiladi; payment alohida allocation | □ PASS □ FAIL |
| AC-07 | Client va supplier debt alohida | `/sales/debts`, `/finance/suppliers` | Ikkala qarz alohida ko‘rinadi; frontend “taxmin” emas | □ PASS □ FAIL |
| AC-08 | Avans manager tasdiqlovisiz accountant to‘lamaydi | `/finance/advances` | Accountant to‘g‘ridan-to‘g‘ri to‘lay olmaydi (yoki 403) | □ PASS □ FAIL □ N/A |
| AC-09 | Owner hammasi; boshqa rollar cheklangan | Turli login | Sidebar/API RBAC farq qiladi | □ PASS □ FAIL |
| AC-10 | Muhim amallar audit | Backend AuditLog / smoke | Payment reverse, delivery, stock correction auditda | □ PASS □ FAIL |
| AC-11 | Cross-tenant access yo‘q | Platform + tenant | Boshqa tenant data ko‘rinmasligi | □ PASS □ FAIL |
| AC-12 | Factory konteksti | Multi-branch tenant | Yozuvlar factory bilan bog‘langan | □ PASS □ FAIL □ N/A |
| AC-13 | Telegram employee read-only | Bot + API | Faqat o‘qish; write yo‘q | □ PASS □ FAIL □ N/A |

**Qo‘shimcha MVP scope (spec §19):**

| # | Mavzu | Kutilgan | Natija |
| --- | --- | --- | --- |
| SC-01 | Auth + role navigation | Har rol o‘z menyusini ko‘radi | □ |
| SC-02 | Master data CRUD | Rang/material/mavsum/product/variant/narx | □ |
| SC-03 | Defect qayd | Yozuv bor; avtomatik jarima **yo‘q** | □ |
| SC-04 | Finished receipt Ombor→stock | Stage ↓ stock ↑ | □ |
| SC-05 | Material receipt | Material stock oshadi; supplier purchase avtomatik stock bermaydi | □ |
| SC-06 | Delivery to‘lovdan mustaqil | To‘lanmagan/qisman to‘langan buyurtma ham yetkazilishi mumkin; qarz saqlanadi. Yetkazib berish sex tomonidan, mijozga bepul (haq olinmaydi) | □ |
| SC-07 | Delivery return → keyin payment reverse mumkin | Delivered holda reverse blok | □ |
| SC-08 | Closed payroll immutable | Close dan keyin calculate/pay o‘zgarmaydi | □ |
| SC-09 | Responsive web (mobile browser) | Menyu, form, overflow | □ |
| SC-10 | Factory TV | Token bilan ishlaydi; tokensiz yo‘q | □ |

---

## 3. Operator walkthrough (SIZ yurasiz)

Har qadamda: **amal** → **kutilgan** → **haqiqiy** → **□**.

Vaqt: ~60–90 daqiqa (to‘liq).

### W0. Login va rol farqi (10 daq)

1. `/login` → Owner  
   - Ko‘rinadi: Executive dashboard, barcha menyu  
   - □

2. Chiqib Seller bilan kiring  
   - Production write yo‘q / cheklangan  
   - Sotuv ochiladi  
   - □

3. Shift Receiver  
   - Production ochiladi  
   - Finance chuqur write cheklangan  
   - □

4. Noto‘g‘ri parol  
   - Xato xabari; dashboardga o‘tmaydi  
   - □

### W1. Master data (10 daq) — Owner/Manager

1. `/settings/colors` — yangi rang  
2. `/settings/materials` — material  
3. `/settings/seasons` — mavsum  
4. `/settings/products` — model + variant + narx  

**Kutilgan:** variant = model+rang+material+mavsum; **size yo‘q**.  
**□**

### W2. Xodim + stavka (5 daq)

1. `/employees` — xodim qo‘shish  
2. `/settings/salary-rates` — stage (yoki stage+variant) stavka  

**Kutilgan:** employee hard-delete yo‘q; inactive bor.  
**□**

### W3. Production — Stage Inventory haqiqati (15 daq)

Route: `/production`

Yozib oling (qog‘oz/notes):

| Bosqich | Oldin | Keyin |
| --- | --- | --- |
| Averlog | | |
| Dazmol | | |
| … | | |

1. **Partiya 100** (variant tanlang)  
   - Averlog +100 (yoki birinchi stage)  
   - □

2. **Move 40** Averlog → Dazmol  
   - Averlog −40, Dazmol +40  
   - □

3. **Move 99999** (ortiqcha)  
   - Xato; qoldiq o‘zgarmaydi  
   - □

4. **Ishchi faolligi 25** (xodim + stage + dona)  
   - Activity yoziladi  
   - Stage inventory **o‘zgarmaydi** (oldin/keyin bir xil)  
   - □

5. **Brak 2**  
   - Defect yozuvi  
   - Avtomatik jarima/payroll o‘zgarishi **yo‘q**  
   - □

### W4. Ombor (10 daq)

1. Mahsulotni **Ombor** stage gacha olib keling (yoki demo Ombor qoldig‘idan foydalaning)  
2. **Omborga qabul** (finished receipt)  
   - Ombor stage ↓  
   - Finished stock ↑  
   - StockMovement tarixda  
   - □

3. `/warehouse/materials` — material kirim  
   - Material stock ↑  
   - □

4. Stock correction (sabab majburiy)  
   - Snapshot o‘zgaradi; eski movement o‘chirilmaydi  
   - □

### W5. Sotuv + qarz (15 daq)

1. `/sales/clients` — mijoz  
2. Buyurtma: 10 dona, narx aniq  
   - Order total = backend hisobi  
   - Client debt oshishi kerak (paid bo‘lmasa)  
   - □

3. To‘lov: allocation to‘liq emas (masalan 50%)  
   - paymentStatus qisman  
   - Debt kamayadi, lekin 0 bo‘lmasligi mumkin  
   - □

4. **To‘liq to‘lanmagan** (yoki umuman to‘lanmagan) holda Delivery  
   - **Ruxsat etiladi** — yakuniy qaror: yetkazib berish sex tomonidan va
     mijoz uchun bepul amalga oshiriladi, to‘liq to‘lov shart emas
   - Status DELIVERED, Finished stock ↓, qarz o‘zgarmaydi (keyin to‘lanadi)
   - □

5. (SC-06 bilan bir xil stsenariy — alohida "to‘liq to‘lov" talabi yo‘q)
   - □

6. Delivered holda Payment reverse  
   - **Blok**  
   - □

7. Delivery return  
   - Status READY (yoki policy bo‘yicha)  
   - Stock qaytadi  
   - paymentStatus odatda PAID qoladi  
   - □

8. Endi payment reverse  
   - Mumkin  
   - Debt qayta oshadi  
   - □

### W6. Supplier (8 daq)

1. Supplier yaratish  
2. Purchase 1_000_000  
   - Supplier debt oshadi  
   - **Material stock o‘zi oshmaydi**  
   - □

3. Payment allocation  
   - Debt kamayadi  
   - □

### W7. Payroll (10 daq)

1. `/finance/payroll` — period create (oy)  
2. Calculate  
   - Itemlar activity asosida  
   - □

3. Review sonlar: dona × stavka ± bonus/jarima/avans  
   - Frontend “o‘zi hisoblamagan”; backend qiymat  
   - □

4. Pay (agar flow ruxsat bersa) → Close  
5. Close dan keyin qayta calculate/pay  
   - **Blok / immutable**  
   - □

### W8. Dashboard / TV / Mobile brauzer (8 daq)

1. Owner: `/dashboard/executive` — KPI > 0 yoki mantiqiy 0  
2. `/dashboard/operations` — stage board  
3. `/tv` — token bilan ishlaydi  
4. Telefon yoki DevTools 390px:  
   - Menyu ochiladi  
   - Production amallar ishlaydi  
   - Sahifa gorizontal “sindirilmaydi”  
   - □

### W9. Security tez check (10 daq) — pentester nazar

1. Login bo‘lmasdan `/dashboard/executive`  
   - Redirect login  
   - □

2. Seller token bilan `POST /production/batches`  
   - 403  
   - □

3. Factory TV tokensiz  
   - 401  
   - □

4. Boshqa foydalanuvchi ID bilan password change (agar endpoint ochiq)  
   - 403  
   - □

5. XSS: mijoz nomiga `<script>alert(1)</script>`  
   - Escaped render; script ishlamasin  
   - □

6. SQL/injection: qidiruv maydoniga `' OR 1=1--`  
   - Xato yoki bo‘sh natija; crash yo‘q  
   - □

---

## 4. QA matritsasi (chuqurroq)

### 4.1 Functional — Production

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| QA-P01 | Batch default traceability | Partiya ochish | Batch + inventory + movement |
| QA-P02 | Move partial | 100 dan 30 move | 70/30 to‘g‘ri |
| QA-P03 | Move over-qty | 1000 move | 4xx, state o‘zgarmaydi |
| QA-P04 | Activity ≠ inventory | Activity 50 | Inventory oldin=keyin |
| QA-P05 | Defect ≠ auto penalty | Defect | Penalty list bo‘sh qolishi mumkin |
| QA-P06 | Concurrent move (ixtiyoriy) | 2 tab bir vaqtda | Bir muvaffaq, biri fail yoki ikkalasi to‘g‘ri atomic |

### 4.2 Functional — Sales/Finance

| ID | Case | Expected |
| --- | --- | --- |
| QA-S01 | Debt = sum(eligible orders) − sum(allocated payments) | Son backend bilan mos |
| QA-S02 | Unallocated payment yo‘q | Overpay/allocation xato → 4xx |
| QA-S03 | Paid-only delivery | Unpaid deliver 4xx |
| QA-S04 | Reverse after deliver | 409/4xx |
| QA-S05 | Return then reverse | Reverse OK, debt oshadi |
| QA-S06 | Supplier debt alohida | Client debt bilan aralashmasin |
| QA-S07 | Purchase ≠ stock | Stock o‘zgarmaydi |

### 4.3 Functional — Payroll

| ID | Case | Expected |
| --- | --- | --- |
| QA-R01 | Calculate uses activity + rate snapshot | Item amount mantiqiy |
| QA-R02 | Bonus oshiradi, penalty/avans kamaytiradi | Belgilangan formula |
| QA-R03 | Closed immutable | Post-close mutate 4xx |

### 4.4 RBAC

| Rol | Production write | Sales write | Finance write | Warehouse write |
| --- | --- | --- | --- | --- |
| Owner | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓* | ✓ |
| Shift | ✓ | ✗ | ✗ | ? |
| Seller | ✗ | ✓ | ✗ | ✗ |
| Warehouse | ✗ | ✗ | ✗ | ✓ |
| Accountant | ✗ | read? | ✓ | ✗ |

\* Manager ruxsatlari seed/RBAC ga qarab; smoke matrix asos.

Har hujayra: UI yashirish **va** API 403 (faqat UI yashirish yetarli emas).

### 4.5 Security / Abuse

| ID | Hujum / case | Expected |
| --- | --- | --- |
| SEC-01 | No auth API | 401 |
| SEC-02 | Expired/invalid JWT | 401 |
| SEC-03 | Privilege escalation (seller→finance write) | 403 |
| SEC-04 | IDOR: boshqa tenant orderId | 403/404 |
| SEC-05 | TV token brute / missing | 401; token long random |
| SEC-06 | Cookie without Secure in prod | Prod da Secure+HttpOnly |
| SEC-07 | Rate limit login | Ko‘p fail dan keyin sekinlash/blok (agar implement) |
| SEC-08 | Mass assignment (extra fields) | Noma’lum field ignore/reject |
| SEC-09 | Path traversal / admin routes | Auth gate |
| SEC-10 | Bot internal API without key | 401 |

---

## 5. Nima “PASS”, nima “hali N/A” (cheklovlar)

Quyidagilar **MVP da yo‘q** — FAIL deb yozmang, **N/A + limitation**:

- Supplier payment reversal  
- Production movement correction  
- Partial delivery / partial return  
- Full accounting ledger / invoice print  
- IoT  
- Audit browsing UI (audit backend da bor, UI to‘liq emas)  
- Perfect multi-warehouse UI  

Manba: `docs/MVP_KNOWN_LIMITATIONS_V2.md`

---

## 6. Avtomatik vs odam

| Tekshiruv | Avto | Odam majburiy |
| --- | --- | --- |
| Happy-path API zanjir | `smoke:mvp` | Yo‘q, lekin tavsiya |
| Debt/inventory sonlari | `business-rules-deep-test` | Ha, 1–2 sonni qo‘lda solishtiring |
| UI qulaylik, O‘zbek copy | Qisman | **Ha** |
| Responsive real telefon | Qisman viewport | **Ha** |
| Tenant isolation real 2 tenant | Smoke/platform | Ha, multi-tenant pilot da |
| Telegram real bot | Yo‘q (synthetic) | Ha, real token bilan |
| AC-08 avans workflow | Partial | **Ha, UI da** |

---

## 7. Qabul qarori shabloni

```text
Sana: __________
Tester: __________
Muhit: local / pilot / staging
Commit/sha: __________

AC-01..13:  __ / 13 PASS
Critical FAIL: __________
Security FAIL: __________
Limitations accepted: ha / yo‘q

VERDICT:
□ GO — controlled pilot
□ GO WITH LIMITATIONS
□ NO-GO — sabab: __________
```

---

## 8. Siz uchun eng qisqa “1 soatlik” yo‘l

Agar vaqt kam bo‘lsa, faqat shu:

1. W0 rollar (10m)  
2. W3 production inventory math (15m)  
3. W5 sales debt + delivery rules (20m)  
4. W7 payroll calculate (10m)  
5. W9 security tez check (5m)  

Keyin to‘liq W1–W8.

---

## 9. Bog‘liq fayllar

| Fayl | Vazifa |
| --- | --- |
| `docs/product-requirements.md` | Acceptance source |
| `docs/USER_GUIDE_V1.md` | Qanday ishlatish + screenshots |
| `docs/MVP_SMOKE_TEST_SUITE_V1.md` | Avto API smoke |
| `docs/MVP_KNOWN_LIMITATIONS_V2.md` | Nima yo‘q |
| `docs/*_POLICY_V1.md` | Correction / delivery / reverse |
| `scripts/business-rules-deep-test.mjs` | Sonlar va bloklar |
| `scripts/full-manual-case-test.mjs` | Keng API case |
| `scripts/ui-route-case-test.mjs` | UI + mobile viewport |

---

## 10. Staff engineer eslatma

- **UI ishlashi ≠ business to‘g‘riligi.**  
- Har moliya/ombor case da **oldin/keyin son** yozing.  
- RBAC ni **API da** ham tekshiring (faqat sidebar emas).  
- “Demo seed chiroyli” ni “fabrika ishonadi” deb o‘qimang.  
- Pilotga chiqishda: backup, secret, TV token, smoke on server.

```text
Do not build a generic ERP.
Build Paypoq OS according to the product specification.
```

---

## 11. Avtomatik deep-test holati (agent yuritgan, qabul o‘rnini bosmaydi)

Sana: 2026-07-09 (local demo DB)

```bash
node scripts/business-rules-deep-test.mjs
# PASS: 28  FAIL: 0  NOTE: 1
```

Tasdiqlangan business qoidalar (API sonlari bilan):

- Stage inventory: batch + move conservation; over-qty 409  
- Worker activity inventory ni o‘zgartirmaydi  
- Order total / client debt o‘sishi  
- Unpaid delivery blok  
- Over-allocation blok  
- Delivered pay reverse blok; return dan keyin reverse OK  
- Supplier purchase → debt; material stock faqat alohida material-receipt amali bilan oshadi (contract NOTE, pass emas)
- RBAC: seller/shift/warehouse write cheklovlari  
- TV token majburiy  
- Unauth API 401  
- Closed payroll recalc 409  

**Hali odam yurishi shart:** UI qulaylik, AC-08 avans workflow, real telefon, Telegram real bot, multi-tenant IDOR qo‘lda.
