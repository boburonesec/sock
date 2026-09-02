# Paypoq OS — To‘liq foydalanish yo‘riqnomasi (screenshotlar bilan)

Status: Active  
Versiya: 1.1  
Til: O‘zbek  
Screenshotlar: `docs/screenshots/` (demo seed bilan olingan)

Bu hujjat Paypoq OS’ni **o‘rnatish, ishga tushirish va kundalik ishlatish**
uchun asosiy qo‘llanma. Har bir asosiy ekran real UI skrinshoti bilan
ko‘rsatilgan.

Mahsulot qoidalari:

- `AGENTS.md`
- `docs/product-requirements.md`
- `docs/DOMAIN_MODEL_V1.md`

Screenshotlarni qayta olish:

```bash
# API + Web ishlayotgan bo‘lsin
pnpm verify:acceptance-fixture
pnpm playwright:install  # faqat qo‘llab-quvvatlanadigan Chromium engine
pnpm test:ui-routes
pnpm capture:user-guide
```

---

## 1. Paypoq OS nima?

Paypoq OS — paypoq fabrikasi uchun **Manufacturing Operations Platform**.

U:

- ishlab chiqarishni **Stage Inventory** orqali ko‘rsatadi
- ishchi faolligini qayd qiladi
- ombor, sotuv, qarz, payroll va dashboard beradi

U **emas**: generic ERP, to‘liq buxgalteriya, IoT platforma.

Default production oqimi:

```text
Averlog → Dazmol → Sifat → Kiydirish → Par Dazmol → Parlash
→ Bezak → Etiketka → Qadoqlash → Ombor
```

---

## 2. Tezkor start (local)

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# DATABASE_URL va TV tokenlarni to‘ldiring (web va API TV tokenlari bir xil)

pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm prisma:seed        # data yaratmaydigan normal startup baseline tekshiruvi
# Shu nuqtada baseline smoke ishlaydi; business acceptance hali ishlamaydi.
pnpm smoke:mvp

pnpm verify:acceptance-fixture  # faqat demo/QA business fixture
pnpm verify:acceptance          # full + deep business acceptance

