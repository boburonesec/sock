# Paypoq OS — 4 haftalik pilot challenge

**Resurs:** 1 developer, 1 pilot customer, 4 hafta  
**Chegara:** faqat 10 ta o‘zgarish  
**Optimallashtirish:** customer success, operator adoption, business trust, production stability

## Qaror prinsipi

Har bir tanlangan o‘zgarish besh developer kunidan kam bo‘lishi shart. Bir haftadan uzun feature rad etiladi yoki kichik pilot scope’iga kesiladi. To‘rt haftada yangi platforma qurilmaydi; bitta customerning bitta fabrika/bitta smenadagi asosiy zanjiri ishlatiladigan holatga keltiriladi.

Pilot zanjiri:

> Stanokdan chiqdi → bosqichga o‘tdi → omborga tushdi → sotildi → qarz ko‘rindi → ish haqi hisoblandi.

## Top 10 changes

### 1. Pilot scope mode

**Nima qilinadi:** rolga qarab qisqa menyu beriladi. Factory TV, attendance, reports hub, alohida audit, mobile self-service, advanced mechanic quality, multi-factory va Super Admin customer menyusidan yashiriladi. Pilot bitta fabrika bilan cheklanadi.

- **Nega Top 1:** operator o‘rganadigan mahsulot hajmini darhol yarmiga tushiradi.
- **Customer outcome:** har rol faqat kundalik vazifasini ko‘radi.
- **Effort:** M, 2–3 kun.
- **Qabul mezoni:** Owner, Smena nazoratchisi, Omborchi, Seller va Accountant menyularida faqat kelishilgan pilot modullari bor.
- **Old roadmap coverage:** M03, M12, N04–N10ning pilot scope qismi.

### 2. Operator tili va uchta aniq production amali

**Nima qilinadi:** eng chalkash 10 atama o‘zbekchalashtiriladi. Production’da faqat uchta asosiy so‘z ishlatiladi: **Stanokdan chiqqan mahsulot**, **Keyingi bosqichga o‘tkazish**, **Bajarilgan ish**.

- **Nega:** run/intake/output/activity/movement farqini trening bilan yodlatish operator adoptionni buzadi.
- **Customer outcome:** yangi operator amal nomidan natijani tushunadi.
- **Effort:** M, 2–3 kun.
- **Qabul mezoni:** besh operatorning kamida to‘rttasi uch amalning farqini yordamsiz ayta oladi va topadi.
- **Old roadmap coverage:** M02, M04.

### 3. Bitta delivery siyosati — HAL QILINDI (2026-08-29)

**Qaror:** yetkazib berish sex tomonidan va mijoz uchun bepul; mahsulot puli
to‘liq to‘lanmagan bo‘lsa ham yetkazish mumkin (qarz keyin to‘lanadi).
Birinchi pilot uchun mijoz bo‘yicha sozlanadigan konfiguratsiya qurilmaydi —
bitta qoida hammaga bir xil ishlaydi. UI xabari, operator SOP, USER_GUIDE va
acceptance hujjatlari shu qoidaga moslab yangilandi; kod va avtomatik testlar
allaqachon shunday ishlaydi (BR-03 "unpaid delivery allowed").

- **Nega:** qarama-qarshi qoida real mahsulot va pul nizosiga olib keladi.
- **Customer outcome:** Seller qachon yetkazish mumkinligini aniq biladi.
- **Old roadmap coverage:** M01.

### 4. Core data-entry guardrails

**Nima qilinadi:** joriy fabrika/smena katta ko‘rsatiladi; odatiy qiymatlar default qilinadi; faqat ruxsat etilgan keyingi bosqich tanlanadi; mavjud/max miqdor va birlik forma yonida ko‘rinadi; submitdan keyin tugma bloklanadi va oldin/keyin natija chiqadi.

