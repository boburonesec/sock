# Paypoq OS — mijoz uchun foydalanish qo‘llanmasi

Bu qo‘llanma fabrikadagi kundalik ish uchun. Texnik sozlash, maxfiy token va demo parollar bu hujjatga kiritilmagan.

> **Dalil holati:** bu hujjatdagi qadamlar operatsion tavsiya bo‘lib, o‘z-o‘zidan test dalili emas. Tizim xulqi haqidagi tasdiqlangan, test talab qiladigan va qo‘llab-quvvatlanmagan da’volar hujjat oxiridagi “Dalil auditi” bo‘limida ajratilgan.

## 1. Ishni boshlash

1. Administrator bergan manzilni brauzerda oching.
2. Shaxsiy email va parolingiz bilan kiring.
3. Bir nechta fabrika ko‘rinsa, yuqoridan ishlaydigan fabrikani tanlang.
4. Menyuda faqat sizga ruxsat berilgan bo‘limlar ko‘rinishi kutiladi. Aksini ko‘rsangiz administratorga xabar bering.

Parolni boshqa odamga bermang. Begona qurilmada ish tugagach, **Chiqish** tugmasini bosing. Bo‘lim ko‘rinmasa, bu odatda rol/ruxsat masalasi — administratorga murojaat qiling.

## 2. Rollar qisqacha

| Rol | Asosiy vazifa |
|---|---|
| Owner | umumiy nazorat, sozlamalar va barcha muhim hisobotlar |
| Manager | ishlab chiqarish va operatsion nazorat |
| Shift Receiver | smena ishlab chiqarish ma’lumotlarini kiritish |
| Warehouse Manager | xomashyo va tayyor mahsulot ombori |
| Seller | mijoz, buyurtma, to‘lov va yetkazish |
| Accountant | xarajat, qarz, supplier va payroll ishlari |
| Mechanic | Telegram orqali stanok topshiriqlari |
| Client | Telegram orqali o‘z buyurtma va qarzini ko‘rish |

Muhim: hozirgi tizimda Manager va Accountant moliyaviy yozuvlar uchun bir xil keng ruxsatga ega bo‘lishi mumkin. Ishlab chiqarishda tasdiqlovchi va to‘lovchi odamlarni tashkiliy tartib bilan alohida qiling; tizimdagi qat’iy ajratish auditda tuzatish sifatida belgilangan.

## 3. Dashboard

**Kim uchun:** Owner va Manager.  
**Amal:** `/dashboard` sahifasini oching, kerakli fabrika tanlanganini tekshiring, ishlab chiqarish, ombor, sotuv, qarz va ogohlantirish kartalarini ko‘ring.  
**Natija:** bugungi holat bitta ekranda ko‘rinadi.  
**Xato bo‘lsa:** kartadagi raqamni tegishli bo‘limdagi yozuv bilan solishtiring; raqamni qo‘lda “to‘g‘rilamang”.

## 4. Stanok va production run

**Kim uchun:** Manager yoki Shift Receiver.  
**Old shart:** stanok, mahsulot varianti, smena va operator faol bo‘lishi kerak.

1. `/machines` bo‘limini oching.
2. Stanok uchun operator/mexanik biriktirilganini tekshiring.
3. Mahsulot varianti va smenani tanlab production run boshlang.
4. Stanokdan chiqqan tayyor miqdorni **output qabul qilish** orqali kiriting.
5. Bir amalni tarmoq sekin bo‘lganda qayta-qayta bosmang; natijani ro‘yxatdan tekshiring.

**Natija:** output boshlang‘ich Stage Inventoryga tushadi. Production run intake hozir avtomatik ishbay payroll activity yaratmaydi.

## 5. Ishlab chiqarish bosqichlari

**Kim uchun:** Shift Receiver va Manager.  
**Yo‘l:** `/production`

1. Qaysi partiya va qaysi bosqichdan ko‘chirishni tanlang.
2. Keyingi bosqich va dona sonini kiriting.
3. Tasdiqlashdan oldin mavjud qoldiqni tekshiring.
4. Saqlang va ikkala bosqich qoldig‘i o‘zgarganini tekshiring.

Tizim manfiy qoldiqqa yo‘l qo‘ymasligi kerak. Noto‘g‘ri movement uchun oddiy edit/delete yo‘q; yangi harakat bilan yashirishga urinmang. Owner/Managerga xabar bering va tasdiqlangan correction tartibidan foydalaning.

## 6. Ishchi faoliyati va nuqson

