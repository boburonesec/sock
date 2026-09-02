# Paypoq OS — Real fabrika uchun mahsulot validatsiyasi

**Sana:** 2026-08-06  
**Ko‘rib chiqilgan:** USER_GUIDE, CLIENT_USAGE_GUIDE, BUSINESS_ACCEPTANCE, product requirements, domain model, page map, UI specification va Staff Engineering Audit  
**Chegara:** faqat mahsulot sifati, biznes oqimi va operator foydalanishi. Kod, arxitektura, xavfsizlik va performance baholanmadi.

## Qisqa javob

**Agar Paypoq OS ertaga real paypoq fabrikasiga qo‘yilsa, yangi xodimlarning ko‘pi uni tabiiy ravishda, yordamsiz ishlata olmaydi.**

Owner va tajribali Manager dashboard hamda asosiy qoldiqlarni bir kunda tushunishi mumkin. Seller va Warehouse Operator bir kunlik amaliy treningdan keyin cheklangan oqimda ishlashi mumkin. Shift Receiver, Accountant va payroll operatori esa terminlar, bir-biriga yaqin amallar, correction cheklovlari va ko‘p bosqichli hisoblar sabab doimiy yo‘riqnoma hamda nazorat talab qiladi.

Mahsulotning eng kuchli g‘oyasi — **har ishlab chiqarish bosqichidagi joriy qoldiqni ko‘rsatish**. Eng katta UX muammosi — shu sodda g‘oya atrofida inglizcha texnik atamalar, ko‘p master data, stanok/run/intake/batch/activity/movement kabi bir-biriga yaqin tushunchalar va ERPga xos moliyaviy bo‘limlar ko‘payib ketgan.

### Pilot qarori

**Shartli pilot:** ha, lekin faqat bitta fabrika, bitta smena, qisqartirilgan menyu, oldindan tayyorlangan katalog, yozma correction tartibi va joyida yordamchi bilan.  
**Ertadan mustaqil foydalanish:** yo‘q.  
**To‘liq fabrika rollout:** yo‘q; avval ushbu hisobotdagi “Pilotdan oldin shart” bandlari bajarilishi kerak.

## Baholash usuli va cheklov

Ekran, klik va maydon sonlari hujjatlarda tasvirlangan yo‘llar va amallardan chiqarilgan **taxminiy task count**. Modalning real ochilishi, default qiymatlar, klaviatura yurishi va foydalanuvchining haqiqiy kliklari kuzatilmagan. Pilotdan oldin 5–8 real operator bilan moderated usability test o‘tkazilib, har task uchun vaqt, xato va yordam so‘rash soni o‘lchanishi kerak.

Kognitiv murakkablik:

- **Past:** kundalik tanish vazifa, 1 ekran, 1–3 qaror.
- **O‘rta:** bir nechta obyekt/statusni tushunish yoki oldingi yozuvni tekshirish kerak.
- **Yuqori:** bir xil ko‘rinadigan amallar orasidan tanlash, boshqa modul natijasini bilish yoki xatoni qaytarish qiyin.
- **Juda yuqori:** pul/payroll/stock natijasi bir nechta manbaga bog‘liq va correction xavfli.

## 1. Modul kesimidagi product fit

| Modul | Tabiiy oqimmi? | Ekran | Odatdagi klik | Majburiy maydon | Murakkablik | Bir kunda o‘rganish |
|---|---|---:|---:|---:|---|---|
| Login/fabrika | Asosan tabiiy | 1 | 2–4 | 2 + fabrika | Past | Oson |
| Executive dashboard | Ko‘rish tabiiy, KPI tili og‘ir | 1 | 0–2 | 0 | Past/O‘rta | Oson |
| Operations dashboard | Manager uchun tabiiy | 1 | 0–3 | 0 | O‘rta | Oson |
| Stanok/run | Tushuncha ko‘p | 2 (`machines`, `mechanic`) | 6–10 | 4–6 | Yuqori | Qiyin |
| Production board | Asosiy g‘oya tabiiy, ekran ortiqcha yuklangan | 1 katta board | 5–9/amal | 3–5 | Yuqori | Qiyin |
| Worker activity | Sex ishiga mos, lekin duplicate entry xavfi bor | Production ichida | 5–7 | 3–5 | O‘rta/Yuqori | O‘rta |
| Defect | Sodda, lekin disposition yo‘q | Production ichida | 5–7 | 4 | O‘rta | O‘rta |
| Warehouse | Tayyor mahsulot va material ajratilishi to‘g‘ri | 4 | 4–8 | 4–6 | O‘rta | O‘rta |
| Sales | Savdo oqimi tanish, bo‘limlar tarqoq | 5 | 8–15/order | 5–10 | O‘rta/Yuqori | O‘rta |
| Supplier | Xarid va to‘lov tushunarli, receipt alohida eslab qolinadi | 1 workspace + warehouse | 10–16 | 6–10 | Yuqori | Qiyin |
| Expenses/advances | Oqim tanish | 2 | 5–9 | 4–6 | O‘rta/Yuqori | O‘rta |
| Payroll | Real ishga mos, ammo eng xatoli oqim | 1 + detail drawer | 8–15/period | davr + payment 3–5 | Juda yuqori | Qiyin |
| Employees | Profil va status tabiiy, sozlama ko‘p | 4+ | 6–12 | 5–10 | Yuqori | Qiyin |
| Attendance | Hozir ko‘rish ekranigina | 1 | 0–3 | 0 | Past | Oson, lekin kam foyda |
| Reports | Hisobot emas, linklar hubi | 1 | 1–3 | 0 | Past | Oson, qiymati past |
| Audit | Owner uchun tushunish qiyin | 1 | 2–6 | 0/filter | Yuqori | Qiyin |
| Settings | Juda fragmentlangan | 10+ | 4–10/task | turlicha | Juda yuqori | Qiyin |
| Notifications | Oddiy inbox, triggerlar cheklangan | 1 | 1–2 | 0 | Past | Oson |
| Telegram | Ishchi uchun mos kanal, real jarayon tasdiqlanmagan | 1 chat | 1–3 | link kodi | O‘rta | Oson/O‘rta |
| Mobile | Rahbar uchun qo‘shimcha ko‘rish | 5+ | turlicha | login | O‘rta | O‘rta |
| Factory TV | Ko‘rish oson, joriy pilotga tayyor emas | 1 | 0 | 0 | Past | Oson |

Klik va maydon sonlari UI specification hamda walkthrough asosidagi taxmin; real usability test bilan qayta o‘lchanadi.

## 2. Terminologiya auditi

### Darhol almashtirilishi kerak bo‘lgan atamalar

