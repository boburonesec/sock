# Docker Deployment v1

## Scope

This document describes Docker-based local/pilot runtime for:

- `apps/api`
- `apps/web`
- `apps/bot`
- PostgreSQL

This is not Kubernetes, ArgoCD, or full deployment automation.

## Added Docker artifacts

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/bot/Dockerfile`
- `docker-compose.yml`
- `.env.docker.example`
- `.dockerignore`

## Verification result

Last checked for Phase 2 release readiness:

```text
docker compose --env-file .env.docker.example config  PASS
docker build -f apps/api/Dockerfile                  PASS
docker build -f apps/web/Dockerfile                  PASS
docker build -f apps/bot/Dockerfile                  PASS
```

Important implementation note:

- API Docker image installs OpenSSL because Prisma needs the matching OpenSSL
  runtime in Debian slim images.
- API runtime currently copies generated build-stage `node_modules` to preserve
  Prisma Client artifacts reliably under pnpm workspace layout. This is safe for
  pilot verification, but image slimming with `pnpm deploy` or an equivalent
  production packaging strategy can be optimized later.

## Runtime architecture

```text
Browser -> Web container -> API URL
Bot process -> API internal bot endpoints
API -> PostgreSQL
```

The bot does not connect directly to PostgreSQL.

## Local Docker setup

1. Copy env example:

```bash
cp .env.docker.example .env.docker
```

2. Edit secrets in `.env.docker`.

Use long random values for:

- `JWT_ACCESS_SECRET`
- `PLATFORM_JWT_ACCESS_SECRET`
- `TELEGRAM_LINK_TOKEN_SECRET`
- `BOT_INTERNAL_API_KEY`
- `TELEGRAM_BOT_TOKEN`

3. Build containers:

```bash
docker compose --env-file .env.docker build
```

4. Start PostgreSQL:

```bash
docker compose --env-file .env.docker up -d postgres
```

5. Apply migrations:

```bash
docker compose --env-file .env.docker --profile migrate run --rm migrate
```

6. Start API/Web/Bot:

```bash
docker compose --env-file .env.docker up -d api web bot
```

## Pilot deployment flow

Recommended pilot order:

1. Build images.
2. Start/verify PostgreSQL.
3. Run migrations once.
4. Start API.
5. Verify API health.
6. Start Web.
7. Start Bot as a single instance.
8. Run smoke tests from host or CI.

## Migrate workflow

Migration is intentionally separate from API startup.

Reason:

- safer production behavior
- avoids multiple API replicas racing migrations
- gives operator explicit control

Command:

```bash
docker compose --env-file .env.docker --profile migrate run --rm migrate
```

## Seed workflow

Baseline seed is for development/demo/pilot setup only.

Host command:

```bash
pnpm prisma:seed
```

Inside Docker, use one-off API image if needed:

```bash
docker compose --env-file .env.docker run --rm api node -r ts-node/register apps/api/prisma/seed.ts
```

For real production, seed should be used cautiously and only for required master
data/bootstrap users.

## Smoke workflow

Host smoke:

```bash
pnpm smoke:telegram
pnpm smoke:mvp
```

Against an already running Docker API:

```bash
TELEGRAM_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:telegram
MVP_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:mvp
```

## Rollback approach

Fast rollback:

1. Stop bot first if Telegram behavior is affected.
2. Roll web image back if UI is affected.
3. Roll API image back if API behavior is affected.
4. Restore database from backup only if data migration caused irreversible
   damage.

Important:

- database backup must exist before applying production migrations
- schema rollback is not automatic
- smoke tests should run after rollback

## Production notes

- Use HTTPS in front of Web/API.
- Use strong secrets, not `.env.docker.example` defaults.
- Run exactly one long-polling bot instance per Telegram token.
- Configure database backups outside Compose.
- Add log retention/monitoring before broad rollout.