**Ishchi faoliyati:** ishchi, bosqich, miqdor va vaqtni kiriting. Bu payroll hisobiga asos bo‘lishi mumkin, lekin Stage Inventoryni o‘zgartirmaydi.  
**Nuqson:** partiya/bosqich, nuqson turi va miqdorni kiriting. Nuqson yozuvi ishlab chiqarish qoldig‘ini o‘zi avtomatik ko‘chirmaydi.

Bir real hodisani ikki marta kiritmang. Xatoni aniqlasangiz payroll yopilishidan oldin mas’ulga bildiring.

## 7. Ombor

**Kim uchun:** Warehouse Manager.  
**Yo‘l:** `/warehouse`

- Xomashyo yoki mahsulotni tanlang.
- Ombor va zonani tekshiring.
- Kirim/chiqim/ko‘chirish turini to‘g‘ri tanlang.
- Miqdor va izohni kiriting.
- Saqlagandan keyin qoldiqni tekshiring.

Supplier purchase qarz va purchase tarixini yaratadi, lekin stockni avtomatik oshirmaydi. Haqiqiy tovar kelganda ombor kirimini alohida yozing.

## 8. Mijoz va buyurtma

**Kim uchun:** Seller.  
**Yo‘l:** `/clients`, `/sales/orders`

1. Avval mijoz mavjudligini tekshiring; bo‘lmasa yarating.
2. Buyurtmada mahsulot, rang/variant, miqdor va narxni kiriting.
3. Umumiy summa server hisoblagan qiymat ekanini tekshiring.
4. Buyurtma holatini real jarayonga mos yangilang.

Mijoz qarzi buyurtmalar va to‘lovlardan hisoblanadi. Uni qo‘lda alohida raqam sifatida “tuzatmang”.

## 9. Mijoz to‘lovi

1. Mijozni tanlang.
2. To‘lov summasi, usuli va sanasini kiriting.
3. Qaysi buyurtmalarga taqsimlanishini tekshiring.
4. Tasdiqlang va mijoz qarzi kamayganini ko‘ring.

Ortiqcha allocation qabul qilinmasligi kerak. Noto‘g‘ri to‘lovni o‘chirmang; mavjud reversal funksiyasidan foydalaning va sabab yozing.

## 10. Yetkazib berish va qaytarish

**Rasmiy siyosat (biznes egasi tasdiqlagan):** yetkazib berish sex tomonidan
amalga oshiriladi va mijoz uchun bepul; mahsulot puli to‘liq to‘lanmagan
bo‘lsa ham yetkazish mumkin. Qolgan summa mijoz qarzi bo‘lib qoladi va keyin
to‘lanadi. Dastur va avtomatik testlar shu qoidaga mos ishlaydi.

Yetkazishda:

1. Buyurtma va mijozni yana tekshiring.
2. Tayyor mahsulot qoldig‘i yetarliligini tekshiring.
3. Yetkazishni tasdiqlang.
4. Stock kamaygani, order holati va qarz to‘g‘ri qolganini tekshiring.

Qaytarishda buyurtmani tanlang, qaytgan miqdorni aniq kiriting va stock/order natijasini tekshiring. Partial delivery MVPda cheklangan bo‘lishi mumkin.

## 11. Supplier purchase va qarz

**Kim uchun:** Accountant/finance ruxsatli foydalanuvchi.

1. Supplierni yarating yoki tanlang.
2. Purchasega material, miqdor, narx va sanani kiriting.
3. Purchase qarzni oshirganini tekshiring.
4. Tovar kelganda Warehouse bo‘limida alohida stock kirimi yozing.

Purchase yozuvi stock movement emas. Shu ikki amalni aralashtirish real qoldiqni noto‘g‘ri ko‘rsatadi.

## 12. Supplier to‘lovi

1. Supplierni tanlang.
2. To‘lov summasi va usulini kiriting.
3. Ochiq purchaselarga allocationni tekshiring.
4. Bir marta tasdiqlang va qarz kamayganini ko‘ring.

Noto‘g‘ri supplier payment kiritilsa yangi qarshi yozuv yaratishdan oldin Owner va Accountant bilan correction tartibini kelishing. Reversal mavjudligi bu auditda alohida tasdiqlanmagan.

## 13. Xarajat va advance

Odatdagi oqim: **so‘rov → tasdiq/rad → to‘lov**.