| Hozirgi atama | Muammo | Operatorga tavsiya |
|---|---|---|
| Stage Inventory | Texnik va inglizcha | **Bosqichdagi qoldiq** |
| Production Run | Sex xodimi ishlatmaydi | **Stanok ishi** yoki **Ishlab chiqarish navbati** |
| Shift Receiver | Real lavozim sifatida noaniq | Fabrikaga qarab **Smena hisobchisi**, **Smena nazoratchisi** yoki **Qabulchi** |
| Payroll | Buxgalter tushunadi, operator emas | **Ish haqi hisob-kitobi** |
| Warehouse Zone | Omborchi “zona” deyishi shart emas | **Ombor joyi** yoki **Ombor bo‘limi** |
| Supplier Purchase | Aralash til | **Yetkazib beruvchidan xarid** |
| Activity | Nima qilingani noma’lum | **Bajarilgan ish** |
| Intake | Texnik integratsiya tili | **Ishlab chiqarilgan mahsulotni qabul qilish** |
| Output | Noaniq | **Stanokdan chiqqan mahsulot** |
| Movement / Move Stage | Texnik | **Bosqichga o‘tkazish** |
| Batch | Ko‘p joyda “partiya” bilan aralash | Faqat **Partiya** |
| Defect | Inglizcha | **Nuqson** yoki fabrikadagi odatiy **Brak**; bittasini tanlash |
| Finished receipt | Texnik | **Tayyor mahsulotni omborga qabul qilish** |
| Stock | Inglizcha | **Ombor qoldig‘i** |
| Threshold | Texnik | **Minimal qoldiq** |
| Allocation | Buxgalter ham ikkilanadi | **To‘lovni taqsimlash** |
| Client debt | Aralash til | **Mijoz qarzi** |
| Supplier debt | Aralash til | **Yetkazib beruvchiga qarzimiz** |
| Expense | Buxgalterga tanish, operatorga emas | **Xarajat** |
| Advance | O‘zbekchada ishlatiladi | **Avans** |
| Correction | Texnik | **Qoldiqni tuzatish** |
| Reversal | Juda texnik | **To‘lovni bekor qilish** yoki **Qaytarma yozuv** |
| Return | Aralash | **Mahsulot qaytishi** |
| Drawer | UI termini ko‘rinmasin | **Tafsilotlar** |
| Executive | Keraksiz status tili | **Rahbar paneli** |
| Operations | Keng va noaniq | **Ishlab chiqarish nazorati** |
| Attention | Inglizcha status | **E’tibor kerak** |
| Hold | Inglizcha status | **Vaqtincha to‘xtatildi** |
| Requested | Status noaniq | **Tasdiq kutilmoqda** |
| Approved | — | **Tasdiqlandi** |
| Rejected | — | **Rad etildi** |
| Partially paid | — | **Qisman to‘landi** |
| Paid | — | **To‘landi** |
| Closed | Kontekstga qarab | **Yakunlandi** |
| Inactive | — | **Ishlamaydi** yoki **Faol emas** |

### Fabrika bilan albatta tasdiqlanadigan so‘zlar

`Averlog`, `Dazmol`, `Sifat`, `Kiydirish`, `Par Dazmol`, `Parlash`, `Bezak`, `Etiketka`, `Qadoqlash` universal emas. Ayrim fabrikalar “to‘quv”, “tikuv/overlok”, “forma”, “boarding”, “juftlash”, “birka”, “pachka” kabi nomlardan foydalanadi. Pilot onboardingda mavjud doska va sexdagi og‘zaki nomlar olinib, tizim aynan shu nomlarga moslanishi kerak.

**Asosiy qoida:** ekranda bitta tushuncha uchun bitta til. “Supplier purchase → Payment allocation → Debt” kabi gaplar operator interfeysida bo‘lmasligi kerak.

## 3. Modul bo‘yicha chuqur product review

### Dashboard

**Business fit:** Owner uchun tabiiy: ertalab umumiy holat. Managerga executive va operations orasidagi farqni o‘rgatish kerak. 8 KPI, ikki trend, top ro‘yxatlar va alertlar bir qarashda haddan ortiq bo‘lishi mumkin.

**Yetishmaydi:** “Bugun nima qilishim kerak?” ro‘yxati; raqamdan tegishli yozuvga drill-down; KPIning davri va ta’rifi; oxirgi yangilanish va mas’ul; kechagi/reja bilan sodda solishtirish.

**Keraksiz:** alohida Executive va Operations dashboard birinchi pilotda ikkita parallel “bosh sahifa” yaratadi. Owner uchun Rahbar paneli, Manager uchun Smena paneli yetarli.

**Tavsiya:** rolga qarab bitta bosh sahifa. Eng yuqorida 4 savol: bugun nechta chiqdi, qayerda tiqildi, nima kamaydi, kimdan/kimga qancha qarz.

### Stanoklar va mexanik

**Business fit:** Manual stanok, biriktirilgan mexanik va smena tushunchasi real. Lekin `Machine → Assignment → Run → Intake → Batch → Activity` ketma-ketligi sex uchun tizim tili, ish tili emas.

**Hesitation:** yangi smena boshlanganda operator avval assignmentni, keyin runni, keyin output qabulini qayerdan qilishni eslab qolishi kerak. Mexanik va operator yana partiya formasida ko‘rinsa, ularning vazifasi takrorlangandek tuyuladi.

**Yetishmaydi:** smenani topshirish/qabul qilish; stanok to‘xtash sababi va davomiyligi; setup/almashtirish vaqti; rejadagi model/miqdor; outputni smena bo‘yicha jamlash; tezkor “stanok to‘xtadi” tugmasi; qog‘oz stanok kartasi/QR.

**Ortiqcha:** target/min/max measurement, uch slot, recheck, task va HOLD mexanizmi asosiy Stage Inventory hali o‘rganilmagan pilotda juda katta alohida tizim. Sifat nazorati real majburiyat bo‘lmasa, Phase 2ga o‘tkazing.

**Tavsiya:** bitta **Smena stanoklari** ekrani: stanok, model, operator, mexanik, reja, chiqdi, brak, to‘xtash. “Ishni boshlash” va “Chiqqan mahsulotni qabul qilish” asosiy tugmalar bo‘lsin.

### Production / Bosqichdagi qoldiq

**Business fit:** juda kuchli va fabrika uchun tabiiy. Sex rahbari aynan qaysi bosqichda nechta yarim tayyor mahsulot borligini bilmoqchi.

**Hesitation:** bir board ichida KPI, stage cards, batch, move, activity, defect va finished receipt bor. “Ishlab chiqarishni qabul qilish” bilan “ishchi bajargan ish” va “bosqichga o‘tkazish” bir xil miqdorlarni so‘rashi sabab operator qaysi birini qachon qilishini adashtiradi.

**Yetishmaydi:** navbatdagi tavsiya etilgan bosqich; bir xil partiyani topish uchun qidiruv/QR; smena bo‘yicha ochiq ishlar; correction; partiyani birlashtirish/ajratish biznes qoidasi; rework; scrap; WIP sanog‘ini tasdiqlash; smena yakuni reconciliation; izoh/attachment; chop etiladigan partiya yorlig‘i.

