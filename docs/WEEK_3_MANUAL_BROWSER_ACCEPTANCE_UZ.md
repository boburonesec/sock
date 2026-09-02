# Week 3 — qo‘lda brauzer orqali qabul qilish

## Muhit va kirish

- Ilova: `http://localhost:3070`
- Manager: `manager@paypoq.local` / `ChangeMe123!`
- Accountant: `accountant@paypoq.local` / `ChangeMe123!`
- Bu ma’lumotlar faqat lokal demo fixture uchun.
- Har bir rol almashishdan oldin akkauntdan chiqing, keyin boshqa akkaunt bilan kiring.
- Ishlab chiqarish sahifasi: menyudan **Ishlab chiqarish**, URL `/production`.
- Ish haqi sahifasi: menyudan **Ish haqi**, URL `/finance/payroll`.

## Manager — smena yakuni

### 1. Qattiq to‘siq

| Role | URL/menu | Action | What I should see | PASS | FAIL | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Manager | Ishlab chiqarish | `Kechki smena`, `2026-08-10` sanasini tanlang | Holat: **Ochiq** | ☐ | ☐ | |
| Manager | Smena yakuni | `To‘xtatadigan muammolar`ni tekshiring | **Ochiq ishlab chiqarish jarayonlari**; `Yopilmagan jarayonlar soni: 1.`; keyingi qadam: `Jarayonlarni yakunlang yoki bekor qiling.` | ☐ | ☐ | |
| Manager | Smena yakuni | Tugmalarni tekshiring | **Topshirishga tayyor** bloklangan; **Qabul qilish** ham mavjud holatda ishlamaydi | ☐ | ☐ | |

### 2. Ogohlantirish va Manager tasdig‘i

| Role | URL/menu | Action | What I should see | PASS | FAIL | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Manager | Ishlab chiqarish | `Kunduzgi smena`, `2026-08-10` sanasini tanlang | Holat: **Topshirishga tayyor**; `To‘xtatadigan muammolar` — **Yo‘q** | ☐ | ☐ | |
| Manager | Smena yakuni | `Ogohlantirishlar`ni tekshiring | **Nuqsonlar nazorati**; `Shu kundagi nuqson yozuvlari: 1.`; Manager sabab bilan tasdiqlashi kerakligi ko‘rinadi | ☐ | ☐ | |
| Manager | Sabab maydoni | `Nuqson ko‘rib chiqildi, qabul qilaman` deb yozing va **Qabul qilish**ni bosing | `Smena qabul qilindi.` va holat **Qabul qilingan** | ☐ | ☐ | |

### 3. READY smenani tuzatishga qaytarish

| Role | URL/menu | Action | What I should see | PASS | FAIL | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Manager | Ishlab chiqarish | `Kunduzgi smena`, `2026-08-11` sanasini tanlang | Holat: **Topshirishga tayyor**; to‘siq va ogohlantirish yo‘q | ☐ | ☐ | |
| Manager | Smena yakuni | Sababni bo‘sh qoldirib **Tuzatishga qaytarish**ni bosing | Amal bajarilmaydi; `Kamida 3 belgili sabab yozing.` | ☐ | ☐ | |
| Manager | Sabab maydoni | `Miqdorlarni qayta tekshiring` deb yozing va **Tuzatishga qaytarish**ni bosing | `Smena tuzatishga qaytarildi.` va holat **Ochiq** | ☐ | ☐ | |

### 4. Toza READY smenani qabul qilish

| Role | URL/menu | Action | What I should see | PASS | FAIL | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Manager | Ishlab chiqarish | `Kunduzgi smena`, `2026-08-12` sanasini tanlang | Holat: **Topshirishga tayyor**; to‘siq va ogohlantirish yo‘q; tayyorlik bandlari yashil/tayyor | ☐ | ☐ | |
| Manager | Sabab maydoni | `Tekshirildi` deb yozing va **Qabul qilish**ni bosing | `Smena qabul qilindi.` va holat **Qabul qilingan** | ☐ | ☐ | |
| Manager | Smena yakuni | Tugmalarni qayta tekshiring | Qabul qilingan smenani qayta ochish/topshirish imkoni yo‘q; **Topshirishga tayyor** bloklangan | ☐ | ☐ | |

