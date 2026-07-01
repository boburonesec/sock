# CI Pipeline Review v1

## Current pipeline

GitHub Actions workflow:

- installs dependencies with pnpm
- generates Prisma Client
- starts disposable PostgreSQL service
- applies Prisma migrations
- builds API
- builds Web
- builds Bot
- verifies Docker image builds
- runs `pnpm smoke:telegram`
- runs `pnpm smoke:mvp`

## Strengths

- Smoke tests no longer depend on an external `DATABASE_URL` secret.
- Telegram flow is verified independently.
- Full MVP smoke verifies core operational flows and RBAC.
- Dockerfiles are at least build-verified.
- Bot build is included.

## Risks

- CI smoke database is disposable and does not test backup/restore.
- Docker image build verification does not run containers end-to-end yet.
- No artifact publishing.
- No deployment automation.
- Prisma warns that `package.json#prisma` config is deprecated for Prisma 7.

## Future improvements

- Add Docker Compose runtime smoke in CI.
- Add artifact/image publishing only after registry policy is decided.
- Add dependency/security scanning.
- Add backup/restore rehearsal job for staging.
- Move Prisma config to `prisma.config.ts` before Prisma 7 upgrade.

## Current status

```text
CI readiness: PARTIAL -> GOOD FOR PILOT
```

CI is enough to protect MVP pilot changes, but not yet a full production
deployment pipeline.

## Local verification evidence

After the local PostgreSQL database was confirmed reachable, the following
commands were re-run successfully:

```text
pnpm api:build        PASS
pnpm bot:build        PASS
pnpm build            PASS
pnpm smoke:telegram   PASS
pnpm smoke:mvp        PASS
```

Docker verification also passed:

```text
docker compose --env-file .env.docker.example config  PASS
API Docker image build                                PASS
Web Docker image build                                PASS
Bot Docker image build                                PASS
```

One local `pnpm build` attempt without `CI=true` triggered pnpm dependency
state cleanup and failed because metadata fetch was blocked in the sandboxed
run. Re-running with `CI=true` and network access passed. This was an
environment/dependency-state issue, not an application build failure.