**Ortiqcha:** “batch primary emas” bo‘lsa ham operatorning deyarli har amalida batch tanlashi traceability yukini oshiradi. Partiya tanlovi QR/default orqali yashirin avtomatlashtirilishi kerak.

**Split:** boardni ikkiga ajrating: **Smena qabul va harakatlari** (operator write) hamda **Bosqichlar holati** (manager read). Quick actions bir-biriga raqobat qilmasin.

### Ishchi faoliyati

**Business fit:** ishbay fabrikaga mos. Ammo bir xil mahsulot outputi production run orqali ham, Shift Receiver activity orqali ham qayd qilinishi hujjatlarda turlicha tushuntirilgan.

**Yetishmaydi:** brigada/guruh bilan bulk entry; bir amalni bir nechta ishchiga taqsimlash; smena oxirida tasdiq; ishchining e’tirozi; correction/reversal; supervisor imzosi; normadan tashqari ish; qayta ishlash haqini ajratish.

**Tavsiya:** individual forma o‘rniga “brigada vedomosti”: bosqich + mahsulot + umumiy dona, keyin xodimlarga tez taqsimlash. Oldingi smenani clone qilish va numpad kerak.

### Nuqson va sifat

**Business fit:** brak qaydi zarur. Defect avtomatik jarima qilmasligi to‘g‘ri.

**Yetishmaydi:** nuqson disposition — qayta ishlash, chiqindi, ikkinchi nav, ishlab chiqarishga qaytarish; kim tasdiqladi; foto; sabab kategoriyasi; root-cause/action; stock va WIPga ta’siri; supplier-material sababini belgilash.

**Tavsiya:** “Brak yozish”dan keyin majburiy “Bu mahsulot bilan nima qilindi?” savoli bo‘lsin. Faqat yozuv yaratish real qoldiqni hal qilmaydi.

### Warehouse

**Business fit:** material va tayyor mahsulotni ajratish, warehouse/joy, kirim-chiqim-correction tabiiy. Purchase bilan real receiptni ajratish biznes jihatdan to‘g‘ri, lekin operatorga ko‘rinadigan bog‘lanish yetishmaydi.

**Yetishmaydi:** purchase/waybillga qarshi qabul; qisman qabul; birlik konversiyasi (kg, bobina, quti, dona); lot/rang partiyasi; supplier qaytarish; inventarizatsiya; sanash varaqasi; transfer; reservation; damaged/quarantine joyi; printable qabul dalolatnomasi va label.

**Fragmentation:** finished, materials, movements va zones to‘rtta ekranda. Omborchi uchun bitta workspace: **Qabul qilish**, **Berish/ko‘chirish**, **Qoldiq**, **Tarix** tablari.

**Automation:** material tanlanganda odatiy birlik, default ombor joyi va ochiq purchase ko‘rinsin; barcode/QR keyingi bosqichda katta qiymat beradi.

### Sales

**Business fit:** client → order → payment → delivery → debt mantiqan to‘g‘ri. Paymentning orderdan alohida bo‘lishi real qarzdor savdoga mos.

**Hesitation:** `/sales`, clients, orders, payments va debts alohida. Seller bitta mijoz bo‘yicha besh ekran orasida yurishi mumkin. Delivery to‘lovga bog‘liqmi-yo‘qmi hujjatlar qarama-qarshi.

**Yetishmaydi:** quotation; order print/Telegram PDF; mijozning bir nechta contacti; yetkazish manzili; vehicle/driver; partial delivery; reservation; pick/pack list; invoice/waybill; order comment/attachment; cancellation reason; overdue collection task; credit limit; promised date o‘zgarishi tarixi.

**Merge:** bitta **Mijoz kartasi** ichida buyurtmalar, to‘lovlar, qarz va aloqa tarixi. Bitta **Buyurtma tafsiloti** ichida mahsulot, to‘lov, yetkazish, qaytarish va timeline.

### Supplier

**Business fit:** supplier → purchase → payment → debt to‘g‘ri. Ammo purchase va material receipt ikki modulda bo‘lib, real hujjat raqami bilan bog‘lanishi aniq emas.

**Yetishmaydi:** purchase order/approval; invoice va waybill raqami; kutilgan sana; qisman receipt; narx farqi; supplier return; payment reversal; prepayment/credit; currency; attachment; statement reconciliation.

**Tavsiya:** supplier workspace ichida “Xarid”, “Kelgan tovar”, “To‘lov”, “Qarz”ni bitta timeline qiling. Omborchi purchase ro‘yxatidan “Qabul qilish”ni boshlasin.

### Expenses va advances

**Business fit:** request → approve/reject → pay tabiiy. Real fabrikada receipt/chek va cashbox muhim.

**Yetishmaydi:** attachment; cash/bank kassasi; cost center/bo‘lim; recurring expense; reject/cancel reason; correction; advance settlement (avans hisoboti); unused advance return; employee expense claim.

**ERP creep:** alohida expense categories, approval history, advance, bonus, penalty va payroll moliyaviy tizimni kengaytiradi. MVPda faqat payrollga bevosita ta’sir qiladigan advance va 5–8 qat’iy expense category qoldiring.

### Payroll

**Business fit:** ishbay dona × tarixiy stavka + bonus − jarima − avans — paypoq fabrikasiga mos.

**Hesitation:** activity, salary rate, night premium, bonus, penalty, advance, period status, partial payment va close bir natijaga ta’sir qiladi. Operator “Calculate”ni qachon qayta bosish, xato bo‘lsa nima qilish va close’dan keyin qanday tuzatishni bilmaydi.

**Yetishmaydi:** draft preview; validation checklist; “activitysiz/stavkasiz xodimlar”; manager sign-off; payslip print/Telegram; bulk payment; payment register; correction period; rounding policy; salaried staff handlingning aniq UI; leave/absence; payroll reconciliation.

**Tavsiya:** 4 bosqichli wizard: **1. Ma’lumotni tekshirish → 2. Hisoblash → 3. Tasdiqlash → 4. To‘lash/yakunlash**. Har bosqichda xato soni va “keyingi qadam” ko‘rinsin. Pilotda partial paymentni olib tashlab, faqat to‘liq period yoki xodim bo‘yicha to‘liq payment qoldirish xavfsizroq.

### Employees va attendance

**Business fit:** employee canonical registry va inactive qilish to‘g‘ri. Work profile, compensation type, application role, stage, shift, salary agreement kabi tushunchalar bitta create flowda juda og‘ir.

**Yetishmaydi:** employee number; telefon; ishga kirgan/chiqqan sana; brigada; lavozimning sexdagi nomi; document/contract attachment; emergency contact; transfer history; leave; termination reason; bulk import.

**Ortiqcha:** bonuses, penalties, advances employee drawer va alohida finance sahifalarida takroriy mental model yaratadi. Xodim kartasi read-only summary bo‘lsin, mutation o‘z biznes modulida amalga oshsin.