pnpm api:dev            # :3001
pnpm dev                # :3000
```

Ochish:

```text
http://localhost:3000/login
```

---

## 3. Demo akkauntlar

### Factory (tenant) — `/login`

| Rol | Email | Parol |
| --- | --- | --- |
| Owner | `owner@paypoq.local` | `ChangeMe123!` |
| Manager | `manager@paypoq.local` | `ChangeMe123!` |
| Seller | `seller@paypoq.local` | `ChangeMe123!` |
| Warehouse | `warehouse@paypoq.local` | `ChangeMe123!` |
| Shift Receiver | `shift@paypoq.local` | `ChangeMe123!` |
| Accountant | `accountant@paypoq.local` | `ChangeMe123!` |

### Super Admin — `/admin/login`

| Email | Parol |
| --- | --- |
| `platform@paypoq.local` | `ChangeMe123!` |

---

## 4. Kirish (Login)

**Yo‘l:** `/login`

1. Email va parolni kiriting  
2. **Kirish** tugmasini bosing  
3. Muvaffaqiyatli bo‘lsa `/dashboard/executive` ga o‘tasiz  

![Login sahifasi](screenshots/01-login.png)

---

## 5. Boshqaruv paneli (Executive)

**Yo‘l:** `/dashboard/executive`  
**Kim:** Owner, Manager

Bu yerda fabrikalar holatini bir qarashda ko‘rasiz:

- oylik sotuv / xarajat  
- mijoz va supplier qarzi  
- faol xodim / buyurtma / mahsulot  
- past qoldiq materiallar  
- biznes holati kartalari  

![Executive dashboard](screenshots/02-dashboard-executive.png)

**Qanday ishlatish**

1. Kun boshida shu sahifani oching  
2. `Kuzatuvda` badge’lar e’tibor talab qiladigan sohalarni ko‘rsatadi  
3. Tezkor navigatsiya tugmalari: Operatsiyalar, Ishlab chiqarish, Sotuvlar, Moliya  

> KPI’lar frontendda hisoblanmaydi — backend summary.

---

## 6. Operatsiyalar dashboard

**Yo‘l:** `/dashboard/operations`  
**Kim:** Manager

Stage inventory, bottleneck va ishchi unumdorligiga e’tibor.

![Operatsiyalar dashboard](screenshots/03-dashboard-operations.png)

### Bildirishnomalar

**Yo‘l:** `/notifications`

Bu sahifa persistent in-app inbox. O‘qilmagan xabarni `O‘qildi` tugmasi bilan
belgilash mumkin; Telegram yetkazish muvaffaqiyatsiz bo‘lsa ham inbox source of
truth bo‘lib qoladi. MVP’da machine task, quality recheck va inspection
xabarlari yaratiladi. Low stock, order deadline, pending advance, generic
defect, stalled batch va overdue debt avtomatik triggerlari future scope.

---

## 7. Ishlab chiqarish (asosiy control center)

**Yo‘l:** `/production`  
**Kim:** Manager, Shift Receiver

Bu tizimning eng muhim sahifasi.

![Ishlab chiqarish board](screenshots/04-production.png)

### Nimalar ko‘rinadi

- Bugungi ishlab chiqarish, jarayondagi dona, eng band bosqich  
- **Bosqichlar oqimi** (Averlog … Ombor) — har kartada hozirgi dona  
- O‘ng panel: **Tezkor amallar**

### Tezkor amallar tartibi

```text
1. Stanoklar bo‘limida production runni boshlash va outputni qabul qilish
2. Bosqichga o‘tkazish
3. Ishchi faolligi qo‘shish
4. Brak qayd qilish (kerak bo‘lsa)
5. Omborga qabul qilish (Ombor stage’dan)
```

| Amal | Nima bo‘ladi |
| --- | --- |
| Production run outputini qabul qilish | Batch va birinchi stage inventory yaratiladi; mexanik/operatorga model stavkasi bilan alohida ishbay activity yoziladi |
| Bosqichga o‘tkazish | Source ↓ destination ↑ (manfiy bo‘lmaydi) |
| Ishchi faolligi | Payroll uchun yozuv; inventory o‘zgarmaydi |
| Brak | Defect yozuvi; avtomatik jarima yo‘q |
| Omborga qabul | Ombor stage ↓ finished stock ↑ |

**Operator eslatmasi**

- Asosiy metriks — **Stage Inventory**, batch soni emas  
- Ishchilar webga kirmaydi — Shift Receiver kiritadi  
- Qabulda tanlangan mexanik/operator faqat ishning audit qaydi; bu amal ularga payroll yoki ishbay faollik yozmaydi

---

## 8. Ombor

### 8.1 Tayyor mahsulot

**Yo‘l:** `/warehouse`

![Ombor — tayyor mahsulot](screenshots/05-warehouse.png)

### 8.2 Materiallar

**Yo‘l:** `/warehouse/materials`

Material qabul qilish shu yerdan.  
Supplier purchase **avtomatik** stock yaratmaydi.

![Ombor materiallar](screenshots/06-warehouse-materials.png)

### 8.3 Harakatlar tarixi

**Yo‘l:** `/warehouse/movements`

Kirim, chiqim, correction yozuvlari. Eski yozuvlar o‘chirilmaydi.

![Ombor harakatlar](screenshots/07-warehouse-movements.png)

### 8.4 Zonalar

**Yo‘l:** `/warehouse/zones`

![Ombor zonalar](screenshots/08-warehouse-zones.png)

### Stock correction

Noto‘g‘ri qoldiq bo‘lsa:

1. Correction amalini oching  
2. Yangi quantity + reason  
3. Snapshot yangilanadi, `CORRECTION` movement yoziladi  

---

## 9. Sotuvlar

### 9.1 Sotuv overview

**Yo‘l:** `/sales`

![Sotuvlar overview](screenshots/09-sales.png)

### 9.2 Mijozlar

**Yo‘l:** `/sales/clients`

1. Mijoz qo‘shing (ism, telefon, manzil)  
2. Qarz backend projection sifatida ko‘rinadi  

![Mijozlar](screenshots/10-sales-clients.png)

### 9.3 Buyurtmalar

**Yo‘l:** `/sales/orders`

```text
Mijoz tanlash → variant + miqdor → buyurtma yaratish
→ (ixtiyoriy to‘lov, alohida) → yetkazish (stock + ixtiyoriy logistika chiqimi)
```

![Buyurtmalar](screenshots/11-sales-orders.png)

Demo misol:

- `DEMO-ORD-001` — yetkazilgan, to‘langan  
- `DEMO-ORD-002` — tasdiqlangan, qisman to‘langan  

### 9.4 To‘lovlar

**Yo‘l:** `/sales/payments`

- To‘lov buyurtmaga **allocation** qilinadi  
- Unallocated payment / client credit / overpayment V1’da yo‘q  

![To‘lovlar](screenshots/12-sales-payments.png)

### 9.5 Mijoz qarzi

**Yo‘l:** `/sales/debts`

`Client debt = tasdiqlangan buyurtmalar − qabul qilingan to‘lovlar`

![Mijoz qarzlari](screenshots/13-sales-debts.png)

### Delivery va return

| Amal | Shart | Natija |
| --- | --- | --- |
| Yetkazish | Yetkazilmagan status + Finished Products stock | Stock OUT, status DELIVERED. Mijoz to‘lovi **shart emas**. Ixtiyoriy logistika summasi → moliya **Transport** chiqimi (PAID) |
| Tahrirlash / bekor | Faqat yetkazilmagan (DRAFT/CONFIRMED/READY/…) | Qatorlar/mijoz o‘zgaradi yoki CANCELLED. To‘lov bog‘langan bo‘lsa bekor bloklanadi |
| Return | Faqat DELIVERED | Stock RETURN, status READY |
| Payment (mijoz) | Allocation | Debt = buyurtmalar − to‘lovlar |
| Payment reversal | Policy bo‘yicha | Debt qayta hisoblanadi |

**Muhim:** Buyurtma yaratish = yozuv (mijozga chiqmagan). Mijozga chiqish = «Yetkazildi qilish». Logistika to‘lovi — fabrika chiqimi, mijoz mahsulot to‘lovi emas.

Siyosatlar: `DELIVERY_RETURN_POLICY_V1.md`, `SALES_PAYMENT_REVERSAL_POLICY_V1.md`

---

## 10. Moliya

### 10.1 Finance overview

**Yo‘l:** `/finance`

![Moliya overview](screenshots/14-finance.png)

### 10.2 Supplierlar

**Yo‘l:** `/finance/suppliers`

```text
Supplier yaratish → Purchase → Payment allocation → Debt
```

![Supplierlar](screenshots/15-finance-suppliers.png)

### 10.3 Payroll

**Yo‘l:** `/finance/payroll`

```text
Period create → Calculate → Review → Pay → Close
```

- Manba: WorkerActivity + salary rate snapshot  
- Bonus +, jarima/avans −  
- Closed payroll **o‘zgarmaydi**  

![Payroll](screenshots/16-finance-payroll.png)

### 10.4 Avanslar

**Yo‘l:** `/finance/advances`

![Avanslar](screenshots/17-finance-advances.png)

### 10.5 Xarajatlar

**Yo‘l:** `/finance/expenses`

![Xarajatlar](screenshots/18-finance-expenses.png)

---

## 11. Xodimlar

**Yo‘l:** `/employees`

1. **Xodim qo‘shish** — ism, ish bosqichlari va kunduzgi/kechki smenani tanlang
2. Faollik, bonus, jarima, avans shu yerdan boshqariladi  
3. Hard-delete **yo‘q** — inactive qiling  

![Xodimlar](screenshots/19-employees.png)

### 11.1 Davomat

**Yo‘l:** `/attendance`

- Oy bo‘yicha xodim necha kun kelgani ko‘rinadi.
- Kirish va chiqish bo‘lsa kun to‘liq yopilgan hisoblanadi.
- Chiqish yo‘q va smena yakuni o‘tgan bo‘lsa “Xodim kunni yopmadi” ogohlantirishi chiqadi.
- Hozirgi bosqichda ma’lumot qo‘lda kiritilmaydi; Trunket FaceID formati tasdiqlangach integratsiya ulanadi.

---

## 12. Hisobotlar

**Yo‘l:** `/reports`

Overview va modul bo‘yicha hisobot kirish nuqtalari.  
Excel/PDF export V1’da cheklangan.

![Hisobotlar](screenshots/20-reports.png)

---

## 13. Sozlamalar (master data)

### 13.1 Sozlamalar home

**Yo‘l:** `/settings`

![Sozlamalar](screenshots/21-settings.png)

### 13.2 Mahsulotlar

**Yo‘l:** `/settings/products`

```text
Rang + Material + Mavsum
→ Product model
→ Product variant
→ Narx
```

MVP’da **size yo‘q**. Order narxi snapshot sifatida saqlanadi.

![Mahsulotlar](screenshots/22-settings-products.png)

### 13.3 Rang / Material / Mavsum

| Yo‘l | Skrinshot |
| --- | --- |
| `/settings/colors` | ![Ranglar](screenshots/23-settings-colors.png) |
| `/settings/materials` | ![Materiallar](screenshots/24-settings-materials.png) |
| `/settings/seasons` | ![Mavsumlar](screenshots/25-settings-seasons.png) |

### 13.4 Bosqichlar

**Yo‘l:** `/settings/stages`

![Bosqichlar](screenshots/26-settings-stages.png)

### 13.5 Ish haqi stavkalari

**Yo‘l:** `/settings/salary-rates`

- factory + stage  
- yoki factory + stage + product variant  
- employee-specific rate V1’da yo‘q  

![Stavkalar](screenshots/27-settings-salary-rates.png)

### 13.6 Kompaniya / filial

**Yo‘l:** `/settings/company`

![Kompaniya](screenshots/28-settings-company.png)

### 13.7 Ish smenalari

**Yo‘l:** `/settings/shifts`

Owner yoki Manager kunduzgi va kechki smena vaqtlarini hamda kechki smena uchun dona ustamasini so‘mda belgilaydi. O‘zgarish eski ish haqi yozuvlarini qayta hisoblamaydi.

### 13.8 Telegram bog‘lash

**Yo‘l:** `/settings/telegram`

Employee yoki Client uchun link token yarating → botda `/link CODE`.

![Telegram sozlamalari](screenshots/29-settings-telegram.png)

---

## 14. Profil

**Yo‘l:** `/profile`

![Profil](screenshots/30-profile.png)

---

## 15. Factory TV

**Yo‘l:** `/tv`  
Login talab qilinmaydi. Token: `FACTORY_TV_ACCESS_TOKEN` (web va API bir xil).

Zavod zalidagi katta ekran uchun:

- bugungi ishlab chiqarish  
- stage qoldiqlari  
- aktiv ishchilar  

![Factory TV](screenshots/31-factory-tv.png)

Production’da TV’ni internetga ochiq qoldirmang; token kuchli bo‘lsin.

---

## 16. Super Admin (platform)

### 16.1 Admin login

**Yo‘l:** `/admin/login`

![Admin login](screenshots/32-admin-login.png)

### 16.2 Korxonalar (tenantlar)

**Yo‘l:** `/admin` yoki `/admin/tenants`

Platform admin:

- yangi korxona (tenant) yaratadi  
- activate / suspend  
- owner user yaratadi  
- branch mode / filial qo‘shadi  

![Admin korxonalar](screenshots/33-admin-home.png)

![Admin tenants ro‘yxat](screenshots/34-admin-tenants.png)

Bu panel **fabrika smena operatori** uchun emas — Paypoq platform egasi uchun.

---

## 17. Kundalik ish zanjiri (qisqa checklist)

Yangi kun / yangi mahsulot:

```text
☐ Master data (rang, material, mavsum, product, stavka)
☐ Xodimlar
☐ Production: partiya → bosqich → faollik → ombor
☐ Warehouse: material kirim / finished receipt
☐ Sales: mijoz → order → payment → delivery
☐ Finance: supplier / avans / payroll (davr oxiri)
☐ Dashboard + Factory TV tekshiruv
```

---

## 18. Telegram bot (qisqa)

```bash
# env: TELEGRAM_BOT_TOKEN, API_BASE_URL, BOT_INTERNAL_API_KEY
pnpm bot:dev
```

| Buyruq | Vazifa |
| --- | --- |
| `/link CODE` | Akkount bog‘lash |
| `/salary`, `/activities`, `/advances`, `/payroll` | Employee o‘qish |
| `/orders`, `/debt`, `/payments` | Client o‘qish |

Bot faqat o‘qiydi. Batafsil: `docs/TELEGRAM_BOT_RUNBOOK_V1.md`

---

## 19. Mobile (qisqa)

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm mobile:dev
# Android emulator: http://10.0.2.2:3001
# Real device: http://LAN_IP:3001
```