- **Nega:** noto‘g‘ri stage, quantity, factory va duplicate click eng ko‘p uchraydigan kundalik xatolar.
- **Customer outcome:** kamroq qaror, kamroq qayta tekshirish.
- **Effort:** L, maksimal 5 kun. Faqat production move, material receipt, client payment va payroll payment formalariga qo‘llanadi.
- **Qabul mezoni:** noto‘g‘ri factory/stage, over-quantity va double-submit guided testda muvaffaqiyatli to‘xtatiladi.
- **Old roadmap coverage:** M05, S04, S05ning core scope’i.

### 5. Smena yakuni reconciliation

**Nima qilinadi:** bitta checklist: ochiq stanok ishlari, kiritilmagan bajarilgan ishlar, bosqich qoldig‘i, omborga olinmagan tayyor mahsulot va izoh. Smena nazoratchisi topshiradi, Manager qabul qiladi.

- **Nega:** data xatosini oy oxirida emas, shu kuni topish business trustning asosidir.
- **Customer outcome:** keyingi smena nimani qabul qilganini biladi.
- **Effort:** M, 3–4 kun.
- **Qabul mezoni:** ochiq exceptionlar ko‘rinmasdan smenani “yakunlandi” deb belgilab bo‘lmaydi yoki customer tasdiqlagan override sababi talab qilinadi.
- **Old roadmap coverage:** M07.

### 6. Minimal correction va recovery pack

**Nima qilinadi:** mavjud stock correction, client payment reversal va return oqimlari bitta operator SOPga birlashtiriladi. Production movement, worker activity yoki supplier payment uchun to‘liq universal correction engine qurilmaydi; ular uchun Manager tasdiqlaydigan, yozuv IDsi va sababni saqlaydigan controlled escalation beriladi.

- **Nega:** “xato bo‘lsa nima qilamiz?”ga javobsiz pilot yurmaydi.
- **Customer outcome:** xato yashirilmaydi, delete yoki soxta qarshi yozuv ishlatilmaydi.
- **Effort:** M, 3–4 kun.
- **Qabul mezoni:** to‘rtta asosiy xato case’ida operator qaysi recovery yo‘lini ishlatishini topadi; unsupported case Manager queue’ga tushadi.
- **Old roadmap coverage:** M06, M19; S09ning SOP qismi.

### 7. Finance approval separation

**Nima qilinadi:** so‘rovchi, tasdiqlovchi va to‘lovchi aniq ko‘rsatiladi; Manager approve/reject qiladi, Accountant faqat tasdiqlangan yozuvni to‘laydi; bir xil odam bajarishi customer siyosatiga zid bo‘lsa bloklanadi.

- **Nega:** bir kishining pul oqimini boshidan oxirigacha boshqarishi owner ishonchini yo‘qotadi.
- **Customer outcome:** har chiqimda kim so‘radi, kim tasdiqladi, kim to‘ladi aniq.
- **Effort:** M, 3–4 kun.
- **Qabul mezoni:** Manager va Accountant role walkthrough customer kutgan natijani beradi.
- **Old roadmap coverage:** M08 va finance transitionning pilot state gate’i.

### 8. Payroll trust gate

**Nima qilinadi:** calculate oldidan missing rate/activity exceptionlari; xodim bo‘yicha **Hisoblandi / To‘landi / Qoldi**; manager confirmation; close oldidan ikkinchi tasdiq; bir xil payroll itemga parallel paymentning oldini olish va regression testi. Partial payment UX kengaytirilmaydi.

- **Nega:** birinchi noto‘g‘ri ish haqi butun pilot ishonchini buzadi.
- **Customer outcome:** Accountant nimadan hisoblanganini ko‘radi, Owner yakunlashdan oldin tasdiqlaydi.
- **Effort:** L, maksimal 5 kun; faqat piece-rate pilot case’i.
- **Qabul mezoni:** missing-rate case bloklanadi; parallel paymentdan faqat bittasi o‘tadi; yopilish oldidan totals va approver ko‘rinadi.
- **Old roadmap coverage:** M09, M10, S07ning payroll qismi.

### 9. Customer onboarding va opening-data sign-off