**Attendance:** Trunket kelmaguncha read-only attendance sahifasi kundalik foyda bermaydi. Import/qo‘lda entry yo‘q bo‘lsa, MVP menyusidan yashiring yoki “integratsiya kutilmoqda” emas, aniq demo data ekanini belgilang.

### Reports

**Business fit:** hozirgi `/reports` real hisobot emas, operatsion ekranlarga linklar hubi. Factory owner “hisobot” deganda davr, filter, total, export va chop etishni kutadi.

**Tavsiya:** MVP menyusidan `Hisobotlar`ni olib tashlang yoki nomini **Bo‘limlar xulosasi** qiling. Pilot uchun majburiy uch hisobot: kunlik ishlab chiqarish, ombor qoldig‘i, qarzdorlik. Keyin payroll vedomosti.

### Audit

**Business fit:** tarix kerak, lekin `entity type`, `before/after`, ID kabi tilda oddiy owner ishlay olmaydi.

**Tavsiya:** alohida “Audit” menyusi o‘rniga har yozuvda **O‘zgarishlar tarixi**. Owner uchun “Kim, qachon, nimani, nimadan nimaga o‘zgartirdi?” jumlasi. Texnik JSON ko‘rsatilmasin.

### Settings

**Business fit:** master data kerak, ammo 10+ sahifa MVPni ERP admin paneliga aylantiradi.

**Fragmentation:** products, colors, materials, seasons, stages, salary rates, shifts, categories, zones, thresholds, roles, company, Telegram.

**Tavsiya:** uch guruhga birlashtiring:

1. **Mahsulot va ishlab chiqarish:** model, variant, rang, material, mavsum, bosqich, stavka.
2. **Fabrika va ombor:** fabrika, smena, ombor joylari, minimal qoldiq.
3. **Foydalanuvchilar va xizmatlar:** rollar, Telegram.

Pilot onboardingni consultant/admin qiladi. Oddiy Managerga kundalik settings ko‘rsatilmang.

## 4. Business consistency muammolari

1. **Delivery — HAL QILINDI (2026-08-29):** Biznes egasi rasmiy siyosatni tasdiqladi — yetkazib berish sex tomonidan va mijoz uchun bepul; to‘liq to‘lov shart emas, qarz keyin to‘lanadi. Barcha hujjatlar (USER_GUIDE, BUSINESS_ACCEPTANCE, CLIENT_USAGE_GUIDE, CLIENT_DEMO_PLAYBOOK) shu qoidaga moslab yangilandi; kod va avtomatik testlar allaqachon shu qoida bo‘yicha ishlaydi.
2. **Production output va payroll:** USER_GUIDE output ikki activity yaratadi ham deydi, audit/manual intake yaratmaydi ham deydi. Product requirements yangi ProductionRun intake activity yaratishini, legacy/manual batch yaratmasligini aytadi. UI bu ikki yo‘lni mutlaqo farqlashi kerak.
3. **Shift Receiver:** docs partiya, move, activity, defectni unga yuklaydi; machines flowda run ham u tomonidan boshlanadi. Bitta odam uchun smena davomida data entry haddan ko‘p.
4. **Finished stock:** default stage flow “Ombor” bilan tugaydi, keyin yana finished receipt orqali warehouse stockka o‘tadi. Operator uchun “Ombor bosqichi” va “Ombor qoldig‘i” ikki xil narsa bo‘lib qoladi.
5. **Material:** ProductVariant atributidagi Material bilan ombordagi real raw material bir tushuncha sifatida ishlatiladi. Tarkib/BOM bo‘lmasa model materiali real sarfni anglatmaydi.
6. **Defect:** defect yozuvi WIPni o‘zgartirmaydi, ammo real brak miqdori qayerga ketgani ko‘rsatilmaydi.
7. **Reports:** requirements to‘liq kesimdagi hisobotlarni tasvirlaydi, V1 faqat hub/link beradi.
8. **Notifications:** dashboard low-stockni ko‘rsatishi mumkin, lekin notification kelmaydi. “Ogohlantirish” va “bildirishnoma” farqi aniq aytilishi kerak.
9. **Employee roles:** docsda Warehouse Operator/Worker/Manager, Shift Receiver, Mechanic/Master va EmployeeWorkProfile atamalari bir-biriga aralashadi.
10. **Size:** paypoq savdosida o‘lcham muhim bo‘lishi mumkin, lekin MVPda yo‘q. Pilot fabrikada bitta model turli size bilan yuritilsa, variant va stock noto‘g‘ri birlashadi.
11. **Attendance:** payroll formula activityga asoslangan, salaried staff va attendance bog‘lanishi operatorga aniq emas.
12. **Factory:** owner consolidated view kutadi, lekin kundalik yozuvlar active factoryga bog‘liq; switch holati har mutatsiyada juda aniq ko‘rinishi kerak.

## 5. Manual data-entry burden

Eng katta yuk Shift Receiverda:

- run boshlash;
- output qabul qilish;
- partiya/bosqich harakati;
- har ishchi activitysi;
- defect;
- finished receipt;
- smena tekshiruvi.

Bitta 8 soatlik smenada 10 stanok, har biri 4 output qabul, 20 ishchi va 8 bosqich bo‘lsa, operator o‘nlab yoki yuzlab tanlov/miqdor yozuvlari qiladi. Bu raqam real kuzatuvsiz taxmin, lekin hujjatlardagi har bir hodisani qo‘lda yozish modeli yuqori yukni ko‘rsatadi.

### Birinchi navbatdagi avtomatlashtirish

1. Role/factory/stage bo‘yicha smart defaultlar.
2. Numpad va “yana bittasini kiritish”.
3. Oxirgi tanlovni eslab qolish.
4. QR orqali partiya/stanok/product tanlash.
5. Bulk worker activity.
6. Production move’da faqat ruxsat etilgan keyingi stage.
7. Supplier purchase’dan material receiptni boshlash.
8. Orderdan pick/deliveryni boshlash.
9. Payment allocationni eng eski qarzga avtomatik taklif qilish.
10. Shift-end reconciliation va exception list.
11. Excel import faqat boshlang‘ich master data/qoldiq uchun.
12. Keyin barcode/FaceID/IoT; asosiy manual UX to‘g‘rilanmasdan oldin emas.

## 6. Real ish kunining simulyatsiyasi

