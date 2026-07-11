# Production Readiness Checklist v1

Status: Active  
Date: 2026-07-11  
Related: `PAYPOQ_OS_FINAL_GO_DECISION_V1.md`, `SECRETS_MANAGEMENT_V1.md`,
`BACKUP_AND_RECOVERY_V1.md`, `PM2_PRODUCTION_DEPLOYMENT_V1.md`,
`DOCKER_DEPLOYMENT_V1.md`, `MVP_KNOWN_LIMITATIONS_V2.md`

Legend:

| Status | Meaning |
| --- | --- |
| **DONE** | Implemented in code/docs; ops must still apply on target server |
| **PARTIAL** | Code/docs exist; remaining work is ops, multi-instance, or factory process |
| **OPS** | Cannot be finished in git alone — named owner on target server |
| **OPEN** | Not done; P1/P2 backlog |

---

## 1. P0 — Production launch blockers

### 1.1 Secrets and configuration

| Item | Status | Notes |
| --- | --- | --- |
| Production secrets rotated (JWT, platform JWT, telegram link, bot key, TV token, DB) | **OPS** | Env validation rejects weak/placeholder secrets in `NODE_ENV=production` (`apps/api/src/config/env.validation.ts`) |
| Secrets in password manager; not git/image/chat | **OPS** | Policy: `SECRETS_MANAGEMENT_V1.md` |
| `apps/api/.env` / `.env.production` outside git | **DONE** | `.gitignore`; examples only in repo |
| `NEXT_PUBLIC_API_URL` = real HTTPS API | **OPS** | Template: `apps/web/.env.example` |
| `CORS_ORIGIN` = real web origin only | **DONE** (code) + **OPS** (value) | Production rejects `*` and `localhost` |
| `NODE_ENV=production` | **OPS** | |
| Cookies HTTPS Secure + domain | **DONE** | HttpOnly + Secure + SameSite strict in prod (`auth.controller.ts`) |
| Demo passwords not on production DB | **DONE** (guard) + **OPS** | `seed.ts` / `demo-seed.ts` refuse `NODE_ENV=production` |
| No `demo:reset` / demo seed on production | **DONE** (guard) + **OPS** | `demo-reset.mjs` + seed guards |

### 1.2 Infrastructure and deploy

| Item | Status | Notes |
| --- | --- | --- |
| Server CPU/RAM/disk | **OPS** | |
| Postgres dedicated user/password/network | **OPS** | |
| Deploy method PM2 **or** Docker (not mixed) | **DONE** (docs) + **OPS** | `PM2_PRODUCTION_DEPLOYMENT_V1.md`, `DOCKER_DEPLOYMENT_V1.md` |
| Reverse proxy + TLS | **PARTIAL** | Example: `configs/nginx.paypoq.example.conf` — install TLS on server |
| API/Web separate domain or path | **OPS** | nginx example uses `api.` / `app.` |
| Health `/health`, `/health/readiness` | **DONE** | |
| Process restart policy | **DONE** (docs/config) | PM2 ecosystem / Docker restart |
| `prisma migrate deploy` only in prod | **DONE** (docs) | |
| Deploy order: backup → migrate → restart → smoke → rollback | **DONE** (docs) | PM2/Docker runbooks |

### 1.3 Backup and restore

| Item | Status | Notes |
| --- | --- | --- |
| Daily automated full backup | **PARTIAL** | `pnpm backup:db` + `configs/backup-cron.example` — install cron **OPS** |
| Manual backup before deploy/migrate | **OPS** | Documented in backup + deploy docs |
| Off-server copy (S3/disk) | **OPS** | Not automated in repo |
| Retention policy | **PARTIAL** | Documented guidance in `BACKUP_AND_RECOVERY_V1.md` |
| Restore rehearsal once | **PARTIAL** | Local rehearsal DONE 2026-07-11 (`docs/OPS_REHEARSAL_LOG_V1.md`); re-run on target server |
| Named backup/restore owners | **OPS** | |
| RTO/RPO written | **PARTIAL** | Template in backup doc (fill real numbers) |

### 1.4 Factory TV and open endpoints

| Item | Status | Notes |
| --- | --- | --- |
| `/tv` not on public internet (or VPN) | **OPS** | nginx example shows IP allowlist pattern |
| Strong `FACTORY_TV_ACCESS_TOKEN` + rotation | **DONE** (validation) + **OPS** | |
| TV token server-side via `/api/factory-tv/summary` (not `NEXT_PUBLIC_*`) | **DONE** | Web proxy + runtime env; still keep `/tv` internal |
| `/admin` IP allowlist / VPN | **OPS** | nginx comment block |

### 1.5 Telegram bot

| Item | Status | Notes |
| --- | --- | --- |
| One bot process per token | **DONE** (docs) + **OPS** | `TELEGRAM_BOT_RUNBOOK_V1.md` |
| `BOT_INTERNAL_API_KEY` private | **DONE** (validation) + **OPS** | nginx can lock `/telegram/bot` |
| Bot API URL private | **OPS** | `apps/bot/.env.example` |
| Crash restart + logs | **DONE** (PM2/Docker) + **OPS** | |
| `smoke:telegram` on prod-like env | **OPS** | CI runs smoke on test DB |

### 1.6 Post-deploy verification