- Sabab, kategoriya, summa va sanani aniq kiriting.
- Tasdiqlovchi hujjat/izohni korxona tartibiga muvofiq saqlang.
- Bir odamning o‘zi so‘rash, tasdiqlash va to‘lashiga yo‘l qo‘ymang.
- Tizimdagi “To‘langan jami” kartasi audit tuzatilguncha ro‘yxatdagi qiymatlardan hisoblanishi mumkin; rasmiy hisob uchun backend hisobot va buxgalteriya dalilini solishtiring.

## 14. Payroll

1. Davrni oching.
2. Ishchi faoliyati, stavka, bonus, jarima va advancelar to‘liqligini tekshiring.
3. Payrollni hisoblang.
4. Har bir ishchi bo‘yicha natijani tekshiring.
5. To‘lovni kiriting; parallel ravishda ikki operator bir ishchiga to‘lov kiritmasin.
6. Hammasi tekshirilgach davrni yoping.

Yopilgan payrollni eski yozuvni tahrirlash orqali o‘zgartirmang. Qaysi correction/adjustment usuli ruxsat etilganini mas’ul bilan tekshiring; bu audit yopilgan davrning barcha runtime cheklovlarini alohida sinamagan. Concurrency testi o‘tmaguncha bitta payroll to‘lov operatori ishlashi ehtiyot chorasi hisoblanadi.

## 15. Xodimlar

Xodimni o‘chirmang; ishlamasa **inactive** holatiga o‘tkazing. Rol, fabrika accessi, Telegram bog‘lanishi va salary agreementni tegishli mas’ul boshqarsin. Bir xodimning shaxsiy ma’lumotini boshqa foydalanuvchilarga yubormang.

## 16. Telegram bot

**Xodim/mijoz:** administrator ko‘rsatgan bog‘lash oqimidan foydalanadi. Kodni boshqa odamga yubormang. Bot faqat bog‘langan shaxsga tegishli ma’lumotni ko‘rsatishi kutiladi; bu audit real Telegram muhitida buni sinamagan.

Telefon yo‘qolsa yoki Telegram hisobi almashsa, darhol administratorga unlink/revoke so‘rovi bering. Botda begona ma’lumot ko‘rinsa, screenshotni ommaviy guruhga yubormang; administratorga shaxsiy xabar bilan incident sifatida bildiring.

## 17. Mobile ilova

Mobile ilovaning access tokenni SecureStore’da saqlashi source reviewda ko‘rilgan, ammo real qurilmadagi login/refresh/logout tiklanishi sinovdan o‘tmagan. Faqat rasmiy buildni o‘rnating. Telefonni PIN/biometriya bilan himoyalang. Telefon yo‘qolsa sessiyani bekor qildiring. Offline paytda muhim write amalini ishladi deb taxmin qilmang — internet qaytganda server natijasini tekshiring.

## 18. Factory TV

Factory TV faqat administrator tenant/factoryga alohida bog‘langan xavfsiz credential o‘rnatgandan keyin ishlatilishi kerak. Audit paytida TV backend demo factory kontekstiga bog‘langanligi topildi. Bu tuzatilmaguncha real ishlab chiqarish raqami sifatida TV ekraniga tayanmang.

## 19. Kunlik nazorat ro‘yxati

**Smena boshida:** to‘g‘ri fabrika, faol stanok/run, operator/smena va kechagi ochiq yozuvlarni tekshiring.  
**Smena davomida:** har real amalni bir marta kiriting; stock va stage qoldig‘ini davriy solishtiring.  
**Smena oxirida:** production output, stage inventory, tayyor mahsulot, yetkazish/to‘lov va payroll activityni mas’ullar bilan solishtiring.

## 20. Xato yoki incident bo‘lsa

1. Amalni qayta-qayta takrorlamang.
2. Vaqt, foydalanuvchi, fabrika, bo‘lim, yozuv IDsi va ekrandagi xabarni yozib oling.
3. Maxfiy token/parolni screenshotga qo‘shmang.
4. Owner yoki administratorga xabar bering.
5. Moliyaviy/stock xatoni delete yoki soxta qarshi yozuv bilan yashirmang; tasdiqlangan reversal/correction oqimini ishlating.

## 21. Administrator uchun pilot shartlari

- production secrets va TLS sozlangan;
- demo account/seed productionda ishlatilmaydi;
- har foydalanuvchiga eng kam zarur rol berilgan;
- Factory TV demo-context muammosi yopilgan yoki TV o‘chirilgan;
- encrypted off-host backup olingan va toza bazaga restore mashqi o‘tgan;
- yangi muhitda API, web, Telegram va mobile smoke testlari o‘tgan;
- delivery payment siyosati yozma tasdiqlangan;
- finance approver va payer amalda alohida odamlar;
- payroll to‘lovini bir vaqtda faqat bitta operator kiritadi, concurrency fix chiqmaguncha.