| Vaqt | Shift Receiver / Production | Warehouse | Seller | Accountant | Manager/Owner | Keraksiz uzilish |
|---|---|---|---|---|---|---|
| 08:00 | Smena, stanok, operator va ochiq runlarni tekshiradi | Kechagi qoldiq va keladigan tovarni tekshiradi | Ochiq order/deadlinelar | Kechagi payment/expense | Dashboard va bottleneck | Bir xil holatni bir necha ekranda tekshirish |
| 09:00 | Run boshlaydi, birinchi output | Material beradi | Yangi orderlar | Supplier hujjatlari | Rejani tekshiradi | Assignment/run/intake ketma-ketligi |
| 10:00 | Output, move va activity yozadi | Material chiqimi | Mijoz qo‘ng‘iroqlari | Client payment | Stage holati | Bir miqdorni bir necha formada kiritish |
| 11:00 | Brak va recheck | Receipt | Order tayyorligini so‘raydi | Expense/advance | Muammo qarori | Brak disposition yo‘qligi sabab og‘zaki koordinatsiya |
| 12:00 | Smena oralig‘i sanog‘i | Qoldiq sanog‘i | Payment follow-up | Debt check | Dashboard | Tizimda formal reconciliation yo‘q |
| 13:00 | Keyingi output/move | Purchase bo‘yicha qabul | Delivery tayyorlaydi | Supplier payment | Approval | Purchase va receipt ikki modulda |
| 14:00 | Worker activitylarni to‘ldiradi | Finished receipt | Delivery | Allocation | Bottleneck | Activityni keyin eslab kiritish xatosi |
| 15:00 | Stage bo‘yicha sanaydi | Transfer/correction | Return yoki yangi order | Expense/advance | Correction tasdiqi | Correction oqimlari bir xil emas |
| 16:00 | Oxirgi output | Qoldiqni tekshiradi | Qarz undirish | Payroll input check | Kunlik plan/fakt | Reports hub real report bermaydi |
| 17:00 | Smena yakuni activity/move | Kirim-chiqim solishtiradi | Order/payment yakuni | Cash/payment solishtirish | Exception review | Har rol o‘z daftarini yana solishtiradi |
| 18:00 | Keyingi smenaga topshiradi | Omborni topshiradi | Ochiq ishlar | Approval/payment ro‘yxati | Kun yakuni | Formal shift handover va sign-off yo‘q |

**Asosiy uzilish:** Shift Receiver real sexni kuzatish o‘rniga ko‘p mayda formalarni to‘ldirishi mumkin. Pilotda vaqt o‘lchanmasa, tizim kechikkan data entryni kamaytirish o‘rniga ko‘paytiradi.

## 7. Eng ko‘p uchraydigan 100 ta operator xatosi

