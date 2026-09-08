/**
 * Paypoq OS — Hardened Mobile UI Acceptance Suite
 *
 * Rules (per user directive):
 *  - No false-positive PASS when business precondition absent
 *  - No force:true on normal UI interactions
 *  - Real deterministic postcondition assertions via assert
 *  - Fixtures created via API; business action through UI
 *  - Unique RUN_ID to avoid cross-run collisions
 *  - DrawerFooter geometry validation for Seller, Warehouse, Accountant
 *
 * Form field IDs and button text verified against source:
 *  - Order: select#orderClient, select[id^="orderItemVariant"], input[id^="orderItemQuantity"]
 *  - Stock correction: select#stockCorrectionItemType, #stockCorrectionProductVariantId,
 *      select#stockCorrectionWarehouseZoneId, input#stockCorrectionNewQuantity, textarea#stockCorrectionReason
 *    Submit: "Qoldiqni tuzatish"
 *  - Advance form: select#advance-employee, input#advance-amount, textarea#advance-reason
 *    Open drawer button: "Avans so\u2018rovi" (U+2018)
 *    Submit: "So\u2018rov ochish" (U+2018)
 *  - Expense form: select#expense-category, input#expense-amount, textarea#expense-reason
 *    Submit: "So\u2018rov ochish" (U+2018)
 *  - Work shifts: input#DAY-start, submit: "O\u2018zgarishlarni saqlash" (U+2018), URL: /settings/shifts
 *  - Tenant form: input#tenant-name, input#contact-email, submit: "Korxona yaratish"
 *  - Mechanic task types: REPAIR | SETUP | INSPECTION | OTHER (NOT SCHEDULED)
 */

import assert from 'assert';
import { chromium, webkit } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const API_URL  = 'http://localhost:3001';
const PASSWORD  = 'ChangeMe123!';
const RUN_ID    = Date.now();

// Uzbek curly apostrophe (U+2018) used throughout the UI
const APOS = '\u2018';

let results   = [];
let hasFailure = false;

// ─── helpers ────────────────────────────────────────────────────────────────

function recordPass(role, engine, viewport, workflow, uiSubmit, uiSuccess, postcondition) {
  results.push({ role, engine, viewport, workflow, uiSubmit, uiSuccess, postcondition, result: 'PASS' });
  console.log(`[PASS] ${role}`);
}

function recordFail(role, engine, viewport, workflow, error) {
  hasFailure = true;
  results.push({
    role, engine, viewport,
    workflow: `${workflow} (${error?.message ?? error})`,
    uiSubmit: 'None', uiSuccess: 'None', postcondition: 'None',
    result: 'FAIL',
  });
  console.log(`[FAIL] ${role}  ->  ${error?.message ?? error}`);
}

async function apiLogin(email, isPlatform = false) {
  const path = isPlatform ? '/platform-auth/login' : '/auth/login';
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`API login failed for ${email}: ${res.status}`);
  const body = await res.json();
  const token = body?.data?.accessToken;
  if (!token) throw new Error(`No accessToken for ${email}`);
  return token;
}

