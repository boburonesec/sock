import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createScriptPrismaClient } from './prisma-client.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(scriptPath), '..');
const repoRoot = path.resolve(apiRoot, '../..');
const baseUrl =
  process.env.TELEGRAM_SMOKE_BASE_URL ??
  `http://localhost:${process.env.TELEGRAM_SMOKE_PORT ?? '3016'}`;
const port = new URL(baseUrl).port || '3016';
const shouldStartServer = !process.env.TELEGRAM_SMOKE_BASE_URL;
const keepServer = process.env.TELEGRAM_SMOKE_KEEP_SERVER === '1';
const botInternalApiKey =
  process.env.BOT_INTERNAL_API_KEY ??
  'local-development-bot-internal-api-key-change-me';
const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const checks = [];
const prisma = createScriptPrismaClient();

let accessToken = '';
let serverProcess = null;
let currentUser = null;

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

  if (accessToken && !options.skipAuth) {
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
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

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

  if (accessToken && !options.skipAuth) {
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
      'Built API entrypoint was not found. Run `pnpm api:build` first.',
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
    if (process.env.TELEGRAM_SMOKE_VERBOSE === '1') {
      process.stdout.write(chunk);
    }
  });
  serverProcess.stderr.on('data', (chunk) => {
    if (process.env.TELEGRAM_SMOKE_VERBOSE === '1') {
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

async function login() {
  const loginResponse = await request('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: {
      email: process.env.TELEGRAM_SMOKE_EMAIL ?? 'owner@paypoq.local',
      password: process.env.TELEGRAM_SMOKE_PASSWORD ?? 'ChangeMe123!',
    },
  });

  accessToken = loginResponse.data.accessToken;
  const me = (await request('/auth/me')).data;
  currentUser = me;

  assert(me.tenantId, 'auth context should include tenantId');
  assert(me.activeFactoryId, 'auth context should include activeFactoryId');

  pass('auth login for Telegram smoke', {
    tenantId: me.tenantId,
    activeFactoryId: me.activeFactoryId,
  });
}

async function runUserNotificationFlow() {
  const token = (await request('/telegram/link-tokens/me', { method: 'POST' })).data;
  const telegramUserId = `user-${suffix}`;
  const telegramChatId = `chat-${suffix}`;
  const linked = (await request('/telegram/bot/link', { method: 'POST', skipAuth: true, headers: { 'x-bot-api-key': botInternalApiKey }, body: { code: token.code, telegramUserId, telegramChatId } })).data;
  assert(linked.type === 'USER' && linked.user?.id === currentUser.user.id, 'USER Telegram link should target current user');
  const notification = await prisma.notification.create({ data: { tenantId: currentUser.tenantId, recipientUserId: currentUser.user.id, type: 'SMOKE', title: 'Smoke notification', body: 'Outbox delivery smoke', dedupeKey: `telegram-user-smoke:${suffix}`, deliveries: { create: {} } } });
  const claimed = (await request('/internal/notification-deliveries/claim', { method: 'POST', skipAuth: true, headers: { 'x-bot-api-key': botInternalApiKey } })).data;
  const delivery = claimed.find((item) => item.title === notification.title);
  assert(delivery?.chatId === telegramChatId, 'outbox claim should resolve only linked USER chat');
  await request(`/internal/notification-deliveries/${delivery.id}/ack`, { method: 'POST', skipAuth: true, headers: { 'x-bot-api-key': botInternalApiKey }, body: { status: 'SENT' } });
  await request('/telegram/bot/unlink', { method: 'POST', skipAuth: true, headers: { 'x-bot-api-key': botInternalApiKey }, body: { telegramUserId } });
  pass('USER Telegram link and durable notification outbox claim/ack');
}

async function createEmployee(namePrefix = 'Telegram Smoke Employee') {
  const shifts = (await request('/settings/work-shifts')).data;
  const dayShift = shifts.find((shift) => shift.code === 'DAY');
  const stages = (await request('/product/stages')).data;
  assert(dayShift, 'default DAY work shift should exist');
  return (await request('/employees', {
    method: 'POST',
    body: {
      name: `${namePrefix} ${suffix}`,
      workProfile: 'STAGE_WORKER',
      compensationType: 'PIECE_RATE',
      workShiftId: dayShift.id,
      stageIds: [stages[0].id],
    },
  })).data;
}

async function createClient(namePrefix = 'Telegram Smoke Client') {
  return (await request('/sales/clients', {
    method: 'POST',
    body: { name: `${namePrefix} ${suffix}` },
  })).data;
}

async function createEmployeeToken(employeeId) {
  return (await request(`/telegram/link-tokens/employees/${employeeId}`, {
    method: 'POST',
  })).data;
}

async function createClientToken(clientId) {
  return (await request(`/telegram/link-tokens/clients/${clientId}`, {
    method: 'POST',
  })).data;
}

async function botRequest(pathname, options = {}) {
  return request(pathname, {
    ...options,
    skipAuth: true,
    headers: {
      'x-bot-api-key': botInternalApiKey,
      ...(options.headers ?? {}),
    },
  });
}

async function expectBotStatus(pathname, status, options = {}) {
  return expectStatus(pathname, status, {
    ...options,
    skipAuth: true,
    headers: {
      'x-bot-api-key': botInternalApiKey,
      ...(options.headers ?? {}),
    },
  });
}

async function linkTelegramAccount(code, telegramUserId, telegramChatId) {
  return (await botRequest('/telegram/bot/link', {
    method: 'POST',
    body: { code, telegramUserId, telegramChatId },
  })).data;
}

async function runEmployeeFlow() {
  const employee = await createEmployee();
  const token = await createEmployeeToken(employee.id);
  const telegramUserId = `tg-employee-${suffix}`;
  const telegramChatId = `chat-employee-${suffix}`;
  const linked = await linkTelegramAccount(
    token.code,
    telegramUserId,
    telegramChatId,
  );

  assert(linked.type === 'EMPLOYEE', 'employee token should link EMPLOYEE account');
  assert(linked.employee.id === employee.id, 'linked employee should match target');

  const salary = await botRequest(
    `/telegram/bot/employee/salary?telegramUserId=${encodeURIComponent(telegramUserId)}`,
  );
  const activities = await botRequest(
    `/telegram/bot/employee/activities?telegramUserId=${encodeURIComponent(telegramUserId)}`,
  );
  const advances = await botRequest(
    `/telegram/bot/employee/advances?telegramUserId=${encodeURIComponent(telegramUserId)}`,
  );
  const payroll = await botRequest(
    `/telegram/bot/employee/payroll?telegramUserId=${encodeURIComponent(telegramUserId)}`,
  );

  assert(Array.isArray(salary.data), 'employee salary endpoint should return array');
  assert(Array.isArray(activities.data), 'employee activities endpoint should return array');
  assert(Array.isArray(advances.data), 'employee advances endpoint should return array');
  assert(Array.isArray(payroll.data), 'employee payroll endpoint should return array');

  await expectBotStatus(
    `/telegram/bot/client/orders?telegramUserId=${encodeURIComponent(telegramUserId)}`,
    404,
  );
  await botRequest('/telegram/bot/unlink', {
    method: 'POST',
    body: { telegramUserId },
  });
  await expectBotStatus(
    `/telegram/bot/employee/salary?telegramUserId=${encodeURIComponent(telegramUserId)}`,
    404,
  );

  pass('employee link, read endpoints, wrong-type denial, and unlink');
}

async function runBlockedRelinkFlow() {
  const employee = await createEmployee('Telegram Smoke Blocked Employee');
  const token = await createEmployeeToken(employee.id);
  const telegramUserId = `tg-blocked-${suffix}`;
  const telegramChatId = `chat-blocked-${suffix}`;
  const linked = await linkTelegramAccount(
    token.code,
    telegramUserId,
    telegramChatId,
  );

  await request(`/telegram/accounts/${linked.telegramAccountId}/block`, {
    method: 'POST',
  });

  const nextToken = await createEmployeeToken(employee.id);
  await expectBotStatus('/telegram/bot/link', 409, {
    method: 'POST',
    body: {
      code: nextToken.code,
      telegramUserId,
      telegramChatId,
    },
  });

  pass('blocked employee Telegram account cannot relink');
}

async function runClientFlow() {
  const client = await createClient();
  const token = await createClientToken(client.id);
  const telegramUserId = `tg-client-${suffix}`;
  const telegramChatId = `chat-client-${suffix}`;
  const linked = await linkTelegramAccount(
    token.code,
    telegramUserId,
    telegramChatId,
  );

  assert(linked.type === 'CLIENT', 'client token should link CLIENT account');
  assert(linked.client.id === client.id, 'linked client should match target');

  const orders = await botRequest(
    `/telegram/bot/client/orders?telegramUserId=${encodeURIComponent(telegramUserId)}`,
  );
  const debt = await botRequest(
    `/telegram/bot/client/debt?telegramUserId=${encodeURIComponent(telegramUserId)}`,
  );
  const payments = await botRequest(
    `/telegram/bot/client/payments?telegramUserId=${encodeURIComponent(telegramUserId)}`,
  );

  assert(Array.isArray(orders.data), 'client orders endpoint should return array');
  assert(debt.data.client.id === client.id, 'client debt endpoint should return linked client');
  assert(Array.isArray(payments.data), 'client payments endpoint should return array');

  await expectBotStatus(
    `/telegram/bot/employee/salary?telegramUserId=${encodeURIComponent(telegramUserId)}`,
    404,
  );

  pass('client link, orders/debt/payments, and wrong-type denial');

  return { token };
}

async function runCodeSecurityChecks(usedToken) {
  await expectBotStatus('/telegram/bot/link', 400, {
    method: 'POST',
    body: {
      code: 'INVALID1',
      telegramUserId: `tg-invalid-once-${suffix}`,
      telegramChatId: `chat-invalid-once-${suffix}`,
    },
  });

  await expectBotStatus('/telegram/bot/link', 400, {
    method: 'POST',
    body: {
      code: usedToken.code,
      telegramUserId: `tg-used-${suffix}`,
      telegramChatId: `chat-used-${suffix}`,
    },
  });

  await expectStatus('/telegram/bot/me?telegramUserId=no-key', 401, {
    skipAuth: true,
  });
  await expectStatus('/telegram/bot/me?telegramUserId=wrong-key', 401, {
    skipAuth: true,
    headers: { 'x-bot-api-key': 'wrong-internal-key' },
  });

  const limitedTelegramUserId = `tg-rate-limit-${suffix}`;
  const limitedTelegramChatId = `chat-rate-limit-${suffix}`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await expectBotStatus('/telegram/bot/link', 400, {
      method: 'POST',
      body: {
        code: `BAD${attempt}`,
        telegramUserId: limitedTelegramUserId,
        telegramChatId: limitedTelegramChatId,
      },
    });
  }

  await expectBotStatus('/telegram/bot/link', 429, {
    method: 'POST',
    body: {
      code: 'BAD5',
      telegramUserId: limitedTelegramUserId,
      telegramChatId: limitedTelegramChatId,
    },
  });

  pass('invalid/used code, internal key rejection, and link rate limit');
}