| # | Xato | Nega yuz beradi | UI oldini olishi |
|---:|---|---|---|
| 1 | Noto‘g‘ri fabrika | Switch ko‘zga tashlanmaydi | Har write modalda fabrika badge |
| 2 | Noto‘g‘ri smena | Default yo‘q/eski | Joriy vaqtga smart default |
| 3 | Noto‘g‘ri sana | Kech kiritish | “Bugun/kecha” shortcut, warning |
| 4 | Bir tugmani ikki bosish | Javob sekin | Submitni bloklash, natija banneri |
| 5 | Amal saqlandimi deb bilmaslik | Feedback sust | Aniq success + yangi qoldiq |
| 6 | Inglizcha statusni tushunmaslik | Aralash til | To‘liq o‘zbekcha status |
| 7 | Noto‘g‘ri rol hisobida ishlash | Shared login | Ism/rolni doim ko‘rsatish |
| 8 | Chiqishni unutish | Umumiy kompyuter | Idle logout va smena yakuni eslatmasi |
| 9 | Qidiruvsiz noto‘g‘ri yozuv tanlash | Uzoq dropdown | Search, recent, code |
| 10 | Inactive obyektni tanlash | Filter noaniq | Default yashirish, badge |
| 11 | Noto‘g‘ri stanok | O‘xshash nom | Katta raqam/QR/foto |
| 12 | Run ochmasdan output | Ketma-ketlik noaniq | “Avval ishni boshlang” guided step |
| 13 | Eski runni davom ettirish | Ochiq run ko‘p | Bitta active run, age warning |
| 14 | Noto‘g‘ri model bilan run | Stanok modeli ko‘rinmaydi | Confirm card: stanok+model |
| 15 | Noto‘g‘ri operator | Ismlar o‘xshash | Employee code/rasm/smena filter |
| 16 | Noto‘g‘ri mexanik | Assignment tushunarsiz | Avtomatik tanlash, override sababi |
| 17 | Outputni batch deb o‘ylash | Terminlar yaqin | “Stanokdan chiqdi” yagona amal |
| 18 | Outputni ikki marta qabul qilish | Smena varag‘i yo‘q | Idempotent UI + last intake |
| 19 | Umumiy counter o‘rniga delta kiritish | Maydon noaniq | “Yangi chiqqan dona” misoli |
| 20 | Delta o‘rniga counter kiritish | Shu sabab | Counter/delta rejimini aniq ajratish |
| 21 | Noto‘g‘ri partiya | Kodlar uzun | QR va product/stage preview |
| 22 | Batch va variantni aralashtirish | Texnik model | Partiya kartasida oddiy nom |
| 23 | Noto‘g‘ri source stage | Board zich | Partiyadan avtomatik source |
| 24 | Noto‘g‘ri destination stage | Barcha stage tanlanadi | Faqat ruxsat etilgan keyingi stage |
| 25 | Stage skip qilish | Flow ko‘rinmaydi | Skip uchun tasdiq/sabab |
| 26 | Qoldiqdan ortiq move | Son esda yo‘q | Max ko‘rsatish va clamp |
| 27 | 100 o‘rniga 1000 | Numpad typo | Katta og‘ish warningi |
| 28 | Nol miqdor | Default/blank | Positive validation |
| 29 | Manfiy miqdor | Correction deb o‘ylash | Minusni bloklash; alohida tuzatish |
| 30 | Birlikni adashtirish | Dona/kg aralash | Unitni maydon yonida katta ko‘rsatish |
| 31 | Move qilmay activity yozish | Ikki amal bog‘lanmagan | Task checklist |
| 32 | Activityni move deb o‘ylash | Termin noaniq | “Ish haqi uchun” izohi |
| 33 | Bir ishni ikki ishchiga to‘liq yozish | Bulk taqsimlash yo‘q | Total allocation constraint |
| 34 | Noto‘g‘ri ishchi | Uzun ro‘yxat | Smena/bosqich filtri |
| 35 | Noto‘g‘ri stage activity | Worker stage ko‘rinmaydi | Assigned stage default |
| 36 | Kechagi ishni bugunga yozish | Backlog entry | Smena close va late-entry warning |
| 37 | Stavkasiz activity | Setup to‘liq emas | Save oldidan rate preview/block |
| 38 | Brakni activitydan ayirmaslik | Qoida noaniq | Net/gross tushuntirish |
| 39 | Brakni ikki marta yozish | Disposition yo‘q | Defect code va recent duplicate |
| 40 | Brak qayerga ketganini yozmaslik | Maydon yo‘q | Rework/scrap/second-grade majburiy |
| 41 | Brak uchun avtomatik jarima kutish | Mental model | “Jarima alohida qaror” copy |
| 42 | Reworkni yangi ishlab chiqarish deb yozish | Rework oqimi yo‘q | Maxsus qayta ishlash oqimi |
| 43 | Ombor stage bilan warehouse’ni aralashtirish | Bir xil nom | Final stage “Qadoq tayyor”, keyin qabul |
| 44 | Finished receiptni unutish | Alohida amal | Ombor stage’da CTA/queue |
| 45 | Finished receiptni ikki marta qilish | History ko‘rinmaydi | Remaining qty va receipt timeline |
| 46 | Material receiptni purchase deb o‘ylash | Ikki modul | Purchase’dan “Tovarni qabul qilish” |
| 47 | Purchase kiritib stock oshdi deb o‘ylash | Mental model | Persistent warning/result |
| 48 | Tovar kelmay turib receipt | Invoice keldi | Waybill/received date majburiy |
| 49 | Qisman kelganni to‘liq qabul | Partial receipt yo‘q | Ordered/received/remaining |
| 50 | Noto‘g‘ri material | Nomlar o‘xshash | Supplier purchase context |
| 51 | Noto‘g‘ri ombor | Default noaniq | Role/location default |
| 52 | Noto‘g‘ri ombor joyi | Zona ko‘p | QR va capacity/type filter |
| 53 | Kg o‘rniga dona | Unit ko‘rinmaydi | Fixed unit + conversion |
| 54 | Bobina og‘irligini taxmin qilish | Conversion yo‘q | Tare/net fields |
| 55 | Transferni chiqim+kirim qilib yozish | Transfer yo‘q | Bitta transfer wizard |
| 56 | Correction bilan real chiqimni yashirish | Oson yo‘l | Reason/approval va anomaly flag |
| 57 | Inventar sanog‘ini correction qilish | Count workflow yo‘q | Cycle count session |
| 58 | Supplier returnni chiqim deb yozish | Return yo‘q | Supplier return turi |
| 59 | Damaged stockni oddiy stockda qoldirish | Quarantine yo‘q | Brak/karantin joyi |
| 60 | Minimal qoldiqni noto‘g‘ri qo‘yish | Kontekst yo‘q | Consumption history suggestion |
| 61 | Duplicate client yaratish | Search sust | Telefon/nom duplicate warning |
| 62 | Mijoz telefonini xato yozish | Format yo‘q | Mask va validation |
| 63 | Noto‘g‘ri variant buyurtma | Size yo‘q/atribut ko‘p | Variant summary va sample image |
| 64 | Narxni xato kiritish | Manual override | Price list default + approval |
| 65 | 12 000 o‘rniga 120 000 | Typo | Total deviation warning |
| 66 | Deadline kiritmaslik | Majburiy emas/noaniq | Required promised date |
| 67 | Orderni confirm qilmaslik | Status oqimi noaniq | Next-action banner |
| 68 | Confirmed orderni yana edit | Lock noaniq | Change reason/version |
| 69 | Noto‘g‘ri orderni cancel | O‘xshash orderlar | Client+amount confirmation |
| 70 | Paymentni noto‘g‘ri mijozga yozish | Context yo‘q | Client header va qarz preview |
| 71 | Paymentni noto‘g‘ri orderga taqsimlash | Allocation murakkab | Oldest-first suggestion |
| 72 | To‘lovning bir qismini unutish | Manual allocation | Allocated/remaining live total |
| 73 | Overpaymentni kiritish | Credit yo‘q | Block + tushunarli yo‘l |
| 74 | Bank/cash usulini adashtirish | Default | Method confirmation/reference |
| 75 | Payment sanasini bugun qoldirish | Kech entry | Receipt date prompt |
| 76 | Unpaid orderni policyga zid deliver | Hujjatlar zid | Tenant policy hard gate |
| 77 | Deliveryda noto‘g‘ri miqdor | Partial yo‘q | Pick list va scan |
| 78 | Deliveryni order yaratish deb o‘ylash | Status tili | “Mijozga chiqarish” CTA |
| 79 | Qaytgan mahsulotni tekshirmay stockka qo‘shish | Quality step yo‘q | Return inspection |
| 80 | Return sababini yozmaslik | Maydon yo‘q | Required reason/category |
| 81 | Supplierni duplicate yaratish | Search yo‘q | Tax ID/phone duplicate |
| 82 | Purchase summasini item totalsiz yozish | Header total | Itemized calculation |
| 83 | Invoice va receiptni bitta sana qilish | Farq tushunarsiz | Ikki aniq sana |
| 84 | Supplier paymentni noto‘g‘ri purchasega yozish | Allocation | Outstanding documents list |
| 85 | Noto‘g‘ri paymentni qaytarolmaslik | Reversal yo‘q | Controlled reversal |
| 86 | Expense kategoriyasini adashtirish | Ko‘p category | 5–8 plain categories |
| 87 | Chek/receipt qo‘shmaslik | Attachment yo‘q | Amount threshold attachment |
| 88 | O‘z expense’ini o‘zi tasdiqlash | Role mental model | Actor separation UX |
| 89 | Avansni salary advance bilan cash expense aralashtirish | Termin | “Xodim avansi” aniq nom |
| 90 | Advance settlementni unutish | Hisobot yo‘q | Outstanding advance queue |
| 91 | Noto‘g‘ri payroll oyini tanlash | Period list | Current/open period highlight |
| 92 | Activitylar tugamay calculate qilish | Precheck yo‘q | Readiness checklist |
| 93 | Stavkasiz xodimni o‘tkazib yuborish | Exception yashirin | Blocking exception list |
| 94 | Bonus/jarimani ikki marta qo‘shish | Bir nechta entry point | Duplicate warning |
| 95 | Advance’ni yana qo‘lda ayirish | Formula tushunarsiz | Formula breakdown |
| 96 | Partial paymentni full deb o‘ylash | Status | Paid/remaining katta ko‘rsatish |
| 97 | Bir paymentni ikki operator kiritish | Parallel ish | Payment owner/lock |
| 98 | Payrollni erta close qilish | Irreversible | Checklist + second confirmation |
| 99 | Closed payroll xatosini yashirish | Correction yo‘q | Adjustment period workflow |
| 100 | Hisobotni Excel deb kutish | Menu nomi | “Xulosa” deb nomlash/export roadmap |

## 8. Foydalanuvchi kutadigan missing validations

- joriy factory/smena bilan mos employee, warehouse va stage;
- stanokda bir vaqtning o‘zida faqat bitta faol ish;
- operator va mexanik shu smenada faol;
- faqat oqimdagi ruxsat etilgan keyingi stage;
- quantity positive, unit aniq, odatiy hajmdan katta og‘ish tasdiqlanadi;
- duplicate output/activity/movement/payment uchun vaqt+obyekt+miqdor warning;
- activity sanasida xodim faol va stavkasi mavjud;
- defect quantity tegishli ishlab chiqarish miqdoridan oshmaydi;
- finished receipt qolgan Ombor-stage miqdoridan oshmaydi;
- material receipt ochiq purchase/waybill bilan solishtiriladi;
- product va material noto‘g‘ri warehouse zonega kiritilmaydi;
- correction reason va approver majburiy;
- client/supplier duplicate contact warning;
- order deadline, quantity, price va total review;
- delivery policy, stock availability va delivery quantity validation;
- payment amount allocation yig‘indisiga teng;
- payment methodga qarab reference majburiy;
- expense/advance approver va payer ko‘rinadi;
- payroll readiness: missing rate, missing activity confirmation, open adjustment, negative/zero anomaly;
- close oldidan total, employee count, unpaid amount va approver confirmation.

