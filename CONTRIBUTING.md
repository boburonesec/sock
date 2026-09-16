# Contributing to Paypoq OS

## Development principles

- Read `AGENTS.md` (canonical agent + contributor rules) and relevant `docs/*`
  before changing product or architecture. Release/rollback procedure lives in
  `docs/RELEASE_RUNBOOK_V1.md`.
- Keep Paypoq OS focused on sock factory operations.
- Do not add generic ERP, IoT, mobile, FaceID, or accounting-ledger scope unless
  explicitly approved.
- Keep business-critical calculations in the backend.
- Keep frontend and Telegram bot read/write behavior aligned with API rules.

## Local setup

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm prisma:seed
pnpm api:dev
pnpm dev
```

Telegram bot:

```bash
pnpm bot:dev
```

## Before opening a pull request

Static checks (always):

```bash
pnpm --filter @paypoq/api typecheck
pnpm --filter @paypoq/web lint
pnpm api:build
pnpm bot:build
pnpm build
```

API smoke (needs a local database):

```bash
pnpm smoke:telegram
pnpm smoke:mvp
```

If you touched deployment, seeding, migrations, health routes, CORS or API URL
resolution, also run the production-hardening gate — it enforces the release
invariants in `AGENTS.md` §7:

```bash
pnpm test:prod-hardening
```

Browser acceptance suites (`scripts/*acceptance*.mjs`) must run against a
**production web build and standalone server**, never a long-lived `next dev`
server — see `AGENTS.md` §9 for the exact procedure and why.

If a smoke test requires a local database, ensure `apps/api/.env` points to a
local/dev PostgreSQL database, not production.

## Branching

Recommended branch names:

- `feature/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- `infra/<short-name>`

Keep PRs small and focused.

## Reporting changes

Every meaningful task should report:

- implemented work
- changed files
- architecture decisions
- risks and edge cases
- what was intentionally not implemented
- build/test result
