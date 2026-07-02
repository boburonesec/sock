# Telegram Security Hardening v1

Date: 2026-07-02

## Scope

Review of Telegram production security boundaries. No Telegram feature, write
action, schema change, webhook mode, or Redis dependency was added.

## Current Security Boundary

- Bot-to-API calls require `BOT_INTERNAL_API_KEY`.
- Link tokens are hashed and expire.
- Raw link codes are returned once.
- User-facing commands are read-only.
- Link/unlink/block/admin flows are audit logged.
- Bot process is separate from the API process.
- Existing link attempt limiter is process-local.

## Phase 6 Decision

Redis-backed Telegram limiting was not added in this phase. The current
single-instance process model remains acceptable for a controlled first factory
if exactly one bot process runs per bot token and deployment keeps the API
behind normal HTTPS/network controls.

## Required Production Controls

- Use a strong `BOT_INTERNAL_API_KEY`.
- Run one bot process per Telegram token.
- Monitor bot process health with PM2/Docker and external uptime checks.
- Keep bot logs available for support.
- Rotate bot token and internal API key if leaked.

## Limitations

- In-memory limiter resets after API restart.
- In-memory limiter is not coordinated across multiple API replicas.
- Webhook mode is still deferred.

## Redis Trigger

Move Telegram limiter state to Redis before:

- multi-instance API deployment
- high-volume public rollout
- repeated abuse attempts
- broad SaaS operation

## Verdict

Telegram is acceptable for controlled pilot and small single-factory production
with documented process ownership. It is not yet multi-instance SaaS hardened.

