# Process Supervision v1

## Recommendation

Recommended MVP pilot approach: PM2.

Reason:

- Paypoq OS API, Web, and Bot are Node.js processes.
- PM2 gives restart policy, logs, and process listing with one repo-level config.
- It is simpler than writing and installing three separate systemd unit files.
- Docker Compose remains available for container-based deployments.

Systemd can be added later when the server operations model is stable.

## Config

File:

```text
configs/pm2.ecosystem.config.cjs
```

Processes:

- `paypoq-api`
- `paypoq-web`
- `paypoq-bot`

Important:

- `paypoq-bot` runs with `instances: 1`.
- Telegram long polling must never run with multiple bot instances for the same
  token.

## Environment loading

The PM2 config reads:

```text
.env.production
```

or a custom path:

```bash
PAYPOQ_ENV_FILE=/secure/path/paypoq.env pm2 start configs/pm2.ecosystem.config.cjs
```

Do not commit production env files.

If `pnpm` is not on the PM2 runtime `PATH`, set:

```bash
PAYPOQ_PNPM_BIN=/absolute/path/to/pnpm
```

## Local run

Development:

```bash
pnpm api:dev
pnpm dev
pnpm bot:dev
```

PM2-style local run after build:

```bash
pnpm api:build
pnpm build
pnpm bot:build
pm2 start configs/pm2.ecosystem.config.cjs
```

## Production deployment sequence

1. Pull release code.
2. Install dependencies:
   ```bash
   pnpm install --frozen-lockfile
   ```
3. Generate Prisma Client:
   ```bash
   pnpm prisma:generate
   ```
4. Backup database:
   ```bash
   pnpm backup:db
   ```
5. Apply migrations:
   ```bash
   pnpm prisma:migrate:deploy
   ```
6. Build:
   ```bash
   pnpm api:build
   pnpm build
   pnpm bot:build
   ```
7. Restart API and Web first:
   ```bash
   pm2 restart paypoq-api paypoq-web
   ```
8. Verify API health:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/health/readiness
   ```
9. Restart Bot last:
   ```bash
   pm2 restart paypoq-bot
   ```
10. Run post-deploy smoke:
   ```bash
   pnpm deploy:smoke
   ```

## Restart behavior

PM2 config:

- restarts crashed processes
- limits restart loops
- allows graceful shutdown window
- keeps bot as one process

## Smoke after deploy

Run:

```bash
pnpm deploy:smoke
```

If smoke fails:

1. Stop Bot.
2. Inspect API logs.
3. Decide rollback or fix-forward.
4. Do not continue using the release blindly.

## Rollback procedure

1. Stop Bot.
2. Roll back Web if only UI is affected.
3. Roll back API if API behavior is affected.
4. Restore DB only if migration/data change caused corruption and a known-good
   backup exists.
5. Run post-rollback smoke.

## Limitations

- PM2 does not replace backup/restore.
- PM2 does not provide distributed monitoring.
- PM2 process list must be managed by exactly one operator on the pilot server.