## 9. Business language: tavsiya etilgan menyu va copy

### Operator menyusi

- **Bosh sahifa**
- **Stanoklar**
- **Ishlab chiqarish**
- **Ombor**
- **Sotuv**
- **Yetkazib beruvchilar**
- **Ish haqi**
- **Xodimlar**
- **Xabarlar**
- **Sozlamalar** — faqat ruxsatli foydalanuvchi

`Finance`, `Reports`, `Audit`, `Executive`, `Operations` oddiy operator menyusidan olib tashlansin yoki o‘zbekchalashtirilsin.

### Sahifa nomlari

| Hozirgi | Tavsiya |
|---|---|
| Executive Dashboard | Rahbar paneli |
| Operations Dashboard | Smena holati |
| Production Board | Bosqichlardagi mahsulot |
| Machines | Stanoklar |
| Mechanic Workspace | Mexanik ishlari |
| Warehouse Materials | Xomashyo qoldig‘i |
| Stock Movements | Ombor harakatlari |
| Clients | Mijozlar |
| Orders | Buyurtmalar |
| Payments | Mijoz to‘lovlari |
| Debts | Mijoz qarzlari |
| Suppliers | Yetkazib beruvchilar |
| Expenses | Xarajatlar |
| Advances | Xodim avanslari |
| Payroll | Ish haqi hisob-kitobi |
| Reports | Bo‘limlar xulosasi |
| Audit | O‘zgarishlar tarixi |
| Settings | Sozlamalar |

### Asosiy tugmalar

| Noaniq/texnik | Tushunarli tugma |
|---|---|
| Create | Qo‘shish / Yaratish |
| Save | Saqlash |
| Submit | Tasdiqlashga yuborish |
| Intake | Chiqqan mahsulotni qabul qilish |
| Move Stage | Keyingi bosqichga o‘tkazish |
| Add Activity | Bajarilgan ishni yozish |
| Register Defect | Brakni yozish |
| Finished Receipt | Tayyor mahsulotni omborga olish |
| Calculate Payroll | Ish haqini hisoblash |
| Close | Davrni yakunlash |
| Reverse Payment | To‘lovni bekor qilish |
| Correction | Qoldiqni tuzatish |
| Deactivate | Faoliyatini to‘xtatish |
| Mark read | O‘qildi |

### Form maydonlari

Har maydon labeli savol shaklida yoki aniq obyekt bilan bo‘lsin: **Qaysi stanok? Qaysi mahsulot? Qaysi bosqichdan? Qaysi bosqichga? Nechta dona? Kim bajardi? Qachon? Sababi nima?** `Source`, `Destination`, `Quantity`, `Context`, `Adjustment` kabi yalang‘och atamalar ishlatilmasin.

### Jadvallar

Har jadval birinchi ustunda inson taniydigan nom/kod, oxirida keyingi amal bo‘lsin. ID ko‘rsatilmasin. Pul jadvalida **Jami / To‘landi / Qoldi** yonma-yon. Ishlab chiqarishda **Bosqich / Mahsulot / Partiya / Hozirgi dona / Oxirgi harakat**. Status faqat rang bilan emas, matn bilan ko‘rsatiladi.

## 10. Nima MVPdan olib tashlanishi kerak

1. Factory TV — pilotda asosiy qiymat emas va alohida tayyorgarlik talab qiladi.
2. Attendance — real ingestion yo‘q bo‘lsa menyudan yashirish.
3. Reports hub — real hisobot bo‘lmaguncha “Hisobotlar” nomini olib tashlash.
4. Alohida Audit menyusi — historyni obyekt ichiga ko‘chirish.
5. Generic notification framework ko‘rinishi — faqat ishlaydigan 3–4 notification turi.
6. Mexanik measurement specification/recheck/HOLD — pilot fabrikada majburiy ehtiyoj tasdiqlanmasa Phase 2.
7. Partial payroll payment — pilotda to‘liq tushunilmaguncha.
8. Multi-factory consolidated UX — birinchi pilot bitta fabrikada.
9. Mobile employee self-service — Telegram bilan ikkita parallel kanal yaratmaslik.
10. Super Admin funksiyalarini mijoz demosiga kiritish.
11. 10+ alohida settings menu — onboarding wizard/guruhlar bilan almashtirish.

## 11. Pilotdan oldin MUTLAQ bo‘lishi kerak

1. ~~Delivery siyosati: paid-only yoki qarzga yetkazish — bitta aniq qoida.~~ HAL QILINDI (2026-08-29): qarzga yetkazish, mijoz uchun bepul.
2. Production oqimida “stanokdan chiqdi”, “bosqichga o‘tdi”, “ishchi bajardi” farqi oddiy copy va trening bilan aniq.
3. Production/stock/payment/activity uchun operator ko‘radigan correction/reversal yo‘li.
4. Shift yakuni: kutilgan va real bosqich/ombor qoldig‘ini solishtirish hamda topshirish.
5. Nuqson disposition: rework, scrap, second-grade yoki qaytarish.
6. Ombor inventarizatsiyasi va sanash/tuzatish tartibi.
7. Purchase’dan material receiptga bog‘langan oqim; qisman receipt.
8. Order print yoki kamida printable/ulashiladigan buyurtma tasdig‘i va delivery hujjati.
9. Uch minimal real hisobot: kunlik ishlab chiqarish, ombor qoldig‘i, mijoz/supplier qarzi; payroll vedomosti accountant uchun.
10. Payroll readiness checklist, manager approval va xato correction yo‘li.
11. Factory-specific bosqich nomlari, birliklar, rollar va smena atamalarini konfiguratsiya qilish.
12. Boshlang‘ich data import va ikki tomonlama sign-off.
13. Role-based soddalashtirilgan menyu va to‘liq o‘zbekcha copy.
14. Real operator bilan task test: xatosiz 10 asosiy vazifa va belgilangan vaqt.
15. Bir sahifalik smena SOP va favqulodda qog‘oz fallback.

## 12. Product falsafasi: MESmi yoki generic ERPmi?

### Hali Manufacturing OS bo‘lib turgan joylar

- Stage Inventory asosiy metrigi.
- Ishchi faoliyati va tarixiy dona stavkasi.
- Stanok, smena, mexanik, operator va production run.
- WIP, bottleneck, nuqson va finished receipt.
- Ishchilar webga kirmasligi; Shift Receiver orqali operatsion qayd.

