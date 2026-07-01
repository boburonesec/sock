# Secrets Rotation v1

## Scope

This document explains how to rotate:

- `JWT_ACCESS_SECRET`
- `PLATFORM_JWT_ACCESS_SECRET`
- `BOT_INTERNAL_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `DATABASE_URL` / database password

No real secret is included here.

## General rotation rules

1. Generate new secret in password manager.
2. Update production env file or secret store.
3. Restart affected services.
4. Run smoke tests.
5. Record rotation time and operator.

Do not commit secrets.

## JWT access secret

Affects:

- tenant user access tokens

Expected downtime:

- no hard downtime
- existing access tokens become invalid
- refresh/login should recover depending on session state

Steps:

```bash
pm2 stop paypoq-bot
# update JWT_ACCESS_SECRET
pm2 restart paypoq-api
pm2 restart paypoq-web
pm2 start paypoq-bot
pnpm deploy:smoke
```

Rollback:

- restore previous secret
- restart API/Web/Bot
- run smoke

## Platform JWT secret

Affects:

- platform admin access tokens

Steps:

```bash
# update PLATFORM_JWT_ACCESS_SECRET
pm2 restart paypoq-api
pnpm deploy:smoke
```

Platform admins may need to log in again.

## Bot internal API key

Affects:

- bot to API internal endpoints

Steps:

1. Update API env `BOT_INTERNAL_API_KEY`.
2. Update Bot env `BOT_INTERNAL_API_KEY`.
3. Restart API.
4. Restart Bot.
5. Run:
   ```bash
   pnpm smoke:telegram
   ```

Rollback:

- restore old key in both API and Bot env
- restart both

## Telegram bot token

Affects:

- Telegram long polling

Steps:

1. Stop Bot:
   ```bash
   pm2 stop paypoq-bot
   ```
2. Rotate token in BotFather.
3. Update `TELEGRAM_BOT_TOKEN`.
4. Start Bot:
   ```bash
   pm2 start paypoq-bot
   ```
5. Test `/start` in private chat.
6. Run `pnpm smoke:telegram` for backend bot endpoints.

Rollback:

- Telegram token rollback depends on BotFather availability; usually generate a
  fresh token instead.

## Database password

Affects:

- API database access
- migration commands
- backup scripts

Expected downtime:

- short planned maintenance window recommended

Steps:

1. Create database backup.
2. Stop Bot.
3. Stop API.
4. Change PostgreSQL password.
5. Update `DATABASE_URL`.
6. Update backup cron env.
7. Run:
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate:deploy
   ```
8. Start API.
9. Verify:
   ```bash
   curl http://localhost:3001/health/readiness
   ```
10. Start Bot.
11. Run:
   ```bash
   pnpm deploy:smoke
   ```

Rollback:

- restore previous DB password if still possible
- update `DATABASE_URL`
- restart API/Bot

## Incident rotation

If secret leak is suspected:

1. Stop affected service if risk is active.
2. Rotate immediately.
3. Invalidate sessions where applicable.
4. Run smoke.
5. Review audit logs.
6. Document incident.

## Status

```text
Secrets rotation plan: READY
Automated rotation: intentionally not implemented
```
