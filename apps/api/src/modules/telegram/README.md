# Telegram Module

Purpose:

- create short-lived Telegram link tokens for employees and clients
- keep raw link codes out of database storage
- prepare future read-only Telegram bot linking

Current v1 scope:

- `POST /telegram/link-tokens/employees/:employeeId`
- `POST /telegram/link-tokens/clients/:clientId`
- `GET /telegram/link-tokens`
- `GET /telegram/accounts`
- `GET /telegram/health`
- `POST /telegram/bot/link`
- `POST /telegram/bot/unlink`
- `GET /telegram/bot/me`
- `GET /telegram/bot/employee/salary`
- `GET /telegram/bot/employee/activities`
- `GET /telegram/bot/employee/advances`
- `GET /telegram/bot/employee/payroll`
- `GET /telegram/bot/client/orders`
- `GET /telegram/bot/client/debt`
- `GET /telegram/bot/client/payments`
- `POST /telegram/accounts/:id/block`

Not implemented yet:

- Telegram webhook deployment
- manager/owner Telegram summaries
- unblock policy and endpoint

Security notes:

- raw codes are returned once only
- `codeHash` is HMAC-SHA256 using `TELEGRAM_LINK_TOKEN_SECRET`
- old unexpired tokens for the same target are marked used before creating a
  new token, because v1 schema has no separate `invalidatedAt`
- bot internal endpoints require `x-bot-api-key`
- bot endpoint responses are scoped to the linked Telegram employee/client
  account
- `/telegram/accounts` masks `telegramUserId` and does not expose
  `telegramChatId`
- `/telegram/health` is protected by tenant auth + `settings.view`; it returns
  tenant-scoped counts and readiness checks only
- `/telegram/bot/link` uses an in-memory per-telegram-user/chat limiter for
  MVP brute-force protection; it resets on API restart
- `/telegram/accounts/:id/block` requires `settings.write`