Employee self-service + manager read dashboards. Offline write / push V1’da yo‘q.

---

## 20. Docker / smoke / backup

```bash
# Docker
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d postgres
docker compose --env-file .env.docker --profile migrate run --rm migrate
docker compose --env-file .env.docker up -d api web bot

# Smoke
pnpm smoke:mvp
# yoki ishlayotgan API uchun:
MVP_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:mvp

# Backup
pnpm backup:db
pnpm restore:db path/to/backup.dump
```

---

## 21. Operator qat’iy qoidalari

1. Qarz, stock total, payroll, KPI — faqat backend qiymatlari  
2. Eski movement/payment’ni o‘chirmang  
3. Xato → correction / reversal / return  
4. Closed payroll immutable  
5. Employee delete emas — inactive  
6. Manfiy inventory yo‘q  
7. Delivery to‘lovdan mustaqil — sex o‘zi va mijoz uchun bepul yetkazadi;
   to‘liq to‘lov shart emas (qarz saqlanadi, keyin to‘lanadi)  
8. Supplier purchase ≠ material stock  

---

## 22. Mavjud / hali yo‘q

**Mavjud:** auth/RBAC, production, warehouse, sales+return+reversal, supplier,
payroll, dashboards, TV, Telegram, mobile foundation, super admin.