async function apiFetch(path, token, method = 'GET', body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function uiLogin(context, email, isPlatform = false) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}${isPlatform ? '/admin/login' : '/login'}`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  if (!isPlatform) {
    await page.waitForSelector('button[aria-label="Menyuni ochish"]', { timeout: 15000 });
  } else {
    await page.waitForURL('**/admin/tenants**', { timeout: 15000 });
  }
  return page;
}

async function navTo(page, linkText, urlPattern) {
  await page.click('button[aria-label="Menyuni ochish"]');
  await page.waitForSelector(`nav a:has-text("${linkText}")`, { state: 'visible' });
  await page.click(`nav a:has-text("${linkText}")`);
  await page.waitForURL(urlPattern, { timeout: 15000 });
  await page.waitForTimeout(700);
}

/**
 * Wait for a drawer to close.
 * Strategy: wait for the form to detach from DOM (Drawer uses `if (!open) return null`).
 * Falls back to waiting for the submit button to disappear.
 */
async function waitForDrawerClose(page, submitLocator, timeout = 20000) {
  try {
    await submitLocator.waitFor({ state: 'detached', timeout });
  } catch {
    // fallback: wait for form to not be in viewport
    await page.waitForTimeout(2000);
  }
}

/**
 * DrawerFooter geometry validation.
 * Asserts submit CTA is rendered and within the viewport bounds.
 */
async function assertDrawerFooterReachable(page, submitLocator) {
  await submitLocator.waitFor({ state: 'visible', timeout: 10000 });
  const box = await submitLocator.boundingBox();
  const vp = page.viewportSize();
  assert.ok(box, 'Submit CTA has no bounding box — not rendered');
  assert.ok(
    box.y + box.height <= vp.height + 10,
    `Submit CTA bottom (${Math.round(box.y + box.height)}) exceeds viewport height (${vp.height})`
  );
  assert.ok(box.y >= 0, 'Submit CTA top is above viewport');
  assert.ok(box.width > 0 && box.height > 0, 'Submit CTA has zero size');
}

// ─── 1. Seller ───────────────────────────────────────────────────────────────

async function runSeller() {
  const token = await apiLogin('seller@paypoq.local');

  const clientsData = await apiFetch('/sales/clients', token);
  const clients = clientsData?.data ?? [];
  if (clients.length === 0) throw new Error('No clients — seed required');

  const ordersData = await apiFetch('/sales/orders', token);
  const existingOrders = ordersData?.data ?? [];
  if (existingOrders.length === 0) throw new Error('No existing orders to derive a product variant');

  const variantId   = existingOrders[0].items[0].productVariant.id;
  const clientId    = clients[0].id;
  const testQty     = 3;
  const countBefore = existingOrders.length;

  const browser = await webkit.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  try {
    const page = await uiLogin(context, 'seller@paypoq.local');
    await navTo(page, 'Sotuv', '**/sales**');

    await page.click('a:has-text("Buyurtmalar")');
    await page.waitForURL('**/sales/orders**', { timeout: 10000 });
    await page.waitForTimeout(800);

    const createBtn = page.locator('main').getByRole('button', { name: 'Buyurtma yaratish' });
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(600);

    // select#orderClient (id confirmed in source)
    const clientSelect = page.locator('select#orderClient');
    await clientSelect.waitFor({ state: 'visible', timeout: 8000 });
    await clientSelect.selectOption(clientId);

    // select[id^="orderItemVariant"] (dynamic RHF id)
    const variantSelect = page.locator('select[id^="orderItemVariant"]').first();
    await variantSelect.waitFor({ state: 'visible', timeout: 5000 });
    await variantSelect.selectOption(variantId);

    // input[id^="orderItemQuantity"] (dynamic RHF id)
    const qtyInput = page.locator('input[id^="orderItemQuantity"]').first();
    await qtyInput.waitFor({ state: 'visible', timeout: 5000 });
    await qtyInput.fill(String(testQty));

    // DrawerFooter geometry validation
    const submitBtn = page.getByRole('button', { name: 'Buyurtma yaratish' }).last();
    await assertDrawerFooterReachable(page, submitBtn);

    // Standard click — no force
    await submitBtn.click();
    await waitForDrawerClose(page, submitBtn);

    await page.waitForTimeout(1200);
    const afterData = await apiFetch('/sales/orders', token);
    const afterOrders = afterData?.data ?? [];
    assert.ok(afterOrders.length > countBefore,
      `Order count did not increase: before=${countBefore} after=${afterOrders.length}`);
    const created = afterOrders[0];
    assert.ok(
      created.items.some(i => i.quantity === testQty),
      `No item with qty=${testQty}; items=${JSON.stringify(created.items)}`
    );

    recordPass('Seller', 'WebKit', '375x667',
      'Create Order Flow',
      'Clicked Buyurtma yaratish (standard click)',
      'Drawer closed',
      `Order #${created.orderNumber} created · qty=${testQty} confirmed via API`);
  } finally {
    await browser.close();
  }
}

