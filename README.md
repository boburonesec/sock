# Paypoq OS

Paypoq OS — paypoq fabrikalari uchun qurilayotgan Manufacturing Operations
Platform. Bu generic ERP emas, to‘liq buxgalteriya tizimi emas va V1’da IoT
platforma emas.

Tizimning markaziy g‘oyasi:

- ishlab chiqarishni bosqich inventari orqali ko‘rish
- ishchi faolligini hisobga olish
- ombor qoldiqlarini yuritish
- sotuv, to‘lov va client qarzini boshqarish
- supplier qarzini boshqarish
- payroll hisob-kitobini backend’da qilish
- owner/manager uchun tezkor dashboardlar berish

## Monorepo tuzilmasi

```text
paypoq-os/
├── docs/              # Product, QA, runbook va roadmap hujjatlari
├── apps/
│   ├── api/           # NestJS + Prisma backend
│   ├── bot/           # Telegram employee/client read-only bot
│   ├── mobile/        # Expo React Native mobile foundation
│   └── web/           # Next.js App Router frontend
├── packages/
│   └── shared/        # Kelajakdagi shared types/constants/schemas
├── AGENTS.md          # AI agentlar uchun doimiy qoidalar
├── package.json       # Root workspace scripts
└── pnpm-workspace.yaml
```

## apps/api vazifasi

`apps/api` — Paypoq OS backend’i.

Stack:

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- local email/password auth
- JWT access token + HttpOnly refresh cookie
- RBAC permissions
- AuditLog

Backend’da saqlanadigan asosiy narsa:

- tenant/factory context
- product master data
- production stage inventory
- warehouse stock
- sales orders/payments/debts
- supplier purchases/payments/debts
- payroll snapshots
- dashboard summary calculations

Muhim qoida: debt, stock total, payroll, salary, finance va dashboard KPI kabi
business-critical hisob-kitoblar frontend’da emas, backend’da bajariladi.

## apps/web vazifasi

`apps/web` — Paypoq OS frontend’i.

Stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui style primitives
- Zustand for UI/session state
- TanStack Query for API state
- React Hook Form + Zod for forms

Frontend:

- Uzbek-first
- dark-mode-first
- factory operator-friendly
- API qiymatlarini render qiladi
- business-critical hisob-kitoblarni source-of-truth sifatida bajarmaydi

## apps/bot vazifasi

`apps/bot` — Telegram orqali employee va clientlar uchun read-only yordamchi bot.

Bot:

- employee uchun salary/activity/advance/payroll ma’lumotlarini ko‘rsatadi
- client uchun orders/debt/payments ma’lumotlarini ko‘rsatadi
- faqat private chatda sensitive data chiqaradi
- business-critical qiymatlarni o‘zi hisoblamaydi
- Paypoq OS API’dagi internal bot endpointlarni `BOT_INTERNAL_API_KEY` bilan chaqiradi

## apps/mobile vazifasi

`apps/mobile` — Paypoq Mobile uchun Expo React Native foundation.

Mobile:

- mavjud `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` va `GET /auth/me` APIlarini ishlatadi
- Expo Router bilan auth/protected route guard beradi
- TanStack Query’ni backend data uchun tayyorlaydi
- Zustand’dan faqat auth va UI state uchun foydalanadi
- token session metadatasini Expo SecureStore’da saqlaydi
- business-critical qiymatlarni hisoblamaydi
- V1’da FaceID, IoT, offline writes, push notification va client mobile auth o‘zgarishlarini kiritmaydi

## packages/shared vazifasi

`packages/shared` hozircha minimal placeholder.

Kelajakda faqat quyidagilar uchun ishlatiladi:

- shared TypeScript types
- shared constants
- shared Zod schemas
- shared domain enums

Bu yerga frontend component, backend service yoki database logic qo‘yilmaydi.

## Talablar

- Node.js
- pnpm
- PostgreSQL

## O‘rnatish

Repository root’dan:

```bash
pnpm install
```

## Environment sozlash

### API

`apps/api/.env.example` dan nusxa oling:

```bash
cp apps/api/.env.example apps/api/.env
```

Kerakli env qiymatlar:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/paypoq_os?schema=public
CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=replace-with-long-random-secret
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
AUTH_COOKIE_NAME=paypoq_refresh_token
FACTORY_TV_ACCESS_TOKEN=replace-with-long-random-factory-tv-display-token
```

Local development uchun misol:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/paypoq_os?schema=public
```

### Web

`apps/web/.env.local` yarating:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN=replace-with-same-factory-tv-display-token
```

### Telegram bot

Pilot bot uchun:

```env
TELEGRAM_BOT_TOKEN=replace-with-telegram-bot-token
API_BASE_URL=http://localhost:3001
BOT_INTERNAL_API_KEY=replace-with-same-secret-as-api
```

`BOT_INTERNAL_API_KEY` qiymati `apps/api/.env` va bot runtime muhitida bir xil
bo‘lishi kerak.

### Mobile

Mobile API URL Expo public env orqali beriladi:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Runtime bo‘yicha backend manzili:

- iOS simulator: `http://localhost:3001`
- Android emulator: `http://10.0.2.2:3001`
- Real device: `http://YOUR_COMPUTER_LAN_IP:3001`

## Database setup

Prisma Client generate:

```bash
pnpm prisma:generate
```

Local development migration:

```bash
pnpm prisma:migrate:dev
```

Pilot/staging-style database uchun:

```bash
pnpm prisma:migrate:deploy
```

Demo/baseline seed:

```bash
pnpm prisma:seed
```

Seed quyidagilarni yaratadi:

- Demo tenant
- Main Factory
- Main Warehouse
- warehouse zones
- permissions
- roles
- default production stages
- demo Owner user
- limited-role demo users for RBAC smoke testing

