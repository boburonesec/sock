# Paypoq OS — Telegram Bot Integration Design v1

Status: Proposed

Date: 2026-06-30

Scope:

- Design documentation only
- No code changes
- No schema changes
- No migrations

## Purpose

Telegram bot Paypoq OS uchun oddiy self-service kanal bo‘ladi.

Botning asosiy vazifasi:

- employee o‘z salary/activity/advance/payroll holatini ko‘radi
- client o‘z orders/debt/payments holatini ko‘radi
- keyinroq manager/owner tezkor summary ko‘radi

V1 bot **read-only** bo‘lishi kerak.

Bot production data kiritmaydi, payment yaratmaydi, delivery qilmaydi, payroll
o‘zgartirmaydi.

## Product Principles

Telegram bot quyidagi Paypoq OS prinsiplariga mos bo‘lishi kerak:

- Business first
- MVP first
- Operator-friendly
- Human before IoT
- No premature automation
- No frontend/bot business calculation
- Backend-owned salary, debt, stock, payroll calculations
- Strong tenant isolation

Bot generic ERP botiga aylanmasligi kerak.

## 1. Bot User Types

### Employee

Employee — fabrikada ishlaydigan ishchi yoki staff.

Use cases:

- bugungi faolligini ko‘rish
- oylik faolligini ko‘rish
- hisoblangan salary/payroll holatini ko‘rish
- avanslar
- bonuslar
- jarimalar
- to‘langan/qoldiq

Important:

- Worker web app ishlatmaydi.
- Shift Receiver production data kiritishda davom etadi.
- Telegram bot employee uchun self-service ko‘rish kanali.

### Client

Client — fabrikadan mahsulot sotib oluvchi xaridor.

Use cases:

- buyurtmalarni ko‘rish
- order status ko‘rish
- debt ko‘rish
- payments history ko‘rish
- oxirgi payment va debt statusini ko‘rish

Important:

- Client order yaratmaydi.
- Seller order yaratadi.
- Client debt backend projection orqali keladi.

### Manager / Owner later

Manager/Owner keyingi bosqichda tezkor summary ko‘rishi mumkin.

Use cases:

- today production
- bottleneck stages
- active orders
- low stock alerts
- client debt warning
- pending approvals

Important:

- Manager summary tenant/factory permissions bilan cheklanadi.
- Sensitive finance detail default ko‘rsatilmasligi kerak.
- V1’da manager bot access deferred.

## 2. Auth / Linking Strategy

Recommended strategy:

```text
Web app creates one-time linking code
→ user sends code to Telegram bot
→ backend binds Telegram user id to Employee/Client/User
→ bot uses binding for read-only access
```

### Why one-time code from web app

This is safer than phone-only linking.

Benefits:

- Manager/accountant can intentionally create/link account.
- Tenant/factory context is known.
- Employee/client identity is selected in trusted web app.
- Bot does not guess identity from phone number.
- Linking can expire.
- Audit can record who generated and who used the code.

### Linking flow for employee

1. Manager opens employee profile in web app.
2. Manager clicks `Telegram link code yaratish`.
3. Backend creates short-lived one-time token.
4. Employee opens Telegram bot.
5. Employee sends:

```text
/link ABC123
```

6. Bot backend validates token.
7. Telegram user id is bound to that Employee.
8. Bot confirms successful linking.

### Linking flow for client

1. Seller or Manager opens client profile.
2. Creates Telegram link code.
3. Client sends `/link CODE`.
4. Telegram user id is bound to Client.

### Manager/Owner linking later

Manager/Owner bot account should link to `User`, not `Employee` or `Client`.

The backend already has `User`, `Role`, `Permission`, `UserFactoryAccess`.

Manager bot context should use the same tenant/factory/RBAC model as web auth.

### Phone-based linking risks

Phone-only linking is not recommended for V1.

Risks:

- shared family phones
- seller/client phone mismatch
- employee phone not recorded
- SIM ownership changes
- recycled phone numbers
- multiple tenants with same phone
- Telegram account may not expose phone unless contact shared

Phone can be used as an extra verification signal later, but not as the only
authority.

### Telegram user id binding

Telegram identity should be based on:

```text
telegramUserId
```

Optional useful fields:

- username
- firstName
- lastName
- languageCode

But only `telegramUserId` should be stable binding key.

### Unlink / relink policy

Required policies:

- employee/client can send `/unlink`
- manager can unlink from web app
- relink requires a new one-time code
- old link tokens cannot be reused
- when employee becomes inactive, bot access should be disabled
- when client is archived/inactive, bot access should be disabled
- every link/unlink/relink must be audited

Recommended V1:

- allow one active Telegram binding per Employee/Client
- if a second Telegram account tries to link, block and require manager unlink
- if same Telegram account tries to relink same entity, allow if currently
  linked and active

## 3. Data Access Rules

### Employee access

Employee sees only own data:

- own WorkerActivity
- own payroll items
- own advances
- own bonuses
- own penalties
- own payroll payment status

Employee must not see:

- other employees
- client debt
- supplier debt
- company expenses
- salary rates table
- production board totals unless explicitly approved later

### Client access

Client sees only own client account:

- own orders
- own payments
- own debt projection
- own order statuses

Client must not see:

- other clients
- supplier debt
- warehouse stock
- production internals
- employee/payroll data

### Manager/Owner access later

Manager/Owner sees only allowed tenant/factory summaries:

- based on linked `User`
- use existing roles/permissions
- respect `UserFactoryAccess`
- no cross-tenant data
- no unauthorized factory summaries

### No write actions in V1

V1 bot is read-only.

Forbidden in V1:

- create order
- record payment
- approve advance
- create worker activity
- move production stage
- change stock
- calculate payroll
- change settings

Reason:

Telegram UX is convenient but risky for business writes. Read-only first gives
value without compromising operational integrity.

## 4. Backend Design

### Options

#### Option A — Separate app in monorepo

Example:

```text
apps/
├── api/
├── web/
└── bot/
```

The bot app:

- receives Telegram updates
- validates Telegram bindings
- calls backend API or shared application services
- formats messages

Pros:

- bot lifecycle separate from API
- easier webhook/long-polling deployment separation
- bot-specific dependencies isolated
- future scaling is cleaner

Cons:

- new app/process
- slightly more deployment complexity

#### Option B — Bot module inside API

Example:

```text
apps/api/src/modules/telegram/
```

Pros:

- fastest MVP implementation
- direct access to Prisma/services
- one process

Cons:

- API process now handles Telegram webhook workload
- mixing web API and bot transport can get messy
- harder to separate deploy/restart behavior later

### Recommended approach

Recommended V1:

```text
Separate app: apps/bot
Reuse backend API for read operations where possible.
Use direct DB only for Telegram update/linking infrastructure if absolutely needed.
```

Why:

- Telegram is a separate external interface.
- Keeping it outside `apps/api` avoids API module clutter.
- It still remains a monorepo app, not a microservice architecture decision.
- It can be deployed as one extra process without Kafka/CQRS/event sourcing.

Important:

This is **not** microservices. It is a small separate runtime in the same
monorepo that talks to the modular monolith backend.

### API reuse vs direct DB access

Preferred:

- bot calls backend internal/public bot-safe endpoints
- backend owns tenant/factory/business filtering
- backend owns salary/debt/payroll calculations

Avoid:

- duplicating debt/payroll logic inside bot
- direct DB queries that bypass RBAC/tenant rules

Practical compromise:

- bot may use Prisma only for TelegramAccount and token validation if this
  linking logic is owned by bot/auth module
- all business data should come from backend query services/endpoints

### Bot-safe API endpoints later

Potential endpoints:

```text
GET /bot/me
GET /bot/employee/salary
GET /bot/employee/activities
GET /bot/employee/advances
GET /bot/client/orders
GET /bot/client/debt
GET /bot/client/payments
GET /bot/manager/summary
POST /bot/link
POST /bot/unlink
```

These endpoints should authenticate by Telegram binding or internal bot token,
not by normal browser JWT.

## 5. Required Schema Changes

No schema changes in this design task.

Future minimal schema slice should include:

### TelegramAccount

Purpose:

Bind Telegram user id to Paypoq OS entity.

Suggested fields:

```text
id
tenantId
factoryId nullable
telegramUserId
telegramUsername nullable
telegramFirstName nullable
telegramLastName nullable
telegramLanguageCode nullable
linkedType enum: EMPLOYEE | CLIENT | USER
employeeId nullable
clientId nullable
userId nullable
status enum: ACTIVE | UNLINKED | BLOCKED
linkedAt
unlinkedAt nullable
lastSeenAt nullable
createdAt
updatedAt
```

Constraints:

- `telegramUserId` should be unique for active binding.
- exactly one of `employeeId`, `clientId`, `userId` must be set based on
  linkedType.
- tenantId required.
- factoryId required for employee; nullable for client/user if tenant-level.

### TelegramLinkToken

Purpose:

Short-lived one-time linking code.

Suggested fields:

```text
id
tenantId
factoryId nullable
codeHash
linkedType enum
employeeId nullable
clientId nullable
userId nullable
expiresAt
usedAt nullable
createdByUserId
createdAt
usedByTelegramUserId nullable
metadata nullable Json
```

Rules:

- store hash of code, not raw code
- expires quickly, e.g. 10 minutes
- one-time use
- cannot link inactive employee/client
- audit generated/used/expired events where useful

### Audit actions

Required actions:

```text
TELEGRAM_LINK_TOKEN_CREATED
TELEGRAM_ACCOUNT_LINKED
TELEGRAM_ACCOUNT_UNLINKED
TELEGRAM_ACCOUNT_RELINK_BLOCKED
TELEGRAM_ACCESS_DENIED
```

Optional later:

```text
TELEGRAM_COMMAND_VIEWED
```

Do not audit every salary/debt view in detail unless required, because it can
generate high-volume logs. Instead, consider aggregate access logs or security
logs later.

## 6. Bot Commands

### `/start`

Purpose:

- greet user
- explain bot
- show linked/unlinked status
- tell user to use `/link CODE` if not linked

Example:

```text
Paypoq OS botiga xush kelibsiz.
Hisobingiz ulanmagan. Web app’dan berilgan kod bilan /link CODE yuboring.
```

### `/link`

Usage:

```text
/link ABC123
```

Purpose:

- validate one-time code
- bind Telegram account
- show linked entity name

Security:

- rate limit attempts
- expire tokens
- audit success/failure

### `/salary`

Employee only.

Shows:

- current payroll period
- worked amount
- bonus
- penalty
- advance
- final salary
- paid
- remaining
- status

All values backend-calculated.

### `/activities`

Employee only.

Shows:

- today activity
- monthly activity summary
- recent activity rows

Optional filters later:

```text
/activities today
/activities month
```

### `/advances`

Employee only.

Shows:

- active advances
- paid/applied advances
- status
- reason

### `/orders`

Client only.

Shows:

- recent orders
- status
- amount
- payment status

### `/debt`

Client only.

Shows:

- total orders
- total paid
- debt
- last payment date

All values backend-calculated projection.

### `/payments`

Client only.

Shows:

- recent payments
- method
- amount
- date
- related order if allocated

### `/help`

Shows available commands based on linked type.

Example:

Employee:

```text
/salary
/activities
/advances
/help
/unlink
```

Client:

```text
/orders
/debt
/payments
/help
/unlink
```

## 7. Security Risks

### Shared phone numbers

Risk:

One phone may be used by multiple people or family members.

Mitigation:

- do not use phone-only linking
- use one-time code from web app
- allow manager unlink