**Nima qilinadi:** customerning real stage nomlari, birliklari, rollari, smenalari, katalogi va opening balances standart template orqali tayyorlanadi. Product owner va customer mas’uli ikki tomonlama imzo qo‘yadi. Besh real operator bilan 10 core task rehearsal qilinadi.

- **Nega:** yaxshi UI ham noto‘g‘ri boshlang‘ich qoldiqni tuzata olmaydi.
- **Customer outcome:** birinchi kun raqamlari qayerdan kelgani va kim tasdiqlagani aniq.
- **Effort:** M, developer 2 kun; qolgan ish Product Owner/customer tomonidan.
- **Qabul mezoni:** import error list bo‘sh; opening balances signed; kamida 4/5 operator core tasklarning ≥90%ini 0 kritik xato bilan bajaradi.
- **Old roadmap coverage:** M13, M14, M18, S10.

### 10. Release stability gate

**Nima qilinadi:** demo/acceptance fixture va smoke takroriy ishlaydi; fresh pilot muhitida core acceptance o‘tadi; production konfiguratsiyasi tayyor; encrypted off-host backup olinadi va clean databasega restore mashqi qilinadi. Yangi feature qo‘shilmaydi.

- **Nega:** demo ishlashi production barqarorligini isbotlamaydi; customerning birinchi kuni tiklanmaydigan xato bo‘lmasligi kerak.
- **Customer outcome:** release qayta tekshiriladigan va ma’lumot tiklanadigan bo‘ladi.
- **Effort:** L, maksimal 5 kun; hosting setup alohida owner yordamida.
- **Qabul mezoni:** clean environment acceptance, backup checksum va restore evidence customer go-live papkasida bor.
- **Old roadmap coverage:** M20, M21, M22.

## 4 haftalik ketma-ketlik

| Hafta | Developer fokus | Product/customer parallel ish | Exit |
|---|---|---|---|
| 1 | #1 scope, #2 language, #3 delivery | Policy va terminology sign-off | Har rol aniq menyu va bitta delivery qoidasi |
| 2 | #4 guardrails, #7 finance separation | Correction va role SOP | Core entry xatolari to‘xtatiladi |
| 3 | #5 shift close, #6 recovery, #8 payroll | Opening data va operator training | Smena va payroll customer walkthrough o‘tadi |
| 4 | #9 onboarding support, #10 release gate | Rehearsal, sign-off, go-live plan | Clean acceptance + restore + operator gate |

Developer capacity taxminan 18–20 fokus kun. Har bir change maksimal 5 kunlik scope bilan muzlatiladi. Bir item 5 kundan oshishi aniqlansa, universal yechim rad etiladi va yuqoridagi pilot-specific variant yoki manual SOP ishlatiladi.

## Rejected items va business justification

Quyida avvalgi roadmapdagi tanlanmagan barcha itemlar guruhlangan. Bir xil customer outcome’ga xizmat qiladigan itemlar bir qatorda keltirilgan.

### Customer birinchi pilotda yashay oladi — keyin

