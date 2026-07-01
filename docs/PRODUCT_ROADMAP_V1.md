# Paypoq OS — Product Roadmap v1

Status: Proposed

Date: 2026-06-30

## Maqsad

Bu roadmap Paypoq OS’ni MVP’dan pilot va keyingi SaaS bosqichlariga olib
chiqish uchun yo‘nalish beradi.

Roadmap prinsiplar:

- Business first
- MVP first
- Operator-friendly
- Backend-owned business calculations
- No generic ERP
- No premature IoT
- No overengineering

## Phase 1 — Current MVP

Maqsad:

Paypoq fabrikasi uchun asosiy operational chain’ni ishlatib ko‘rsatish.

Mavjud:

- Auth/RBAC
- Product master data
- Product catalog / variant / price
- Employees
- Salary rates
- Production batch
- Stage movement
- Worker activity
- Defect record
- Finished product receipt
- Material receipt
- Stock correction
- Client/order/payment
- Delivery
- Delivery return
- Sales payment reversal
- Supplier purchase/payment
- Payroll calculate/pay/close
- Executive / Operations / Sales / Finance / Warehouse dashboards
- Factory TV
- MVP smoke test suite

Natija:

Controlled demo va pilot validation uchun yetarli.

## Phase 2 — Pilot Hardening

Maqsad:

Real factory pilotda ishonchlilikni oshirish.

Prioritetlar:

1. Automated CI smoke pipeline.
2. Limited-role seed users va `403` RBAC tests.
3. Audit browsing UI.
4. Supplier payment reversal.
5. Production movement correction.
6. Material receipt correction.
7. Expense write workflow.
8. Better backup/restore automation.
9. Concurrency testing for stock/payment flows.
10. Basic monitoring/logging.

Bu bosqichda hali ham:

- microservices yo‘q
- Kafka yo‘q
- CQRS/event sourcing yo‘q
- generic ERP module yo‘q

## Phase 3 — Telegram Bot

Maqsad:

Oddiy userlar uchun eng qulay self-service kanal yaratish.

Telegram bot V1 read-only bo‘lishi kerak.

### Employee use cases

Ishchilar Telegram orqali ko‘ra oladi:

- bugungi faollik
- oylik faollik
- hisoblangan oylik
- to‘langan/qoldiq
- avanslar
- bonuslar
- jarimalar
- payroll status

Muhim:

- Ishchilar web app ishlatmaydi.
- Shift Receiver production data kiritishda davom etadi.
- Bot faqat ko‘rish va xabardor qilish uchun boshlanadi.

### Client use cases

Clientlar Telegram orqali ko‘ra oladi:

- buyurtmalar
- buyurtma statusi
- qarz
- to‘lovlar
- oxirgi payment tarixi

### Telegram auth/linking

Alohida design kerak:

- phone-based linking
- one-time code
- tenant/client/employee mapping
- unlink flow
- security/rate limiting

Bot write action’lari keyingi bosqichda ko‘rib chiqiladi.

## Phase 4 — Mobile App

Maqsad:

Manager/operator uchun tezkor mobile access.

### Manager mobile use cases

- dashboard KPIs
- stage inventory
- bottleneck alerts
- client debt
- supplier debt
- pending approvals

### Operator mobile use cases

- warehouse quick check
- stock movement review
- production visibility
- simple alerts

### Employee self-service mobile

Keyinroq:

- salary/activity view
- payroll status
- advance status

Avval Telegram bot yetarli bo‘lishi mumkin.

### Technical direction

- Backend API’larni reuse qilish.
- Mobile uchun business logic duplicate qilmaslik.
- Offline-first faqat real factory feedback talab qilsa.

## Phase 5 — Super-admin / SaaS Owner Panel

Maqsad:

Paypoq OS operatori/SaaS owner uchun organization va factorylarni boshqarish.

Factory app permissions’dan alohida bo‘lishi kerak.

Super-admin UI:

- organization/tenant yaratish
- factory yaratish
- owner user yaratish
- manager user yaratish
- subscription/status boshqarish
- tenant health ko‘rish
- active users count
- basic usage metrics
- support/debug view

Muhim:

- Super-admin factory business data’ga ehtiyotkorlik bilan access qiladi.
- Tenant isolation buzilmasligi kerak.
- Super-admin permission modeli factory RBAC’dan alohida design qilinadi.

## Phase 6 — Multi-tenant Production Readiness

Maqsad:

Bir nechta real organization/factory bilan production-ready ishlash.

Kerak bo‘ladi:

- tenant onboarding flow
- stronger tenant isolation tests
- backups per environment
- migration runbook
- monitoring/alerting
- audit browsing
- rate limiting
- security review
- disaster recovery test
- support tools
- data export policy

Potential infra:

- managed PostgreSQL
- object storage only when real files appear
- Redis only if session/rate-limit/cache need is proven

Hali ham:

- microservices faqat real scale sabab bo‘lsa
- Kafka faqat event volume/asynchronous integration talab qilsa
- IoT faqat V2+ real machine integration paydo bo‘lsa

## Recommended next milestone

Eng yaxshi keyingi qadam:

```text
Pilot hardening:
CI smoke pipeline + limited-role RBAC tests + audit browsing UI
```

Sabab:

MVP business flow bor. Endi pilot ishonchliligi va supportability kuchaytirilishi
kerak.