### Stolen Telegram accounts

Risk:

Attacker sees salary/debt data.

Mitigation:

- allow unlink from web app
- show last linked Telegram username/id in web app
- add suspicious login/link audit
- support account block
- keep bot read-only in V1

### Data leakage in group chats

Risk:

User sends commands in group chat.

Policy:

- Bot should respond only in private chats for sensitive data.
- In group chats, reply:

```text
Maxfiy ma’lumotlar faqat private chatda ko‘rsatiladi.
```

### Rate limiting

Risks:

- brute-force link codes
- spam commands
- scraping salary/debt data

Mitigation:

- rate limit `/link`
- rate limit command frequency per Telegram user
- lock after repeated failed link attempts
- consider Redis later only if needed

MVP can start with database-backed attempt counters if traffic is low.

### Audit logging

Audit must cover:

- link token created
- account linked
- account unlinked
- blocked/rejected link attempt
- suspicious repeated failures

Do not log sensitive message content unnecessarily.

### Tenant isolation

Every bot request must resolve:

- tenantId
- linked entity
- optional factoryId

Never trust Telegram username/phone as tenant authority.

## 8. Phased Plan

### Phase 1 — Employee read-only v1

First implementation slice.

Build:

- schema slice:
  - TelegramAccount
  - TelegramLinkToken
- web action:
  - generate employee link code
  - unlink employee Telegram account
- bot app:
  - `/start`
  - `/link`
  - `/salary`
  - `/activities`
  - `/advances`
  - `/help`
  - private chat only
- backend bot-safe employee read endpoints
- audit actions
- smoke test for linking and read commands if feasible

Why employee first:

- employee value is high
- payroll/activity questions are common
- no client-facing external risk yet
- data scope is narrow: employee sees own data only

### Phase 2 — Client read-only v2

Build:

- client link code generation
- `/orders`
- `/debt`
- `/payments`
- unlink/relink policy
- client-facing copy/messages

Extra care:

- debt data is sensitive
- client phone/account ownership must be verified operationally

### Phase 3 — Manager summary v3

Build:

- link Telegram to User
- enforce existing RBAC/factory access
- `/summary`
- `/production`
- `/alerts`

Potential summaries:

- today production
- bottleneck stage
- low stock material count
- active orders
- high debt warnings

Keep write actions deferred.

## Recommended Architecture

Recommended:

```text
apps/bot
```

as a separate monorepo app using backend-owned read APIs.

Do not add:

- Kafka
- event sourcing
- CQRS
- workflow engine
- direct duplicated payroll/debt calculations

## First Implementation Slice

Recommended first slice:

```text
Employee read-only Telegram bot v1
```

Minimum deliverables:

1. Prisma schema review for TelegramAccount and TelegramLinkToken.
2. Migration after approval.
3. Backend link-token endpoints for employees.
4. Bot app foundation.
5. `/start`, `/link`, `/salary`, `/activities`, `/advances`, `/help`.
6. Web UI action on employee details to generate/unlink Telegram code.
7. Audit logs.
8. Smoke/manual test guide.

## What Is Intentionally Deferred

Deferred:

- client bot access
- manager/owner bot summaries
- all write actions
- approval actions
- payment creation
- production data entry
- payroll calculation via bot
- Telegram group support for sensitive data
- phone-only linking
- mobile app
- super-admin bot tools
- Redis/rate-limit infrastructure unless needed

## Senior Engineering Review

This design avoids two common mistakes:

1. It does not treat Telegram phone number as identity authority.
2. It does not duplicate business calculations inside the bot.

The recommended separate `apps/bot` is a small monorepo runtime, not a
microservice architecture shift. This is justified because Telegram is a
different transport/lifecycle from the web API, while still reusing backend
business rules.

The safest MVP is Employee read-only first. Client debt and manager summaries
are valuable, but expose more sensitive business data and should come after the
linking/security model is proven.