// ─── 2. Warehouse Operator ────────────────────────────────────────────────────

async function runWarehouseOperator() {
  const token = await apiLogin('warehouse@paypoq.local');

  const stockData = await apiFetch('/warehouse/stock', token);
  const stockItems = stockData?.data ?? [];
  if (stockItems.length === 0) throw new Error('No stock items — seed required');

  const zonesData = await apiFetch('/warehouse/zones', token);
  const zones = zonesData?.data ?? [];
  if (zones.length === 0) throw new Error('No warehouse zones — seed required');

  const target   = stockItems[0];
  const before   = Number(target.quantity);
  const expected = before + 5;
  const zoneId   = zones[0].id;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  try {
    const page = await uiLogin(context, 'warehouse@paypoq.local');
    await navTo(page, 'Ombor', '**/warehouse**');
    await page.waitForTimeout(600);

    const corrBtn = page.locator('main').getByRole('button', { name: 'Qoldiqni tuzatish' });
    await corrBtn.waitFor({ state: 'visible', timeout: 10000 });
    await corrBtn.click();
    await page.waitForTimeout(600);

    // Form field IDs confirmed in stock-correction-drawer.tsx source
    const itemTypeSelect = page.locator('select#stockCorrectionItemType');
    await itemTypeSelect.waitFor({ state: 'visible', timeout: 5000 });
    await itemTypeSelect.selectOption('PRODUCT');

    const variantSelect = page.locator('select#stockCorrectionProductVariantId');
    await variantSelect.waitFor({ state: 'visible', timeout: 5000 });
    await variantSelect.selectOption(target.productVariant.id);

    const zoneSelect = page.locator('select#stockCorrectionWarehouseZoneId');
    await zoneSelect.waitFor({ state: 'visible', timeout: 5000 });
    await zoneSelect.selectOption(zoneId);

    const qtyInput = page.locator('input#stockCorrectionNewQuantity');
    await qtyInput.waitFor({ state: 'visible', timeout: 5000 });
    await qtyInput.fill(String(expected));

    const reasonInput = page.locator('textarea#stockCorrectionReason');
    await reasonInput.waitFor({ state: 'visible', timeout: 5000 });
    await reasonInput.fill(`UI-TEST-${RUN_ID}: acceptance test correction`);

    // DrawerFooter geometry validation
    const submitBtn = page.getByRole('button', { name: 'Qoldiqni tuzatish' }).last();
    await assertDrawerFooterReachable(page, submitBtn);

    // Standard click — no force
    await submitBtn.click();
    await waitForDrawerClose(page, submitBtn);

    await page.waitForTimeout(1200);
    const afterStock = await apiFetch('/warehouse/stock', token);
    const afterItems = afterStock?.data ?? [];
    const updated = afterItems.find(s => s.productVariant?.id === target.productVariant.id);
    assert.ok(updated, `Stock item for variant ${target.productVariant.id} not found after correction`);
    assert.strictEqual(
      Number(updated.quantity), expected,
      `Stock quantity mismatch: expected=${expected} actual=${updated.quantity}`
    );

    recordPass('Warehouse Operator', 'Chromium', '412x915',
      'Stock Correction Flow',
      'Clicked Qoldiqni tuzatish (standard click)',
      'Drawer closed',
      `Stock: before=${before} -> after=${updated.quantity} (expected ${expected}) confirmed via API`);
  } finally {
    await browser.close();
  }
}

// ─── 3. Shift Receiver ────────────────────────────────────────────────────────
// No ACTIVE production runs in demo seed → honest FAIL (infrastructure gap).
// To pass: seed an active production run via POST /production/runs before test.

