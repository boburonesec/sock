# Paypoq OS — Product Requirements

## 1. Product Vision

Paypoq OS — paypoq fabrikasi uchun Manufacturing Operating System. U mahsulotning ishlab chiqarish bosqichlaridan omborga, sotuvdan qarzdorlik va ish haqi hisobigacha bo‘lgan asosiy operatsiyalarni ko‘rinadigan va boshqariladigan qiladi.

Tizim generic ERP emas. Uning markazida stage inventory, smena qabul qiluvchi kiritadigan ishchi faoliyati va qarzdorlik boshqaruvi turadi.

## 2. Business Goals

- Har bir mahsulot qaysi ishlab chiqarish bosqichida ekanini darhol ko‘rish.
- Ishchilar faoliyatidan dona asosidagi ish haqini aniq hisoblash.
- Mijoz va yetkazib beruvchilar qarzlarini alohida nazorat qilish.
- Menejerga kundalik operatsion qarorlar uchun bitta ko‘rinish berish.
- Qo‘lda yuritiladigan jadvallar, kechikkan ma’lumot va noto‘g‘ri qoldiqlarni kamaytirish.

## 3. User Roles

| Rol | Asosiy vazifa |
| --- | --- |
| Owner | Barcha ko‘rsatkichlar, moliya va hisobotlarni ko‘rish |
| Manager | Ishlab chiqarish, tasdiqlar, xodimlar va operatsiyalarni boshqarish |
| Shift Receiver | Partiya, bosqich ko‘chishi, ishchi faolligi va nuqsonlarni kiritish |
| Warehouse Worker | Ombor qoldig‘i va harakatlarini yuritish |
| Seller | Mijozlar, buyurtmalar va to‘lovlarni yuritish |
| Accountant | Xarajatlar, avans to‘lovlari, ish haqi va qarzlarni yuritish |

Ishchilar web-ilovadan foydalanmaydi. Ularning faolligi smena qabul qiluvchi tomonidan qayd etiladi.

## 4. Production Module

Mahsulot oqimi:

`Averlog → Dazmol → Sifat → Kiydirish → Par Dazmol → Parlash → Bezak → Etiketka → Qadoqlash → Ombor`

- Ishlab chiqarish stage inventory bilan yuritiladi; har bosqichning qoldig‘i mavjud.
- Partiya standart hajmi 500 dona, ammo sozlanadigan bo‘ladi.
- Partiya mahsulot modeli, rangi, materiali va mavsumi bilan bog‘lanadi; MVP’da o‘lcham yo‘q.
- Smena qabul qiluvchi partiyani yaratadi, bosqichga qabul qiladi va keyingi bosqichga ko‘chiradi.
- Har ko‘chirishda miqdor, vaqt, mas’ul shaxs va izoh qayd etiladi.
- Nuqsonlar kam uchraydi, biroq miqdor, sabab va aniqlangan bosqich bilan majburiy qayd etiladi.
- Bosqichga ortiqcha miqdor chiqarish yoki manfiy qoldiq yaratish mumkin emas.

## 5. Warehouse Module

- Xomashyo, qadoqlash materiali va tayyor mahsulotlar alohida yuritiladi.
- Ombor zonalari va joylashuvlari qo‘llab-quvvatlanadi.
- Kirim, chiqim, ishlab chiqarishga berish va qaytarish — alohida harakat turlari.
- Tayyor mahsulot Qadoqlash bosqichidan Omborga o‘tganda ombor qoldig‘iga qo‘shiladi.
- Kam qoldiq uchun minimal limit va bildirishnoma bo‘ladi.

## 6. Sales Module

- Seller mijoz va buyurtmani yaratadi.
- Buyurtma mahsulotlar, miqdor, narx, muddat va holatni saqlaydi.
- To‘lov buyurtmadan alohida obyekt: bitta to‘lov bir yoki bir nechta buyurtmaga taqsimlanishi mumkin.
- Mijoz qarzi barcha tasdiqlangan buyurtmalar minus qabul qilingan to‘lovlardan hisoblanadi.
- Qarzdorlik holati buyurtma kartasi va mijoz profilida ko‘rinadi.

## 7. Finance Module

