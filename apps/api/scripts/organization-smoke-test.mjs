import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const scriptPath = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(scriptPath), '..');
const repoRoot = path.resolve(apiRoot, '../..');
const baseUrl =
  process.env.ORGANIZATION_SMOKE_BASE_URL ??
  `http://localhost:${process.env.ORGANIZATION_SMOKE_PORT ?? '3019'}`;
const port = new URL(baseUrl).port || '3019';
const shouldStartServer = !process.env.ORGANIZATION_SMOKE_BASE_URL;
const keepServer = process.env.ORGANIZATION_SMOKE_KEEP_SERVER === '1';
const prisma = new PrismaClient();
const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const platformAdminEmail =
  process.env.ORGANIZATION_SMOKE_PLATFORM_EMAIL ?? 'platform@paypoq.local';
const platformAdminPassword =
  process.env.ORGANIZATION_SMOKE_PLATFORM_PASSWORD ?? 'ChangeMe123!';
const ownerEmail = `owner-${suffix}@paypoq.local`;
const ownerPassword = `Owner-${suffix}-123`;
const ordinaryEmail = process.env.ORGANIZATION_SMOKE_ORDINARY_EMAIL ?? 'seller@paypoq.local';
const ordinaryPassword = process.env.ORGANIZATION_SMOKE_ORDINARY_PASSWORD ?? 'ChangeMe123!';
const managerPassword = `Manager-${suffix}-123`;
const managerResetPassword = `Manager-reset-${suffix}-123`;
const checks = [];

let serverProcess = null;
let accessToken = '';
let platformAccessToken = '';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function pass(name, details = {}) {
  checks.push({ name, ok: true, details });
}

async function request(pathname, options = {}) {
  const headers = { ...(options.headers ?? {}) };

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(
      `${options.method ?? 'GET'} ${pathname} failed: ${response.status}`,
    );
    error.status = response.status;
    error.body = json;
    throw error;
  }

  return json;
}

async function platformRequest(pathname, options = {}) {
  const headers = { ...(options.headers ?? {}) };

  if (platformAccessToken) {
    headers.Authorization = `Bearer ${platformAccessToken}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(
      `${options.method ?? 'GET'} ${pathname} failed: ${response.status}`,
    );
    error.status = response.status;
    error.body = json;
    throw error;
  }

  return json;
}

async function expectStatus(pathname, status, options = {}) {
  const headers = { ...(options.headers ?? {}) };

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });
  const text = await response.text();

  assert(
    response.status === status,
    `${pathname} expected ${status}, got ${response.status}: ${text}`,
  );
}

async function waitForHealth() {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);

      if (response.ok) {
        return;
      }
    } catch {
      // Server may still be booting.
    }

    await delay(500);
  }

  throw new Error(`API did not become healthy at ${baseUrl}/health`);
}

function startServerIfNeeded() {
  if (!shouldStartServer) {
    return;
  }

  const mainCandidates = [
    path.join(apiRoot, 'dist/src/main.js'),
    path.join(apiRoot, 'dist/main.js'),
  ];
  const mainPath = mainCandidates.find((candidate) => existsSync(candidate));

  if (!mainPath) {
    throw new Error(
      'Built API entrypoint was not found. Run `pnpm --filter @paypoq/api build` first.',
    );
  }

  serverProcess = spawn(process.execPath, [mainPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? 'development',
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    if (process.env.ORGANIZATION_SMOKE_VERBOSE === '1') {
      process.stdout.write(chunk);
    }
  });
  serverProcess.stderr.on('data', (chunk) => {
    if (process.env.ORGANIZATION_SMOKE_VERBOSE === '1') {
      process.stderr.write(chunk);
    }
  });
}

async function stopServerIfNeeded() {
  if (!serverProcess || keepServer) {
    return;
  }

  serverProcess.kill('SIGTERM');
  await delay(500);

  if (!serverProcess.killed) {
    serverProcess.kill('SIGKILL');
  }
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`POST /auth/login for ${email} failed: ${response.status}`);
  }

  return json.data;
}

async function platformLogin() {
  const response = await fetch(`${baseUrl}/platform-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: platformAdminEmail,
      password: platformAdminPassword,
    }),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`POST /platform-auth/login failed: ${response.status}`);
  }

  return json.data;
}