**Hali yo‘q:** full accounting, invoice/print, IoT telemetriya/sensor integratsiyasi

### Xodim turi, haq turi va account

`Xodimlar` sahifasida ish profili va haq turi alohida tanlanadi. Bosqich faqat
bosqich ishchisiga beriladi. Operator account olmaydi. Mexanik va
mexanik-master tegishli account rolini oladi. Oylik xodimda amaldagi salary
agreement, ishbay mexanik/operator uchun esa model stavkasi ishlatiladi.

### Stanok va mexanik nazorati

`Stanoklar` sahifasida stanok yarating, smena/vaqt bo‘yicha mexanikni biriktiring
va operator bilan stanok ishini boshlang. Stanokdan chiqqan mahsulotni qabul
qilish bosqichdagi qoldiqni va ikki xodimning ishbay bajarilgan ishini bitta
amalda yozadi. `Qo‘lda qabul qilish (eski usul)` ish haqi hisob-kitobini
yaratmaydi.

Mexanik `Mexanik` sahifasida tasklar, inspection roundlar va target/min/max
o‘lchovlarini ko‘radi. Normadan chiqish runni avtomatik to‘xtatmaydi; 30
daqiqalik qayta o‘lchov yaratadi. HOLD qarorini master beradi.
reversal, production movement correction, partial delivery, mobile offline write.