| Rejected IDs | Itemlar | Nega hozir rad etildi |
|---|---|---|
| M11 | Refresh rotation integrity | Muhim platform control, lekin 4 haftalik operator adoption zanjiriga ko‘rinadigan qiymat bermaydi; alohida hardening release’ga olinadi. Pilot session SOP bilan cheklanadi. |
| M15 | Uch yangi management report | Mavjud operational screens va signed daily reconciliation birinchi oyga yetadi; yangi reportlar 5 kundan oshishi mumkin. Qaysi format kerakligi real foydalanishdan keyin ma’lum bo‘ladi. |
| M16, S03 | Order/delivery print va payroll payslip | Qog‘oz/Excel template vaqtinchalik ishlaydi. Full print layout customer formatini bilmasdan qayta ishlanishi aniq. |
| M17 | Purchase→receipt product link | Bir supplier va omborchi uchun purchase ID yozilgan SOP bilan pilot yuradi; full ordered/received/remaining oqimi 5 kundan oshishi mumkin. |
| S01 | Brak disposition | Brak hajmi pilotda past bo‘lsa Manager paper/SOP orqali rework/scrap qarorini yuritadi. Real kategoriya kuzatilgach quriladi. |
| S02 | Cycle-count session | Kunlik signed manual count + existing correction birinchi oyga yetadi; full count session alohida katta workflow. |
| S06 | Client/supplier duplicate detection | Pilot data PO tomonidan oldindan tozalanadi; real operator create volume past. |
| S08 | Finance KPI summary change | KPI yashirilishi mumkin; rasmiy qaror underlying expense list/reconciliationga tayanadi. |
| A01–A04 | Warehouse, Sales, Supplier unified workspace; Production read/write split | Har biri L/XL redesign. Customer mavjud yo‘llar bilan bir oy ishlay oladi; real navigation data bo‘lmasdan merge qilish qayta ish yaratadi. |
| A05 | Bulk/brigada activity | Yuqori kelajak qiymati bor, lekin real brigada ish haqi taqsimoti customer bilan kuzatilmagan va 5 kundan oshishi mumkin. |
| A06 | QR/barcode | Qurilma, label va jarayon talab qiladi. Soddalashtirilmagan manual flow ustiga QR qo‘shish xatoni yashiradi. |
| A07 | Full partial receipt/unit conversion/supplier return | Universal warehouse flow XL. Pilot bir xil birlik va kelishilgan receipt SOP bilan yashaydi. |
| A08 | Partial delivery/return, pick-pack, reservation | Birinchi pilotda full delivery siyosati tanlanadi. Kengaytma customer talabini kuzatgach. |
| A09–A10 | Quotation/invoice pack, credit limit, overdue tasks, overpayment | Savdo qulayligi, ammo core production adoption va raqam ishonchining sharti emas. |
| A11 | Expense attachment/cashbox/cost center/advance settlement | Generic finance scope’ni kengaytiradi va bir haftadan ko‘p. Pilot oddiy expense+advance bilan yuradi. |
| A12 | Full payroll variants | Partial/correction/salaried/leave universal flow XL. Pilot faqat kelishilgan piece-rate case bilan muzlatiladi. |
| A13 | Full HR | Employee documents, leave va transfer MES pilotining core og‘rig‘i emas. |
| A14 | Full Excel/PDF reports | Customer qaysi reportni haqiqatan ishlatishi hali noma’lum; signed daily sheets yetarli. |
| A15 | Human-readable object history | Foydali, lekin correction SOP va manager escalation birinchi oy uchun yetarli. |
| A16 | Settings onboarding wizard | Product Owner setupni bajaradi; operator settings ko‘rmaydi. Wizard >1 hafta bo‘lishi mumkin. |
| A17 | Factory TV qaytarish | Customer success uchun write flowlardan past qiymat; pilotda o‘chiq. |
| A18 | Attendance/Trunket | Tashqi payload va real jarayon yo‘q; boshlash spekulyativ. |
| A19 | Manager mobile | Responsive web yoki laptop pilotni qoplaydi; real-device support yangi risk qo‘shadi. |
| A20 | Telegram production rollout | Web core va joyidagi training mavjud; bot privacy/support bir haftadan ko‘p. |
| A21 | Advanced mechanic quality | Customerning majburiy quality jarayoni sifatida hali tanlanmagan; katta alohida workflow. |
| A22 | Multi-factory | Pilot faqat bitta fabrika; nol customer value. |
| A23–A25 | Scale controls, SBOM program, automated immutable backup | Bir instance/bir customer uchun manual verified release va backup gate yetarli; automation keyingi customerdan oldin. |

### Productni kuchsizlantiradi — umuman qilinmaydi

