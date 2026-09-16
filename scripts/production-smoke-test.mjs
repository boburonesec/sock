/**
 * Post-deploy production smoke.
 *
 * Read-only by design, and it never assumes demo data: every credential and
 * URL comes from the environment (password manager / CI secret store). There
 * are deliberately no defaults — a missing variable fails the smoke rather
 * than silently falling back to a demo account.
 *
 * Required:
 *   SMOKE_WEB_URL                 e.g. https://app.example.com
 *   SMOKE_API_URL                 e.g. https://api.example.com
 *   SMOKE_PLATFORM_ADMIN_EMAIL    platform admin created by bootstrap:platform-admin
 *   SMOKE_PLATFORM_ADMIN_PASSWORD
 *   SMOKE_TENANT_EMAIL            operator account inside the dedicated smoke tenant
 *   SMOKE_TENANT_PASSWORD
 *
 * Optional:
 *   SMOKE_EXPECTED_SHA            release SHA; asserted against GET /health
 *   SMOKE_SUSPENDED_TENANT_EMAIL  account in a permanently suspended smoke tenant
 *   SMOKE_SUSPENDED_TENANT_PASSWORD
 *
 * The smoke tenant must be a dedicated tenant that holds no customer data.
 * Nothing here creates orders, payments, stock or users.
 *
 * Usage:
 *   node scripts/production-smoke-test.mjs
 */
import assert from 'node:assert/strict';

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    console.error(`[smoke] ERROR: ${name} is required (no defaults, no demo credentials).`);
    process.exit(1);
  }
  return value.trim();
}

const WEB = requireEnv('SMOKE_WEB_URL').replace(/\/+$/, '');
const API = requireEnv('SMOKE_API_URL').replace(/\/+$/, '');
const PLATFORM_EMAIL = requireEnv('SMOKE_PLATFORM_ADMIN_EMAIL');
const PLATFORM_PASSWORD = requireEnv('SMOKE_PLATFORM_ADMIN_PASSWORD');
const TENANT_EMAIL = requireEnv('SMOKE_TENANT_EMAIL');
const TENANT_PASSWORD = requireEnv('SMOKE_TENANT_PASSWORD');
const EXPECTED_SHA = process.env.SMOKE_EXPECTED_SHA?.trim();
const SUSPENDED_EMAIL = process.env.SMOKE_SUSPENDED_TENANT_EMAIL?.trim();
const SUSPENDED_PASSWORD = process.env.SMOKE_SUSPENDED_TENANT_PASSWORD?.trim();

async function call(base, path, { method = 'GET', token, body, factoryId } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (factoryId) headers['X-Factory-Id'] = factoryId;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  // ---- liveness + deployed build identity ----
  const health = await call(API, '/health');
  record('API liveness (GET /health) responds ok', health.ok && health.data?.status === 'ok', `status=${health.status}`);

  const deployedSha = typeof health.data?.version === 'string' ? health.data.version : 'unknown';
  if (EXPECTED_SHA) {
    record(
      'Deployed build SHA matches the release SHA',
      deployedSha === EXPECTED_SHA,
      `deployed=${deployedSha} expected=${EXPECTED_SHA}`,
    );
  } else {
    record('Deployed build SHA reported by /health', deployedSha !== 'unknown', `deployed=${deployedSha}`);
  }

  // ---- readiness: DB + schema + secrets ----
  const readiness = await call(API, '/health/readiness');
  record(
    'API readiness (GET /health/readiness) is ok',
    readiness.ok && readiness.data?.status === 'ok',
    `status=${readiness.status} checks=${JSON.stringify(readiness.data?.checks ?? {})}`,
  );

  // ---- dangerous operational routes must not exist in production ----
  for (const route of ['/health/bootstrap', '/health/migrate', '/health/diagnostic']) {
    const res = await call(API, route);
    record(`${route} is not exposed`, res.status === 404, `status=${res.status}`);
  }

  // ---- platform admin login (operator-supplied credentials) ----
  const platformLogin = await call(API, '/platform-auth/login', {
    method: 'POST',
    body: { email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD },
  });
  record('Platform Admin login succeeds', platformLogin.ok, `status=${platformLogin.status}`);

  // ---- smoke tenant login + read-only surface checks ----
  const tenantLogin = await call(API, '/auth/login', {
    method: 'POST',
    body: { email: TENANT_EMAIL, password: TENANT_PASSWORD },
  });
  record('Smoke tenant login succeeds', tenantLogin.ok, `status=${tenantLogin.status}`);
  assert(tenantLogin.ok, 'smoke tenant login must succeed to continue');

  const token = tenantLogin.data.data.accessToken;
  const factoryId = tenantLogin.data.data.activeFactoryId;

  const readOnly = [
    ['Production', '/production/operations-summary'],
    ['Warehouse', '/warehouse/stock'],
    ['Sales', '/sales/orders'],
    ['Finance', '/finance/summary'],
  ];
  for (const [label, path] of readOnly) {
    const res = await call(API, path, { token, factoryId });
    record(`${label} read-only API reachable for smoke tenant`, res.ok, `status=${res.status}`);
  }

  // ---- web surface is served ----
  const webLogin = await fetch(`${WEB}/login`, { redirect: 'manual' });
  record('Web login page is served', webLogin.status === 200, `status=${webLogin.status}`);

  // ---- suspended smoke tenant is denied (optional but recommended) ----
  if (SUSPENDED_EMAIL && SUSPENDED_PASSWORD) {
    const denied = await call(API, '/auth/login', {
      method: 'POST',
      body: { email: SUSPENDED_EMAIL, password: SUSPENDED_PASSWORD },
    });
    record('Suspended smoke tenant is denied login', !denied.ok, `status=${denied.status}`);
  } else {
    console.log('[skip] suspended-tenant check (SMOKE_SUSPENDED_TENANT_* not set)');
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.error(`\n${failed.length} FAILED:`);
    for (const f of failed) console.error(`  ${f.name}`);
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('[smoke] fatal:', error instanceof Error ? error.message : error);
  process.exit(1);
});
