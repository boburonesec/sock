# Post-Deploy Smoke v1

## Script

```text
scripts/deploy-smoke.sh
```

Root script:

```bash
pnpm deploy:smoke
```

It runs:

- `pnpm smoke:telegram`
- `pnpm smoke:mvp`

The script fails fast and returns a non-zero exit code if any smoke fails.

## Deployment sequence

1. Backup database.
2. Apply migrations.
3. Build API/Web/Bot.
4. Restart API.
5. Restart Web.
6. Verify API health/readiness.
7. Restart Bot.
8. Run post-deploy smoke.

## Migration sequence

Before migration:

```bash
pnpm backup:db
```

Then:

```bash
pnpm prisma:migrate:deploy
```

Never run development migration commands against production.

## Smoke sequence

Default:

```bash
pnpm deploy:smoke
```

Against a running API:

```bash
TELEGRAM_SMOKE_BASE_URL=https://api.example.com pnpm smoke:telegram
MVP_SMOKE_BASE_URL=https://api.example.com pnpm smoke:mvp
```

## Rollback decision points

Rollback if:

- API does not become healthy
- readiness endpoint is degraded
- smoke fails on auth/RBAC
- smoke fails on core write chain
- smoke fails on payroll/sales stock consistency
- bot smoke fails while Telegram bot is enabled

Fix-forward may be acceptable only for:

- non-critical UI label issue
- documentation issue
- disabled future action display issue

## Operator rule

Do not declare a deployment successful until post-deploy smoke passes or a named
operator explicitly accepts the limitation.
