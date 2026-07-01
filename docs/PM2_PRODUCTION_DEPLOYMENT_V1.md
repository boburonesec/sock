# PM2 Production Deployment v1

## Recommendation

Use PM2 for the first real factory server.

Reason:

- Paypoq OS is a Node.js monorepo.
- PM2 provides restart-on-crash, process listing, log access, and reboot startup.
- It is simpler than systemd for a first small-factory deployment.
- It avoids Kubernetes/enterprise platform overhead.

Config:

```text
configs/pm2.ecosystem.config.cjs
```

## Install PM2

On the server:

```bash
npm install -g pm2
pm2 --version
```

If global npm installs are not allowed, install PM2 through the server’s chosen
Node toolchain and document the binary path.

## Environment

Create an env file outside git:

```text
/opt/paypoq-os/.env.production
```

PM2 reads `.env.production` by default.

Alternative:

```bash
PAYPOQ_ENV_FILE=/secure/path/paypoq.env pm2 start configs/pm2.ecosystem.config.cjs
```

If `pnpm` is not on PM2’s PATH:

```bash
PAYPOQ_PNPM_BIN=/absolute/path/to/pnpm pm2 start configs/pm2.ecosystem.config.cjs
```

## Processes

PM2 apps:

- `paypoq-api`
- `paypoq-web`
- `paypoq-bot`

Bot rule:

```text
Exactly one paypoq-bot instance per Telegram bot token.
```

Do not run clustered bot processes while using long polling.

## Build and migration sequence

Recommended deployment:

```bash
cd /opt/paypoq-os
git pull
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm backup:db
pnpm prisma:migrate:deploy
pnpm api:build
pnpm build
pnpm bot:build
```

Seed only when provisioning a fresh system or explicitly required:

```bash
pnpm prisma:seed
```

Do not run demo reset/seed against production.

## Start PM2

First start:

```bash
pm2 start configs/pm2.ecosystem.config.cjs
```

Check:

```bash
pm2 status
pm2 logs paypoq-api
pm2 logs paypoq-web
pm2 logs paypoq-bot
```

## Restart sequence

After deploy:

```bash
pm2 restart paypoq-api
curl http://localhost:3001/health/readiness

pm2 restart paypoq-web
curl http://localhost:3000

pm2 restart paypoq-bot
pnpm deploy:smoke
```

Bot restarts last so Telegram behavior is only resumed after API/Web are
healthy.

## Restart on reboot

Configure PM2 startup:

```bash
pm2 startup
```

Follow the command printed by PM2.

Then:

```bash
pm2 save
```

Verify after reboot:

```bash
pm2 status
curl http://localhost:3001/health/readiness
pnpm deploy:smoke
```

## Graceful shutdown

The PM2 config sets `kill_timeout` to allow Node processes to receive shutdown
signals before forced termination.

Operationally:

1. Stop Bot first for risky incidents.
2. Stop/restart API after Bot if writes must be paused.
3. Start API before Bot.

## Rollback

1. Stop Bot.
2. Checkout previous release tag/commit.
3. Build API/Web/Bot.
4. Restart API/Web.
5. Start Bot.
6. Run `pnpm deploy:smoke`.
7. Restore DB only if migration/data corruption requires it.

## Status

```text
PM2 deployment strategy: READY FOR FIRST FACTORY
```
