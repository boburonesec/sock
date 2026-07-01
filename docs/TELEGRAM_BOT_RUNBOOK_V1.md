# Telegram Bot Runbook v1

## Maqsad

Bu runbook Paypoq OS Telegram botini local yoki pilot muhitda ishga tushirish,
tekshirish va xavfsiz boshqarish bo‘yicha amaliy qo‘llanma.

Deployment hardening qarorlari uchun qarang:

- `docs/TELEGRAM_BOT_DEPLOYMENT_HARDENING_V1.md`

Bot v1:

- employee uchun read-only salary/activity/advance/payroll
- client uchun read-only orders/debt/payments
- write actionlarsiz
- long polling runtime

## Talablar

- API ishlayotgan bo‘lishi kerak
- PostgreSQL va migration/seed tayyor bo‘lishi kerak
- Telegram BotFather orqali olingan bot token kerak
- API va bot bir xil `BOT_INTERNAL_API_KEY` ishlatishi kerak

## Environment

API `.env`:

```env
BOT_INTERNAL_API_KEY=replace-with-long-random-secret
```

Bot runtime env:

```env
TELEGRAM_BOT_TOKEN=replace-with-telegram-bot-token
API_BASE_URL=http://localhost:3001
BOT_INTERNAL_API_KEY=replace-with-same-secret-as-api
```

Pilot uchun tavsiya:

- `BOT_INTERNAL_API_KEY` kamida 32+ random belgidan iborat bo‘lsin
- secret chat/loglarda ulashilmasin
- `TELEGRAM_BOT_TOKEN` faqat bot runtime muhitida saqlansin

## Local run

Terminal 1:

```bash
pnpm api:build
pnpm api:start
```

Terminal 2:

```bash
TELEGRAM_BOT_TOKEN=... \
API_BASE_URL=http://localhost:3001 \
BOT_INTERNAL_API_KEY=... \
pnpm bot:dev
```

## Pilot/production-style run

Build:

```bash
pnpm api:build
pnpm bot:build
```

Start API:

```bash
pnpm api:start
```

Start bot:

```bash
TELEGRAM_BOT_TOKEN=... \
API_BASE_URL=https://api.example.com \
BOT_INTERNAL_API_KEY=... \
pnpm bot:start
```

## Long polling behavior

- Bot v1 Telegraf long polling ishlatadi.
- Bir Telegram bot token uchun bir vaqtda bitta bot process ishlashi kerak.
- Agar ikki process bir token bilan polling qilsa, update conflict yuz berishi
  mumkin.
- Webhook deployment keyingi bosqichga qoldirilgan.

## Graceful shutdown

Bot `SIGINT` va `SIGTERM` signallarida `bot.stop(...)` chaqiradi.

Stop:

```bash
Ctrl+C
```

Process manager ishlatilsa, avval `SIGTERM`, keyin timeoutdan so‘ng hard kill
berish tavsiya qilinadi.

## Employee link flow

1. Web app’da `/employees` sahifasini oching.
2. Employee details drawer’da `Telegram kod yaratish` bosing.
3. Kodni faqat to‘g‘ri employee’ga yuboring.
4. Employee private chatda:

```text
/link CODE
```

5. Tekshirish:

```text
/salary
/activities
/advances
/payroll
```

Uzish:

```text
/unlink
```

## Client link flow

1. Web app’da `/sales/clients` sahifasini oching.
2. Client details drawer’da `Telegram kod yaratish` bosing.
3. Kodni faqat to‘g‘ri clientga yuboring.
4. Client private chatda:

```text
/link CODE
```

5. Tekshirish:

```text
/orders
/debt
/payments
```

Uzish:

```text
/unlink
```

## Security checklist

Pilotdan oldin:

- Bot group chatlarda ishlamasligini tekshiring.
- Wrong `BOT_INTERNAL_API_KEY` bilan internal endpointlar rad etilishini tekshiring.
- Invalid/used link code ishlamasligini tekshiring.
- Blocked account qayta link bo‘lmasligini tekshiring.
- Raw link code loglarda chiqmayotganini tekshiring.

## Troubleshooting

Bot start bo‘lmasa:

- `TELEGRAM_BOT_TOKEN` borligini tekshiring
- `API_BASE_URL` reachable ekanini tekshiring
- API start bo‘lganini tekshiring

Commandlar `Unauthorized` qaytarsa:

- API `.env` va bot env’dagi `BOT_INTERNAL_API_KEY` bir xil ekanini tekshiring

`/link CODE` ishlamasa:

- code 10 daqiqadan oshmaganini tekshiring
- code oldin ishlatilmaganini tekshiring
- target employee/client ACTIVE ekanini tekshiring
- Telegram account BLOCKED emasligini tekshiring

Client/employee noto‘g‘ri command yuborsa:

- bu expected behavior; bot safe message qaytaradi

## Build verification

```bash
pnpm api:build
pnpm bot:build
pnpm build
```

## Telegram smoke test

Real Telegram bot token talab qilmaydigan backend/internal smoke:

```bash
pnpm smoke:telegram
```

Bu command:

- API build qiladi
- baseline seedni idempotent yuritadi
- built API’ni local test portda ko‘taradi
- employee/client link flowlarni synthetic `telegramUserId` bilan tekshiradi
- invalid/used code, wrong internal key va rate limit holatlarini tekshiradi
- settings account/token ro‘yxatlarida raw code/codeHash chiqmasligini tekshiradi

Agar API allaqachon ishlayotgan bo‘lsa:

```bash
TELEGRAM_SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:telegram
```

## Pilot rollback

Botni vaqtincha o‘chirish:

1. Bot processni to‘xtating.
2. API ishlashda davom etadi.
3. Existing TelegramAccount rows saqlanadi.
4. Zarur bo‘lsa accountni `/telegram/accounts/:id/block` orqali bloklang.

Schema rollback bu runbook scope’ida emas, chunki bu task schema o‘zgartirmaydi.

## Known limitations

- Webhook deployment yo‘q.
- Redis-backed rate limiter yo‘q.
- Manager/owner bot commandlari yo‘q.
- Client payment/order write actionlari yo‘q.
- Telegram account support operations uchun alohida UI hali minimal.
