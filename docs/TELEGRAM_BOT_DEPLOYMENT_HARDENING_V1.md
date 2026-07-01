# Telegram Bot Deployment Hardening v1

## Maqsad

Bu hujjat Paypoq OS Telegram botini safer pilot/production deploymentga
tayyorlash uchun runtime, process management, secrets, observability va failure
policy qarorlarini belgilaydi.

Scope:

- design documentation only
- no code changes
- no schema changes
- no migrations
- no bot feature changes

## 1. Runtime strategy

### Current behavior: long polling

`apps/bot` hozir Telegraf long polling runtime bilan ishlaydi.

Long polling nimani anglatadi:

- bot process Telegram’dan updates’ni doimiy polling qiladi
- public webhook URL kerak emas
- local/pilot setup oson
- bitta bot token uchun faqat bitta polling process ishlashi kerak

Afzalliklari:

- MVP pilot uchun eng sodda yo‘l
- reverse proxy yoki public TLS webhook sozlash shart emas
- debugging oson
- infrani murakkablashtirmaydi

Kamchiliklari:

- duplicate process ishga tushsa Telegram update conflict bo‘lishi mumkin
- process supervision shart
- horizontal scaling yo‘q
- high-volume bot traffic uchun webhook yaxshiroq

### Webhook alternative

Webhook mode’da Telegram bot serverga HTTPS orqali update yuboradi.

Webhook uchun kerak bo‘ladi:

- public HTTPS endpoint
- Telegram webhook secret/header verification
- reverse proxy yoki managed hosting
- endpoint uptime monitoring
- deployment paytida webhook re-register/revoke tartibi

Afzalliklari:

- production-style deploymentga mosroq
- scaling va ingress nazorati yaxshiroq
- polling conflict riski kamayadi

Kamchiliklari:

- pilot uchun ko‘proq operational complexity
- TLS, domain, reverse proxy va webhook lifecycle kerak
- noto‘g‘ri sozlansa bot umuman update olmay qoladi

### Recommended MVP pilot approach

MVP pilot uchun tavsiya:

```text
Long polling + single supervised bot process
```

Nega bu yetarli:

- bot read-only
- traffic past bo‘lishi kutiladi
- MVP’da bot write action qilmaydi
- pilotda tez tekshirish va rollback muhimroq
- infrani webhook/Redis bilan erta murakkablashtirish shart emas

### When to switch to webhook

Webhookga o‘tish signallari:

- bot foydalanuvchilari soni sezilarli oshsa
- process restarts yoki polling conflict ko‘paysa
- production hosting allaqachon stable HTTPS ingressga ega bo‘lsa
- bot monitoring/alerting talab kuchaysa
- Telegram command latency pilot uchun sezilarli muammo bo‘lsa

## 2. Process management

### Local run

API:

```bash
pnpm api:build
pnpm api:start
```

Bot:

```bash
TELEGRAM_BOT_TOKEN=... \
API_BASE_URL=http://localhost:3001 \
BOT_INTERNAL_API_KEY=... \
pnpm bot:dev
```

### Pilot server run

Pilot serverda bot build qilingan JS orqali ishlashi tavsiya qilinadi:

```bash
pnpm bot:build
TELEGRAM_BOT_TOKEN=... \
API_BASE_URL=https://api.example.com \
BOT_INTERNAL_API_KEY=... \
pnpm bot:start
```

### PM2 option

PM2 kichik pilot uchun sodda variant:

- restart policy bor
- loglarni ko‘rish oson
- single instance saqlash mumkin

Recommended PM2 rule:

```text
instances: 1
autorestart: true
max_restarts: limited
restart_delay: 5000ms
```

### systemd option

systemd server-level deployment uchun yaxshi:

- OS bootda auto-start
- restart policy
- journal logs
- environment file support

Recommended systemd rule:

```text
Restart=on-failure
RestartSec=5
KillSignal=SIGTERM
```

### Docker option

Docker keyinroq qulay:

- repeatable runtime
- env injection
- CI/CD bilan mos

Lekin current pilotda Docker shart emas. Agar API/web ham containerized bo‘lsa,
botni ham Docker service qilish mantiqli.

### Single bot instance rule

Long polling mode’da:

```text
Bir TELEGRAM_BOT_TOKEN uchun faqat bitta bot process.
```

Duplicate process risklari:

- Telegram polling conflict
- commandlar kechikishi
- logs chalkashishi
- link flow user uchun noaniq bo‘lishi

Deployment checklistda eski bot process to‘xtaganini tekshirish majburiy.

## 3. Environment and secrets

Required bot env:

```env
TELEGRAM_BOT_TOKEN=...
API_BASE_URL=...
BOT_INTERNAL_API_KEY=...
```

Required API env:

```env
BOT_INTERNAL_API_KEY=...
```

### TELEGRAM_BOT_TOKEN

- BotFather token.
- Git, README, screenshot, support chat yoki logs’da saqlanmasin.
- Token leak bo‘lsa BotFather orqali revoke/regenerate qilinsin.

### API_BASE_URL

- Local: `http://localhost:3001`
- Pilot/production: HTTPS API URL
- Productionda plain HTTP ishlatmaslik kerak.

### BOT_INTERNAL_API_KEY

- API va bot orasidagi shared secret.
- Kamida 32+ random belgidan iborat bo‘lsin.
- Tenant user JWT o‘rnini bosmaydi; faqat bot internal endpointlar uchun.
- Frontendga berilmaydi.

### Secret rotation

Rotation tartibi:

1. API va bot config’da yangi secret tayyorlash.
2. API deploy/restart.
3. Bot deploy/restart.
4. Smoke test.
5. Eski secretni secret store’dan olib tashlash.

Current implementation bitta active secretni qo‘llaydi. Zero-downtime rotation
uchun keyinroq `current + previous secret` support qo‘shilishi mumkin.

### Where not to store secrets

Secrets quyidagilarda bo‘lmasligi kerak:

- Git repository
- docs
- issue tracker
- Telegram/Slack chats
- frontend `.env.local`
- browser localStorage/sessionStorage
- application logs

## 4. Network and security

### Bot → API communication

Bot API’ga internal endpointlar orqali ulanadi:

```text
x-bot-api-key: BOT_INTERNAL_API_KEY
```

Bot DBga bevosita ulanmaydi. Bu business rules va data ownershipni backendda
saqlaydi.

### HTTPS requirement

Pilot localdan tashqarida:

- `API_BASE_URL` HTTPS bo‘lishi kerak
- self-signed certlardan qochish kerak
- reverse proxy TLS termination qilsa ham bot external URL HTTPS bo‘lsin

### Internal API key handling

- key faqat server-side bot processda bo‘ladi
- key frontendga chiqmasin
- wrong/missing key `401` qaytarishi kerak
- key logs’da maskalanishi kerak

### Telegram group chat risk

Bot sensitive data faqat private chatda ko‘rsatadi.

Group chat risklari:

- salary/debt/payment data leak
- xodim yoki client noto‘g‘ri chatga command yuborishi

Required behavior:

- group chatlarda faqat safe “Private chat only” message
- sensitive command payload yoki data chiqmasin

### Logs and sensitive data

Logs’da quyidagilar chiqmasligi kerak:

- raw link code
- Telegram bot token
- `BOT_INTERNAL_API_KEY`
- salary/payroll/debt/payment detail payloadlari

Current bot handler error log generic message ishlatadi. Pilotda structured
logging qo‘shilsa ham sensitive fields redaction majburiy bo‘ladi.

## 5. Observability

### Startup logs

Bot startup loglari minimal bo‘lishi kerak:

- bot started
- config missing bo‘lsa env nomi
- API unreachable bo‘lsa generic error

Token yoki secret chiqmasligi kerak.

### Command error logs

Command failure loglari:

- generic error message
- no raw command text if it may contain `/link CODE`
- no response payload with sensitive data

### Health check strategy

Current botda HTTP health endpoint yo‘q.

Pilot v1 uchun minimal approach:

- process manager running state
- API `/health`
- manual bot `/start` smoke
- post-deploy client/employee read smoke

Future:

- bot process health endpoint
- last successful Telegram polling timestamp
- last API call success timestamp

### Basic uptime monitoring

Pilot uchun:

- process manager status check
- API health uptime check
- Telegram bot manual smoke after deploy

Recommended later:

- external uptime monitor
- admin alert on bot start/failure
- error count threshold alerts

### Alerting recommendations

MVP pilot:

- deployment operator manual checks enough

Next step:

- admin alert channel for:
  - bot started
  - bot crashed/restarted
  - API auth failures spike
  - Telegram API errors spike

## 6. Failure scenarios

### API down

Behavior:

- bot command fails gracefully
- user sees safe retry-later message
- no sensitive data in error

Mitigation:

- monitor API `/health`
- restart API before bot if both are down

### Telegram API unavailable

Behavior:

- polling may fail/retry depending on Telegraf behavior
- users may see delayed responses

Mitigation:

- process manager restart on fatal crash
- check Telegram status if widespread

### Bot token revoked

Behavior:

- bot cannot launch or polling fails

Mitigation:

- regenerate token in BotFather
- update secret store
- restart bot
- run smoke

### Wrong internal API key

Behavior:

- internal endpoints return `401`
- bot commands fail safely

Mitigation:

- compare API and bot env values without printing them
- rotate both together

### Duplicate long polling process

Behavior:

- Telegram update conflict
- commands unreliable

Mitigation:

- enforce single process in PM2/systemd/Docker
- stop old process before deploy
- never run local dev bot with production token

### Rate limit reset on restart

Behavior:

- `/link` brute-force limiter state resets

Mitigation:

- acceptable for MVP pilot
- migrate limiter to Redis when bot usage grows or abuse appears

## 7. Deployment checklist

### Pre-deploy

- API build passes
- Bot build passes
- Web build passes if UI changed
- `TELEGRAM_BOT_TOKEN` configured
- `API_BASE_URL` points to correct API
- `BOT_INTERNAL_API_KEY` matches API
- old bot process stopped
- database migrations already applied
- seed/demo data state understood

### Deploy

1. Deploy/start API.
2. Verify API `/health`.
3. Deploy/start bot with one instance only.
4. Check bot startup logs.
5. Do not print secrets.

### Post-deploy smoke

Employee smoke:

1. Generate employee link code.
2. `/link CODE`.
3. `/salary`.
4. `/activities`.
5. `/unlink`.

Client smoke:

1. Generate client link code.
2. `/link CODE`.
3. `/orders`.
4. `/debt`.
5. `/payments`.
6. `/unlink`.

Security smoke:

- group chat safe response
- wrong internal API key rejected
- invalid code rejected
- used code rejected

### Rollback

Fast rollback:

1. Stop bot process.
2. Keep API running.
3. If token leaked, revoke token in BotFather.
4. If internal key leaked, rotate API and bot key.
5. Block affected TelegramAccount rows if needed.

No schema rollback is involved in this hardening design.

## 8. Future hardening

### Webhook mode

Add when:

- stable public HTTPS infra exists
- bot traffic grows
- operational team wants production-style ingress

### Redis-backed rate limiting

Add when:

- abuse risk grows
- multiple API instances exist
- restart-reset behavior is no longer acceptable

### Structured logging

Add:

- request/command correlation id
- safe error codes
- redaction rules

Do not log raw `/link CODE`.

### Bot metrics

Useful metrics:

- command count by command type
- error count by endpoint
- API latency
- Telegram API failures
- link failure/rate-limit count

### Admin alert channel

Later:

- admin Telegram channel or email/slack equivalent
- bot start/stop/failure alerts
- suspicious link attempt alerts

## 9. Recommended pilot decision

Recommended first pilot deployment:

```text
Long polling bot + single supervised process + HTTPS API + strong internal API key
```

Process manager:

- PM2 is simplest for quick pilot.
- systemd is better if server ops already uses systemd.
- Docker is better once API/Web are containerized too.

Why enough for now:

- bot is read-only
- expected usage is low
- no payment/order write action exists
- rollback is simply stopping bot process
- no extra infrastructure is required

Trigger migration to webhook:

- duplicate polling conflicts happen
- bot traffic grows
- pilot becomes production rollout
- HTTPS ingress and deployment automation are stable

Trigger Redis limiter:

- repeated invalid `/link` attempts appear
- bot/API runs multiple instances
- rate-limit reset on restart becomes unacceptable

## 10. Next implementation plan

Recommended next tasks:

1. Bot process deployment script/config
   - choose PM2 or systemd
   - document single-instance deployment
   - include env file template without secrets

2. Bot smoke command
   - automate internal endpoint smoke without real Telegram token when possible
   - verify employee/client link and read endpoint shapes

3. Admin alert channel
   - bot startup/failure notification
   - keep alert payload non-sensitive

4. Redis limiter later
   - replace in-memory `/link` limiter
   - preserve same user-facing behavior

5. Webhook later
   - add webhook endpoint
   - Telegram secret validation
   - deployment lifecycle docs

Current smoke command:

```bash
pnpm smoke:telegram
```

This smoke does not require a real Telegram bot token; it verifies backend
internal bot flows with synthetic Telegram user IDs.

## Senior Engineering Review

Long polling is not the most advanced production architecture, but it is the
right MVP pilot trade-off: simple, reversible, and enough for low-volume
read-only bot usage. Moving immediately to webhook + Redis would add
operational complexity before pilot feedback proves the need.

Main risk is operational discipline: one bot instance only, strong secrets,
and no sensitive logs. The first implementation after this design should
therefore focus on process deployment config and smoke automation rather than
new bot features.
