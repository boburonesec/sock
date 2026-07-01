import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const scriptPath = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(scriptPath), '..');
const repoRoot = path.resolve(apiRoot, '../..');
const baseUrl = process.env.MVP_SMOKE_BASE_URL ?? `http://localhost:${process.env.MVP_SMOKE_PORT ?? '3015'}`;
const port = new URL(baseUrl).port || '3015';
const shouldStartServer = !process.env.MVP_SMOKE_BASE_URL;
const keepServer = process.env.MVP_SMOKE_KEEP_SERVER === '1';
const prisma = new PrismaClient();
const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const checks = [];

let accessToken = '';
let serverProcess = null;

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

  if (accessToken) {
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

  if (accessToken) {
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
    if (process.env.MVP_SMOKE_VERBOSE === '1') {
      process.stdout.write(chunk);
    }
  });
  serverProcess.stderr.on('data', (chunk) => {
    if (process.env.MVP_SMOKE_VERBOSE === '1') {
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

async function loginAndVerifyContext() {
  await expectStatus('/product/colors', 401);
  pass('protected endpoint returns 401 without token');

  const login = await request('/auth/login', {
    method: 'POST',
    body: {
      email: process.env.MVP_SMOKE_EMAIL ?? 'owner@paypoq.local',
      password: process.env.MVP_SMOKE_PASSWORD ?? 'ChangeMe123!',
    },
  });

  accessToken = login.data.accessToken;
  const me = (await request('/auth/me')).data;

  assert(me.tenantId, 'auth context should include tenantId');
  assert(me.activeFactoryId, 'auth context should include activeFactoryId');
  assert(Array.isArray(me.permissions), 'auth context should include permissions');

  pass('auth login and request context', {
    tenantId: me.tenantId,
    activeFactoryId: me.activeFactoryId,
    permissions: me.permissions.length,
  });

  return me;
}

async function loginAs(email, password = 'ChangeMe123!') {
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

  return json.data.accessToken;
}

async function withAccessToken(token, callback) {
  const previousAccessToken = accessToken;
  accessToken = token;

  try {
    return await callback();
  } finally {
    accessToken = previousAccessToken;
  }
}

async function createProductSetup() {
  const color = (await request('/product/colors', {
    method: 'POST',
    body: { name: `Smoke Color ${suffix}` },
  })).data;
  const material = (await request('/product/materials', {
    method: 'POST',
    body: { name: `Smoke Material ${suffix}` },
  })).data;
  const season = (await request('/product/seasons', {
    method: 'POST',
    body: { name: `Smoke Season ${suffix}` },
  })).data;
  const product = (await request('/product/products', {
    method: 'POST',
    body: { name: `Smoke Product ${suffix}` },
  })).data;
  const variant = (await request(`/product/products/${product.id}/variants`, {
    method: 'POST',
    body: {
      colorId: color.id,
      materialId: material.id,
      seasonId: season.id,
    },
  })).data;

  await request(`/product/variants/${variant.id}/prices`, {
    method: 'POST',
    body: {
      amount: '100',
      effectiveFrom: '2026-01-01',
    },
  });

  pass('product variant and price setup', {
    productId: product.id,
    variantId: variant.id,
  });

  return { color, material, season, product, variant };
}

async function createEmployeeAndSalaryRate(variantId) {
  const employee = (await request('/employees', {
    method: 'POST',
    body: { name: `Smoke Employee ${suffix}` },
  })).data;
  const stages = (await request('/product/stages')).data;
  const firstStage = stages[0];
  const secondStage = stages[1];
  const omborStage = stages.find((stage) => stage.name === 'Ombor');

  assert(firstStage && secondStage && omborStage, 'default production stages should exist');

  await request('/settings/salary-rates', {
    method: 'POST',
    body: {
      stageId: firstStage.id,
      productVariantId: variantId,
      amount: '7',
      effectiveFrom: '2026-01-01',
    },
  });

  pass('employee and salary rate setup', { employeeId: employee.id });

  return { employee, stages, firstStage, secondStage, omborStage };
}

async function runProductionChain({ employee, firstStage, secondStage, omborStage, variant }) {
  await request('/production/batches', {
    method: 'POST',
    body: {
      productVariantId: variant.id,
      quantity: 30,
      note: `Smoke batch ${suffix}`,
    },
  });
  await request('/production/stage-movements', {
    method: 'POST',
    body: {
      sourceStageId: firstStage.id,
      destinationStageId: secondStage.id,
      productVariantId: variant.id,
      quantity: 6,
    },
  });
  const workerActivity = (await request('/production/worker-activities', {
    method: 'POST',
    body: {
      employeeId: employee.id,
      stageId: firstStage.id,
      productVariantId: variant.id,
      quantity: 4,
    },
  })).data;

  await request('/production/defects', {
    method: 'POST',
    body: {
      employeeId: employee.id,
      stageId: firstStage.id,
      productVariantId: variant.id,
      quantity: 1,
      reason: `Smoke defect ${suffix}`,
    },
  });
  await request('/production/stage-movements', {
    method: 'POST',
    body: {
      sourceStageId: firstStage.id,
      destinationStageId: omborStage.id,
      productVariantId: variant.id,
      quantity: 5,
    },
  });
  await request('/warehouse/finished-product-receipts', {
    method: 'POST',
    body: {
      productVariantId: variant.id,
      quantity: 5,
      note: `Smoke finished receipt ${suffix}`,
    },
  });

  pass('production batch, stage movement, activity, defect, and finished receipt');

  return { workerActivity };
}

async function runWarehouseChecks({ material, variant }) {
  const zones = (await request('/warehouse/zones')).data;
  const rawZone = zones.find((zone) => zone.name === 'Raw Materials');
  const finishedZone = zones.find((zone) => zone.name === 'Finished Products');

  assert(rawZone, 'Raw Materials zone should exist');
  assert(finishedZone, 'Finished Products zone should exist');

  await request('/warehouse/material-receipts', {
    method: 'POST',
    body: {
      materialId: material.id,
      quantity: '12.5',
      unit: 'kg',
      warehouseZoneId: rawZone.id,
      note: `Smoke material receipt ${suffix}`,
    },
  });
  await request('/warehouse/stock-corrections', {
    method: 'POST',
    body: {
      itemType: 'MATERIAL',
      materialId: material.id,
      warehouseZoneId: rawZone.id,
      newQuantity: '9.25',
      reason: `Smoke material correction ${suffix}`,
    },
  });
  await request('/warehouse/stock-corrections', {
    method: 'POST',
    body: {
      itemType: 'PRODUCT',
      productVariantId: variant.id,
      warehouseZoneId: finishedZone.id,
      newQuantity: '4',
      reason: `Smoke delivery setup ${suffix}`,
    },
  });

  pass('material receipt and stock correction');

  return { rawZone, finishedZone };
}

async function runRbacMatrix({ material, rawZone }) {
  const [sellerToken, warehouseToken, shiftToken, accountantToken, managerToken] =
    await Promise.all([
      loginAs('seller@paypoq.local'),
      loginAs('warehouse@paypoq.local'),
      loginAs('shift@paypoq.local'),
      loginAs('accountant@paypoq.local'),
      loginAs('manager@paypoq.local'),
    ]);

  await withAccessToken(sellerToken, async () => {
    await request('/sales/summary');
    await request('/sales/clients', {
      method: 'POST',
      body: { name: `RBAC Seller Client ${suffix}` },
    });
    await expectStatus('/finance/advances', 403, {
      method: 'POST',
      body: { employeeId: 'blocked', amount: '1', reason: 'blocked' },
    });
    await expectStatus('/warehouse/stock-corrections', 403, {
      method: 'POST',
      body: {
        itemType: 'MATERIAL',
        materialId: material.id,
        warehouseZoneId: rawZone.id,
        newQuantity: '1',
        reason: 'blocked',
      },
    });
  });

  await withAccessToken(warehouseToken, async () => {
    await request('/warehouse/material-receipts', {
      method: 'POST',
      body: {
        materialId: material.id,
        quantity: '1',
        unit: 'kg',
        warehouseZoneId: rawZone.id,
        note: `RBAC warehouse receipt ${suffix}`,
      },
    });
    await expectStatus('/sales/payments', 403, {
      method: 'POST',
      body: {
        clientId: 'blocked',
        amount: '1',
        method: 'CASH',
        allocations: [{ orderId: 'blocked', amount: '1' }],
      },
    });
  });

  await withAccessToken(shiftToken, async () => {
    await request('/production/defects', {
      method: 'POST',
      body: {
        quantity: 1,
        reason: `RBAC shift defect ${suffix}`,
      },
    });
    await expectStatus('/finance/advances', 403, {
      method: 'POST',
      body: { employeeId: 'blocked', amount: '1', reason: 'blocked' },
    });
  });

  await withAccessToken(accountantToken, async () => {
    await request('/finance/summary');
    await request('/supplier/suppliers');
    await request('/finance/payroll-periods');
    await expectStatus('/production/defects', 403, {
      method: 'POST',
      body: {
        quantity: 1,
        reason: 'blocked',
      },
    });
  });

  await withAccessToken(managerToken, async () => {
    await request('/dashboard/executive-summary');
    await request('/production/operations-summary');
    await request('/warehouse/stock-summary');
    await request('/sales/summary');
    await request('/finance/summary');
  });

  pass('limited-role RBAC matrix', {
    seller: 'sales allowed, finance/warehouse writes denied',
    warehouse: 'warehouse write allowed, sales payment denied',
    shiftReceiver: 'production write allowed, finance write denied',
    accountant: 'finance/supplier/payroll allowed, production write denied',
    manager: 'main operational summaries allowed',
  });
}

async function runSalesRecoveryChain({ tenantId, clientName, variant, finishedZone }) {
  const client = (await request('/sales/clients', {
    method: 'POST',
    body: { name: clientName },
  })).data;
  const order = (await request('/sales/orders', {
    method: 'POST',
    body: {
      clientId: client.id,
      items: [{ productVariantId: variant.id, quantity: 2, unitPrice: '100' }],
    },
  })).data;
  const payment = (await request('/sales/payments', {
    method: 'POST',
    body: {
      clientId: client.id,
      amount: '200',
      method: 'CASH',
      allocations: [{ orderId: order.id, amount: '200' }],
    },
  })).data;
  const delivered = (await request(`/sales/orders/${order.id}/deliver`, {
    method: 'POST',
  })).data;

  assert(delivered.status === 'DELIVERED', 'order should be delivered');

  await expectStatus(`/sales/payments/${payment.id}/reverse`, 409, {
    method: 'POST',
    body: { reason: `Blocked before return ${suffix}` },
  });

  const stockAfterDelivery = await prisma.stock.findFirst({
    where: {
      tenantId,
      productVariantId: variant.id,
      warehouseZoneId: finishedZone.id,
    },
  });
  assert(stockAfterDelivery, 'stock should exist after delivery');
  const quantityBeforeReturn = Number(stockAfterDelivery.quantity);

  const returned = (await request(`/sales/orders/${order.id}/return-delivery`, {
    method: 'POST',
  })).data;

  assert(returned.status === 'READY', 'returned order should be READY');
  assert(returned.paymentStatus === 'PAID', 'payment status should remain PAID after return');

  const stockAfterReturn = await prisma.stock.findFirst({
    where: {
      tenantId,
      productVariantId: variant.id,
      warehouseZoneId: finishedZone.id,
    },
  });

  assert(
    Number(stockAfterReturn.quantity) === quantityBeforeReturn + 2,
    'delivery return should restore full order quantity to stock',
  );

  const reversed = (await request(`/sales/payments/${payment.id}/reverse`, {
    method: 'POST',
    body: { reason: `Smoke reversal after return ${suffix}` },
  })).data;

  assert(reversed.reversedAt, 'payment should be marked reversed');

  const refreshedOrder = (await request('/sales/orders')).data.find(
    (item) => item.id === order.id,
  );
  assert(
    refreshedOrder.paymentStatus === 'UNPAID',
    `order should become UNPAID after reversal, got ${refreshedOrder.paymentStatus}`,
  );

  const debt = (await request('/sales/debts')).data.find(
    (item) => item.client.id === client.id,
  );
  assert(debt?.debt === '200', `debt should increase to 200, got ${debt?.debt}`);

  const returnMovement = await prisma.stockMovement.findFirst({
    where: {
      tenantId,
      productVariantId: variant.id,
      movementType: 'RETURN',
      reason: 'ORDER_DELIVERY_RETURN',
    },
    orderBy: { createdAt: 'desc' },
  });
  assert(returnMovement, 'delivery return should create RETURN StockMovement');

  pass('client order payment delivery return and payment reversal', {
    clientId: client.id,
    orderId: order.id,
    paymentId: payment.id,
  });

  return { client, order, payment };
}

async function runSupplierFlow(material) {
  const supplier = (await request('/supplier/suppliers', {
    method: 'POST',
    body: { name: `Smoke Supplier ${suffix}` },
  })).data;
  const purchase = (await request('/supplier/purchases', {
    method: 'POST',
    body: {
      supplierId: supplier.id,
      items: [{ materialId: material.id, quantity: '3', unit: 'kg', unitPrice: '10' }],
    },
  })).data;

  await request('/supplier/payments', {
    method: 'POST',
    body: {
      supplierId: supplier.id,
      amount: '30',
      method: 'TRANSFER',
      allocations: [{ purchaseId: purchase.id, amount: '30' }],
    },
  });

  const supplierDebt = (await request('/supplier/debts')).data.find(
    (item) => item.supplier.id === supplier.id,
  );

  assert(supplierDebt?.debt === '0', `supplier debt should be zero, got ${supplierDebt?.debt}`);
  pass('supplier purchase and payment allocation', { supplierId: supplier.id });
}

async function findAvailablePayrollMonth({ tenantId, factoryId }) {
  for (let year = 2099; year <= 2199; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const payrollMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const existingPeriod = await prisma.payrollPeriod.findFirst({
        where: {
          tenantId,
          factoryId,
          month: new Date(`${payrollMonth}T00:00:00.000Z`),
        },
        select: { id: true },
      });

      if (!existingPeriod) {
        return payrollMonth;
      }
    }
  }

  throw new Error('No available future payroll month found for smoke test.');
}

async function runPayrollFlow({ context, workerActivity }) {
  const payrollMonth = await findAvailablePayrollMonth({
    tenantId: context.tenantId,
    factoryId: context.activeFactoryId,
  });
  const activityDate = new Date(`${payrollMonth}T10:00:00.000Z`);

  // Test setup only: WorkerActivity API records today's date by design. Move the
  // isolated test activity into an isolated future payroll month so this smoke
  // suite does not depend on existing payroll periods.
  await prisma.workerActivity.update({
    where: { id: workerActivity.id },
    data: { activityDate },
  });

  const period = (await request('/finance/payroll-periods', {
    method: 'POST',
    body: { month: payrollMonth },
  })).data;
  const calculated = (await request(`/finance/payroll-periods/${period.id}/calculate`, {
    method: 'POST',
  })).data;
  const items = (await request(`/finance/payroll-periods/${period.id}/items`)).data;

  assert(calculated.status === 'CALCULATED', 'payroll period should calculate');
  assert(items.length > 0, 'payroll calculation should create at least one item');

  const payableItem = items.find((item) => Number(item.remainingAmount) > 0);

  if (payableItem) {
    await request(`/finance/payroll-periods/${period.id}/pay`, {
      method: 'POST',
      body: {
        payrollItemId: payableItem.id,
        amount: payableItem.remainingAmount,
        method: 'CASH',
      },
    });
  }

  const closed = (await request(`/finance/payroll-periods/${period.id}/close`, {
    method: 'POST',
  })).data;

  assert(closed.status === 'CLOSED', 'payroll period should close');
  pass('payroll calculate pay close', { payrollPeriodId: period.id });
}

async function verifyDashboards() {
  const [executive, operations, warehouseSummary, salesSummary, financeSummary, tv] =
    await Promise.all([
      request('/dashboard/executive-summary'),
      request('/production/operations-summary'),
      request('/warehouse/stock-summary'),
      request('/sales/summary'),
      request('/finance/summary'),
      request('/dashboard/factory-tv-summary'),
    ]);

  assert(executive.data.kpis, 'executive summary should include kpis');
  assert(operations.data.kpis, 'operations summary should include kpis');
  assert(warehouseSummary.data.kpis, 'warehouse summary should include kpis');
  assert(salesSummary.data.kpis, 'sales summary should include kpis');
  assert(financeSummary.data.kpis, 'finance summary should include kpis');
  assert(tv.data.kpis, 'factory TV summary should include kpis');

  pass('dashboard summaries', {
    executiveKpis: Object.keys(executive.data.kpis).length,
  });
}

async function verifyCriticalAudits(tenantId) {
  const actions = [
    'STOCK_CORRECTED',
    'CLIENT_PAYMENT_REVERSED',
    'SALES_ORDER_DELIVERY_RETURNED',
    'STOCK_MOVEMENT_CREATED',
    'SUPPLIER_PAYMENT_CREATED',
    'PAYROLL_PERIOD_CLOSED',
  ];
  const audits = await prisma.auditLog.findMany({
    where: { tenantId, action: { in: actions } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const auditActions = new Set(audits.map((audit) => audit.action));

  for (const action of actions) {
    assert(auditActions.has(action), `${action} audit should exist`);
  }

  pass('critical audit actions', { actions: [...auditActions].sort() });
}

async function runSmokeSuite() {
  startServerIfNeeded();
  await waitForHealth();

  const context = await loginAndVerifyContext();
  const productSetup = await createProductSetup();
  const employeeSetup = await createEmployeeAndSalaryRate(productSetup.variant.id);
  const production = await runProductionChain({
    ...employeeSetup,
    variant: productSetup.variant,
  });
  const warehouse = await runWarehouseChecks({
    material: productSetup.material,
    variant: productSetup.variant,
  });
  await runRbacMatrix({
    material: productSetup.material,
    rawZone: warehouse.rawZone,
  });

  await runSalesRecoveryChain({
    tenantId: context.tenantId,
    clientName: `Smoke Client ${suffix}`,
    variant: productSetup.variant,
    finishedZone: warehouse.finishedZone,
  });
  await runSupplierFlow(productSetup.material);
  await runPayrollFlow({ context, ...production });
  await verifyDashboards();
  await verifyCriticalAudits(context.tenantId);

  return {
    ok: true,
    baseUrl,
    suffix,
    passedCount: checks.length,
    checks,
  };
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
