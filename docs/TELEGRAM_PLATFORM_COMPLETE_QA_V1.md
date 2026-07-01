# Telegram Platform Complete QA v1

## Maqsad

Telegram subsystem controlled pilot uchun tayyorligini tekshirish:

- employee bot read-only flow
- client bot read-only flow
- admin Telegram account management
- health/readiness endpoint
- smoke test coverage
- security decisions

## Implemented scope

Backend:

- `GET /telegram/accounts`
- `GET /telegram/health`
- existing `POST /telegram/accounts/:id/block` reused
- existing internal bot endpoints reused

Frontend:

- `/settings/telegram` endi account list, link token list va health panelni
  ko‘rsatadi
- active account uchun block action mavjud
- unblock v1’da implement qilinmadi

Bot:

- employee commands mavjud
- client commands mavjud
- private chat only behavior mavjud
- startup env validation mavjud

Smoke:

- `pnpm smoke:telegram`

## Verification result

2026-07-01 qayta tekshiruv:

```text
API build: passed
Bot build: passed
Web build: passed
Telegram smoke: passed
MVP smoke: passed
```

`pnpm smoke:telegram` passed checks:

- auth login for Telegram smoke
- employee link, read endpoints, wrong-type denial, and unlink
- blocked employee Telegram account cannot relink
- client link, orders/debt/payments, and wrong-type denial
- invalid/used code, internal key rejection, and link rate limit
- settings token/account list and health endpoint are safe

`pnpm smoke:mvp` also passed after local PostgreSQL became reachable.

## Employee flow verified

Smoke coverage:

1. employee yaratish
2. employee link token yaratish
3. synthetic Telegram userni employee sifatida link qilish
4. employee data endpointlari:
   - salary
   - activities
   - advances
   - payroll
5. employee account client-only endpointdan foydalana olmasligi
6. unlinkdan keyin data endpointlar rad etilishi
7. blocked employee Telegram user qayta link bo‘la olmasligi

## Client flow verified

Smoke coverage:

1. client yaratish
2. client link token yaratish
3. synthetic Telegram userni client sifatida link qilish
4. client data endpointlari:
   - orders
   - debt
   - payments
5. client account employee-only endpointdan foydalana olmasligi

## Account admin UI verified

`/settings/telegram`:

- account turi: EMPLOYEE / CLIENT / USER
- linked entity name/id
- masked Telegram user ID
- status: ACTIVE / UNLINKED / BLOCKED
- linkedAt / unlinkedAt / blockedAt
- block action
- link-token list alohida ko‘rsatiladi
- raw code ko‘rsatilmaydi
- codeHash ko‘rsatilmaydi

Unblock:

- v1’da qo‘shilmadi.
- Sabab: unblock/relink policy alohida security decision talab qiladi.

## Health endpoint verified

Endpoint:

```text
GET /telegram/health
```

Security decision:

- public emas
- tenant auth + `settings.view` bilan himoyalangan
- tenant-scoped basic counts qaytaradi
- sensitive secret qiymatlarini qaytarmaydi

Returns:

- bot internal API key configured boolean
- link token secret configured boolean
- database check
- tenant-scoped account/token counts

## Smoke tests

Command:

```bash
pnpm smoke:telegram
```

Coverage:

- employee link code
- employee internal link
- employee read endpoints
- employee cannot use client endpoint
- unlink employee
- blocked employee cannot relink
- client link code
- client internal link
- client orders/debt/payments
- client cannot use employee endpoint
- invalid code rejected
- used code rejected
- missing/wrong internal API key rejected
- link rate limit returns `429`
- settings token list does not expose raw code/codeHash
- settings account list does not expose raw Telegram user ID or chat ID

## Security decisions

- Raw link code is returned once only.
- Raw code is not persisted.
- `codeHash` is not exposed through frontend/API list endpoints.
- Group chats do not expose sensitive data.
- BLOCKED accounts cannot use bot.
- UNLINKED accounts cannot use bot data endpoints.
- Bot internal API requires `x-bot-api-key`.
- Frontend does not calculate salary, payroll, debt, or stock.
- Bot does not calculate salary, payroll, debt, or stock.
- Telegram write actions are not implemented.

## Known limitations

- Rate limit is in-memory and resets on API restart.
- Long polling requires one bot process per token.
- Webhook mode is not implemented.
- Redis-backed limiter is not implemented.
- Manager/owner bot commands are not implemented.
- Unblock policy is not implemented.
- Bot process manager config is not implemented.

## Pilot readiness verdict

Verdict:

```text
Pilot-ready for controlled read-only employee/client Telegram usage.
```

Conditions:

- run `pnpm smoke:telegram` before each pilot/demo deployment
- use strong `BOT_INTERNAL_API_KEY`
- run only one bot process per Telegram token
- keep bot in private-chat-only mode
- monitor support reports for failed links or account compromise

## Recommended next phase

1. Bot process deployment config
   - PM2 or systemd
   - single-instance guard

2. Telegram account management polish
   - account detail drawer
   - explicit unblock policy design before implementation

3. Redis-backed link rate limiter

4. Webhook deployment once pilot becomes production rollout

## Senior Engineering Review

Telegram subsystem is ready for controlled pilot because core read-only flows,
admin visibility, account block, health/readiness and automated smoke coverage
exist. The remaining risks are operational rather than domain-model blockers:
process supervision, single-instance long polling, secret handling, and
restart-persistent rate limiting.
