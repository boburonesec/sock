# Paypoq OS — Page Map v1

Status: Approved  
Version: 1.0

## Global layout

Ichki ilova `sidebar`, top navigation, asosiy kontent maydoni, notification center va user menu’dan iborat. Dark mode standart, light mode optional.

## Dashboardlar

| Yo‘l | Foydalanuvchilar | Asosiy ko‘rsatkichlar |
| --- | --- | --- |
| `/dashboard/executive` | Owner, Manager | Ishlab chiqarish, ombor, client/supplier debt, sotuv, xarajatlar |
| `/dashboard/operations` | Manager | Stage inventory, faollik, trend, bottleneck, nuqsonlar |
| `/dashboard/finance` | Accountant, Owner, Manager | Qarzdorlik, payroll, avans va xarajatlar |
| `/dashboard/sales` | Seller, Manager, Owner | Buyurtmalar, sotuv, client debt, top clients |

## Ishlab chiqarish

| Yo‘l | Vazifa |
| --- | --- |
| `/production` | Production board: stage cards, summary, batch, ko‘chirish, faoliyat va nuqson qaydi |
| `/production/stages` | Bosqich qoldiqlari va mahsulotlar kesimi |
| `/production/activities` | Ishchi faolligi va unumdorlik |
| `/production/defects` | Nuqsonlar ro‘yxati, statistikasi va tarixi |

Production sahifalari Manager va Shift Receiver uchun.

## Ombor

| Yo‘l | Vazifa |
| --- | --- |
| `/warehouse` | Tayyor mahsulot, material qoldiqlari va low-stock holati |
| `/warehouse/materials` | Material inventory va qabul qilish |
| `/warehouse/movements` | Harakatlar tarixi va tuzatishlar |
| `/warehouse/zones` | Ombor zonalari va transferlar |

Ombor sahifalari Warehouse Operator va Manager uchun.

## Sotuvlar

| Yo‘l | Vazifa |
| --- | --- |
| `/sales/clients` | Mijozlar ro‘yxati va qarz xulosasi |
| `/sales/clients/:id` | Mijoz ma’lumoti, buyurtma, to‘lov va qarz |
| `/sales/orders` | Buyurtmalar va holatlar |
| `/sales/orders/:id` | Buyurtma tafsilotlari, mahsulotlar, to‘lovlar, timeline |
| `/sales/payments` | To‘lovlar ro‘yxati |
| `/sales/debts` | Client debt va aging |

## Moliya

| Yo‘l | Vazifa |
| --- | --- |
| `/finance/expenses` | Xarajatlar va tasdiqlash |
| `/finance/advances` | Avans so‘rovlari, tasdiqlash va to‘lov |
| `/finance/payroll` | Payroll davrlari va holatlari |
| `/finance/payroll/:id` | Xodimlar bo‘yicha payroll va to‘lovlar |
| `/finance/suppliers` | Supplier directory, xarid va qarzdorlik |

## Xodimlar

| Yo‘l | Vazifa |
| --- | --- |
| `/employees` | Xodimlar ro‘yxati |
| `/employees/:id` | Faollik, bonus, jarima, avans va payroll tarixi |
| `/employees/bonuses` | Bonus yozuvlari |
| `/employees/penalties` | Jarima yozuvlari |

## Hisobotlar va sozlamalar

- Hisobotlar: `/reports/production`, `/reports/employees`, `/reports/sales`, `/reports/finance`, `/reports/warehouse`.
- Barcha hisobotlarda sana filtri, qidiruv, Excel va PDF eksport mavjud bo‘ladi.
- Sozlamalar: mahsulotlar, model, rang, material, mavsum, bosqich, salary rate, expense category, warehouse zone, threshold, role va permission.

## Umumiy ekranlar

| Yo‘l | Vazifa | Ruxsat |
| --- | --- | --- |
| `/notifications` | Bildirishnomalar feed’i | Barcha foydalanuvchilar |
| `/audit` | Audit log va filterlar | Owner, Manager |
| `/tv` | Login talab qilmaydigan, faqat o‘qish uchun Factory TV dashboard | Factory monitor |

Factory TV bugungi ishlab chiqarish, stage inventory, top workerlar va joriy maqsadlarni ko‘rsatadi.
