# Paypoq OS — Page Map v1

Status: Active (aligned with shipped web routes)  
Version: 1.1  
Date: 2026-07-11

## Global layout

Ichki ilova `sidebar`, top navigation, asosiy kontent maydoni, notification bell va user menu’dan iborat. Dark mode standart, light mode optional.

Frontend route access `apps/web/src/lib/access-control.ts` orqali permission bilan cheklanadi. Backend RBAC alohida guard.

## Dashboardlar

| Yo‘l | Foydalanuvchilar (permission) | Asosiy ko‘rsatkichlar | Holat |
| --- | --- | --- | --- |
| `/dashboard/executive` | `dashboard.view` (Owner, Manager) | Ishlab chiqarish, ombor, client/supplier debt, sotuv, xarajatlar | **Shipped** |
| `/dashboard/operations` | `dashboard.view` | Stage inventory, faollik, bottleneck, nuqsonlar | **Shipped** |
| `/dashboard/finance` | — | — | **Yo‘q** — moliya KPI executive + `/finance` ichida |
| `/dashboard/sales` | — | — | **Yo‘q** — sotuv KPI executive + `/sales` ichida |

## Ishlab chiqarish

| Yo‘l | Vazifa | Holat |
| --- | --- | --- |
| `/production` | Production board: stage cards, batch, ko‘chirish, ishchi faoliyati, nuqson | **Shipped** (bitta board) |
| `/production/stages` | Alohida sahifa | **Yo‘q** — board ichida |
| `/production/activities` | Alohida sahifa | **Yo‘q** — board ichida |
| `/production/defects` | Alohida sahifa | **Yo‘q** — board ichida |
| `/machines` | Stanok, mexanik assignment, production run va output qabul | **Shipped** |
| `/mechanic` | Mexanik tasklari, inspection va quality attention | **Shipped** |

Production: Manager va Shift Receiver (`production.view` / `production.write`).

## Ombor

| Yo‘l | Vazifa | Holat |
| --- | --- | --- |
| `/warehouse` | Tayyor mahsulot qoldig‘i, low-stock, tuzatish | **Shipped** |
| `/warehouse/materials` | Material inventory va qabul | **Shipped** |
| `/warehouse/movements` | Harakatlar tarixi | **Shipped** |
| `/warehouse/zones` | Zonalar overview (read) | **Shipped** — zona→zona transfer **yo‘q** |

Ombor: Warehouse Operator va Manager (`warehouse.view` / `warehouse.write`).

## Sotuvlar

| Yo‘l | Vazifa | Holat |
| --- | --- | --- |
| `/sales` | Sotuvlar hub | **Shipped** |
| `/sales/clients` | Mijozlar ro‘yxati | **Shipped** |
| `/sales/clients/:id` | Mijoz tafsiloti (drawer/panel, route ixtiyoriy) | UI da drawer asosiy |
| `/sales/orders` | Buyurtmalar | **Shipped** |
| `/sales/orders/:id` | Buyurtma tafsiloti | UI da drawer asosiy |
| `/sales/payments` | To‘lovlar | **Shipped** |
| `/sales/debts` | Client debt | **Shipped** |

## Moliya

| Yo‘l | Vazifa | Holat |
| --- | --- | --- |
| `/finance` | Moliya hub / summary | **Shipped** |
| `/finance/expenses` | Xarajatlar workflow | **Shipped** |
| `/finance/advances` | Avanslar workflow | **Shipped** |
| `/finance/payroll` | Payroll davrlari | **Shipped** |
| `/finance/payroll/:id` | Davr itemlari | UI drawer/panel |
| `/finance/suppliers` | Supplier, xarid, qarz | **Shipped** |

## Xodimlar

| Yo‘l | Vazifa | Holat |
| --- | --- | --- |
| `/employees` | Ishbay ishchilar (dasturga kirmaydi) | **Shipped** |
| `/attendance` | Oylik kelib-ketish va yopilmagan kunlar hisoboti | **Shipped** (Trunket ingestion kutilmoqda) |
| `/employees/:id` | Tafsilot | UI drawer asosiy |
| `/employees/bonuses` | Bonus yozuvlari | **Shipped** |
| `/employees/penalties` | Jarima yozuvlari | **Shipped** |

## Hisobotlar

| Yo‘l | Holat |
| --- | --- |
| `/reports` | **Shipped** — overview + tezkor havolalar operatsion ekranlarga |
| `/reports/production` va boshqa sub-route’lar | **Yo‘q** alohida generated report sahifalari |
| Excel / PDF export | **Yo‘q** (keyingi bosqich; UI da aniq yozilgan) |

## Sozlamalar

| Yo‘l | Holat |
| --- | --- |
| `/settings` | Overview hub |
| `/settings/products` | Mahsulot + variant |
| `/settings/colors`, `/materials`, `/seasons`, `/stages` | Master data |
| `/settings/salary-rates` | Bosqich bo‘yicha ishbay stavka |
| `/settings/shifts` | DAY/NIGHT vaqti va kechki dona ustamasi |
| `/settings/expense-categories` | Xarajat kategoriyalari |
| `/settings/zones`, `/settings/thresholds` | Zona / low-stock limit |
| `/settings/roles` | Rollar (read) |
| `/settings/company` | Filiallar + operatorlar (**Owner only**) |
| `/settings/telegram` | Telegram link / account boshqaruvi |
| `/settings/product-models`, `/settings/permissions` | Navigation metadata mavjud; alohida page yo‘q yoki roles ichida |

## Umumiy ekranlar

| Yo‘l | Vazifa | Holat |
| --- | --- | --- |
| `/login` | Tenant operator login | **Shipped** |
| `/profile` | Operator akkaunt | **Shipped** |
| `/notifications` | Placeholder shell | **Shipped shell** — avtomatik feed yo‘q |
| `/audit` | Audit log | **Shipped** — faqat `audit.view` (default: Owner; Manager’da **yo‘q**) |
| `/tv` | Factory TV (login yo‘q; server-side token via `/api/factory-tv/summary`) | **Shipped** |
| `/admin/*` | Platform super-admin (alohida login) | **Shipped** |
| `/design-system` | Dev design system | **Shipped** (ichki) |

## Platform admin

| Yo‘l | Vazifa |
| --- | --- |
| `/admin/login` | Platform admin login |
| `/admin` | Admin home |
| `/admin/tenants` | Tenant ro‘yxati / yaratish |
| `/admin/tenants/:id` | Tenant detail, factory, owner, branch mode |
| `/admin/profile` | Platform admin profil |

## Mobile (Expo) — asosiy yo‘llar

| Yo‘l | Vazifa |
| --- | --- |
| Login | Operator login (tenant auth) |
| Home / activities / payroll / advances / profile | Employee self-service (linked employee) |
| Manager screens | Executive / production / warehouse / sales / finance o‘qish |

## Telegram bot

Read-only: employee salary/activity/advance/payroll; client orders/debt/payments. Private chat only. API key orqali internal endpoints.

## Manba

Amalda route ro‘yxati: `apps/web/src/app/**` va `next build` output.  
Cheklovlar: `docs/MVP_KNOWN_LIMITATIONS_V2.md`.
