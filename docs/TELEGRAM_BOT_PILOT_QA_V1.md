# Telegram Bot Pilot QA v1

## Maqsad

Bu hujjat Paypoq OS Telegram botini pilotga tayyorlashdan oldin tekshiriladigan
QA ro‘yxatini belgilaydi.

Scope:

- employee read-only flow
- client read-only flow
- bot internal API security
- local/pilot startup
- build verification

Scope’dan tashqari:

- bot orqali write actionlar
- payment/order yaratish
- payroll/debt hisoblashni botga ko‘chirish
- schema yoki migration o‘zgarishi

## Tekshirilgan env qiymatlar

Bot runtime quyidagilarni talab qiladi:

```env
TELEGRAM_BOT_TOKEN=...
API_BASE_URL=http://localhost:3001
BOT_INTERNAL_API_KEY=...
```

API runtime’da ham shu internal secret bo‘lishi kerak:

```env
BOT_INTERNAL_API_KEY=...
```

QA natijasi:

- `apps/bot/src/config.ts` uchala env qiymatni majburiy qiladi.
- `API_BASE_URL` oxiridagi slashlar normalize qilinadi.
- Internal endpointlar `x-bot-api-key` header orqali himoyalangan.

## Bot startup QA

Local development:

```bash
pnpm bot:dev
```

Built/pilot runtime:

```bash
pnpm bot:build
pnpm bot:start
```

API alohida process sifatida ishlashi kerak:

```bash
pnpm api:build
pnpm api:start
```

Long polling:

- v1 bot Telegraf long polling bilan ishlaydi.
- Webhook deployment hali yo‘q.
- Bir bot token bilan bir vaqtning o‘zida faqat bitta polling process ishlashi
  kerak.

Graceful shutdown:

- `SIGINT` va `SIGTERM` signallari `bot.stop(...)` orqali ushlanadi.

## Employee flow QA

1. Web/API orqali employee link code yaratiladi:

```text
POST /telegram/link-tokens/employees/:employeeId
```

2. Employee Telegram private chatda yuboradi:

```text
/link CODE
```

3. Quyidagi commandlar tekshiriladi:

```text
/salary
/activities
/advances
/payroll
/unlink
```

Expected:

- faqat linked employee ma’lumotlari qaytadi
- bot payroll yoki salary hisoblamaydi
- `/unlink` row’ni o‘chirmaydi, `UNLINKED` statusga o‘tkazadi
- unlinkdan keyin employee data commandlari safe denial qaytaradi

## Client flow QA

1. Web/API orqali client link code yaratiladi:

```text
POST /telegram/link-tokens/clients/:clientId
```

2. Client Telegram private chatda yuboradi:

```text
/link CODE
```

3. Quyidagi commandlar tekshiriladi:

```text
/orders
/debt
/payments
/unlink
```

Expected:

- faqat linked client ma’lumotlari qaytadi
- reversed payments payment list va debt projectiondan chiqariladi
- bot debt hisoblamaydi; projection API tarafida tayyorlanadi
- employee-only command client account uchun safe denial qaytaradi
- client-only command employee account uchun safe denial qaytaradi

## Security QA

Private chat only:

- barcha sensitive commandlar private chatda ishlaydi
- group chatda faqat safe “Private chat only” xabari qaytadi

Invalid code:

- noto‘g‘ri yoki muddati tugagan `/link CODE` `400` qaytaradi

Used code:

- ishlatilgan code qayta ishlamaydi

Blocked account:

- `POST /telegram/accounts/:id/block` accountni `BLOCKED` qiladi
- blocked account data endpointlardan foydalana olmaydi
- blocked `telegramUserId` bilan `/link` rad etiladi

Rate limit:

- `/link` urinishlari `telegramUserId + telegramChatId` bo‘yicha in-memory
  limitlanadi
- 10 daqiqada 5 urinishdan keyin `429` kutiladi
- cheklov API restartdan keyin reset bo‘ladi

Internal API key:

- `x-bot-api-key` yo‘q yoki noto‘g‘ri bo‘lsa internal bot endpointlar `401`
  qaytarishi kerak

Sensitive data:

- raw link code databasega saqlanmaydi
- raw code log qilinmaydi
- code hash HMAC strategy bilan saqlanadi

## Build QA

Run:

```bash
pnpm api:build
pnpm bot:build
pnpm build
```

2026-07-01 verification:

- API build: passed
- Bot build: passed
- Web build: passed
- Telegram smoke: passed
- MVP smoke: passed

Telegram smoke passed checks:

- employee link/read/unlink flow
- blocked account relink rejection
- client link/orders/debt/payments flow
- wrong account type denial
- invalid/used code rejection
- missing/wrong internal API key rejection
- link rate limit `429`
- settings token/account list safety

## Smoke QA checklist

Minimum smoke:

1. API’ni ishga tushirish.
2. Owner sifatida login qilish.
3. Employee link token yaratish.
4. Synthetic Telegram userni employee sifatida link qilish.
5. Employee data endpointlarini chaqirish.
6. Client link token yaratish.
7. Synthetic Telegram userni client sifatida link qilish.
8. Client orders/debt/payments endpointlarini chaqirish.
9. Wrong account type command denialni tekshirish.
10. Missing/wrong `x-bot-api-key` denialni tekshirish.

## Must-fix items

- Hozircha must-fix topilmadi.

## Can-defer items

- Redis-backed rate limiter.
- Webhook deployment.
- Bot process monitoring/restart manager.
- Telegram account management UI’da block/unblock polish.
- Manager/owner Telegram summary commandlari.

## Remaining risks

- In-memory rate limit process restartda reset bo‘ladi.
- Long polling pilot uchun sodda, lekin productionda webhook yoki managed
  process supervision kerak bo‘ladi.
- Telegram account compromise holati operational support policy talab qiladi.