async function runShiftReceiver() {
  const token = await apiLogin('shift@paypoq.local');
  const runsData = await apiFetch('/production/runs', token);
  const activeRuns = (runsData?.data ?? []).filter(r => r.status === 'ACTIVE');

  if (activeRuns.length === 0) {
    throw new Error(
      'No ACTIVE production runs — seed via POST /production/runs before this test'
    );
  }

  const runId = activeRuns[0].id;
  const defectsBefore = await apiFetch('/production/defects', token);
  const countBefore   = (defectsBefore?.data ?? []).length;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  try {
    const page = await uiLogin(context, 'shift@paypoq.local');
    await navTo(page, 'Ishlab chiqarish', '**/production**');
    await page.waitForTimeout(600);

    const defectBtn = page.locator('main').getByRole('button', { name: 'Brak qayd qilish' });
    await defectBtn.waitFor({ state: 'visible', timeout: 10000 });
    await defectBtn.click();
    await page.waitForTimeout(600);

    const testQty = 2;
    await page.fill('input[type="number"]', String(testQty));

    const submitBtn = page.getByRole('button', { name: 'Saqlash' });
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    // Standard click — no force
    await submitBtn.click();
    await waitForDrawerClose(page, submitBtn);

    await page.waitForTimeout(1000);
    const defectsAfter = await apiFetch('/production/defects', token);
    assert.ok((defectsAfter?.data ?? []).length > countBefore,
      `Defect count did not increase: before=${countBefore} after=${(defectsAfter?.data ?? []).length}`);

    recordPass('Shift Receiver', 'Chromium', '360x740',
      'Defect Recording Flow',
      'Clicked Brak qayd qilish (standard click)',
      'Drawer closed',
      `Defect count: ${countBefore} -> ${(defectsAfter?.data ?? []).length} for run ${runId}`);
  } finally {
    await browser.close();
  }
}

// ─── 4. Mechanic ─────────────────────────────────────────────────────────────

async function runMechanic() {
  const ownerToken = await apiLogin('owner@paypoq.local');

  // Create machine fixture if none exist
  const machinesData = await apiFetch('/machines', ownerToken);
  let machines = machinesData?.data ?? [];
  if (machines.length === 0) {
    const shortCode = `M${String(RUN_ID).slice(-7)}`;
    const created = await apiFetch('/machines', ownerToken, 'POST', {
      code: shortCode,
      name: `Test Machine ${RUN_ID}`,
    });
    machines = [created.data];
  }

  // Find mechanic employee
  const lookupsData = await apiFetch('/production/lookups/employees', ownerToken);
  const employees = lookupsData?.data ?? [];
  const mechEmployee = employees.find(e => (e.workProfile || '').toUpperCase() === 'MECHANIC');
  if (!mechEmployee) throw new Error('No MECHANIC employee — seed required');

  // Create task fixture (type INSPECTION — SCHEDULED does not exist in enum)
  const taskDesc = `UI-TEST-${RUN_ID}: inspection`;
  const taskBody = await apiFetch('/machines/tasks', ownerToken, 'POST', {
    machineId: machines[0].id,
    assigneeMechanicId: mechEmployee.id,
    type: 'INSPECTION',
    priority: 'MEDIUM',
    description: taskDesc,
  });
  const taskId = taskBody?.data?.id;
  assert.ok(taskId, 'Failed to create maintenance task fixture via API');

  const browser = await webkit.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await uiLogin(context, 'mechanic@paypoq.local');
    await navTo(page, 'Mexanik', '**/mechanic**');
    await page.waitForTimeout(800);

    // Wait for task to appear in list
    await page.waitForSelector(`text=${taskDesc}`, { timeout: 15000 });

    // Click "Vazifani ochish" to expand the task detail panel
    const openBtn = page.getByRole('button', { name: 'Vazifani ochish' }).first();
    await openBtn.waitFor({ state: 'visible', timeout: 10000 });
    // Standard click — no force
    await openBtn.click();
    await page.waitForTimeout(800);

    // The expanded detail shows "Ishni boshlash" for OPEN tasks
    const startBtn = page.getByRole('button', { name: 'Ishni boshlash' });
    await startBtn.waitFor({ state: 'visible', timeout: 8000 });
    // Standard click — no force
    await startBtn.click();
    await page.waitForTimeout(1500);

    // Postcondition: task status must be IN_PROGRESS
    const mechToken = await apiLogin('mechanic@paypoq.local');
    const tasksAfter = await apiFetch('/machines/tasks', mechToken);
    const updated = (tasksAfter?.data ?? []).find(t => t.id === taskId);
    assert.ok(updated, `Task ${taskId} not found after Mechanic UI interaction`);
    assert.strictEqual(updated.status, 'IN_PROGRESS',
      `Task status should be IN_PROGRESS; got ${updated.status}`);

    recordPass('Mechanic', 'WebKit', '390x844',
      'Maintenance Task Start Flow',
      'Clicked Vazifani ochish then Ishni boshlash (standard clicks)',
      'Task status changed',
      `Task ${taskId}: OPEN -> ${updated.status} confirmed via API`);
  } finally {
    await browser.close();
  }
}