- Xarajatlar kategoriya, summa, sana va tasdiqlovchi hujjat bilan qayd etiladi.
- Yetkazib beruvchi qarzi xaridlar va ularga biriktirilgan to‘lovlar asosida yuritiladi.
- Avans jarayoni: so‘rov → manager tasdiqlashi/rad etishi → accountant to‘lovi.
- Ish haqi davr bo‘yicha faoliyat hamda bosqich stavkalari asosida hisoblanadi.
- Moliya ma’lumotlarini o‘zgartirish audit log’ga yoziladi.

## 8. Employee Module

- Xodim profili: ism, rol, bo‘lim, faol/ta’til holati.
- Shift Receiver ishchi faoliyatini sana, bosqich, dona, stavka va xodim bo‘yicha kiritadi.
- Bonus va jarimalar alohida yozuvlar sifatida saqlanadi.
- Ish haqi: faoliyat miqdori × tegishli bosqich stavkasi + bonus − jarima − avans.
- Ishchi faoliyatini kiritgan foydalanuvchi va o‘zgartirish tarixi saqlanadi.

## 9. Reports

- Ishlab chiqarish: sana, mahsulot va bosqich kesimida ishlab chiqarish, WIP va nuqsonlar.
- Sotuv: buyurtmalar, mijozlar va qarzdorlik.
- Moliya: xarajatlar, to‘lovlar, supplier debt va cash flow.
- Xodimlar: ishlab chiqarilgan dona, ish haqi, bonus, jarima va avans.
- Hisobotlar filtrlanadigan va keyinchalik eksport qilinadigan bo‘ladi.

## 10. Dashboards

- Executive: ishlab chiqarish, sotuv, qarzdorlik va asosiy moliyaviy KPI.
- Operations: bosqich qoldiqlari, bottleneck, bugungi partiyalar va nuqsonlar.
- Finance: mijoz qarzi, supplier debt, xarajatlar va kutilayotgan to‘lovlar.
- Sales: faol buyurtmalar, muddatlar, to‘lovlar va mijoz qarzi.
- Dashboard ko‘rinishi foydalanuvchi roliga mos bo‘ladi.

## 11. Notifications

- Past ombor qoldig‘i.
- Buyurtma muddati yaqinlashishi yoki o‘tib ketishi.
- Avans tasdiqlash kutayotgani.
- Nuqson qaydi.
- Bosqichda uzoq turib qolgan partiya.
- Muddati o‘tgan mijoz yoki yetkazib beruvchi qarzi.

## 12. Permissions

- RBAC (role-based access control) ishlatiladi.
- Owner barcha modul va hisobotlarni ko‘ra oladi.
- Manager operatsion ma’lumotlarni boshqaradi va avanslarni tasdiqlaydi.
- Accountant tasdiqlangan avanslarni to‘laydi, moliya va payroll’ni boshqaradi.
- Seller faqat mijoz, buyurtma va to‘lov sohasiga yozadi.
- Shift Receiver ishlab chiqarish faolligi, partiyalar va nuqsonlarni kiritadi.
- Omborchi faqat stock va stock movement yozuvlarini yuritadi.

## 13. Master Data

- Mahsulot modellari
- Ranglar
- Materiallar
- Mavsumlar
- Ishlab chiqarish bosqichlari
- Bosqich bo‘yicha dona stavkalari
- Ombor zonalari
- Xarajat kategoriyalari
- Rol va huquqlar

Master data o‘zgarishi mavjud tarixiy operatsiyalarni buzmasligi kerak; eski yozuvlar o‘sha paytdagi nom va stavkani saqlaydi.

## 14. Audit Log

Quyidagilar audit qilinadi: partiya/bosqich ko‘chishi, stock movement, nuqson, buyurtma, to‘lov, qarz, faoliyat, stavka, bonus, jarima va avans.

Har yozuvda: obyekt turi, obyekt ID, amal, oldingi qiymat, yangi qiymat, foydalanuvchi va vaqt saqlanadi. Audit yozuvlarini oddiy foydalanuvchi o‘zgartira olmaydi.

## 15. Multi-Tenant and Multi-Factory

- Har bir foydalanuvchi tenant doirasida ishlaydi; tenantlar ma’lumoti bir-biridan qat’iy ajratiladi.
- Tenant bir yoki bir nechta factory’ga ega bo‘lishi mumkin.
- Operatsion yozuvlar factory bilan bog‘lanadi; foydalanuvchi ruxsati berilgan factory doirasidagina ma’lumotni ko‘radi va o‘zgartiradi.
- Owner yoki vakolatli manager factory’lar bo‘yicha konsolidatsiyalangan hisobotlarni ko‘ra oladi.
- Factory almashtirish konteksni o‘zgartiradi, ammo tarixiy yozuvning factory bog‘lanishini o‘zgartirmaydi.

