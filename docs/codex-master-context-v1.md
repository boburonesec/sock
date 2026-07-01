# Paypoq OS — Codex Master Context v1.0

Status: Active  
Source of truth: Product Specification v1.0

## Product boundary

Paypoq OS — paypoq fabrikalari uchun Manufacturing Operations Platform. U production, warehouse, sales, operational finance, employees, payroll va reports’ni bitta platformada boshqaradi.

U generic ERP, buxgalteriya tizimi yoki IoT platformasi emas. Birinchi versiya operatsion ko‘rinish va jarayon boshqaruviga qaratilgan.

## Non-negotiable business model

- Eng muhim metrka: **Stage Inventory** — har bir bosqichdagi hozirgi mahsulot soni.
- Batch reporting birligi emas; u faqat traceability va audit uchun ishlatiladi.
- Ishlab chiqarish ma’lumotini Shift Receiver qo‘lda kiritadi.
- Ishchilar web-ilovaga kirmaydi; ular Factory TV va Telegram Bot’dan foydalanadi.
- Default batch size 500, lekin sozlanadi.

## Default production flow

`Averlog → Dazmol → Sifat → Kiydirish → Par Dazmol → Parlash → Bezak → Etiketka → Qadoqlash → Ombor`

Bosqichlar sozlanadi, ammo har bir harakat stage inventory’ni aniq va audit qilinadigan tarzda yangilaydi.

## Data and finance rules

- Product: model + variant; variant attributes: color, material, season. MVP’da size yo‘q.
- Variant default narxni override qilishi mumkin. Buyurtma tarixiy narxni saqlaydi.
- Client debt = tasdiqlangan buyurtmalar jami − qabul qilingan to‘lovlar jami. Qarzni qo‘lda tahrirlash mumkin emas.
- Supplier debt = xaridlar jami − supplier to‘lovlari jami. Qarzni qo‘lda tahrirlash mumkin emas.
- Payroll worker activity, bonus, penalty va advance’dan hosil qilinadi; tarixiy rate saqlanishi kerak.
- Nuqson ixtiyoriy manager qarori bilan jarimaga olib kelishi mumkin.

## Tenant and factory isolation

Tenant — kompaniya. Tenant o‘z factory, employee, product, order, warehouse va finance ma’lumotlariga egalik qiladi. Cross-tenant access mutlaqo taqiqlanadi.

Tenant bir nechta factory’ga ega bo‘lishi mumkin. Foydalanuvchi single-factory yoki ruxsat bo‘lsa combined view’da ishlaydi. MVP bir asosiy warehouse bilan qulay ishlaydi, biroq data model bir nechta warehouse’ni qo‘llab-quvvatlaydi.

## Technical direction

- Modular monolith
- PostgreSQL
- Explicit business logic va simple CRUD
- Microservice, CQRS, Event Sourcing, workflow engine hamda erta optimallashtirish yo‘q

## Product success

Muvaffaqiyat: menejerlar spreadsheet’dan chiqadi; production, warehouse, client debt, supplier debt va payroll ko‘rinadi; kundalik ish platformada yuradi; owner factory holatini tez ko‘ra oladi.
