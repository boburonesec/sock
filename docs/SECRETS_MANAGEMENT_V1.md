# Secrets Management v1

## Scope

This document covers operational handling for:

- `JWT_ACCESS_SECRET`
- `PLATFORM_JWT_ACCESS_SECRET`
- `TELEGRAM_LINK_TOKEN_SECRET`
- `BOT_INTERNAL_API_KEY`
- `FACTORY_TV_ACCESS_TOKEN` (API + web server; **not** `NEXT_PUBLIC_*` on new deploys)
- `TELEGRAM_BOT_TOKEN`
- PostgreSQL credentials

## Golden rules

Do not:

- commit secrets
- store secrets in docs
- store secrets in Docker images
- store secrets in frontend code (`NEXT_PUBLIC_*` includes values in the browser bundle)
- put `FACTORY_TV_ACCESS_TOKEN` in `NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN` on new deploys
- paste secrets into screenshots or chat logs
- reuse local development secrets in production

## Local development

Local `.env` files are acceptable on developer machines.

Rules:

- use `.env.example` as template only
- keep real `.env` ignored by git
- rotate local demo secrets if shared outside the machine

## Pilot environment

Minimum acceptable pilot approach:

- store secrets in a password manager such as 1Password
- copy secrets into server env file manually
- restrict server access
- keep `.env.production` outside git
- rotate secrets when an operator leaves

## Production environment

Recommended options:

- 1Password for small private deployments
- HashiCorp Vault when operational maturity exists
- cloud secret manager if deployed on a cloud platform

Enterprise secret infrastructure is not implemented in this phase.

## Rotation policy

Recommended:

- JWT secrets: rotate after suspected leak or scheduled every 6-12 months
- platform JWT secret: rotate after admin personnel changes
- bot internal API key: rotate after any server/operator incident
- Telegram bot token: rotate immediately if leaked
- database password: rotate during planned maintenance

Rotation impact:

- refresh sessions may become invalid
- bot must restart after secret changes
- API/Web/Bot smoke tests must be run after rotation

## Incident response

If a secret is exposed:

1. Stop affected process if needed.
2. Generate replacement secret.
3. Update secret storage.
4. Update runtime env.
5. Restart affected service.
6. Revoke old external token if applicable.
7. Run smoke tests.
8. Record what was exposed and when.

## Ownership

For pilot:

- one technical owner manages secret generation and rotation
- one backup owner has emergency access

For production:

- use named access groups
- review access quarterly

## Frontend warning

Only `NEXT_PUBLIC_*` variables can be exposed to the browser.

Never put JWT secrets, database credentials, bot tokens, or internal API keys in
frontend code or `NEXT_PUBLIC_*` env vars.