To‘liq: `docs/MVP_KNOWN_LIMITATIONS_V2.md`

---

## 23. Screenshot indeksi

| # | Fayl | Sahifa |
| --- | --- | --- |
| 01 | `01-login.png` | `/login` |
| 02 | `02-dashboard-executive.png` | `/dashboard/executive` |
| 03 | `03-dashboard-operations.png` | `/dashboard/operations` |
| 04 | `04-production.png` | `/production` |
| 05 | `05-warehouse.png` | `/warehouse` |
| 06 | `06-warehouse-materials.png` | `/warehouse/materials` |
| 07 | `07-warehouse-movements.png` | `/warehouse/movements` |
| 08 | `08-warehouse-zones.png` | `/warehouse/zones` |
| 09 | `09-sales.png` | `/sales` |
| 10 | `10-sales-clients.png` | `/sales/clients` |
| 11 | `11-sales-orders.png` | `/sales/orders` |
| 12 | `12-sales-payments.png` | `/sales/payments` |
| 13 | `13-sales-debts.png` | `/sales/debts` |
| 14 | `14-finance.png` | `/finance` |
| 15 | `15-finance-suppliers.png` | `/finance/suppliers` |
| 16 | `16-finance-payroll.png` | `/finance/payroll` |
| 17 | `17-finance-advances.png` | `/finance/advances` |
| 18 | `18-finance-expenses.png` | `/finance/expenses` |
| 19 | `19-employees.png` | `/employees` |
| 20 | `20-reports.png` | `/reports` |
| 21 | `21-settings.png` | `/settings` |
| 22–29 | `22…29-settings-*.png` | settings subpages |
| 30 | `30-profile.png` | `/profile` |
| 31 | `31-factory-tv.png` | `/tv` |
| 32–34 | `32…34-admin-*.png` | Super Admin |

