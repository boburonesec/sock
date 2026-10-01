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
in sync with `apps/api`. With `NODE_ENV=production` the bot refuses to start
unless the key is set (32+ characters, not the development default). Locally it
falls back to the same development default as the API.

Optional: `BOT_API_TIMEOUT_MS` (default `15000`) bounds every API call so a hung
API cannot freeze command handlers or the notification delivery loop.

## Notification delivery

In polling mode the bot also runs the operator notification worker: every 5s it
claims pending deliveries from `POST /internal/notification-deliveries/claim`,
sends them as HTML-escaped Telegram messages and acknowledges `SENT`/`FAILED`.
The API retries failures with backoff (max 8 attempts), reclaims deliveries
stranded in `PROCESSING` after the 60s lease, and skips suspended tenants.

## Run

```bash
pnpm --filter @paypoq/bot build
pnpm --filter @paypoq/bot start
```
