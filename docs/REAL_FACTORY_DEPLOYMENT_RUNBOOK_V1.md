# Real Factory Deployment Runbook v1

## Goal

One engineer should be able to deploy Paypoq OS to a new factory server and
leave it operable.

## Server requirements

Recommended first factory server:

- Ubuntu 22.04 LTS or 24.04 LTS
- 2 CPU cores minimum
- 4 GB RAM minimum; 8 GB recommended
- 80 GB SSD minimum
- stable internet
- SSH access
- domain or LAN hostname
- backup storage outside the server

## Install system dependencies

```bash
sudo apt update
sudo apt install -y git curl build-essential postgresql-client
```

Install Node.js 22 using the chosen server policy.

Enable pnpm:

```bash
corepack enable
corepack prepare pnpm@11.7.0 --activate
```

Install PM2:

```bash
npm install -g pm2
```

## PostgreSQL

Use one of:

- managed PostgreSQL
- PostgreSQL installed on the server
- Docker PostgreSQL for small pilot

Create database:

```bash
createdb paypoq_os
```

Keep DB credentials in the production env file or secret manager.

## Clone and install

```bash
cd /opt
git clone <repo-url> paypoq-os
cd /opt/paypoq-os
pnpm install --frozen-lockfile
```

## Configure env

Create:

```text
/opt/paypoq-os/.env.production
```

Required:

- `NODE_ENV=production`
- `PORT=3001`
- `DATABASE_URL`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `PLATFORM_JWT_ACCESS_SECRET`
- `TELEGRAM_LINK_TOKEN_SECRET`
- `BOT_INTERNAL_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_API_URL` for Web build environment

Do not commit this file.

## Migrate and seed

```bash
pnpm prisma:generate
pnpm prisma:migrate:deploy
```

For first factory provisioning only:

```bash
pnpm prisma:seed
```

Do not run demo reset in production.

## Build

```bash
pnpm api:build
pnpm build
pnpm bot:build
```

## Start services

```bash
pm2 start configs/pm2.ecosystem.config.cjs
pm2 status
```

Configure reboot startup:

```bash
pm2 startup
pm2 save
```

## Verify

```bash
curl http://localhost:3001/health
curl http://localhost:3001/health/readiness
pnpm deploy:smoke
```

If Telegram is enabled, test `/start` in private chat.

## Backup setup

Create backup directory:

```bash
sudo mkdir -p /var/backups/paypoq-os
sudo chown "$USER":"$USER" /var/backups/paypoq-os
```

Add cron using `docs/BACKUP_SCHEDULER_V1.md`.

Copy backups off-server.

## Monitoring setup

Install/configure Uptime Kuma or equivalent.

Minimum checks:

- Web login page
- API `/health/readiness`
- backup job success
- manual/PM2 Bot status after deploy

## Rollback

Code rollback:

```bash
pm2 stop paypoq-bot
git checkout <previous-release-tag>
pnpm install --frozen-lockfile
pnpm api:build
pnpm build
pnpm bot:build
pm2 restart paypoq-api paypoq-web
pm2 restart paypoq-bot
pnpm deploy:smoke
```

Database rollback:

- use only after backup restore decision
- restore into clean DB first when possible
- run smoke before pointing production traffic at restored DB

## Ownership

Assign named owners:

- backups
- deploys
- secrets
- monitoring
- incident response

No production system should rely on “someone will check it.”

## Deployment acceptance checklist

- [ ] env file created outside git
- [ ] migrations applied
- [ ] API/Web/Bot builds pass
- [ ] PM2 processes running
- [ ] PM2 startup saved
- [ ] backup cron configured
- [ ] off-server backup path confirmed
- [ ] Uptime Kuma checks configured
- [ ] `pnpm deploy:smoke` passed
- [ ] owner has demo/login credentials
- [ ] known limitations shared with factory owner
