# Uptime Monitoring v1

## Goal

Provide simple real-factory monitoring without Prometheus, Grafana, ELK, or
Kubernetes monitoring.

Recommended tool:

```text
Uptime Kuma
```

## API checks

Check:

```text
GET /health/readiness
```

Recommended interval:

- every 1 minute for pilot
- every 5 minutes if alert noise is too high

Expected:

- HTTP 200
- response includes `status: "ok"`

Alert if:

- timeout
- HTTP 500/503
- readiness is degraded

## Web checks

Check:

```text
GET https://factory-domain.example.com/login
```

or the production Web root.

Recommended interval:

- every 1 minute

Alert if:

- HTTP unavailable
- TLS certificate issue
- response timeout

## Bot checks

Telegram bot long polling is not an HTTP server.

Monitor it through:

- PM2 process status: `paypoq-bot`
- logs for Telegram/API errors
- post-deploy `pnpm smoke:telegram`
- optional Uptime Kuma push monitor from a future lightweight cron

Minimum pilot rule:

- operator checks `pm2 status` after deploy
- Telegram smoke must pass after deploy

## Internal API access

If Bot cannot reach API or `BOT_INTERNAL_API_KEY` is wrong:

- bot commands should fail safely
- `pnpm smoke:telegram` should fail
- operator must rotate/fix env and restart Bot

## Alert channels

Recommended:

- Telegram admin channel
- email to technical owner

Minimum alert list:

- API readiness down
- Web down
- Bot process down
- backup job failed
- post-deploy smoke failed

## Uptime Kuma setup example

Create monitors:

1. API readiness
   - Type: HTTP(s)
   - URL: `https://api.example.com/health/readiness`
   - Interval: 60 seconds

2. Web
   - Type: HTTP(s)
   - URL: `https://app.example.com/login`
   - Interval: 60 seconds

3. Backup cron
   - Type: Push
   - Trigger from cron after successful backup
   - Can be added later once Uptime Kuma URL exists

4. Bot process
   - For MVP, manual/PM2 check after deploy
   - Later: push monitor cron that validates `pm2 jlist`

## What is not implemented

- Prometheus
- Grafana
- ELK
- Sentry
- distributed tracing
- Kubernetes probes

These can wait until production volume or operational complexity justifies them.

## Status

```text
Monitoring strategy: READY
Actual monitor installation: operator task on production server
```
