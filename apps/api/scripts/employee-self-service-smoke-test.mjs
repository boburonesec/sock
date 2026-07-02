import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const scriptPath = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(scriptPath), '..');
const repoRoot = path.resolve(apiRoot, '../..');
const baseUrl =
  process.env.EMPLOYEE_SELF_SERVICE_SMOKE_BASE_URL ??
  `http://localhost:${process.env.EMPLOYEE_SELF_SERVICE_SMOKE_PORT ?? '3017'}`;
const port = new URL(baseUrl).port || '3017';
const shouldStartServer = !process.env.EMPLOYEE_SELF_SERVICE_SMOKE_BASE_URL;
const keepServer = process.env.EMPLOYEE_SELF_SERVICE_SMOKE_KEEP_SERVER === '1';
const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const password = 'ChangeMe123!';
const prisma = new PrismaClient();
const checks = [];

let serverProcess = null;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function pass(name, details = {}) {
  checks.push({ name, ok: true, details });
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
    if (process.env.EMPLOYEE_SELF_SERVICE_SMOKE_VERBOSE === '1') {
      process.stdout.write(chunk);
    }
  });
  serverProcess.stderr.on('data', (chunk) => {
    if (process.env.EMPLOYEE_SELF_SERVICE_SMOKE_VERBOSE === '1') {
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

async function request(pathname, options = {}) {
  const headers = { ...(options.headers ?? {}) };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
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
    json = JSON.parse(text);
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
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();

  assert(
    response.status === status,
    `${pathname} expected ${status}, got ${response.status}: ${text}`,
  );
}

async function login(email) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  return response.data.accessToken;
}

async function findAvailablePayrollMonth(tenantId, factoryId) {
  for (let offset = 0; offset < 240; offset += 1) {
    const month = new Date(Date.UTC(2200, offset, 1));
    const existing = await prisma.payrollPeriod.findFirst({
      where: {
        tenantId,
        factoryId,
        month,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return month;
    }
  }

  throw new Error('Could not find an unused payroll month for smoke data.');
}

async function createSmokeData() {
  const tenant = await prisma.tenant.findFirstOrThrow({
    where: { status: 'ACTIVE', deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const factory = await prisma.factory.findFirstOrThrow({
    where: { tenantId: tenant.id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const stage = await prisma.productionStage.findFirstOrThrow({
    where: { tenantId: tenant.id, factoryId: factory.id, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  });
  const productVariant = await prisma.productVariant.findFirstOrThrow({
    where: { tenantId: tenant.id, deletedAt: null, product: { deletedAt: null } },
    orderBy: { createdAt: 'asc' },
  });
  const month = await findAvailablePayrollMonth(tenant.id, factory.id);
  const now = new Date();
  const passwordHash = await argon2.hash(password);
  const linkedUserEmail = `employee-self-${suffix}@paypoq.local`;
  const unlinkedUserEmail = `employee-self-unlinked-${suffix}@paypoq.local`;

  const [linkedEmployee, otherEmployee] = await Promise.all([
    prisma.employee.create({
      data: {
        tenantId: tenant.id,
        factoryId: factory.id,
        name: `Self Service Employee ${suffix}`,
        status: 'ACTIVE',
      },
    }),
    prisma.employee.create({
      data: {
        tenantId: tenant.id,
        factoryId: factory.id,
        name: `Other Employee ${suffix}`,
        status: 'ACTIVE',
      },
    }),
  ]);

  const [linkedUser, unlinkedUser] = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: `Self Service User ${suffix}`,
        email: linkedUserEmail,
        status: 'ACTIVE',
        credential: {
          create: {
            passwordHash,
          },
        },
        factoryAccesses: {
          create: {
            factoryId: factory.id,
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: `Unlinked User ${suffix}`,
        email: unlinkedUserEmail,
        status: 'ACTIVE',
        credential: {
          create: {
            passwordHash,
          },
        },
        factoryAccesses: {
          create: {
            factoryId: factory.id,
          },
        },
      },
    }),
  ]);

  await prisma.telegramAccount.create({
    data: {
      tenantId: tenant.id,
      telegramUserId: `employee-self-service-${suffix}`,
      telegramChatId: `employee-self-service-chat-${suffix}`,
      type: 'EMPLOYEE',
      employeeId: linkedEmployee.id,
      userId: linkedUser.id,
      status: 'ACTIVE',
    },
  });

  const [ownActivity, otherActivity] = await Promise.all([
    prisma.workerActivity.create({
      data: {
        tenantId: tenant.id,
        factoryId: factory.id,
        employeeId: linkedEmployee.id,
        productionStageId: stage.id,
        productVariantId: productVariant.id,
        quantity: 11,
        salaryRateAmount: '120',
        activityDate: now,
        enteredByUserId: linkedUser.id,
      },
    }),
    prisma.workerActivity.create({
      data: {
        tenantId: tenant.id,
        factoryId: factory.id,
        employeeId: otherEmployee.id,
        productionStageId: stage.id,
        productVariantId: productVariant.id,
        quantity: 99,
        salaryRateAmount: '120',
        activityDate: now,
        enteredByUserId: linkedUser.id,
      },
    }),
  ]);

  const payrollPeriod = await prisma.payrollPeriod.create({
    data: {
      tenantId: tenant.id,
      factoryId: factory.id,
      month,
      status: 'CALCULATED',
      totalWorkedAmount: '2520',
      totalBonusAmount: '0',
      totalPenaltyAmount: '0',
      totalAdvanceAmount: '0',
      totalFinalAmount: '2520',
      totalPaidAmount: '0',
      totalRemainingAmount: '2520',
      calculatedAt: now,
    },
  });

  const [ownPayrollItem, otherPayrollItem] = await Promise.all([
    prisma.payrollItem.create({
      data: {
        tenantId: tenant.id,
        factoryId: factory.id,
        payrollPeriodId: payrollPeriod.id,
        employeeId: linkedEmployee.id,
        workedAmount: '1320',
        bonusAmount: '0',
        penaltyAmount: '0',
        advanceAmount: '0',
        finalAmount: '1320',
        paidAmount: '0',
        remainingAmount: '1320',
        status: 'CALCULATED',
        calculationSnapshot: { source: 'employee-self-service-smoke' },
      },
    }),
    prisma.payrollItem.create({
      data: {
        tenantId: tenant.id,
        factoryId: factory.id,
        payrollPeriodId: payrollPeriod.id,
        employeeId: otherEmployee.id,
        workedAmount: '1200',
        bonusAmount: '0',
        penaltyAmount: '0',
        advanceAmount: '0',
        finalAmount: '1200',
        paidAmount: '0',
        remainingAmount: '1200',
        status: 'CALCULATED',
        calculationSnapshot: { source: 'employee-self-service-smoke' },
      },
    }),
  ]);

  const [ownAdvance, otherAdvance] = await Promise.all([
    prisma.employeeAdjustment.create({
      data: {
        tenantId: tenant.id,
        factoryId: factory.id,
        employeeId: linkedEmployee.id,
        type: 'ADVANCE',
        amount: '500',
        reason: 'Self service smoke own advance',
        status: 'PAID',
        requestedByUserId: linkedUser.id,
        approvedByUserId: linkedUser.id,
        paidByUserId: linkedUser.id,
        requestedAt: now,
        approvedAt: now,
        paidAt: now,
      },
    }),
    prisma.employeeAdjustment.create({
      data: {
        tenantId: tenant.id,
        factoryId: factory.id,
        employeeId: otherEmployee.id,
        type: 'ADVANCE',
        amount: '900',
        reason: 'Self service smoke other advance',
        status: 'PAID',
        requestedByUserId: linkedUser.id,
        approvedByUserId: linkedUser.id,
        paidByUserId: linkedUser.id,
        requestedAt: now,
        approvedAt: now,
        paidAt: now,
      },
    }),
  ]);

  return {
    linkedUserEmail,
    unlinkedUserEmail,
    linkedEmployee,
    ownActivity,
    otherActivity,
    ownPayrollItem,
    otherPayrollItem,
    ownAdvance,
    otherAdvance,
  };
}

async function run() {
  startServerIfNeeded();
  await waitForHealth();

  await expectStatus('/mobile/employee/me', 401);
  pass('self-service endpoint requires authentication');

  const data = await createSmokeData();
  const linkedToken = await login(data.linkedUserEmail);
  const unlinkedToken = await login(data.unlinkedUserEmail);

  await expectStatus('/mobile/employee/me', 403, { accessToken: unlinkedToken });
  pass('unlinked tenant user receives 403');

  const me = (await request('/mobile/employee/me', { accessToken: linkedToken })).data;
  assert(me.employee.id === data.linkedEmployee.id, 'me should return linked employee only');
  pass('linked user can read own employee profile', { employeeId: me.employee.id });

  const activities = (await request('/mobile/employee/activities', { accessToken: linkedToken })).data;
  assert(
    activities.some((activity) => activity.id === data.ownActivity.id),
    'activities should include own activity',
  );
  assert(
    !activities.some((activity) => activity.id === data.otherActivity.id),
    'activities must not include another employee activity',
  );
  pass('activities are employee scoped', { count: activities.length });

  const payroll = (await request('/mobile/employee/payroll', { accessToken: linkedToken })).data;
  assert(
    payroll.some((item) => item.id === data.ownPayrollItem.id),
    'payroll should include own payroll item',
  );
  assert(
    !payroll.some((item) => item.id === data.otherPayrollItem.id),
    'payroll must not include another employee payroll item',
  );
  pass('payroll is employee scoped', { count: payroll.length });

  const advances = (await request('/mobile/employee/advances', { accessToken: linkedToken })).data;
  assert(
    advances.some((advance) => advance.id === data.ownAdvance.id),
    'advances should include own advance',
  );
  assert(
    !advances.some((advance) => advance.id === data.otherAdvance.id),
    'advances must not include another employee advance',
  );
  pass('advances are employee scoped', { count: advances.length });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        checks,
      },
      null,
      2,
    ),
  );
}

try {
  await run();
} finally {
  await prisma.$disconnect();
  await stopServerIfNeeded();
}
