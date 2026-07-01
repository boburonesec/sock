# Telegram Employee Bot v1

## Maqsad

Telegram Employee Bot v1 Paypoq OS xodimlari uchun read-only yordamchi kanal.
Bot xodimga faqat o‘ziga tegishli ma’lumotlarni ko‘rsatadi:

- joriy ishbay stavkalar
- oxirgi ish faolliklari
- avanslar
- payroll snapshotlari

Bot v1’da hech qanday yozish, hisoblash yoki tasdiqlash amali yo‘q.

## Arxitektura qarori

Bot alohida workspace app sifatida joylashdi:

```text
apps/bot
```

Runtime uchun `Telegraf` tanlandi.

Sabablar:

- Telegram command handlerlari sodda va yetuk.
- Long polling bilan lokal pilotni tez ishga tushirish mumkin.
- MVP uchun NestJS ichiga bot runtime aralashtirmasdan alohida process yuritish toza.
- Keyinchalik webhook deploymentga o‘tish oson.

Bot databasega bevosita ulanmaydi. U Paypoq OS API’dagi internal bot endpointlarga
so‘rov yuboradi. Bu biznes qoidalar va ma’lumot egaligini backendda saqlaydi.

## Environment

Bot app:

```env
TELEGRAM_BOT_TOKEN=replace-with-telegram-bot-token
API_BASE_URL=http://localhost:3001
BOT_INTERNAL_API_KEY=local-development-bot-internal-api-key-change-me
```

API:

```env
BOT_INTERNAL_API_KEY=local-development-bot-internal-api-key-change-me
```

`BOT_INTERNAL_API_KEY` production/pilot muhitida uzun random secret bo‘lishi kerak.

## Backend internal endpointlar

Internal endpointlar `x-bot-api-key` headeri bilan himoyalangan:

```text
POST /telegram/bot/link
POST /telegram/bot/unlink
GET  /telegram/bot/me
GET  /telegram/bot/employee/salary
GET  /telegram/bot/employee/activities
GET  /telegram/bot/employee/advances
GET  /telegram/bot/employee/payroll
```

Endpointlar public emas. Tenant user JWT yoki frontend auth bu endpointlar uchun
ishlatilmaydi.

Tenant-side admin endpoint:

```text
POST /telegram/accounts/:id/block
```

Bu endpoint `settings.write` permission talab qiladi. V1’da block qilish bot access
xavfsizligi hisoblanadi, shuning uchun oddiy employee write emas, manager/admin
darajasidagi settings permission bilan himoyalandi.

## Link flow

1. Manager/mas’ul foydalanuvchi web/API orqali xodim uchun qisqa link token yaratadi.
2. Xodim Telegram bot private chatida `/link CODE` yuboradi.
3. Bot code, `telegramUserId`, `telegramChatId` ni API internal endpointga yuboradi.
4. API:
   - token muddati va ishlatilmaganligini tekshiradi
   - token `EMPLOYEE` target ekanini tekshiradi
   - employee ACTIVE ekanini tekshiradi
   - `TelegramAccount` yaratadi yoki mavjud mos linkni yangilaydi
   - token `usedAt` bilan ishlatilgan deb belgilanadi
   - `TELEGRAM_ACCOUNT_LINKED` audit yozadi

Raw code databasega saqlanmaydi va auditga yozilmaydi.

## Web UI orqali link code yaratish

Employee bot uchun:

1. Web app’da `/employees` sahifasiga kiring.
2. Xodimni tanlab details drawer oching.
3. `Telegram kod yaratish` tugmasini bosing.
4. Kod drawer ichida faqat bir marta ko‘rsatiladi.
5. Kodni faqat to‘g‘ri xodimga yuboring.
6. Xodim Telegram botda `/link CODE` yuboradi.

Future client bot tayyorgarligi uchun:
Client bot v1 ham mavjud:

1. Web app’da `/sales/clients` sahifasiga kiring.
2. Client details drawer oching.
3. `Telegram kod yaratish` tugmasini bosing.
4. Kod faqat bir marta ko‘rsatiladi va 10 daqiqada tugaydi.
5. Client botda `/orders`, `/debt`, `/payments` buyruqlaridan foydalanadi.

Admin/audit ko‘rish uchun:

- `/settings/telegram` sahifasi target type, target name/id, expiry, usedAt va createdAt
  qiymatlarini ko‘rsatadi.
- Raw code va `codeHash` ro‘yxatda hech qachon ko‘rsatilmaydi.

## Rate limit

`/link` urinishlari backendda in-memory limiter bilan cheklangan:

- scope: `telegramUserId + telegramChatId`
- limit: 10 daqiqada 5 urinish
- muvaffaqiyatli linkdan keyin counter tozalanadi

Bu MVP uchun sodda himoya. Cheklov: API restart bo‘lsa limiter state yo‘qoladi.
Pilot/production uchun Redis-backed limiter tavsiya qilinadi.

## Unlink / Block policy

Unlink:

- bot command: `/unlink`
- backend: `POST /telegram/bot/unlink`
- faqat ACTIVE employee Telegram account uchun ishlaydi
- `TelegramAccount.status = UNLINKED`
- `unlinkedAt` belgilanadi
- row o‘chirilmaydi
- audit: `TELEGRAM_ACCOUNT_UNLINKED`

Relink policy v1:

- UNLINKED account shu employee uchun yangi token bilan qayta ulanadi.
- Boshqa employee/client/user accountga o‘tish v1’da qo‘llab-quvvatlanmaydi.
- BLOCKED account qayta ulanmaydi.

Block:

- backend: `POST /telegram/accounts/:id/block`
- permission: `settings.write`
- `TelegramAccount.status = BLOCKED`
- `blockedAt` belgilanadi
- blocked account data endpointlardan foydalana olmaydi
- blocked `telegramUserId` bilan `/link` rad etiladi
- audit: `TELEGRAM_ACCOUNT_BLOCKED`

## Bot commandlari

```text
/start
/help
/link CODE
/unlink
/salary
/activities
/advances
/payroll
```

Behavior:

- Barcha commandlar faqat private chatda ishlaydi.
- Group chatlarda bot faqat xavfsiz “Private chat only” xabarini beradi.
- `/unlink` Telegram hisobni Paypoq OS’dan uzadi.
- `/salary` backenddagi mavjud `SalaryRate` snapshotlarini ko‘rsatadi.
- `/activities` faqat linked employee uchun `WorkerActivity` yozuvlarini ko‘rsatadi.
- `/advances` faqat linked employee uchun `EmployeeAdjustment type=ADVANCE` yozuvlarini ko‘rsatadi.
- `/payroll` faqat linked employee uchun `PayrollItem` snapshotlarini ko‘rsatadi.

## Security qoidalari

- Bot DBga to‘g‘ridan-to‘g‘ri ulanmaydi.
- Bot frontend kodidan foydalanmaydi.
- Internal endpointlar `x-bot-api-key` bilan himoyalangan.
- `/link` brute-force urinishlariga qarshi in-memory limiter bor.
- Raw link code log qilinmaydi.
- Raw link code databasega saqlanmaydi.
- Bot salary/payroll hisoblamaydi, faqat backend snapshotlarini ko‘rsatadi.
- Xodim faqat o‘z Telegram accountiga bog‘langan employee ma’lumotlarini ko‘radi.
- Group chatlarda shaxsiy ma’lumot ko‘rsatilmaydi.

## Ishga tushirish

```bash
pnpm --filter @paypoq/api build
pnpm --filter @paypoq/bot build
pnpm --filter @paypoq/api start
TELEGRAM_BOT_TOKEN=... API_BASE_URL=http://localhost:3001 BOT_INTERNAL_API_KEY=... pnpm --filter @paypoq/bot start
```

Root scriptlar:

```bash
pnpm bot:build
pnpm bot:start
```

## Smoke test strategiyasi

Real Telegram token bo‘lmasa ham backend link va read endpointlarini tekshirish mumkin:

1. Employee link token yaratish.
2. `POST /telegram/bot/link` orqali test `telegramUserId` bilan link qilish.
3. `GET /telegram/bot/me` orqali linked employee qaytishini tekshirish.
4. Employee salary/activity/advance/payroll endpointlarini chaqirish.
5. Invalid code `400` qaytarishini tekshirish.
6. Ishlatilgan code qayta ishlatilmasligini tekshirish.
7. `/telegram/bot/unlink` dan keyin data endpointlar rad etilishini tekshirish.
8. `/telegram/accounts/:id/block` dan keyin link/data endpointlar rad etilishini tekshirish.
9. Ko‘p invalid `/link` urinishlari `429` qaytarishini tekshirish.

## Cheklovlar

- Manager/owner bot commandlari hali yo‘q.
- Web UI’dan Telegram account block qilish UX’i hali qo‘shilmagan.
- In-memory rate limit API restartda reset bo‘ladi.
- Webhook deployment hali yo‘q; v1 long polling runtime bilan ishlaydi.

## Keyingi tavsiya etilgan slice

1. Telegram account management UI: linked/unlinked/blocked status.
2. Redis-backed rate limiter.
3. Webhook deployment.
4. Manager/owner Telegram summaries.