// ─── 5. Manager ──────────────────────────────────────────────────────────────
// Manager creates an advance request for an employee via UI.
// Manager cannot approve their own advances (isRequester guard in UI).
// Correct Manager workflow = creating a request, not approving one.

async function runManager() {
  const token = await apiLogin('manager@paypoq.local');

  const lookupsData = await apiFetch('/production/lookups/employees', token);
  const employees = lookupsData?.data ?? [];
  if (employees.length === 0) throw new Error('No employees — seed required for Manager test');
  const targetEmployee = employees[0];

  const testAmount = '60000';
  const testReason = `UI-TEST-${RUN_ID}: manager advance`;

  const beforeData  = await apiFetch('/finance/advances', token);
  const countBefore = (beforeData?.data ?? []).length;

  const browser = await webkit.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await uiLogin(context, 'manager@paypoq.local');
    await navTo(page, 'Moliya', '**/finance**');
    await page.waitForTimeout(600);

    // Navigate to advances sub-tab
    await page.click('a:has-text("Avanslar")');
    await page.waitForURL('**/finance/advances**', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Button text in source: "Avans so\u2018rovi" (U+2018 curly apostrophe)
    const openDrawerBtn = page.getByRole('button', { name: `Avans so${APOS}rovi` });
    await openDrawerBtn.waitFor({ state: 'visible', timeout: 10000 });
    // Standard click — no force
    await openDrawerBtn.click();
    await page.waitForTimeout(600);

    // Form field IDs confirmed in advances-module.tsx
    const empSelect = page.locator('select#advance-employee');
    await empSelect.waitFor({ state: 'visible', timeout: 5000 });
    await empSelect.selectOption(targetEmployee.id);

    await page.fill('input#advance-amount', testAmount);
    await page.fill('textarea#advance-reason', testReason);

    // Submit button: "So\u2018rov ochish" (U+2018)
    const submitBtn = page.getByRole('button', { name: `So${APOS}rov ochish` });
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    // Standard click — no force
    await submitBtn.click();
    await waitForDrawerClose(page, submitBtn);

    await page.waitForTimeout(1000);
    const afterData  = await apiFetch('/finance/advances', token);
    const afterList  = afterData?.data ?? [];
    assert.ok(afterList.length > countBefore,
      `Advance count did not increase: before=${countBefore} after=${afterList.length}`);
    const created = afterList.find(a => a.reason === testReason);
    assert.ok(created, `Advance with reason "${testReason}" not found via API`);
    assert.strictEqual(created.status, 'REQUESTED',
      `Advance should be REQUESTED; got ${created.status}`);

    recordPass('Manager', 'WebKit', '390x844',
      `Create Advance Request Flow`,
      `Clicked Avans so${APOS}rovi then So${APOS}rov ochish (standard clicks)`,
      'Drawer closed',
      `Advance ${created.id} for ${targetEmployee.name} amount=${created.amount} status=REQUESTED confirmed via API`);
  } finally {
    await browser.close();
  }
}

// ─── 6. Accountant ───────────────────────────────────────────────────────────

