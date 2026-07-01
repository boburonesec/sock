# Paypoq OS Telegram Bot

Employee and client read-only Telegram bot runtime.

## Scope v1

- `/start`
- `/help`
- `/link CODE`
- `/salary`
- `/activities`
- `/advances`
- `/payroll`
- `/orders`
- `/debt`
- `/payments`

The bot does not calculate salary, payroll, debt, or production values. It calls
the Paypoq OS API internal bot endpoints.

## Environment

```env
TELEGRAM_BOT_TOKEN=replace-with-telegram-bot-token
API_BASE_URL=http://localhost:3001
BOT_INTERNAL_API_KEY=local-development-bot-internal-api-key-change-me
```

Use a long random `BOT_INTERNAL_API_KEY` outside local development and keep it
in sync with `apps/api`.

## Run

```bash
pnpm --filter @paypoq/bot build
pnpm --filter @paypoq/bot start
```
