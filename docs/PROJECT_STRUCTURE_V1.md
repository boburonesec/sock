# Paypoq OS — Project Structure v1

Status: Active

Date: 2026-06-30

## Maqsad

Bu hujjat yangi developerga Paypoq OS repository tuzilmasini tez tushunishga
yordam beradi.

Paypoq OS monorepo sifatida yuritiladi:

```text
paypoq-os/
├── docs/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   └── shared/
├── AGENTS.md
├── package.json
└── pnpm-workspace.yaml
```

## Root daraja

### `AGENTS.md`

AI coding agentlar uchun majburiy qoidalar.

Har qanday katta o‘zgarishdan oldin o‘qilishi kerak.

### `package.json`

Root workspace scripts:

- `pnpm dev` — web dev server
- `pnpm build` — web build
- `pnpm api:dev` — API dev server
- `pnpm api:build` — API build
- `pnpm api:start` — built API start
- `pnpm prisma:generate`
- `pnpm prisma:migrate:dev`
- `pnpm prisma:migrate:deploy`
- `pnpm prisma:seed`
- `pnpm smoke:mvp`

### `pnpm-workspace.yaml`

Workspace packages:

```text
apps/*
packages/*
```

## Backend: `apps/api`

Backend NestJS modular monolith sifatida qurilgan.

```text
apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── scripts/
│   └── mvp-smoke-test.mjs
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    ├── health/
    ├── prisma/
    ├── common/
    └── modules/
```

### Backend modules

Business modules:

```text
apps/api/src/modules/
├── audit/
├── dashboard/
├── employee/
├── finance/
├── identity/
├── product/
├── production/
├── reports/
├── sales/
├── settings/
├── supplier/
└── warehouse/
```

Placeholder/future modules ham mavjud:

```text
factory/
notification/
payroll/
tenant/
```

### Yangi backend module qo‘shish qoidasi

1. Avval domain docs’ni o‘qing.
2. Module bitta aniq domain ownership’ga ega bo‘lsin.
3. Cross-domain read summary kerak bo‘lsa, read-only module bo‘lishi mumkin.
4. Business calculation backend’da bo‘lsin.
5. Write action bo‘lsa, RBAC va AuditLog talab qilinadi.
6. Tenant/factory context majburiy.
7. Prisma schema change kerak bo‘lsa, alohida review/migration task qiling.

## Frontend: `apps/web`

Frontend Next.js App Router asosida.

```text
apps/web/src/
├── app/
├── components/
├── features/
├── lib/
├── stores/
└── types/
```

### Routes

Routes `apps/web/src/app` ichida.

Asosiy route guruhlari:

```text
/dashboard/executive
/dashboard/operations
/production
/warehouse
/sales
/finance
/employees
/reports
/settings
/tv
```

### Feature folders

Business UI feature’lar:

```text
apps/web/src/features/
├── dashboard/
├── employees/
├── finance/
├── production/
├── reports/
├── sales/
├── settings/
├── tv/
└── warehouse/
```

Feature ichida odatda:

```text
components/
use-*.ts
*-module.tsx
```

bo‘ladi.

### API client

Frontend API layer:

```text
apps/web/src/lib/api/
├── client.ts
├── query-keys.ts
├── auth.ts
├── product.ts
├── production.ts
├── warehouse.ts
├── sales.ts
├── supplier.ts
├── finance.ts
├── employees.ts
├── dashboard.ts
├── settings.ts
└── reports.ts
```

Qoidalar:

- TanStack Query API state uchun ishlatiladi.
- Mutations query invalidation qilishi kerak.
- Frontend business-critical hisob-kitob qilmaydi.
- API response source-of-truth hisoblanadi.

### Reusable components

Reusable UI:

```text
apps/web/src/components/
```

Yangi primitive yaratishdan oldin mavjud componentlarni tekshiring.

## Shared package: `packages/shared`

Hozircha placeholder.

Faqat quyidagilar uchun ishlatiladi:

- shared TypeScript types
- constants
- Zod schemas
- domain enums

Quyidagilar taqiqlanadi:

- frontend components
- backend services
- Prisma/database logic

## Docs: `docs`

Docs product va engineering source-of-truth sifatida ishlatiladi.

Muhim hujjatlar:

- `DOMAIN_MODEL_V1.md`
- `DATABASE_DESIGN_REVIEW_V1.md`
- `PRISMA_SCHEMA_REVIEW_V1.md`
- `MVP_RELEASE_CANDIDATE_QA_V2.md`
- `MVP_KNOWN_LIMITATIONS_V2.md`
- `MVP_SMOKE_TEST_SUITE_V1.md`
- `MVP_PILOT_RUNBOOK_V1.md`
- `MVP_DEPLOYMENT_CHECKLIST_V1.md`
- `PRODUCT_ROADMAP_V1.md`
- `OPERATIONS_GUIDE_V1.md`

## Cleanup notes

Hozir repo’da lowercase eski product docs ham bor:

- `product-requirements.md`
- `codex-master-context-v1.md`
- `engineering-principles.md`
- `page-map-v1.md`
- `ui-specification-v1.md`

Ular tarixiy/source material sifatida foydali bo‘lishi mumkin. Shu sababli bu
stabilization pass’da o‘chirilmagan.

## Developer workflow

1. Relevant docs’ni o‘qing.
2. Scope’ni aniqlang.
3. Kichik o‘zgarish qiling.
4. Build qiling.
5. Zarur bo‘lsa smoke test qiling.
6. Changed files, assumptions, risks va test natijani report qiling.

Recommended commands:

```bash
pnpm api:build
pnpm build
pnpm smoke:mvp
```