Texnik o‘rnatish va to‘liq operatsion tafsilotlar uchun `docs/USER_GUIDE_V1.md`, `docs/MVP_PILOT_RUNBOOK_V1.md`, `docs/BACKUP_AND_RECOVERY_V1.md` va `docs/TELEGRAM_BOT_RUNBOOK_V1.md` ishlatiladi.

## 22. Dalil auditi

Quyidagi jadval ushbu qo‘llanmadagi tizim-xulqi da’volarini tasniflaydi. Oddiy xavfsizlik va ish tartibi maslahatlari **ASSUMPTION / operatsion tavsiya** bo‘lib, mahsulot funksiyasi tasdig‘i emas.

| Bo‘lim yoki da’vo | Tasnif | Auditdagi dalil |
|---|---|---|
| Rollar va kundalik vazifalar | VERIFIED BY DOCUMENTATION | auditning product/source-of-truth review doirasi; aniq runtime role matrix bu qo‘llanmada isbotlanmagan |
| Manager va Accountant uchun umumiy `finance.write` | VERIFIED BY SOURCE CODE | audit F-02: `role-permissions.ts:38-60`, finance controller/service citations |
| Dashboard kartalari va navigatsiya tafsilotlari | REQUIRES MANUAL TEST | joriy browser testlari yaroqli UI dalili bermadi |
| Production output boshlang‘ich Stage Inventoryga tushishi va intake payroll activity yaratmasligi | VERIFIED BY COMMAND OUTPUT / DOCUMENTATION | auditda 64/64 va 35/35 suite natijalari qayd etilgan; USER_GUIDE ziddiyati ham qayd etilgan |
| Manfiy stage qoldig‘ini rad etish | VERIFIED BY COMMAND OUTPUT | auditda business-rule suite natijasi qayd etilgan; raw log repositoryda saqlanmagan |
| Worker activity Stage Inventoryni o‘zgartirmasligi | VERIFIED BY DOCUMENTATION | auditda product/acceptance hujjatlari o‘qilgan; bu self-audit source’ni qayta ochmadi |
| Supplier purchase stockni avtomatik oshirmasligi | VERIFIED BY DOCUMENTATION / COMMAND OUTPUT | audit product-policy va business-rule natijasiga tayangan |
| Mijoz qarzi, payment allocation va reversal qadamlarining to‘liq UI oqimi | REQUIRES MANUAL TEST | browser suite yaroqli dalil bermadi; API suite natijasi UI’ni isbotlamaydi |
| To‘lanmagan orderni yetkazishga ruxsat | VERIFIED BY DOCUMENTATION / COMMAND OUTPUT | audit F-09; 64/64 va 35 PASS natijalari |
| Partial delivery cheklovi | SPECULATION | qo‘llanmada “bo‘lishi mumkin” deb yozilgan; bu audit isbotlamagan |
| Supplier payment reversal mavjudligi | NOT SUPPORTED | da’vo olib tashlandi; operator escalation ko‘rsatmasi qoldirildi |
| Xarajat KPI ro‘yxatdan hisoblanishi | VERIFIED BY SOURCE CODE | audit F-10: `expenses-module.tsx:100-126` |
| Payroll concurrency natijasi | REQUIRES MANUAL TEST | audit F-03; faqat xavf patterni source’da ko‘rilgan |
| Yopilgan payrollning barcha runtime cheklovlari | REQUIRES MANUAL TEST | qo‘llanma konservativ tarzda qayta yozildi |
| Telegram identity/privacy xulqi | REQUIRES MANUAL TEST | real Telegram testi bajarilmagan; oldingi keng da’vo qo‘llab-quvvatlanmagan |
| Mobile SecureStore | VERIFIED BY SOURCE CODE | audit: `apps/mobile/src/lib/auth/session-storage.ts:1-49` |
| Mobile real-device session xulqi | REQUIRES MANUAL TEST | iOS/Android testi bajarilmagan |
| Factory TV demo kontekstiga bog‘langan | VERIFIED BY SOURCE CODE | audit F-01: dashboard service va DevContext citations |
| Pilot shartlari va incident ko‘rsatmalari | ASSUMPTION | riskka asoslangan operatsion tavsiyalar |