async function runSettingsChecks() {
  const tokens = (await request('/telegram/link-tokens')).data;
  const accounts = (await request('/telegram/accounts')).data;
  const health = (await request('/telegram/health')).data;

  assert(Array.isArray(tokens), 'settings token list should return array');
  assert(Array.isArray(accounts), 'settings account list should return array');
  assert(health.status === 'ok', 'telegram health should be ok');

  const serializedTokens = JSON.stringify(tokens);
  const serializedAccounts = JSON.stringify(accounts);

  assert(!serializedTokens.includes('codeHash'), 'token list must not expose codeHash');
  assert(!serializedTokens.includes('"code"'), 'token list must not expose raw code field');
  assert(!serializedAccounts.includes('telegramChatId'), 'account list must not expose telegramChatId');
  assert(!serializedAccounts.includes('telegramUserId"'), 'account list must not expose raw telegramUserId');
  assert(
    accounts.every((account) => typeof account.telegramUserIdMasked === 'string'),
    'account list should expose masked Telegram user ID only',
  );

  pass('settings token/account list and health endpoint are safe');
}

async function main() {
  startServerIfNeeded();
  await waitForHealth();
  await login();
  await runEmployeeFlow();
  await runBlockedRelinkFlow();
  const { token: usedClientToken } = await runClientFlow();
  await runCodeSecurityChecks(usedClientToken);
  await runUserNotificationFlow();
  await runSettingsChecks();

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        checks,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Telegram smoke test failed.');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await stopServerIfNeeded();
  });
