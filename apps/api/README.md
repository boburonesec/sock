# Paypoq OS API

NestJS modular-monolith API foundation for Paypoq OS.

## Current foundation

- environment configuration and validation
- global `ValidationPipe`
- CORS configuration
- `GET /health`
- Prisma configuration and generated Prisma Client
- Core, master-data, read-model, and auth foundation Prisma schema

The current schema includes tenant/factory/warehouse context, identity
relations, local auth credential/session tables, product catalogue master data,
production-stage configuration, salary-rate configuration, expense categories,
low-stock thresholds, read snapshots, and transaction tables.

The API now includes local auth, request context, RBAC guards, read endpoints,
and MVP write flows for product setup, employees, production, warehouse, sales,
supplier, and payroll.

## Local environment

Copy `.env.example` to `.env` and configure the values for your local setup.

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/paypoq_os?schema=public
CORS_ORIGIN=http://localhost:3000
JWT_ACCESS_SECRET=local-development-jwt-secret-change-me
AUTH_COOKIE_NAME=paypoq_refresh_token
PLATFORM_JWT_ACCESS_SECRET=local-development-platform-jwt-secret-change-me
PLATFORM_AUTH_COOKIE_NAME=paypoq_platform_refresh_token
TELEGRAM_LINK_TOKEN_SECRET=local-development-telegram-link-token-secret-change-me
```

`DATABASE_URL` must point to a local PostgreSQL database before running a
migration or opening Prisma Studio. It follows this format:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

Do not commit `.env` credentials. `.env.example` is the safe template.

## Development seed

The development seed creates baseline tenant/factory/master-data records and one
LOCAL DEVELOPMENT ONLY owner auth user:

```text
Email: owner@paypoq.local
Password: ChangeMe123!
Role: Owner
Factory access: Main Factory
```

It also creates limited-role local users for RBAC smoke testing:

```text
manager@paypoq.local
seller@paypoq.local
warehouse@paypoq.local
shift@paypoq.local
accountant@paypoq.local

Password: ChangeMe123!
Factory access: Main Factory
```

The demo password is stored only as a hash in `UserCredential`. The seed uses
`argon2` with the library defaults, which currently produce Argon2id hashes.
Argon2 was chosen over bcrypt because it is the stronger modern default for
password hashing and matches the approved Paypoq OS auth design.

The seed also creates one LOCAL DEVELOPMENT ONLY platform admin for future
SaaS-owner workflows:

```text
Email: platform@paypoq.local
Password: ChangeMe123!
Status: ACTIVE
```

The platform admin is stored in `PlatformAdmin` and uses
`PlatformAdminCredential`. It is intentionally separate from tenant `User` and
tenant `UserCredential`.

## Local auth smoke test

Auth endpoints are backend-only at this stage. The frontend is not connected to
auth yet.

Login with the LOCAL DEVELOPMENT ONLY seeded owner:

```bash
curl -i -c /tmp/paypoq-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@paypoq.local","password":"ChangeMe123!"}' \
  http://localhost:3001/auth/login
```

Use the returned `accessToken` for `/auth/me`:

```bash
curl -H "Authorization: Bearer ACCESS_TOKEN_FROM_LOGIN" \
  http://localhost:3001/auth/me
```

Refresh rotates the HttpOnly refresh cookie:

```bash
curl -i -b /tmp/paypoq-cookies.txt -c /tmp/paypoq-cookies.txt \
  -X POST http://localhost:3001/auth/refresh
```

Logout revokes the current refresh session:

```bash
curl -i -b /tmp/paypoq-cookies.txt -c /tmp/paypoq-cookies.txt \
  -X POST http://localhost:3001/auth/logout
```

## Platform auth smoke test

Platform auth is backend-only at this stage. It is separate from tenant auth and
does not create tenant provisioning endpoints yet.

Login with the LOCAL DEVELOPMENT ONLY platform admin:

```bash
curl -i -c /tmp/paypoq-platform-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"platform@paypoq.local","password":"ChangeMe123!"}' \
  http://localhost:3001/platform-auth/login
```

Use the returned `accessToken` for `/platform-auth/me`:

```bash
curl -H "Authorization: Bearer PLATFORM_ACCESS_TOKEN_FROM_LOGIN" \
  http://localhost:3001/platform-auth/me
```

Refresh rotates the platform HttpOnly refresh cookie:

```bash
curl -i -b /tmp/paypoq-platform-cookies.txt -c /tmp/paypoq-platform-cookies.txt \
  -X POST http://localhost:3001/platform-auth/refresh
```

Logout revokes the current platform refresh session:

```bash
curl -i -b /tmp/paypoq-platform-cookies.txt -c /tmp/paypoq-platform-cookies.txt \
  -X POST http://localhost:3001/platform-auth/logout
```

## Prisma workflow

The API package name is `@paypoq/api`, so run these commands from the monorepo
root:

```bash
pnpm --filter @paypoq/api prisma:generate
pnpm --filter @paypoq/api prisma:migrate:dev
pnpm --filter @paypoq/api prisma:migrate:deploy
pnpm --filter @paypoq/api prisma:studio
```

Equivalent root scripts are also available:

```bash
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm prisma:migrate:deploy
pnpm prisma:studio
```

`prisma:generate` only generates the typed Prisma Client. `prisma:migrate:dev`
changes a database and creates migration files, so it must be run only with an
approved local `DATABASE_URL`. `prisma:migrate:deploy` applies existing
migrations and is the safer command for pilot/staging-style environments. Do
not create new migrations or seed data without explicit approval.

## Development commands

```bash
pnpm api:dev
pnpm api:build
pnpm api:start
```

## MVP smoke test

From the monorepo root:

```bash
pnpm smoke:mvp
```

See `docs/MVP_SMOKE_TEST_SUITE_V1.md` for details.