---

## 24. Keyin to‘ldiriladigan qismlar

- [ ] Real factory tenant ma’lumotlari  
- [ ] Operator training video / bosqichma-bosqich ssenariylar  
- [ ] Production secret rotation tartibi  
- [ ] Backup restore rehearsal natijasi  
- [ ] Monitoring / alert ownership  
- [ ] Form modal skrinshotlari (partiya yaratish, to‘lov, delivery dialog)  

Modal/dialog skrinshotlari keyingi iteratsiyada qo‘shilishi mumkin
(`scripts/capture-user-guide-screenshots.mjs` ga dialog open qo‘shib).

---

## 25. Pilot navigatsiya matritsasi

Pilot rejimi standart holatda yoqilgan. Faqat pilot kundalik ishiga kerakli
bo‘limlar menyuda ko‘rinadi va URL orqali ham ochiladi. Mavjud modullar
o‘chirilmagan; keyingi bosqich uchun `NEXT_PUBLIC_PILOT_SCOPE_MODE=false` bilan
to‘liq permission-based navigatsiyani qayta yoqish mumkin.

| Rol | Pilotda ko‘rinadigan bo‘limlar | Birinchi sahifa |
| --- | --- | --- |
| Owner | Boshqaruv paneli, Ishlab chiqarish, Stanoklar, Ombor, Sotuvlar, Moliya, Xodimlar, Sozlamalar | Boshqaruv paneli |
| Manager | Boshqaruv paneli, Ishlab chiqarish, Ombor, Sotuvlar, Moliya, Xodimlar, Sozlamalar | Boshqaruv paneli |
| Shift Receiver (smena nazoratchisi) | Ishlab chiqarish, Stanoklar | Ishlab chiqarish |
| Warehouse Operator (omborchi) | Ombor | Ombor |
| Seller (sotuvchi) | Sotuvlar | Sotuvlar |
| Accountant (buxgalter) | Moliya | Moliya |

Profil va Bildirishnomalar barcha login qilgan pilot rollarida ochiq. Pilotda
Operatsiyalar paneli, Hisobotlar, Audit jurnali, Mexanik ish maydoni va Davomat
menyudan ham, to‘g‘ridan-to‘g‘ri URL orqali ham yashiriladi. Backend permission
guardlari o‘zgarmagan va mustaqil himoya qatlamidir.

Ishlab chiqarish operatori uchun uchta asosiy amal alohida ko‘rsatiladi:

1. `Stanok ishini boshlash`
2. `Stanokdan chiqqan mahsulotni qabul qilish`
3. `Keyingi bosqichga o‘tkazish`

### Week 2 moliya vakolatlari

| Amal | Pilotdagi vakolat |
| --- | --- |
| Xarajat yoki avans so‘rovini yaratish | Moliya yozish huquqi bor foydalanuvchi |
| Xarajat yoki avansni tasdiqlash/rad etish | Manager |
| Tasdiqlangan xarajat yoki avansni to‘lash | Accountant |
| Ish haqini to‘lash | Accountant |

So‘rovchi o‘z xarajat yoki avans so‘rovini tasdiqlay olmaydi va o‘zi so‘ragan
to‘lovni bajara olmaydi. Owner uchun favqulodda ma’muriy istisno hozircha
saqlangan; bu istisnoni olib tashlash alohida biznes qaroridir.

### DELIVERY POLICY — BLOCKED BY CUSTOMER CONFIRMATION

Pilot uchun `UNPAID`, `PARTIALLY_PAID` va `PAID` buyurtmalarni yetkazish qoidasi
hali tasdiqlanmagan. Shu sabab Week 2 doirasida delivery, return, payment
reversal yoki client debt biznes qoidalari o‘zgartirilmadi. Bu holatlar bo‘yicha
yangi xulq va’da qilinmasin yoki operatorga yakuniy siyosat sifatida o‘rgatilmasin.

## 26. Golden rule

```text
Do not build a generic ERP.
Build Paypoq OS according to the product specification.
```

Operator uchun:

```text
Bosqichdagi qoldiq — haqiqat.
Backend — hisob-kitob manbai.
Xato — o‘chirish bilan emas, qoldiqni tuzatish yoki to‘lovni bekor qilish bilan tuzatiladi.
```
