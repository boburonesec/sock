# Paypoq OS — Telegram Link Token Backend v1

Status: Implemented  
Date: 2026-07-01

## Scope

This slice adds authenticated tenant-side backend endpoints for generating
short-lived Telegram link codes.

It does not implement:

- Telegram bot runtime
- Telegram API/webhook integration
- `/link` command handling
- `TelegramAccount` linking
- frontend link generation UI
- employee/client Telegram data APIs

## Endpoints

```text
POST /telegram/link-tokens/employees/:employeeId
POST /telegram/link-tokens/clients/:clientId
GET  /telegram/link-tokens
```

All endpoints require tenant JWT authentication.

## Permissions

```text
POST /telegram/link-tokens/employees/:employeeId -> employees.write
POST /telegram/link-tokens/clients/:clientId    -> sales.write
GET  /telegram/link-tokens                      -> settings.view
```

`settings.view` is used for listing because token visibility is configuration /
link-management metadata. A dedicated `telegram.view` permission can be added
later if Telegram becomes a larger module.

## Business Rules

Employee token generation:

- uses current `tenantId` and `activeFactoryId`
- employee must belong to the current tenant/factory
- employee must be `ACTIVE`

Client token generation:

- uses current `tenantId`
- client must belong to the current tenant
- client must be `ACTIVE`

Common rules:

- generated code is human-enterable
- code expires after 10 minutes
- raw code is returned only once in the creation response
- database stores only `codeHash`
- `createdByUserId` comes from request context
- no Telegram account is linked yet

## Code / Hash Strategy

The raw link code is 8 characters using an uppercase human-friendly alphabet
that avoids confusing characters.

The stored `codeHash` is:

```text
HMAC-SHA256(TELEGRAM_LINK_TOKEN_SECRET, tenantId + ":" + normalizedCode)
```

Why HMAC:

- deterministic for future `/link CODE` validation
- raw token is never stored
- server secret prevents easy offline guessing from database contents

Environment variable:

```text
TELEGRAM_LINK_TOKEN_SECRET
```

Production must use a long random value.

## Existing Token Policy

Before creating a new token for the same target, the backend marks existing
unused, unexpired tokens for that target as `usedAt = now`.

Reason:

- V1 schema has `usedAt` but no dedicated `invalidatedAt`
- this prevents multiple active codes for the same Employee/Client
- it keeps the schema minimal

Future improvement:

- add `invalidatedAt` or `status` to `TelegramLinkToken` if operational history
  needs to distinguish “used” from “invalidated”.

## Audit

Each generated token creates:

```text
TELEGRAM_LINK_TOKEN_CREATED
```

Audit includes:

- tenantId
- factoryId for employee targets
- userId
- entityType: `TelegramLinkToken`
- entityId
- safe target metadata

The raw code and code hash are not written to AuditLog.

## Security Risks

- Link code brute force must be rate-limited in the future bot/link endpoint.
- Telegram account ownership is only as strong as the Telegram account security.
- Raw code appears once in API response, so frontend must avoid logging it.
- Listing endpoint intentionally does not expose `codeHash` or raw code.

## Recommended Next Slice

Implement bot/link validation endpoint:

```text
POST /bot/link
```

It should:

- accept Telegram user/chat id and raw code from bot runtime
- hash code with the same strategy
- validate expiry and unused state
- enforce target type and active target status
- create `TelegramAccount`
- mark token `usedAt`
- audit `TELEGRAM_ACCOUNT_LINKED`