async function runOrganizationSmoke() {
  const platformSession = await platformLogin();
  platformAccessToken = platformSession.accessToken;
  pass('platform admin login succeeds');

  const tenantResponse = await platformRequest('/platform-admin/tenants', {
    method: 'POST',
    body: {
      name: `Smoke Branch Mode ${suffix}`,
      contactEmail: `contact-${suffix}@paypoq.local`,
      contactPhone: '+998 90 123 45 67',
      branchMode: 'SINGLE',
    },
  });
  const tenant = tenantResponse.data;
  assert(tenant.branchMode === 'SINGLE', 'platform admin should create SINGLE tenant');
  pass('platform admin creates single tenant', { tenantId: tenant.id });

  const ownerResponse = await platformRequest(`/platform-admin/tenants/${tenant.id}/owner-users`, {
    method: 'POST',
    body: {
      name: `Smoke Owner ${suffix}`,
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  assert(ownerResponse.data.id, 'owner creation should return id');
  pass('platform admin creates owner account', { ownerId: ownerResponse.data.id });

  const ownerSession = await login(ownerEmail, ownerPassword);
  accessToken = ownerSession.accessToken;
  assert(ownerSession.roles.includes('Owner'), 'seed owner must have Owner role');
  assert(ownerSession.branchMode === 'SINGLE', 'owner session should include SINGLE branch mode');
  pass('owner login succeeds', { branchMode: ownerSession.branchMode });

  await expectStatus('/organization/factories', 403, {
    method: 'POST',
    body: {
      name: `Blocked filial ${suffix}`,
    },
  });
  pass('single tenant owner cannot create extra factory through API');

  const singleManagerEmail = `single-manager-${suffix}@paypoq.local`;
  const singleManagerResponse = await request('/organization/managers', {
    method: 'POST',
    body: {
      name: `Single Manager ${suffix}`,
      email: singleManagerEmail,
      password: managerPassword,
    },
  });
  assert(singleManagerResponse.data.id, 'single manager creation should return id');
  assert(
    singleManagerResponse.data.factories.length === 1,
    'single manager should be auto-assigned to default factory',
  );
  pass('single owner creates manager with default factory access', {
    managerId: singleManagerResponse.data.id,
  });

  const singleManagerSession = await login(singleManagerEmail, managerPassword);
  assert(singleManagerSession.roles.includes('Manager'), 'single manager can login');
  assert(
    singleManagerSession.accessibleFactories.length === 1,
    'single manager should have one default factory',
  );
  pass('single manager can login');

  await platformRequest(`/platform-admin/tenants/${tenant.id}/branch-mode`, {
    method: 'PATCH',
    body: {
      branchMode: 'MULTI',
    },
  });
  pass('platform admin changes tenant to multi branch mode');

  const refreshedOwnerSession = await login(ownerEmail, ownerPassword);
  accessToken = refreshedOwnerSession.accessToken;
  assert(refreshedOwnerSession.branchMode === 'MULTI', 'owner should see MULTI branch mode');

  const factoryName = `Smoke filial ${suffix}`;
  const factoryResponse = await request('/organization/factories', {
    method: 'POST',
    body: {
      name: factoryName,
    },
  });
  const factory = factoryResponse.data;
  assert(factory.id, 'factory creation should return id');
  pass('multi owner creates factory', { factoryId: factory.id });

  const managerEmail = `manager-${suffix}@paypoq.local`;
  const managerResponse = await request('/organization/managers', {
    method: 'POST',
    body: {
      name: `Smoke Manager ${suffix}`,
      email: managerEmail,
      password: managerPassword,
      factoryId: factory.id,
    },
  });
  const manager = managerResponse.data;
  assert(manager.id, 'manager creation should return id');
  assert(manager.roles.includes('Manager'), 'created user should be Manager');
  pass('owner creates manager', { managerId: manager.id });

  await request(`/organization/users/${manager.id}/password`, {
    method: 'PATCH',
    body: {
      password: managerResetPassword,
    },
  });
  pass('owner resets manager password');

  const accessUpdate = await request(`/organization/users/${manager.id}/factory-access`, {
    method: 'PATCH',
    body: {
      factoryIds: [factory.id],
    },
  });
  assert(
    accessUpdate.data.factories.length === 1 && accessUpdate.data.factories[0].id === factory.id,
    'factory access update should keep manager scoped to assigned factory',
  );
  pass('owner updates manager factory access');

  const managerSession = await login(managerEmail, managerResetPassword);
  accessToken = managerSession.accessToken;
  assert(managerSession.roles.includes('Manager'), 'created manager can login');
  assert(
    managerSession.accessibleFactories.some((item) => item.id === factory.id),
    'manager should be scoped to assigned factory',
  );
  pass('manager can login and is scoped to assigned factory', {
    activeFactoryId: managerSession.activeFactoryId,
  });

  const managerFactories = await request('/organization/factories', {
    headers: {
      'X-Factory-Id': factory.id,
    },
  });
  assert(
    managerFactories.data.length === 1 && managerFactories.data[0].id === factory.id,
    'manager should only read assigned factory',
  );
  pass('manager reads only own factory');

  await expectStatus('/organization/factories', 403, {
    method: 'POST',
    headers: {
      'X-Factory-Id': factory.id,
    },
    body: {
      name: `Blocked ${suffix}`,
    },
  });
  pass('manager cannot create factory');

  await expectStatus(`/platform-admin/tenants/${tenant.id}/branch-mode`, 400, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${platformAccessToken}`,
    },
    body: {
      branchMode: 'SINGLE',
    },
  });
  pass('multi to single is blocked while multiple active factories exist');

  const ordinarySession = await login(ordinaryEmail, ordinaryPassword);
  accessToken = ordinarySession.accessToken;
  await expectStatus('/organization/users', 403);
  pass('ordinary user gets 403');

  const auditCount = await prisma.auditLog.count({
    where: {
      action: {
        in: [
          'ORGANIZATION_FACTORY_CREATED',
          'ORGANIZATION_MANAGER_CREATED',
          'ORGANIZATION_USER_PASSWORD_RESET',
          'ORGANIZATION_USER_FACTORY_ACCESS_UPDATED',
        ],
      },
      OR: [
        { entityId: factory.id },
        { entityId: manager.id },
      ],
    },
  });
  assert(auditCount >= 4, 'organization writes should create audit logs');
  pass('audit logs are created', { auditCount });

  const platformAuditCount = await prisma.platformAuditLog.count({
    where: {
      tenantId: tenant.id,
      action: 'TENANT_BRANCH_MODE_UPDATED',
    },
  });
  assert(platformAuditCount >= 1, 'branch mode update should create platform audit log');
  pass('branch mode audit log is created', { platformAuditCount });

  return {
    ok: true,
    baseUrl,
    passedCount: checks.length,
    checks,
  };
}

async function runSmokeSuite() {
  startServerIfNeeded();
  await waitForHealth();

  return runOrganizationSmoke();
}

runSmokeSuite()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await stopServerIfNeeded();
  });
