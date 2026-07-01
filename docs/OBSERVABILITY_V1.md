# Observability v1

## Goal

Paypoq OS needs enough observability for a small factory pilot without adding
heavy enterprise tooling.

No ELK, Prometheus, or Kubernetes monitoring in this phase.

## API health checks

Existing:

```text
GET /health
```

Purpose:

- liveness check
- returns quickly
- safe for Docker/PM2 uptime checks

Added:

```text
GET /health/readiness
```

Purpose:

- checks database connectivity through Prisma
- checks essential auth/bot config presence
- does not expose secret values
- returns 503 when readiness is degraded

Recommended:

- load balancer/container liveness: `/health`
- deploy/operator readiness: `/health/readiness`

## Bot health

Bot runtime should be monitored through:

- process is running
- startup logs
- internal API key errors
- Telegram API connectivity errors
- `/telegram/bot/*` smoke path from `pnpm smoke:telegram`

## Web health

Web has no database dependency.

Recommended checks:

- HTTP 200 on Web root/login page
- API URL configured correctly
- browser can reach API

## Startup logs

Minimum useful startup logs:

- API started and port
- Bot started
- bot long polling started
- fatal env validation errors

Avoid logging:

- tokens
- raw Telegram link codes
- passwords
- refresh tokens
- database URL with password

## Monitoring recommendations

Pilot:

- Uptime Kuma checks:
  - Web URL
  - API `/health`
  - API `/health/readiness`
- manual daily check of smoke results after deployment
- Telegram/email alert to operator

Later:

- Sentry for backend/frontend exceptions
- structured JSON logs
- Grafana/Prometheus only when metrics volume justifies it
- Redis-backed bot rate limiting if multiple API instances are introduced

## Alert recommendations

Start simple:

- API down
- readiness degraded
- Web down
- Bot process down
- smoke test failed after deploy
- backup failed

Alert channels:

- Telegram admin channel
- email
- phone call for critical production incidents

## Known limitations

- No metrics dashboard yet.
- No centralized log store yet.
- No automatic incident paging.
- In-memory bot rate limit resets on API restart.