### ERP murakkabligi kirib kelayotgan joylar

- expense/advance/approval/payment workflowlar;
- configurable roles/permissions va ko‘p settings;
- supplier purchase/payment/debt;
- client payment allocation va finance hub;
- platform super-admin/multi-tenant/multi-factory;
- generic notification/outbox tushunchalari;
- alohida audit, reports, mobile va TV kanallari;
- attendance integratsiyasi, salary agreements va ko‘p compensation turlari.

Bu funksiyalar yomon emas, lekin ularning barchasi birinchi pilotda ko‘rinsa mahsulot “sexdagi qoldiqni bilish”dan “hamma narsani boshqaruvchi ERP”ga aylanadi. MVP navigatsiyasi production, warehouse, sales/debt va piece-rate payroll atrofida qisqartirilishi kerak.

## 13. Modul readiness score

Ball: 1 juda past, 5 pilotga yaqin. `User Error Risk`da 5 — xato xavfi yuqori. Overall Readiness boshqa ustunlarning oddiy o‘rtachasi emas; missing workflow hisobga olingan.

| Modul | Business Fit | Usability | Learnability | Operator Speed | Manager Value | User Error Risk | Overall Readiness |
|---|---:|---:|---:|---:|---:|---:|---:|
| Login/fabrika | 4 | 4 | 4 | 4 | 3 | 2 | 4.0 |
| Dashboard | 4 | 3 | 4 | 4 | 4 | 2 | 3.8 |
| Stanok/run | 4 | 2 | 2 | 2 | 4 | 4 | 2.6 |
| Production/Stage | 5 | 2 | 2 | 2 | 5 | 5 | 2.8 |
| Worker activity | 5 | 2 | 2 | 2 | 4 | 5 | 2.6 |
| Defect/quality | 4 | 3 | 3 | 3 | 4 | 4 | 2.8 |
| Warehouse | 4 | 3 | 3 | 3 | 4 | 4 | 3.2 |
| Sales | 4 | 3 | 3 | 3 | 4 | 4 | 3.2 |
| Supplier | 4 | 2 | 2 | 2 | 4 | 4 | 2.7 |
| Expenses/advances | 3 | 3 | 3 | 3 | 3 | 4 | 2.9 |
| Payroll | 5 | 2 | 2 | 2 | 5 | 5 | 2.7 |
| Employees | 4 | 2 | 2 | 2 | 4 | 4 | 2.8 |
| Attendance | 2 | 3 | 4 | 4 | 2 | 2 | 2.7 |
| Reports | 2 | 3 | 4 | 3 | 2 | 2 | 2.6 |
| Audit/history | 4 | 2 | 2 | 2 | 4 | 3 | 2.8 |
| Settings | 4 | 2 | 1 | 2 | 3 | 5 | 2.3 |
| Notifications | 3 | 4 | 4 | 4 | 3 | 2 | 3.5 |
| Telegram | 4 | 3 | 3 | 4 | 3 | 3 | 3.2 |
| Mobile | 3 | 3 | 3 | 3 | 3 | 3 | 3.0 |
| Factory TV | 3 | 4 | 5 | 5 | 3 | 2 | 2.5 pilot status |

## 14. Bir kunlik o‘rganish bahosi

| Rol | Baho | Nima qila oladi | Nima uchun qiynaladi |
|---|---|---|---|
| Owner | Oson/O‘rta | dashboard, qarz, asosiy xulosa | KPI ta’rifi, real report/export yo‘q |
| Manager | O‘rta/Qiyin | stage holati, basic approvals | ko‘p dashboard/settings, correction va cross-module sabablar |
| Shift Receiver | Qiyin | trening bilan bitta oddiy flow | eng katta entry yuk; run/intake/move/activity/defect farqi |
| Warehouse Operator | O‘rta | kirim/chiqim/qoldiq | purchase receipt, birlik, transfer/inventory gaps |
| Seller | O‘rta | client/order/payment | delivery policy, allocation, return va fragmented screens |
| Accountant | Qiyin | guided supplier/expense/payroll | ko‘p status, allocation, correction va payroll inputs |
| Mechanic | O‘rta/Qiyin | task va measurement | slot/recheck/HOLD tili va jarayoni |
| Yangi administrator | Juda qiyin | consultant yordami bilan setup | 10+ master data va cross-dependency |

**Xulosa:** “bir kunlik trening” faqat rol bo‘yicha 3–5 takroriy taskni o‘rgatish uchun yetadi. Butun tizimni bir kunda o‘rgatish real emas.

## 15. Pilot usability acceptance mezonlari

Pilot oldidan real xodimlar quyidagilarni hujjatsiz bajara olishi kerak:

| Rol | Task | Maqsad vaqt | Kritik xato |
|---|---|---:|---:|
| Shift Receiver | run boshlash + output qabul | ≤2 daqiqa | 0 |
| Shift Receiver | 100 dona keyingi stagega o‘tkazish | ≤45 soniya | 0 |
| Shift Receiver | 5 ishchiga activity kiritish | ≤3 daqiqa | 0 |
| Warehouse | material qabul | ≤90 soniya | 0 |
| Warehouse | stock correction sabab bilan | ≤90 soniya | 0 |
| Seller | client + order | ≤3 daqiqa | 0 |
| Seller | payment taqsimlash | ≤90 soniya | 0 |
| Seller | delivery/return | ≤2 daqiqa | 0 |
| Accountant | supplier purchase/payment | ≤3 daqiqa | 0 |
| Accountant | payroll readiness va calculate | ≤5 daqiqa | 0 |

Har taskda yordam so‘rash ≤1, noto‘g‘ri modulga kirish ≤1, task success ≥90% bo‘lsin. Besh operatorning kamida to‘rttasi mezonni bajarmasa, UI tabiiy emas.

## Yakuniy hukm

Paypoq OSning product yadrosi real paypoq fabrikasiga mos: **bosqichdagi qoldiq, ishbay faoliyat, ombor, buyurtma, qarz va ish haqi** bitta zanjirda ko‘rinadi. Ammo hozirgi hujjatlashtirilgan UX yangi operatorni tabiiy ravishda keyingi qadamga yetaklamaydi. U foydalanuvchidan tizimning ichki obyektlarini — run, intake, batch, movement, activity, allocation, correction — oldindan tushunishni kutadi.

Shuning uchun javob:

> **Yo‘q, ertaga qo‘yib, odamlar o‘zlari tabiiy tushunib ketmaydi.**

Lekin menyu rol bo‘yicha qisqartirilsa, terminlar sex tiliga o‘girilsa, correction/shift-close/printing kabi real ish bosqichlari qo‘shilsa, master data oldindan tayyorlansa va bitta smenada joyida yordam bilan pilot qilinsa, mahsulotning asosiy manufacturing g‘oyasi kuchli qiymat bera oladi.