async function runAccountant() {
  const token = await apiLogin('accountant@paypoq.local');

  const catsData = await apiFetch('/settings/expense-categories', token);
  const cats = catsData?.data ?? [];
  if (cats.length === 0) throw new Error('No expense categories — seed required');

  const categoryId  = cats[0].id;
  const testAmount  = '87500';
  const testReason  = `UI-TEST-${RUN_ID}: acceptance expense`;

  const beforeData  = await apiFetch('/finance/expenses', token);
  const countBefore = (beforeData?.data ?? []).length;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await uiLogin(context, 'accountant@paypoq.local');
    await navTo(page, 'Moliya', '**/finance**');
    await page.waitForTimeout(600);

    // Navigate to expenses sub-tab
    await page.click('a:has-text("Xarajatlar")');
    await page.waitForURL('**/finance/expenses**', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Open create drawer — standard click
    const createBtn = page.locator('main').getByRole('button', { name: 'Xarajat yaratish' });
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(600);

    // Form field IDs confirmed in expenses-module.tsx
    const catSelect = page.locator('select#expense-category');
    await catSelect.waitFor({ state: 'visible', timeout: 5000 });
    await catSelect.selectOption(categoryId);

    await page.fill('input#expense-amount', testAmount);
    await page.fill('textarea#expense-reason', testReason);

    // DrawerFooter geometry validation
    // Submit button: "So\u2018rov ochish" (U+2018 curly apostrophe)
    const submitBtn = page.getByRole('button', { name: `So${APOS}rov ochish` });
    await assertDrawerFooterReachable(page, submitBtn);

    // Standard click — no force
    await submitBtn.click();
    await waitForDrawerClose(page, submitBtn);

    await page.waitForTimeout(1200);
    const afterData  = await apiFetch('/finance/expenses', token);
    const afterList  = afterData?.data ?? [];
    assert.ok(afterList.length > countBefore,
      `Expense count did not increase: before=${countBefore} after=${afterList.length}`);
    const created = afterList.find(e => e.reason === testReason);
    assert.ok(created, `Expense with reason "${testReason}" not found via API`);
    assert.strictEqual(Number(created.amount), Number(testAmount),
      `Expense amount: expected=${testAmount} actual=${created.amount}`);
    assert.strictEqual(created.status, 'REQUESTED',
      `Expense should be REQUESTED; got ${created.status}`);

    recordPass('Accountant', 'Chromium', '390x844',
      'Create Expense Flow',
      `Clicked Xarajat yaratish then So${APOS}rov ochish (standard click)`,
      'Drawer closed',
      `Expense ${created.id} amount=${created.amount} status=${created.status} confirmed via API`);
  } finally {
    await browser.close();
  }
}

// ─── 7. Owner ────────────────────────────────────────────────────────────────

async function runOwner() {
  const token = await apiLogin('owner@paypoq.local');

  const shiftsData = await apiFetch('/settings/work-shifts', token);
  const shifts = shiftsData?.data ?? [];
  const dayShift = shifts.find(s => s.code === 'DAY');
  assert.ok(dayShift, 'DAY work shift not found in API');

  const originalStart = dayShift.startTime;
  const newStart = originalStart === '08:00' ? '08:30' : '08:00';

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await uiLogin(context, 'owner@paypoq.local');
    await navTo(page, 'Sozlamalar', '**/settings**');
    await page.waitForTimeout(600);

    // URL is /settings/shifts (confirmed via navigation.ts)
    const shiftLink = page.locator('a').filter({ hasText: 'Ish smenalari' });
    await shiftLink.first().waitFor({ state: 'visible', timeout: 8000 });
    await shiftLink.first().click();
    await page.waitForURL('**/settings/shifts**', { timeout: 10000 });
    await page.waitForTimeout(800);

    // input#DAY-start confirmed in work-shifts-page.tsx
    // Must use pressSequentially (not fill) to fire React's synthetic onChange
    // for controlled type="time" inputs; fill() sets value but skips onChange.
    const startInput = page.locator('input#DAY-start');
    await startInput.waitFor({ state: 'visible', timeout: 10000 });
    await startInput.click();
    await startInput.selectText();
    await startInput.pressSequentially(newStart, { delay: 50 });
    await startInput.press('Tab');
    await page.waitForTimeout(500);

    // Submit button text when dirty: "O'zgarishlarni saqlash" (plain ASCII apostrophe U+0027)
    const saveBtn = page.getByRole('button', { name: "O'zgarishlarni saqlash" });
    await saveBtn.waitFor({ state: 'visible', timeout: 8000 });
    // Standard click — no force
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // Postcondition: API must reflect new startTime
    const afterData = await apiFetch('/settings/work-shifts', token);
    const afterDay  = (afterData?.data ?? []).find(s => s.code === 'DAY');
    assert.ok(afterDay, 'DAY shift not found after update');
    assert.strictEqual(afterDay.startTime, newStart,
      `DAY startTime: expected=${newStart} actual=${afterDay.startTime}`);

    recordPass('Owner', 'Chromium', '390x844',
      'Work Shift Settings Flow',
      `Used pressSequentially DAY-start (${newStart}) then clicked O'zgarishlarni saqlash (standard click)`,
      'Save feedback displayed',
      `DAY shift startTime confirmed as ${afterDay.startTime} via API`);
  } finally {
    await browser.close();
  }
}