Demo login:

```text
LOCAL DEVELOPMENT ONLY
Email: owner@paypoq.local
Password: ChangeMe123!
```

Limited-role local demo users:

```text
manager@paypoq.local
seller@paypoq.local
warehouse@paypoq.local
shift@paypoq.local
accountant@paypoq.local

Password: ChangeMe123!
```

## Development run

API:

```bash
pnpm api:dev
```

Web:

```bash
pnpm dev
```

Telegram bot:

```bash
pnpm bot:dev
```

Open:

```text
http://localhost:3000/login
```

API health:

```bash
curl http://localhost:3001/health
```

## Build

API build:

```bash
pnpm api:build
```

Web build:

```bash
pnpm build
```

Built API:

```bash
pnpm api:start
```

Built Web:

```bash
pnpm start
```

Built Telegram bot:

```bash
pnpm bot:build
pnpm bot:start
```

## Docker local/pilot runtime

Docker Compose orqali PostgreSQL, API, Web va Botni ko‘tarish bo‘yicha qo‘llanma:

- `docs/DOCKER_DEPLOYMENT_V1.md`

Qisqa start:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d postgres
docker compose --env-file .env.docker --profile migrate run --rm migrate
docker compose --env-file .env.docker up -d api web bot
```

## MVP smoke test

Automated smoke suite:

```bash
pnpm smoke:mvp
```

Bu command API build qiladi, seedni idempotent yuritadi, local API serverni
ko‘taradi va asosiy MVP flow hamda RBAC matrix’ni isolated test data bilan
tekshiradi.

Agar API allaqachon ishlayotgan bo‘lsa:

```bash
MVP_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:mvp
```

Smoke test hujjati:

- `docs/MVP_SMOKE_TEST_SUITE_V1.md`
- `docs/CI_AND_RBAC_HARDENING_V1.md`

Telegram subsystem smoke:

```bash
pnpm smoke:telegram
```

Bu command real Telegram bot token talab qilmaydi; backend internal bot flowlarni
synthetic Telegram user ID bilan tekshiradi.

Post-deploy smoke:

```bash
pnpm deploy:smoke
```

Bu command deploymentdan keyin `smoke:telegram` va `smoke:mvp`ni ketma-ket
yuritadi va xato bo‘lsa fail-fast qiladi.

## Production operations

Operational scripts:

```bash
pnpm backup:db
pnpm restore:db path/to/backup.dump
pnpm deploy:smoke
```

Production hardening hujjatlari:

- `docs/BACKUP_AND_RECOVERY_V1.md`
- `docs/BACKUP_SCHEDULER_V1.md`
- `docs/PROCESS_SUPERVISION_V1.md`
- `docs/PM2_PRODUCTION_DEPLOYMENT_V1.md`
- `docs/SECRETS_MANAGEMENT_V1.md`
- `docs/SECRETS_ROTATION_V1.md`
- `docs/OBSERVABILITY_V1.md`
- `docs/UPTIME_MONITORING_V1.md`
- `docs/POST_DEPLOY_SMOKE_V1.md`
- `docs/PRODUCTION_OPERATIONS_AUDIT_V1.md`
- `docs/PRODUCTION_GO_NO_GO_V2.md`
- `docs/REAL_FACTORY_DEPLOYMENT_RUNBOOK_V1.md`
- `docs/PRODUCTION_ACCEPTANCE_V1.md`
- `docs/PRODUCTION_GO_NO_GO_V3.md`

## Asosiy modullar

- Auth/RBAC
- Settings / Product master data
- Employees
- Production
- Warehouse
- Sales
- Supplier finance
- Payroll
- Dashboards
- Reports overview
- Factory TV
- Telegram Bot

## Muhim cheklovlar

MVP demo va controlled pilot uchun tayyor, lekin keng production rollout uchun
hali quyidagilar yetishmaydi:

- automated backup scheduler and off-server retention
- monitored restore rehearsal ownership
- production monitoring/alert ownership
- audit browsing UI
- supplier payment reversal
- production movement correction
- material receipt correction
- partial delivery/return
- invoice/print flow
- full accounting ledger
- IoT integration

To‘liq ro‘yxat:

- `docs/MVP_KNOWN_LIMITATIONS_V2.md`

## Pilot hujjatlari

- `docs/MVP_PILOT_RUNBOOK_V1.md`
- `docs/MVP_DEPLOYMENT_CHECKLIST_V1.md`
- `docs/MVP_DEMO_SCRIPT_V2.md`
- `docs/TELEGRAM_BOT_RUNBOOK_V1.md`
- `docs/TELEGRAM_BOT_PILOT_QA_V1.md`
- `docs/TELEGRAM_BOT_DEPLOYMENT_HARDENING_V1.md`
- `docs/TELEGRAM_PLATFORM_COMPLETE_QA_V1.md`

## Project structure va roadmap

- `docs/PROJECT_STRUCTURE_V1.md`
- `docs/PRODUCT_ROADMAP_V1.md`
- `docs/OPERATIONS_GUIDE_V1.md`
- `docs/CI_PIPELINE_REVIEW_V1.md`
- `docs/GITHUB_REPOSITORY_READINESS_V1.md`
- `docs/PRODUCTION_READINESS_AUDIT_V1.md`
- `docs/PRODUCTION_GO_NO_GO_V1.md`
- `docs/PRODUCTION_OPERATIONS_AUDIT_V1.md`
- `docs/PRODUCTION_GO_NO_GO_V2.md`

## AI agentlar uchun

Kod yozishdan oldin:

- `AGENTS.md`
- relevant `docs/*`

o‘qilishi kerak.

Golden rule:

```text
Do not build a generic ERP.
Build Paypoq OS according to the product specification.
```
