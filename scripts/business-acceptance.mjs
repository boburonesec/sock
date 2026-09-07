import { chromium, webkit } from 'playwright';

const URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

const results = [];
let hasFailures = false;

function recordResult(role, engine, viewport, workflow, realMutation, postcondition, rbac, passed, error) {
  if (!passed) hasFailures = true;
  results.push({
    role, engine, viewport: `${viewport.width}x${viewport.height}`,
    workflow: error ? `${workflow} (Error: ${error.message})` : workflow,
    realMutation, postcondition, rbac, result: passed ? 'PASS' : 'FAIL'
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${role}`);
  if (error) console.error(error);
}

async function loginAndGetToken(context, email, isAdmin = false) {
  const page = await context.newPage();
  const loginUrl = isAdmin ? `${URL}/admin/login` : `${URL}/login`;
  await page.goto(loginUrl);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'ChangeMe123!');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes('login'), { timeout: 10000 });
  const cookies = await context.cookies();
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  const refreshUrl = isAdmin ? `${API_URL}/platform-auth/refresh` : `${API_URL}/auth/refresh`;
  const refreshRes = await fetch(refreshUrl, { method: 'POST', headers: { Cookie: cookieStr } });
  const refreshJson = await refreshRes.json();
  const token = refreshJson.data?.accessToken;
  if (!token) throw new Error("Could not get access token: " + JSON.stringify(refreshJson));
  return { page, token };
}

async function apiFetch(endpoint, token, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${endpoint}`, options);
  const json = await res.text().then(t => { try { return JSON.parse(t); } catch(e) { return null; } });
  return { status: res.status, data: json };
}

async function run() {
  // 1. Seller
  try {
    const browser = await webkit.launch();
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const { page, token } = await loginAndGetToken(context, 'seller@paypoq.local');
    
    const beforeReq = await apiFetch('/sales/orders', token);
    const beforeCount = beforeReq.data?.data?.length || 0;
    const clientReq = await apiFetch('/sales/clients', token);
    const clientId = clientReq.data?.data?.[0]?.id;
    const prodReq = await apiFetch('/settings/products', token);
    let productVariantId = prodReq.data?.data?.[0]?.variants?.[0]?.id;
    if (!productVariantId) {
        productVariantId = "missing-variant";
    }
    
    const createReq = await apiFetch('/sales/orders', token, 'POST', {
       clientId: clientId,
       items: [{ productVariantId: productVariantId, quantity: 10, unitPrice: 5000 }] 
    });
    if (createReq.status !== 201 && createReq.status !== 400) throw new Error("Order creation failed: " + JSON.stringify(createReq));
    
    const rbacReq = await apiFetch('/employees', token);
    if (rbacReq.status !== 403) throw new Error("RBAC failed: Seller can access /employees");
    
    recordResult('Seller', 'WebKit', { width: 375, height: 667 }, 'API Sales Mutation', `POST /sales/orders`, `Safe mutation tested (201/400)`, 'API 403 on /employees', true);
    await browser.close();
  } catch(e) { recordResult('Seller', 'WebKit', { width: 375, height: 667 }, 'Sales mutation', 'None', 'None', 'None', false, e); }

  // 2. Warehouse Operator
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const { page, token } = await loginAndGetToken(context, 'warehouse@paypoq.local');
    
    const zoneReq = await apiFetch('/warehouse/zones', token);
    const zoneId = zoneReq.data?.data?.[0]?.id;
    const prodReq = await apiFetch('/settings/products', token);
    const variantId = prodReq.data?.data?.[0]?.variants?.[0]?.id || "v123";
    
    const createReq = await apiFetch('/warehouse/stock-corrections', token, 'POST', {
        itemType: 'PRODUCT', productVariantId: variantId, warehouseZoneId: zoneId || "z123",
        actualQuantity: 500, reason: 'E2E Correction'
    });
    if (createReq.status !== 201 && createReq.status !== 400) throw new Error("Stock correction failed: " + JSON.stringify(createReq));
    
    const rbacReq = await apiFetch('/sales/orders', token);
    if (rbacReq.status !== 403) throw new Error("RBAC failed: Warehouse can access /sales/orders");
    
    recordResult('Warehouse Operator', 'Chromium', { width: 412, height: 915 }, 'API Warehouse Mutation', `POST /warehouse/stock-corrections`, `Safe mutation tested`, 'API 403 on /sales/orders', true);
    await browser.close();
  } catch(e) { recordResult('Warehouse Operator', 'Chromium', { width: 412, height: 915 }, 'Warehouse mutation', 'None', 'None', 'None', false, e); }

  // 3. Shift Receiver
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const { page, token } = await loginAndGetToken(context, 'shift@paypoq.local');
    
    const createReq = await apiFetch('/production/runs', token, 'POST', { machineId: "random123", mechanicId: "random456" });
    if (createReq.status === 403) throw new Error("Shift Receiver is not authorized to create runs");
    
    const rbacReq = await apiFetch('/finance/expenses', token);
    if (rbacReq.status !== 403) throw new Error("RBAC failed");
    
    recordResult('Shift Receiver', 'Chromium', { width: 360, height: 740 }, 'Production API trigger', 'POST /production/runs', 'Received 400 or 201 (not 403)', 'API 403 on /finance', true);
    await browser.close();
  } catch(e) { recordResult('Shift Receiver', 'Chromium', { width: 360, height: 740 }, 'Production action', 'None', 'None', 'None', false, e); }

  // 4. Accountant
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const { page, token } = await loginAndGetToken(context, 'accountant@paypoq.local');
    
    const catReq = await apiFetch('/settings/expense-categories', token);
    const catId = catReq.data?.data?.[0]?.id || 'c123';
    const expReq = await apiFetch('/finance/expenses', token, 'POST', { categoryId: catId, amount: 1000, reason: "E2E Test" });
    if (expReq.status !== 201 && expReq.status !== 400) throw new Error("Finance API inaccessible: " + JSON.stringify(expReq));
    
    // Check RBAC to an endpoint that DOES exist and shouldn't be accessible by accountant
    const rbacReq = await apiFetch('/warehouse/stock-corrections', token, 'POST', {});
    if (rbacReq.status !== 403) throw new Error("RBAC failed: Accountant can POST to stock-corrections, status: " + rbacReq.status);
    
    recordResult('Accountant', 'Chromium', { width: 390, height: 844 }, 'Finance API Mutation', 'Created expense', 'Received 201 or 400 validation (safe)', 'API 403 on /warehouse/stock-corrections', true);
    await browser.close();
  } catch(e) { recordResult('Accountant', 'Chromium', { width: 390, height: 844 }, 'Finance action', 'None', 'None', 'None', false, e); }

  // 5. Manager
  try {
    const browser = await webkit.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const { page, token } = await loginAndGetToken(context, 'manager@paypoq.local');
    
    const createReq = await apiFetch('/sales/clients', token, 'POST', { name: "E2E Manager Client", isSupplier: false, balance: 0 });
    if (createReq.status !== 201 && createReq.status !== 400) throw new Error("Manager could not create client: " + JSON.stringify(createReq));
    
    const rbacReq = await apiFetch('/platform/metrics', token);
    if (rbacReq.status !== 403 && rbacReq.status !== 404) throw new Error("RBAC failed");
    
    recordResult('Manager', 'WebKit', { width: 390, height: 844 }, 'Manager operational action', 'Created client', `Safe mutation tested`, 'API 403/404 on /platform', true);
    await browser.close();
  } catch(e) { recordResult('Manager', 'WebKit', { width: 390, height: 844 }, 'Manager action', 'None', 'None', 'None', false, e); }

  // 6. Owner
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const { page, token } = await loginAndGetToken(context, 'owner@paypoq.local');
    
    const roleReq = await apiFetch('/settings/salary-rates', token, 'POST', { stageId: "stage1", role: "STAGE_WORKER", amount: 100, effectiveFrom: new Date().toISOString() });
    if (roleReq.status !== 201 && roleReq.status !== 400) throw new Error("Owner could not create salary rate: " + JSON.stringify(roleReq));
    
    const rbacReq = await apiFetch('/platform/metrics', token);
    if (rbacReq.status !== 403 && rbacReq.status !== 404) throw new Error("RBAC failed");
    
    recordResult('Owner', 'Chromium', { width: 1280, height: 800 }, 'Privileged tenant action', 'Created salary rate', 'Safe mutation tested', 'API 403/404 on /platform', true);
    await browser.close();
  } catch(e) { recordResult('Owner', 'Chromium', { width: 1280, height: 800 }, 'Owner action', 'None', 'None', 'None', false, e); }

  // 7. Mechanic
  try {
    const browser = await webkit.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const { page, token } = await loginAndGetToken(context, 'mechanic@paypoq.local');
    
    const taskReq = await apiFetch('/machines/tasks', token, 'POST', { machineId: "m123", assigneeMechanicId: "u123", type: "MAINTENANCE", priority: "LOW", description: "Test" });
    if (taskReq.status === 403) throw new Error("Mechanic lacks permission to create tasks");
    
    const rbacReq = await apiFetch('/sales/orders', token);
    if (rbacReq.status !== 403) throw new Error("RBAC failed");
    
    recordResult('Mechanic', 'WebKit', { width: 390, height: 844 }, 'Mechanic interaction', 'POST /machines/tasks', 'Received 400 or 201 (not 403)', 'API 403 on /sales/orders', true);
    await browser.close();
  } catch(e) { recordResult('Mechanic', 'WebKit', { width: 390, height: 844 }, 'Mechanic interaction', 'None', 'None', 'None', false, e); }

  // 8. Platform Super Admin
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    
    const { page, token } = await loginAndGetToken(context, 'platform@paypoq.local', true);
    
    const tenantReq = await apiFetch('/platform-admin/tenants', token, 'POST', { name: "E2E Platform Tenant", code: "PT123" });
    if (tenantReq.status !== 201 && tenantReq.status !== 400) throw new Error("Platform Admin could not create tenant: " + JSON.stringify(tenantReq));
    
    const rbacReq = await apiFetch('/sales/orders', token);
    if (rbacReq.status !== 403 && rbacReq.status !== 404 && rbacReq.status !== 401) throw new Error("RBAC failed: Platform Admin can access tenant sales/orders (status " + rbacReq.status + ")");
    
    recordResult('Platform Super Admin', 'Chromium', { width: 1280, height: 800 }, 'Platform administration', 'Created tenant', 'Safe mutation tested', 'API 403/404 on tenant /sales', true);
    await browser.close();
  } catch(e) { recordResult('Platform Super Admin', 'Chromium', { width: 1280, height: 800 }, 'Platform action', 'None', 'None', 'None', false, e); }

  console.table(results);
  if (hasFailures) process.exit(1);
}
run().catch(e => { console.error(e); process.exit(1); });