## Ish haqi — asosiy to‘lov oqimi

Tayyor davr: **2026-yil sentabr**. Boshlang‘ich holat: **Hisoblangan**, reviziya `1`, jami va qoldiq `1 000 000 so‘m`.

| Role | URL/menu | Action | What I should see | PASS | FAIL | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Manager | Ish haqi | Davrlar tarixidan `2026-yil sentabr`ni tanlang | **Hisoblangan**; `Hisob reviziyasi: 1`; `Manager tasdig‘i kutilmoqda` | ☐ | ☐ | |
| Manager | Ish haqi tafsilotlari | Tayyorlik kartalarini tekshiring | Amaldagi hisob tayyor; Manager tasdig‘i hali to‘siq sifatida ko‘rsatiladi | ☐ | ☐ | |
| Manager | Ish haqi tafsilotlari | **Manager tasdiqlaydi**ni bosing | `Manager tasdiqlagan`; joriy tasdiq reviziya `1`ga tegishli | ☐ | ☐ | |
| Accountant | Ish haqi | Chiqib, Accountant bilan kiring; shu davrni tanlang | Manager tasdig‘i ko‘rinadi; **Manager tasdiqlaydi** tugmasi yo‘q; **Xodimga to‘lov** mavjud | ☐ | ☐ | |
| Accountant | Xodimga to‘lov | `Week 3 Oylik Sinov Xodimi`ni tanlang; summani `100000`; usulni `Naqd` qoldirib tasdiqlang | Davr **Qisman to‘langan**; to‘langan `100 000`, qoldiq `900 000 so‘m`; **Davrni yopish** mavjud emas | ☐ | ☐ | |
| Accountant | Xodimga to‘lov | Shu xodimni yana tanlang; avtomatik/qoldiq summasi `900000` ekanini tekshirib tasdiqlang | Davr **To‘langan**; qoldiq `0 so‘m`; **Davrni yopish** paydo bo‘ladi | ☐ | ☐ | |
| Accountant | Ish haqi tafsilotlari | **Davrni yopish**, keyin tasdiq oynasida **Yopish**ni bosing | Davr **Yopilgan**; qayta hisoblash va to‘lov kiritish mavjud emas | ☐ | ☐ | |

## Ish haqi — qayta hisoblash tasdiqni bekor qiladi

Tayyor davr: **2026-yil oktabr**. Boshlang‘ich holat: **Hisoblangan**, reviziya `1`, jami va qoldiq `1 000 000 so‘m`.

| Role | URL/menu | Action | What I should see | PASS | FAIL | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Manager | Ish haqi | `2026-yil oktabr`ni tanlang | Reviziya `1`; Manager tasdig‘i kutilmoqda | ☐ | ☐ | |
| Manager | Ish haqi tafsilotlari | **Manager tasdiqlaydi**ni bosing | Reviziya `1` Manager tomonidan tasdiqlangan | ☐ | ☐ | |
| Accountant | Ish haqi | Accountant bilan kiring va shu davrni tanlang | Joriy Manager tasdig‘i ko‘rinadi; to‘lov mavjud | ☐ | ☐ | |
| Accountant | Ish haqi tafsilotlari | **Qayta hisoblash**ni bosing; tasdiq oynasida yana **Qayta hisoblash**ni bosing | Reviziya `2`; `Manager tasdig‘i kutilmoqda`; readiness Manager tasdig‘ini to‘siq deb ko‘rsatadi | ☐ | ☐ | |
| Accountant | Ish haqi tafsilotlari | Amal tugmalarini tekshiring | **Xodimga to‘lov** mavjud emas; eski reviziya tasdig‘i joriy hisob uchun ishlatilmaydi | ☐ | ☐ | |

## Yakun

Manager shift: ___ / 4 scenarios passed

Payroll: ___ / 2 required scenarios passed

Tester: __________

Date: __________

Final result:

WEEK 3 MANUAL PASS / FAIL