## 16. Telegram Bot

Telegram Bot ishchilar uchun yagona self-service kanal bo‘ladi. U web-ilovaning o‘rnini bosmaydi va faqat xodimga tegishli, read-only ma’lumotlarni ko‘rsatadi:

- Bugungi faollik
- Oylik faollik
- Payroll xulosasi
- Avans, bonus va jarima xulosasi

Bot foydalanuvchi Telegram akkauntini xodim profiliga xavfsiz bog‘lash orqali ishlaydi. Ishchi bot orqali ishlab chiqarish faolligini yoki moliyaviy yozuvlarni o‘zgartira olmaydi.

## 17. Future IoT Integration

Kelajakda to‘quv uskunalari, hisoblagichlar yoki barcode/QR skanerlar bilan integratsiya qilinishi mumkin.

- IoT ma’lumoti to‘g‘ridan-to‘g‘ri stage activity yoki machine event sifatida qabul qilinadi.
- Avtomatik kelgan ma’lumot smena qabul qiluvchi tasdiqlashi mumkin bo‘lgan holatda saqlanadi.
- MVP’da IoT integratsiyasi mavjud emas; domain modeli qo‘lda va avtomatik kiritishni ajrata olishi kerak.

## 18. Non-Goals

MVP quyidagilarni qamrab olmaydi:

- Universal ERP yoki buxgalteriya tizimi bo‘lish.
- Ishchilar uchun mobil/web self-service ilovasi.
- Mahsulot o‘lchamlarini boshqarish.
- Murakkab MRP, talab prognozi yoki avtomatik xarid rejalashtirish.
- To‘liq IoT yoki mashina telemetriyasi.
- Ko‘p valyutali boshqaruv.

## 19. MVP Scope

- Autentifikatsiya va role-based navigation.
- Master data: model, rang, material, mavsum, bosqich va stavka.
- Production stage inventory, partiya yaratish, bosqich ko‘chirish, ishchi faoliyati va nuqson qaydi.
- Ombor qoldiqlari va asosiy harakatlar.
- Mijozlar, buyurtmalar, alohida to‘lovlar va client debt.
- Xarajatlar, supplier debt, avans tasdiqlash/to‘lash, payroll hisoblash.
- Rolga mos dashboard, asosiy hisobotlar, bildirishnomalar va audit log.
- Multi-tenant data isolation va multi-factory konteksti.
- Xodimlar uchun Telegram Bot’dagi read-only xulosalar.
- Mobil responsive UI va public Factory TV dashboard.

## 20. Acceptance Criteria

MVP qabul qilinadi, agar:

1. Manager har bir mahsulotning bosqichlardagi qoldig‘ini real vaqtga yaqin ko‘ra olsa.
2. Shift Receiver 500 dona standart bilan partiya ochib, mahsulotni barcha bosqichlar bo‘ylab ko‘chira olsa.
3. Tizim manfiy stage inventory yoki ombor qoldig‘ini yaratishga yo‘l qo‘ymasa.
4. Shift Receiver xodim faoliyatini bosqich va dona bilan kirita olsa.
5. Payroll dona va tarixiy bosqich stavkasi asosida qayta hisoblanadigan bo‘lsa.
6. Seller buyurtma ochib, undan mustaqil to‘lovni qayd eta olsa.
7. Mijoz va yetkazib beruvchi qarzi aniq va alohida ko‘rinsa.
8. Avans manager tasdiqlovisiz accountant tomonidan to‘lanmasa.
9. Owner barcha dashboard va hisobotlarni ko‘ra olsa, boshqa rollar esa faqat o‘z huquqi doirasida ishlasa.
10. Muhim operatsiyalar audit log’da foydalanuvchi va vaqt bilan saqlansa.
11. Tenant foydalanuvchisi boshqa tenant ma’lumotini ko‘ra yoki o‘zgartira olmasa.
12. Factory konteksti bo‘yicha barcha operatsion ma’lumot to‘g‘ri ajratilsa.
13. Xodim Telegram Bot orqali faqat o‘zining read-only faollik va hisob-kitob xulosasini ko‘ra olsa.