// ─── 8. Platform Super Admin ──────────────────────────────────────────────────

async function runPlatformAdmin() {
  const token = await apiLogin('platform@paypoq.local', true);

  const uniqueName   = `UITest-${RUN_ID}`;
  const contactEmail = `admin-${RUN_ID}@uitest.local`;

  const beforeData  = await apiFetch('/platform-admin/tenants', token);
  const countBefore = (beforeData?.data ?? []).length;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await uiLogin(context, 'platform@paypoq.local', true);
    await page.waitForTimeout(600);

    // Open tenant creation drawer — standard click
    const createBtn = page.locator('main').getByRole('button', { name: 'Korxona yaratish' });
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(600);

    // Form field IDs confirmed in admin/tenants/page.tsx
    await page.fill('input#tenant-name', uniqueName);
    await page.fill('input#contact-email', contactEmail);

    // Submit button confirmed: "Korxona yaratish"
    const submitBtn = page.locator('form').getByRole('button', { name: 'Korxona yaratish' });
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    // Standard click — no force
    await submitBtn.click();
    await waitForDrawerClose(page, submitBtn);

    await page.waitForTimeout(1000);
    const afterData = await apiFetch('/platform-admin/tenants', token);
    const afterList = afterData?.data ?? [];
    assert.ok(afterList.length > countBefore,
      `Tenant count did not increase: before=${countBefore} after=${afterList.length}`);
    const created = afterList.find(t =>
      t.name === uniqueName || t.contactEmail === contactEmail
    );
    assert.ok(created, `Tenant "${uniqueName}" not found in API after creation`);

    recordPass('Platform Super Admin', 'Chromium', '1280x800',
      'Tenant Creation Flow',
      `Clicked Korxona yaratish (standard click) name=${uniqueName}`,
      'Drawer closed',
      `Tenant ${created.id} name="${created.name}" confirmed via API`);
  } finally {
    await browser.close();
  }
}

// ─── run all ──────────────────────────────────────────────────────────────────

async function run() {
  const roles = [
    { name: 'Seller',               fn: runSeller },
    { name: 'Warehouse Operator',   fn: runWarehouseOperator },
    { name: 'Shift Receiver',       fn: runShiftReceiver },
    { name: 'Mechanic',             fn: runMechanic },
    { name: 'Manager',              fn: runManager },
    { name: 'Accountant',           fn: runAccountant },
    { name: 'Owner',                fn: runOwner },
    { name: 'Platform Super Admin', fn: runPlatformAdmin },
  ];

  for (const { name, fn } of roles) {
    try {
      await fn();
    } catch (e) {
      if (!results.find(r => r.role === name)) {
        recordFail(name, '?', '?', `${name} workflow`, e);
      }
    }
  }

  console.table(results.map(r => ({
    role: r.role,
    engine: r.engine,
    viewport: r.viewport,
    workflow: r.workflow.slice(0, 80),
    postcondition: r.postcondition.slice(0, 80),
    result: r.result,
  })));

  if (hasFailure) process.exit(1);
}

run();
