/**
 * Production hardening acceptance — proves the release blockers found by the
 * Production / Deployment Readiness Audit stay closed.
 *
 * Two layers:
 *   1. STATIC  — the shipped source/config cannot reintroduce the blocker
 *                (no demo seeding in the image, no boot-time migrations, no
 *                wildcard CORS in manifests, no hosted-API fallbacks).
 *   2. RUNTIME — a real API process on a DISPOSABLE database proves the
 *                behaviour (fail-closed CORS, readiness vs schema drift,
 *                dangerous routes absent, operator bootstrap CLI rules).
 *
 * Never touches the shared development database: it creates and drops its own
 * `paypoq_hardening_*` databases through the local Postgres container.
 *
 * Usage (Docker Postgres running, API built):
 *   node scripts/production-hardening-acceptance.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PG_CONTAINER = process.env.PG_CONTAINER || 'sockai-postgres-1';
const PG_PORT = process.env.PG_PORT || '55432';
const PG_HOST = process.env.PGHOST || 'localhost';
/**
 * Local workstation talks to the dockerised Postgres via `docker exec`; CI uses
 * a Postgres service container with the psql client on PATH. Both create and
 * drop their own disposable databases — never the shared development one.
 */
const USE_PSQL_CLIENT =
  process.env.HARDENING_PG_MODE === 'service' ||
  spawnSync('docker', ['inspect', PG_CONTAINER], { stdio: 'ignore' }).status !== 0;
const API_PORT = Number(process.env.HARDENING_API_PORT || 3996);
const STRONG_SECRET = `Hardening${randomBytes(24).toString('hex')}`;