| Rejected IDs | Itemlar | Business justification |
|---|---|---|
| N01 | Full accounting/tax ERP | Paypoq OSning manufacturing fokusini yo‘qotadi; customerning mavjud accounting tizimi bilan raqobat yaratadi. |
| N02 | Generic workflow engine | Bitta pilotga ortiqcha abstraksiya; operatorga qiymat bermaydi. |
| N03 | Generic notification-rule builder | Operatorga ko‘proq noise va sozlama beradi; faqat aniq triggerlar kerak. |
| N04 | Alohida technical Audit menu | Owner texnik entity/JSON o‘qimasligi kerak; kerakli history obyekt yonida bo‘ladi. |
| N05 | Linklardan iborat Reports hub | “Hisobot” degan noto‘g‘ri va’da beradi; real report bo‘lmasa menyu yo‘q. |
| N06 | Parallel employee mobile va Telegram | Ikki kanal support va treningni ikki baravar qiladi; bittasi keyin tanlanadi. |
| N07 | Barcha Settingsni operatorga ko‘rsatish | Xato va trainingni oshiradi; setup Product Owner vazifasi. |
| N08 | IoT data stock/payrollni to‘g‘ridan-to‘g‘ri o‘zgartirishi | Manual reconciliation barqaror bo‘lmaguncha business trustni pasaytiradi. |
| N09 | Har rolga ikki parallel dashboard | Qaysi biri “haqiqat” degan savol tug‘diradi; bitta role home yetarli. |
| N10 | Bonus/penalty/advance uchun ikki mutation joyi | Bir xil amal ikki joyda bo‘lsa duplicate va training xatosi ko‘payadi. |

## Top 5 risks if we do nothing

1. **Operator adoption muvaffaqiyatsiz bo‘ladi.** Run/intake/activity/movement terminlari sabab xodimlar tizimdan tashqari daftar va Telegramga qaytadi.
2. **Production va stock raqamiga ishonch yo‘qoladi.** Noto‘g‘ri stage/miqdor, duplicate submit va correction yo‘li yo‘qligi birinchi haftada tafovut yaratadi.
3. **Delivery va qarz nizosi chiqadi.** Paid-only va debt-enabled qarama-qarshiligi Seller, Accountant va Ownerni turli qoida bilan ishlatadi.
4. **Ish haqi bo‘yicha mojaro chiqadi.** Missing rate/activity yoki takroriy payment bitta xodimning noto‘g‘ri maoshiga olib kelsa, butun tizim rad etiladi.
5. **Birinchi incident pilotni to‘xtatadi.** Repeatable acceptance, backup va restore dalili bo‘lmasa, nosozlikdan keyin customerni tez va ishonchli tiklab bo‘lmaydi.

## Top 5 things that look important but actually are not

1. **Factory TV.** Demoda chiroyli, lekin operatorning birorta asosiy write xatosini kamaytirmaydi.
2. **Mobile app.** “Telefon bor” savdoda yaxshi eshitiladi, ammo yangi support kanali yaratadi; responsive web pilotga yetadi.
3. **Ko‘p va chiroyli report/exportlar.** Birinchi oyda customerga uch ishonchli raqam va signed reconciliation ko‘proq qiymat beradi.
4. **IoT va barcode.** Noto‘g‘ri manual jarayonni avtomatlashtirish xatoni tezlashtiradi; avval oqimni soddalashtirish kerak.
5. **Generic ERP funksiyalari.** Full accounting, HR, configurable workflow va ko‘p settings Paypoq OSni kuchli qilmaydi; manufacturing fokusini yo‘qotadi.

## Final decision

To‘rt haftada faqat yuqoridagi o‘nta change bajariladi. Scope muzlatiladi. Tanlangan itemlardan biri besh developer kunidan oshsa:

1. avval pilot-specific scope’ga kesiladi;
2. customer imzolagan manual SOP mumkin bo‘lsa shundan foydalaniladi;
3. data integrity, payroll trust, backup/restore yoki core acceptance itemi bo‘lsa pilot sanasi suriladi;
4. o‘rniga rejected feature olinmaydi.

**CPO xulosasi:** birinchi customer ko‘p feature uchun emas, raqamga ishonish va operatorning ishlata olishi uchun pul to‘laydi. O‘nta change shu ikki natijani himoya qiladi.