| Item | Status | Notes |
| --- | --- | --- |
| `pnpm deploy:smoke` on target | **OPS** | Script exists |
| Manual multi-role login | **OPS** | |
| Full chain: production → warehouse → order → pay → deliver | **OPS** | Walkthrough: `BUSINESS_ACCEPTANCE_WALKTHROUGH_V1.md` |
| Payroll calculate smoke | **OPS** | |
| Factory TV internal only | **OPS** | |

### 1.7 Human ownership

| Role | Status |
| --- | --- |
| Deploy owner | **OPS** |
| Backup/restore owner | **OPS** |
| Secret owner | **OPS** |
| Monitoring/incident owner | **OPS** |
| Factory super-user | **OPS** |
| Limitations explained in writing | **DONE** (doc) + **OPS** (sign-off) |

**P0 gate:** all **OPS** rows named and executed on the target server. Code cannot mark P0 complete alone.

---

## 2. P1 — Small factory “GO”

### 2.1 Security hardening

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| S1 | Login/refresh rate limit (IP + subject) | **DONE** | `auth-rate-limiter.service.ts` (in-memory; multi-instance needs edge/Redis) |
| S2 | Helmet / security headers API + Web | **DONE** | API `helmet`; Web `next.config.ts` headers |
| S3 | CSP (Web) | **DONE** | Next security headers CSP |
| S4 | Failed login audit/log | **PARTIAL** | Known user → audit log; unknown email → structured warn log |
| S5 | Access token storage review | **DONE** | Web: memory only (not localStorage); mobile SecureStore |
| S6 | Refresh cookie HttpOnly Secure SameSite | **DONE** | |
| S7 | Platform admin strong password + MFA | **PARTIAL** | Strong secrets required; MFA **OPEN** |
| S8 | Demo accounts separated from prod bootstrap | **DONE** | seed/demo blocked in production |
| S9 | API only via reverse proxy; DB port closed | **OPS** | nginx example |
| S10 | Dependency audit | **OPEN** | Manual `pnpm audit`; no Renovate job yet |
| S11 | CORS allowlist only | **DONE** | |
| S12 | Bot/internal endpoints not public | **OPS** | nginx private allow |

### 2.2 Monitoring

| Item | Status |
| --- | --- |
| Process uptime | **OPS** (PM2/Docker) |
| Disk/RAM/CPU alerts | **OPS** |
| Postgres alerts | **OPS** |
| 5xx / structured logs / rotation | **PARTIAL** — Nest logs; JSON/rotation **OPS** |
| Request correlation id | **OPEN** |
| Alert channel named | **OPS** |
| Health in external monitor | **OPS** |
| Slow query awareness | **OPEN** |

### 2.3 CI/CD

| Item | Status |
| --- | --- |
| CI install → build (api/web/bot/mobile) | **DONE** | `.github/workflows/ci.yml` |
| CI smoke (mvp + telegram + employee-self-service) | **DONE** |
| PR green CI rule | **OPS** (GitHub branch protection) |
| Version tags / changelog | **OPEN** / **OPS** |
| Staging environment | **OPS** |
| Staging smoke → prod | **OPS** |
| Rollback procedure | **PARTIAL** (docs) |
| Web standalone deploy clarity | **DONE** | `output: "standalone"` |

### 2.4–2.8 Ops / auth lifecycle / multi-factory / QA / business

| Area | Status |
| --- | --- |
| Off-server backup automation | **OPS** |
| Monthly restore drill calendar | **OPS** |
| Operator create/password/disable process | **PARTIAL** — product supports; written factory SOP **OPS** |
| Multi-factory matrix tests | **PARTIAL** — code + `smoke:organization` when multi |
| QA suites | **DONE** in CI for core; target-server gate **OPS** |
| Playwright E2E | **OPEN** (optional) |
| Business acceptance walkthrough | **OPS** | Doc ready |
| Training + limitations sign-off | **OPS** |

---

## 3. P2 — Resilience (1–4 weeks)

Tracked as product backlog — not launch blockers. See `PRODUCT_ROADMAP_V1.md` and `MVP_KNOWN_LIMITATIONS_V2.md`.

Highlights already improved in product code:

- Stage-only salary rates + active unique index
- Multi-worker stage move + stage assignment enforcement
- Operator-facing Uzbek API errors
- Frontend RBAC default-deny

Still open (examples): Excel export, stage move correction, finance SoD, bulk payroll UI, pagination at scale, notification center. (Order edit/cancel + unpaid deliver + logistics expense: shipped 2026-07-11.)

---

## 4. P3 — Intentionally deferred

IoT, full ledger/VAT, microservices/Kafka, partial delivery, self-service SaaS onboarding, full push notification platform — see limitations doc.

---

## 5. Multi-factory SaaS (C)

Verdict remains **NO-GO** until platform MFA, billing/onboarding, multi-tenant pen-test, SLA, and legal pack exist. Do not treat single-factory GO as SaaS GO.

---

## Code changes that help this checklist (2026-07-11)

- Production secret denylist + required `DATABASE_URL` + strict `CORS_ORIGIN`
- Helmet + trust proxy on API
- Web security headers + CSP
- Demo/baseline seed blocked in production
- nginx example + bot `.env.example` + backup cron example
- Failed unknown-email login warn log
- Health readiness stricter secret checks in production

## How to use this document

1. Print or copy into ops tracker.
2. Assign every **OPS** row a name + date.
3. When all P0 OPS rows are checked on the **target** server and `pnpm deploy:smoke` passes, small-factory verdict can move from **GO WITH LIMITATIONS** → **GO**.
4. Keep this file updated when code closes an **OPEN** item.