const results = [];
function record(layer, name, passed, detail) {
  results.push({ layer, name, passed, detail });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${layer}] ${name}${detail ? ` — ${detail}` : ''}`);
}

const read = (relPath) => fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
const exists = (relPath) => fs.existsSync(path.join(repoRoot, relPath));

/**
 * Resolves the real docker-compose.yml with `docker compose config` (no
 * containers are started) to prove the database policy as compose applies it.
 */
function runComposeDatabaseConfigChecks() {
  if (spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' }).status !== 0) {
    console.log('[SKIP] [compose] docker compose not available; database config checks not run');
    return;
  }
  const required = {
    CORS_ORIGIN: 'https://app.example.com',
    NEXT_PUBLIC_API_URL: 'https://api.example.com',
    JWT_ACCESS_SECRET: STRONG_SECRET,
    PLATFORM_JWT_ACCESS_SECRET: STRONG_SECRET,
    TELEGRAM_LINK_TOKEN_SECRET: STRONG_SECRET,
    BOT_INTERNAL_API_KEY: STRONG_SECRET,
    FACTORY_TV_ACCESS_TOKEN: STRONG_SECRET,
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paypoq-compose-'));
  const envFile = path.join(dir, 'compose.env');
  // Values are single-quoted so the env file keeps `#`, `$` etc. literally.
  const resolve = (extra) => {
    const values = { ...required, ...extra };
    fs.writeFileSync(envFile, Object.entries(values).map(([k, v]) => `${k}='${v}'`).join('\n') + '\n');
    const env = { ...process.env };
    for (const key of ['POSTGRES_PASSWORD', 'POSTGRES_USER', 'POSTGRES_DB', 'POSTGRES_PORT', 'DATABASE_URL']) delete env[key];
    const run = spawnSync('docker', ['compose', '-f', 'docker-compose.yml', '--env-file', envFile, '--profile', 'migrate', '--profile', 'bootstrap', 'config', '--format', 'json'], {
      cwd: repoRoot,
      env,
      encoding: 'utf8',
    });
    return { ...run, config: run.status === 0 ? JSON.parse(run.stdout) : { services: {} } };
  };
  const clientUrls = (config) => ['api', 'migrate', 'bootstrap'].map((name) => config.services[name]?.environment?.DATABASE_URL);

  try {
    const hexPassword = randomBytes(24).toString('hex');
    const hexUrl = `postgresql://postgres:${hexPassword}@postgres:5432/paypoq_os?schema=public`;

    const noPassword = resolve({ DATABASE_URL: hexUrl });
    record('compose', 'Compose refuses to resolve without POSTGRES_PASSWORD', noPassword.status !== 0 && /POSTGRES_PASSWORD/.test(noPassword.stderr), `exit=${noPassword.status}`);

    const noUrl = resolve({ POSTGRES_PASSWORD: hexPassword });
    record('compose', 'Compose refuses to resolve without an explicit DATABASE_URL (no derived fallback)', noUrl.status !== 0 && /DATABASE_URL is required/.test(noUrl.stderr), `exit=${noUrl.status}`);

    // Every URI-reserved character: raw for postgres, percent-encoded in the URI.
    const rawPassword = `p@ss:w/rd%#?x&y=z ${randomBytes(4).toString('hex')}`;
    const encodedUrl = `postgresql://postgres:${encodeURIComponent(rawPassword)}@postgres:5432/paypoq_os?schema=public`;
    const reserved = resolve({ POSTGRES_PASSWORD: rawPassword, DATABASE_URL: encodedUrl });
    const urls = clientUrls(reserved.config);
    record(
      'compose',
      'Reserved-character password: postgres gets it raw, clients get the explicit URI unchanged',
      reserved.status === 0 &&
        reserved.config.services.postgres?.environment?.POSTGRES_PASSWORD === rawPassword &&
        urls.every((url) => url === encodedUrl) &&
        decodeURIComponent(new URL(encodedUrl).password) === rawPassword,
      `exit=${reserved.status}`,
    );

    const externalUrl = 'postgresql://app_user:ext%2Fsecret@db.internal.example:6543/paypoq_prod?schema=public&sslmode=require';
    const external = resolve({ POSTGRES_PASSWORD: hexPassword, DATABASE_URL: externalUrl });
    record(
      'compose',
      'Explicit external DATABASE_URL is used verbatim by api/migrate/bootstrap',
      external.status === 0 && clientUrls(external.config).every((url) => url === externalUrl),
      `exit=${external.status}`,
    );

    const published = external.config.services.postgres?.ports ?? [];
    record(
      'compose',
      'Resolved PostgreSQL publication is loopback-only',
      published.length > 0 && published.every((port) => port.host_ip === '127.0.0.1'),
      published.map((port) => `${port.host_ip ?? '*'}:${port.published}`).join(','),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ----------------------------------------------------------------- static
function runStaticChecks() {
  const apiDockerfile = read('apps/api/Dockerfile');
  record(
    'static',
    'API image entrypoint starts the API only (no demo seed, no boot migration)',
    !/ALLOW_DEMO_SEED/.test(apiDockerfile) &&
      !/seed\.js/.test(apiDockerfile) &&
      !/empty-seed\.js/.test(apiDockerfile) &&
      /CMD \["node", "apps\/api\/dist\/src\/main\.js"\]/.test(apiDockerfile),
  );
  record(
    'static',
    'API image entrypoint has no `|| true` masking around release commands',
    !/\|\| true/.test(apiDockerfile),
  );

  const mainTs = read('apps/api/src/main.ts');
  record(
    'static',
    'API startup does not run migrations',
    !/runAutoMigrations|prisma-auto-migrate/.test(mainTs),
  );
  const gateIndex = mainTs.indexOf('assertSchemaReadyForStartup(');
  const listenIndex = mainTs.indexOf('app.listen(');
  record(
    'static',
    'API startup verifies the schema (read-only) before app.listen',
    gateIndex !== -1 && listenIndex !== -1 && gateIndex < listenIndex,
  );
  record(
    'static',
    'Boot-time migration runner is removed from the codebase',
    !exists('apps/api/src/prisma/prisma-auto-migrate.ts'),
  );

  const health = read('apps/api/src/health/health.controller.ts');
  record(
    'static',
    'Health controller exposes no bootstrap/migrate/diagnostic routes',
    !/@Get\('bootstrap'\)/.test(health) &&
      !/@Get\('migrate'\)/.test(health) &&
      !/@Get\('diagnostic'\)/.test(health),
  );
  record(
    'static',
    'Health controller contains no hardcoded credential',
    !/ChangeMe123!/.test(health),
  );

  const seed = read('apps/api/prisma/seed.ts');
  const emptySeed = read('apps/api/prisma/empty-seed.ts');
  record(
    'static',
    'Demo baseline seed refuses NODE_ENV=production unconditionally',
    /NODE_ENV === 'production'/.test(seed) && !/ALLOW_DEMO_SEED !== 'true'/.test(seed),
  );
  record(
    'static',
    'Known-password empty-seed refuses NODE_ENV=production',
    /NODE_ENV === 'production'/.test(emptySeed),
  );

  const renderYaml = read('render.yaml');
  record(
    'static',
    'Render manifest ships no wildcard CORS origin',
    !/CORS_ORIGIN[\s\S]{0,80}value:\s*'\*'/.test(renderYaml),
  );
  record(
    'static',
    'Render API service uses readiness for traffic health checks',
    /healthCheckPath:\s*\/health\/readiness/.test(renderYaml),
  );

  const compose = read('docker-compose.yml');
  record(
    'static',
    'Compose API healthcheck uses readiness',
    /health\/readiness/.test(compose),
  );

  // --- Client-IP boundary for auth rate limiting (AGENTS.md §7.10) ---
  const nginxExample = read('configs/nginx.paypoq.example.conf');
  const pm2Config = read('configs/pm2.ecosystem.config.cjs');
  const authProxySource = read('apps/web/src/lib/api/auth-proxy.ts');
  record(
    'static',
    'Compose publishes api/web on 127.0.0.1 by default (no proxy bypass)',
    /"\$\{API_BIND_ADDRESS:-127\.0\.0\.1\}:\$\{API_PORT:-3001\}:3001"/.test(compose) &&
      /"\$\{WEB_BIND_ADDRESS:-127\.0\.0\.1\}:\$\{WEB_PORT:-3000\}:3000"/.test(compose) &&
      !/-\s*"\$\{(API|WEB)_PORT:-300[01]\}:300[01]"/.test(compose),
  );
  record(
    'static',
    'Compose API trusts forwarding only from its own network and loopback',
    /TRUSTED_PROXIES: \$\{TRUSTED_PROXIES:-loopback,uniquelocal\}/.test(compose),
  );
  record(
    'static',
    'nginx example overwrites X-Forwarded-For (never appends caller values)',
    !/\$proxy_add_x_forwarded_for/.test(nginxExample) &&
      (nginxExample.match(/^\s*proxy_set_header X-Forwarded-For \$remote_addr;/gm) ?? []).length >= 4,
  );
  record(
    'static',
    'PM2 binds API and web to 127.0.0.1 and trusts loopback only',
    /API_BIND_HOST: sharedEnv\.API_BIND_HOST \|\| '127\.0\.0\.1'/.test(pm2Config) &&
      /TRUSTED_PROXIES: sharedEnv\.TRUSTED_PROXIES \|\| 'loopback'/.test(pm2Config) &&
      /HOSTNAME: sharedEnv\.WEB_HOSTNAME \|\| '127\.0\.0\.1'/.test(pm2Config),
  );
  record(
    'static',
    'PM2 web BFF and bot call the API on loopback, not via the public proxy',
    /API_INTERNAL_URL: sharedEnv\.API_INTERNAL_URL \|\| apiInternalUrl/.test(pm2Config) &&
      /API_BASE_URL: sharedEnv\.API_BASE_URL \|\| apiInternalUrl/.test(pm2Config) &&
      /const apiInternalUrl = `http:\/\/127\.0\.0\.1:/.test(pm2Config),
  );
  const nextConfig = read('apps/web/next.config.ts');
  record(
    'static',
    'Production web CSP limits connect-src to self + the baked API origin',
    /return `'self' \$\{new URL\(apiUrl\)\.origin\}`/.test(nextConfig) &&
      /connect-src \$\{connectSrc\(\)\}/.test(nextConfig) &&
      !/connect-src 'self' https: http: ws:;?"/.test(nextConfig),
  );
  record(
    'static',
    'API trust proxy uses the TRUSTED_PROXIES function, not a blanket hop count',
    /createTrustedProxyFn\(/.test(mainTs) && !/'trust proxy',\s*(1|true)\b/.test(mainTs),
  );
  // --- PostgreSQL exposure and credential policy ---
  const dockerEnvExample = read('.env.docker.example');
  record(
    'static',
    'Compose publishes PostgreSQL on 127.0.0.1 only',
    /-\s*"127\.0\.0\.1:\$\{POSTGRES_PORT:-55432\}:5432"/.test(compose) &&
      !/-\s*"\$\{POSTGRES_PORT:-55432\}:5432"/.test(compose) &&
      !/-\s*"(0\.0\.0\.0:)?55432:5432"/.test(compose),
  );
  record(
    'static',
    'Compose has no default database password',
    /POSTGRES_PASSWORD: \$\{POSTGRES_PASSWORD:\?/.test(compose) &&
      !/POSTGRES_PASSWORD:-/.test(compose) &&
      !/postgres:postgres@/.test(compose),
  );
  record(
    'static',
    '.env.docker.example ships no database password or connection URI',
    /^POSTGRES_PASSWORD=$/m.test(dockerEnvExample) &&
      /^DATABASE_URL=$/m.test(dockerEnvExample) &&
      !/^[^#\n]*postgres:postgres@/m.test(dockerEnvExample),
  );
  record(
    'static',
    'Compose never builds DATABASE_URL from POSTGRES_PASSWORD; it is required explicitly',
    (compose.match(/DATABASE_URL: \$\{DATABASE_URL:\?/g) ?? []).length === 3 &&
      !/DATABASE_URL:.*\$\{POSTGRES_PASSWORD/.test(compose.replace(/#.*$/gm, '')),
  );
  runComposeDatabaseConfigChecks();

  record(
    'static',
    'Auth BFF forwards one validated client IP, never the raw chain or X-Real-IP',
    /forwardHeaders\.set\("x-forwarded-for", clientIp\)/.test(authProxySource) &&
      !/request\.headers\.get\("x-real-ip"\)/.test(authProxySource),
  );
  record(
    'static',
    'Compose requires an explicit CORS origin',
    /CORS_ORIGIN:\s*\$\{CORS_ORIGIN:\?/.test(compose),
  );

  const webDockerfile = read('apps/web/Dockerfile');
  record(
    'static',
    'Web image requires an explicit API origin (no hosted default)',
    !/ARG NEXT_PUBLIC_API_URL=/.test(webDockerfile) && /test -n "\$NEXT_PUBLIC_API_URL"/.test(webDockerfile),
  );

  for (const file of [
    'apps/web/src/lib/api/client.ts',
    'apps/web/src/lib/api/platform-client.ts',
    'apps/web/src/lib/api/auth-proxy.ts',
  ]) {
    record(
      'static',
      `${file} has no hardcoded hosted API fallback`,
      !/onrender\.com/.test(read(file)),
    );
  }

  // A Platform Admin creating a tenant Owner must never be handed a known
  // password by default: the field starts empty and the API generates a
  // strong one-time password it returns exactly once.
  const adminTenantPage = read('apps/web/src/app/admin/tenants/[id]/page.tsx');
  record(
    'static',
    'Platform Admin owner form prefills no default password',
    !/ChangeMe123!/.test(adminTenantPage) && /password: ""/.test(adminTenantPage),
  );

  const webSources = execFileSync(
    'bash',
    ['-lc', "grep -rl 'ChangeMe123!' apps/web/src apps/api/src 2>/dev/null || true"],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
  record(
    'static',
    'No known default credential remains in application source',
    webSources === '',
    webSources || 'none',
  );

  const smoke = read('scripts/production-smoke-test.mjs');
  record(
    'static',
    'Production smoke contains no demo credentials or demo tenant',
    !/ChangeMe123!/.test(smoke) && !/@paypoq\.local/.test(smoke) && !/Demo Paypoq Factory/.test(smoke),
  );
  record(
    'static',
    'Production smoke requires operator-supplied credentials',
    /requireEnv\('SMOKE_PLATFORM_ADMIN_PASSWORD'\)/.test(smoke) && /requireEnv\('SMOKE_TENANT_PASSWORD'\)/.test(smoke),
  );
}

// ---------------------------------------------------------------- runtime
function psqlArgs(db, extra) {
  return USE_PSQL_CLIENT
    ? ['-h', PG_HOST, '-p', PG_PORT, '-U', 'postgres', ...(db ? ['-d', db] : []), ...extra]
    : ['exec', PG_CONTAINER, 'psql', '-U', 'postgres', ...(db ? ['-d', db] : []), ...extra];
}

function psqlEnv() {
  return { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'postgres' };
}

function psql(db, sql) {
  const bin = USE_PSQL_CLIENT ? 'psql' : 'docker';
  return execFileSync(bin, psqlArgs(db, ['-Atc', sql]), {
    encoding: 'utf8',
    env: psqlEnv(),
  }).trim();
}

function createDb(name) {
  const bin = USE_PSQL_CLIENT ? 'psql' : 'docker';
  spawnSync(bin, psqlArgs('postgres', ['-c', `DROP DATABASE IF EXISTS ${name};`]), { env: psqlEnv() });
  execFileSync(bin, psqlArgs('postgres', ['-c', `CREATE DATABASE ${name};`]), { env: psqlEnv() });
}

function dropDb(name) {
  const bin = USE_PSQL_CLIENT ? 'psql' : 'docker';
  spawnSync(bin, psqlArgs('postgres', ['-c', `DROP DATABASE IF EXISTS ${name};`]), { env: psqlEnv() });
}

/** Drops a database even while an API still holds connections to it. */
function forceDropDb(name) {
  const bin = USE_PSQL_CLIENT ? 'psql' : 'docker';
  spawnSync(bin, psqlArgs('postgres', ['-c', `DROP DATABASE IF EXISTS ${name} WITH (FORCE);`]), { env: psqlEnv() });
}

/** Creates a disposable database and applies the release migration to it. */
function createMigratedDb(name) {
  createDb(name);
  const migrate = spawnSync('pnpm', ['--filter', '@paypoq/api', 'prisma:migrate:deploy'], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: dbUrl(name) },
    encoding: 'utf8',
  });
  if (migrate.status !== 0) throw new Error(`migrate deploy failed for ${name}: ${migrate.stderr}`);
}

const latestMigrationName = () =>
  fs
    .readdirSync(path.join(repoRoot, 'apps/api/prisma/migrations'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .at(-1);

/** Asserts a production API refused to start: never listened, exited non-zero, reason logged. */
function recordRefusedStart(api, name, expectedLog) {
  const code = api.exitCode();
  record(
    'runtime',
    name,
    !api.alive && !api.listened && typeof code === 'number' && code !== 0 && expectedLog.test(api.log()),
    `alive=${api.alive} listened=${api.listened} exit=${code}`,
  );
}

const dbUrl = (name) => `postgresql://postgres:postgres@${PG_HOST}:${PG_PORT}/${name}?schema=public`;

function productionEnv(databaseUrl, extra = {}) {
  return {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(API_PORT),
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: STRONG_SECRET,
    PLATFORM_JWT_ACCESS_SECRET: STRONG_SECRET,
    TELEGRAM_LINK_TOKEN_SECRET: STRONG_SECRET,
    BOT_INTERNAL_API_KEY: STRONG_SECRET,
    FACTORY_TV_ACCESS_TOKEN: STRONG_SECRET,
    CORS_ORIGIN: 'https://app.example.com',
    BUILD_SHA: 'hardening-test-sha',
    ...extra,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts the built API; resolves with helpers plus whether it stayed alive. */
async function startApi(env) {
  const child = spawn('node', ['apps/api/dist/src/main.js'], {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d.toString()));
  child.stderr.on('data', (d) => (log += d.toString()));

  let exited = false;
  let exitCode = null;
  let listened = false;
  child.on('exit', (code) => {
    exited = true;
    exitCode = code;
  });

  for (let i = 0; i < 20 && !exited; i += 1) {
    await sleep(700);
    try {
      const res = await fetch(`http://127.0.0.1:${API_PORT}/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        listened = true;
        break;
      }
    } catch {
      /* keep waiting */
    }
  }

  return {
    alive: !exited,
    listened,
    exitCode: () => exitCode,
    log: () => log,
    stop: async () => {
      if (!exited) child.kill();
      await sleep(600);
    },
  };
}

async function get(pathname, headers = {}) {
  try {
    const res = await fetch(`http://127.0.0.1:${API_PORT}${pathname}`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  } catch (error) {
    return { status: 0, ok: false, data: String(error), headers: new Headers() };
  }
}

function runBootstrapCli(env) {
  return spawnSync('node', ['apps/api/scripts/bootstrap-platform-admin.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

async function runRuntimeChecks() {
  const healthyDb = `paypoq_hardening_${Date.now()}`;
  const driftDb = `${healthyDb}_drift`;
  const failedDb = `${healthyDb}_failed`;
  const pendingDb = `${healthyDb}_pending`;
  const lostDb = `${healthyDb}_lost`;

  createDb(healthyDb);
  createDb(driftDb);

  try {
    // Official release migration must succeed on an empty database.
    const migrate = spawnSync('pnpm', ['--filter', '@paypoq/api', 'prisma:migrate:deploy'], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: dbUrl(healthyDb) },
      encoding: 'utf8',
    });
    record('runtime', 'prisma migrate deploy succeeds on an empty database', migrate.status === 0, `exit=${migrate.status}`);
    for (const name of [failedDb, pendingDb, lostDb]) createMigratedDb(name);

    // Drift database: migration history claims applied, but no tables exist.
    psql(
      driftDb,
      'CREATE TABLE "_prisma_migrations" (id varchar(36) primary key, checksum varchar(64) not null, finished_at timestamptz, migration_name varchar(255) not null, logs text, rolled_back_at timestamptz, started_at timestamptz not null default now(), applied_steps_count integer not null default 0);',
    );
    psql(
      driftDb,
      "insert into \"_prisma_migrations\"(id,checksum,finished_at,migration_name,applied_steps_count) values (gen_random_uuid()::text,'x',now(),'20260623183655_init',1);",
    );

    // --- CORS fails closed in production ---
    for (const [label, origin] of [
      ['wildcard', '*'],
      ['localhost', 'http://localhost:3000'],
      ['empty', ''],
    ]) {
      const api = await startApi(productionEnv(dbUrl(healthyDb), { CORS_ORIGIN: origin }));
      record('runtime', `Production startup rejects CORS_ORIGIN (${label})`, !api.alive, api.alive ? 'process stayed up' : 'exited');
      await api.stop();
    }

    // --- Valid single and multiple https origins boot ---
    const multi = await startApi(
      productionEnv(dbUrl(healthyDb), { CORS_ORIGIN: 'https://app.example.com,https://admin.example.com' }),
    );
    record('runtime', 'Production startup accepts an explicit https allowlist', multi.alive);
    await multi.stop();

    // --- Healthy schema: readiness ok, routes gone, CORS behaviour ---
    const healthy = await startApi(productionEnv(dbUrl(healthyDb)));
    assert(healthy.alive, `API should start against a migrated database: ${healthy.log().slice(-400)}`);

    const health = await get('/health');
    record('runtime', 'GET /health reports the injected build SHA', health.data?.version === 'hardening-test-sha', `version=${health.data?.version}`);

    const readiness = await get('/health/readiness');
    record('runtime', 'Readiness is 200 on a migrated database', readiness.status === 200, `status=${readiness.status}`);

    for (const route of ['/health/bootstrap', '/health/migrate', '/health/diagnostic']) {
      const res = await get(route);
      record('runtime', `${route} returns 404 in production`, res.status === 404, `status=${res.status}`);
    }

    const allowed = await get('/health', { Origin: 'https://app.example.com' });
    record(
      'runtime',
      'Allowed browser Origin receives matching ACAO + credentials',
      allowed.headers.get('access-control-allow-origin') === 'https://app.example.com' &&
        allowed.headers.get('access-control-allow-credentials') === 'true',
      `acao=${allowed.headers.get('access-control-allow-origin')}`,
    );

    const evil = await get('/health', { Origin: 'https://evil.example' });
    record(
      'runtime',
      'Disallowed browser Origin receives no ACAO',
      evil.headers.get('access-control-allow-origin') === null,
      `acao=${evil.headers.get('access-control-allow-origin')}`,
    );

    const leakFields = JSON.stringify(readiness.data ?? {});
    record(
      'runtime',
      'Readiness response leaks no table names, SQL text or secrets',
      !/information_schema|_prisma_migrations|SELECT|password|secret/i.test(leakFields),
      leakFields.slice(0, 120),
    );
    await healthy.stop();

    // --- Schema drift: a production API must refuse to start ---
    const drift = await startApi(productionEnv(dbUrl(driftDb)));
    recordRefusedStart(drift, 'Production startup refuses a database whose application schema is missing', /Refusing to start: .*essential tables/);
    await drift.stop();

    // --- Database unreachable: schema cannot be verified, so refuse to start ---
    const down = await startApi(productionEnv(`postgresql://postgres:postgres@${PG_HOST}:1/nope?schema=public`));
    recordRefusedStart(down, 'Production startup refuses when the database is unreachable', /Refusing to start: Database is unreachable/);
    await down.stop();

    // --- Release migration failed (unresolved, possibly partially applied) ---
    const latest = latestMigrationName();
    psql(failedDb, `update "_prisma_migrations" set finished_at = null where migration_name = '${latest}';`);
    const failedStart = await startApi(productionEnv(dbUrl(failedDb)));
    recordRefusedStart(failedStart, 'Production startup refuses a failed/unfinished release migration', new RegExp(`Refusing to start: .*failed or unfinished migrations \\(${latest}\\)`));
    await failedStart.stop();

    // --- Release migration skipped: this build's migration was never applied ---
    psql(pendingDb, `delete from "_prisma_migrations" where migration_name = '${latest}';`);
    const pendingStart = await startApi(productionEnv(dbUrl(pendingDb)));
    recordRefusedStart(pendingStart, 'Production startup refuses a database missing this build\'s migrations', new RegExp(`Refusing to start: .*missing migrations required by this build \\(${latest}\\)`));
    await pendingStart.stop();

    // --- Development keeps booting (one warning) but readiness still refuses ---
    const devPending = await startApi(
      productionEnv(dbUrl(pendingDb), { NODE_ENV: 'development', CORS_ORIGIN: 'http://localhost:3000' }),
    );
    const devReadiness = await get('/health/readiness');
    record(
      'runtime',
      'Development startup continues on pending migrations with a warning; readiness is 503',
      devPending.alive &&
        devReadiness.status === 503 &&
        (devPending.log().match(/Continuing because NODE_ENV=development/g) ?? []).length === 1,
      `alive=${devPending.alive} readiness=${devReadiness.status}`,
    );
    await devPending.stop();

    // --- Database lost after a healthy start: readiness must refuse traffic ---
    const lost = await startApi(productionEnv(dbUrl(lostDb)));
    const lostBefore = await get('/health/readiness');
    forceDropDb(lostDb);
    const lostAfter = await get('/health/readiness');
    record(
      'runtime',
      'Readiness is 503 when the database becomes unreachable after startup',
      lost.alive && lostBefore.status === 200 && lostAfter.status === 503,
      `before=${lostBefore.status} after=${lostAfter.status}`,
    );
    await lost.stop();

    // --- Invalid secret still fails startup (regression guard) ---
    const weak = await startApi(
      productionEnv(dbUrl(healthyDb), { JWT_ACCESS_SECRET: 'local-development-jwt-secret-change-me' }),
    );
    record('runtime', 'Production startup fails on a placeholder secret', !weak.alive);
    await weak.stop();

    // --- Invalid TRUSTED_PROXIES must fail startup, not trust everything/nothing ---
    const badTrust = await startApi(productionEnv(dbUrl(healthyDb), { TRUSTED_PROXIES: 'everything' }));
    record('runtime', 'Production startup refuses an invalid TRUSTED_PROXIES value', !badTrust.alive && !badTrust.listened);
    await badTrust.stop();

    // --- Operator bootstrap CLI ---
    const bootstrapEnv = { DATABASE_URL: dbUrl(healthyDb) };
    const missing = runBootstrapCli({ ...bootstrapEnv, PLATFORM_BOOTSTRAP_EMAIL: 'ops@example.com', PLATFORM_BOOTSTRAP_PASSWORD: '' });
    record('runtime', 'Bootstrap CLI exits non-zero without a password', missing.status !== 0, `exit=${missing.status}`);

    const weakPassword = runBootstrapCli({
      ...bootstrapEnv,
      PLATFORM_BOOTSTRAP_EMAIL: 'ops@example.com',
      PLATFORM_BOOTSTRAP_PASSWORD: 'ChangeMe123!',
    });
    record('runtime', 'Bootstrap CLI rejects the known default password', weakPassword.status !== 0, `exit=${weakPassword.status}`);

    const shortPassword = runBootstrapCli({
      ...bootstrapEnv,
      PLATFORM_BOOTSTRAP_EMAIL: 'ops@example.com',
      PLATFORM_BOOTSTRAP_PASSWORD: 'short1234',
    });
    record('runtime', 'Bootstrap CLI rejects a too-short password', shortPassword.status !== 0, `exit=${shortPassword.status}`);

    const badEmail = runBootstrapCli({
      ...bootstrapEnv,
      PLATFORM_BOOTSTRAP_EMAIL: 'not-an-email',
      PLATFORM_BOOTSTRAP_PASSWORD: `Ops${randomBytes(12).toString('hex')}`,
    });
    record('runtime', 'Bootstrap CLI rejects an invalid email', badEmail.status !== 0, `exit=${badEmail.status}`);

    const operatorPassword = `Ops${randomBytes(16).toString('hex')}`;
    const created = runBootstrapCli({
      ...bootstrapEnv,
      PLATFORM_BOOTSTRAP_EMAIL: 'ops@example.com',
      PLATFORM_BOOTSTRAP_PASSWORD: operatorPassword,
    });
    record('runtime', 'Bootstrap CLI creates the platform admin', created.status === 0, `exit=${created.status}`);
    record(
      'runtime',
      'Bootstrap CLI never prints the password',
      !`${created.stdout}${created.stderr}`.includes(operatorPassword),
    );
    record(
      'runtime',
      'Bootstrap CLI creates no tenants, factories or demo users',
      psql(healthyDb, 'select count(*) from "Tenant";') === '0' &&
        psql(healthyDb, 'select count(*) from "User";') === '0' &&
        psql(healthyDb, 'select count(*) from "Factory";') === '0',
      `tenants=${psql(healthyDb, 'select count(*) from "Tenant";')}`,
    );
    record(
      'runtime',
      'Bootstrap CLI is idempotent for the same identity',
      runBootstrapCli({
        ...bootstrapEnv,
        PLATFORM_BOOTSTRAP_EMAIL: 'ops@example.com',
        PLATFORM_BOOTSTRAP_PASSWORD: `${operatorPassword}x`,
      }).status === 0 && psql(healthyDb, 'select count(*) from "PlatformAdmin";') === '1',
      `admins=${psql(healthyDb, 'select count(*) from "PlatformAdmin";')}`,
    );

    // --- The bootstrapped admin can actually authenticate (no default password) ---
    const loginApi = await startApi(productionEnv(dbUrl(healthyDb)));
    const badLogin = await fetch(`http://127.0.0.1:${API_PORT}/platform-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ops@example.com', password: 'ChangeMe123!' }),
    });
    record('runtime', 'Known default password does not authenticate', !badLogin.ok, `status=${badLogin.status}`);

    const goodLogin = await fetch(`http://127.0.0.1:${API_PORT}/platform-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ops@example.com', password: `${operatorPassword}x` }),
    });
    record('runtime', 'Operator-supplied password authenticates', goodLogin.ok, `status=${goodLogin.status}`);
    await loginApi.stop();

    // --- Release migration against an unreachable database fails non-zero ---
    const failedMigrate = spawnSync('pnpm', ['--filter', '@paypoq/api', 'prisma:migrate:deploy'], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: `postgresql://postgres:postgres@${PG_HOST}:1/nope?schema=public` },
      encoding: 'utf8',
    });
    record('runtime', 'Release migration exits non-zero when the database is unreachable', failedMigrate.status !== 0, `exit=${failedMigrate.status}`);
  } finally {
    dropDb(healthyDb);
    dropDb(driftDb);
    for (const name of [failedDb, pendingDb, lostDb]) forceDropDb(name);
  }
}

async function main() {
  runStaticChecks();
  await runRuntimeChecks();

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.error(`\n${failed.length} FAILED:`);
    for (const f of failed) console.error(`  [${f.layer}] ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

await main();
