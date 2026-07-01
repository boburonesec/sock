# Contributing to Paypoq OS

## Development principles

- Read `AGENTS.md` and relevant `docs/*` before changing product or architecture.
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

Run:

```bash
pnpm api:build
pnpm bot:build
pnpm build
pnpm smoke:telegram
pnpm smoke:mvp
```

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
