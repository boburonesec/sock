import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";
const API = process.env.API_BASE_URL || "http://localhost:3001";

const VIEWPORTS = {
  mobilePrimary: { name: "Primary Mobile (390x844)", width: 390, height: 844, isMobile: true, hasTouch: true },
  smallPhone: { name: "Small Phone (320x568)", width: 320, height: 568, isMobile: true, hasTouch: true },
  largePhone: { name: "Large Phone (412x915)", width: 412, height: 915, isMobile: true, hasTouch: true },
  desktop: { name: "Desktop (1440x900)", width: 1440, height: 900, isMobile: false, hasTouch: false },
};

const results = [];

function recordResult(role, workflow, mobile, mutationVerified, rbac, status, detail = "") {
  results.push({ role, workflow, mobile, mutationVerified, rbac, status, detail });
  const icon = status === "PASS" ? "✓" : "✗";
  console.log(`  ${icon} [${status}] [${role}] ${workflow} — ${detail}`);
}

async function apiCall(endpoint, { method = "GET", token, activeFactoryId, body } = {}) {
  const headers = {
    Accept: "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (activeFactoryId) headers["X-Factory-Id"] = activeFactoryId;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function getAuthToken(email, password = "ChangeMe123!", isPlatform = false) {
  const endpoint = isPlatform ? "/platform-auth/login" : "/auth/login";
  const res = await apiCall(endpoint, {
    method: "POST",
    body: { email, password },
  });

  assert(res.ok, `API authentication failed for ${email}: ${JSON.stringify(res.data)}`);
  return {
    accessToken: res.data.data.accessToken,
    tenantId: res.data.data.tenantId,
    activeFactoryId: res.data.data.activeFactoryId,
    user: res.data.data.user || res.data.data.platformAdmin,
  };
}

async function loginUser(page, email, password = "ChangeMe123!", expectedPath = "") {
  await page.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector("#email:not([disabled])", { timeout: 15000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type='submit']");
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  if (expectedPath) {
    await page.waitForURL((url) => url.pathname.includes(expectedPath), { timeout: 10000 });
  }
}

async function checkNoHorizontalOverflow(page, contextLabel) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      clientWidth: doc.clientWidth,
    };
  });
  assert(
    metrics.scrollWidth <= metrics.clientWidth + 2,
    `Horizontal overflow on ${contextLabel}: scrollWidth ${metrics.scrollWidth} > clientWidth ${metrics.clientWidth}`,
  );
}

async function assertTouchTarget(locator, label) {
  const box = await locator.boundingBox();
  assert(box, `Could not get bounding box for ${label}`);
  assert(
    box.height >= 43.5 && box.width >= 43.5,
    `Touch target too small for ${label}: ${box.width}x${box.height}px (must be >= 44x44px)`,
  );
}

async function assertRbacDenied(page, forbiddenUrl, roleLabel) {
  await page.goto(`${WEB}${forbiddenUrl}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const deniedLocator = page
    .locator("text=403")
    .or(page.locator("text=Ruxsat yo‘q"))
    .or(page.locator("text=Bu sahifaga kira olmaysiz"))
    .or(page.locator("text=Kirish"));

  const isForbiddenText = await deniedLocator.first().isVisible();
  assert(isForbiddenText, `Frontend RBAC violation: ${roleLabel} was able to access forbidden route ${forbiddenUrl}`);
}

async function assertApiRbacDenied(endpoint, token, method = "GET", body = null) {
  const res = await apiCall(endpoint, { method, token, body });
  assert(
    [401, 403].includes(res.status),
    `Backend API RBAC violation: expected 401/403 for ${method} ${endpoint}, got ${res.status}: ${JSON.stringify(res.data)}`,
  );
}

async function runAcceptanceAudit() {
  console.log("===============================================================================");
  console.log("PAYPOQ OS — FINAL MOBILE BUSINESS ACCEPTANCE & ROLE MATRIX AUDIT");
  console.log(`Target: Web=${WEB} | API=${API}`);
  console.log("===============================================================================\n");

  const browser = await chromium.launch({ headless: true });

  try {
    const mobileVp = VIEWPORTS.mobilePrimary;

    // =========================================================================
    // 1. SELLER (@ 390x844)
    // =========================================================================
    console.log("\n>>> TESTING ROLE: SELLER (seller@paypoq.local) on 390x844");
    {
      const sellerAuth = await getAuthToken("seller@paypoq.local");
      const context = await browser.newContext({
        viewport: { width: mobileVp.width, height: mobileVp.height },
        isMobile: mobileVp.isMobile,
        hasTouch: mobileVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await loginUser(page, "seller@paypoq.local", "ChangeMe123!", "/sales");
        await checkNoHorizontalOverflow(page, "Seller Landing (/sales)");

        // --- 1.1 Client Creation with Validation & Phone Formatting ---
        await page.goto(`${WEB}/sales/clients`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Seller Clients Page");

        const addClientBtn = page.getByRole("button", { name: "Mijoz qo‘shish" });
        assert(await addClientBtn.isVisible(), "Mijoz qo‘shish button must be visible");
        await assertTouchTarget(addClientBtn, "Mijoz qo‘shish button");
        await addClientBtn.click();
        await page.waitForTimeout(400);

        const clientDrawer = page.locator("section[role='dialog']");
        assert(await clientDrawer.isVisible(), "Client create drawer must open");

        // Validation test 1: Empty submit -> Required error
        const clientSubmitBtn = clientDrawer.getByRole("button", { name: "Mijoz yaratish" });
        await assertTouchTarget(clientSubmitBtn, "Mijoz yaratish submit button");
        await clientSubmitBtn.click();
        await page.waitForTimeout(300);
        const nameError = page.locator("text=Mijoz nomi kiritilishi shart.");
        assert(await nameError.isVisible(), "Required name error must appear on empty submit");

        // Validation test 2: Incomplete phone -> Validation error & values preserved
        const uniqueClientName = `Mobil Mijoz ${Date.now().toString().slice(-4)}`;
        await page.fill("#clientName", uniqueClientName);
        await page.fill("#clientPhone", "90123"); // incomplete 5 digits
        await clientSubmitBtn.click();
        await page.waitForTimeout(300);

        const phoneError = page.locator("text=Telefon raqam to‘liq kiritilishi shart");
        assert(await phoneError.isVisible(), "Phone validation error must appear for incomplete number");
        const preservedName = await page.inputValue("#clientName");
        assert.equal(preservedName, uniqueClientName, "Entered client name must be preserved on validation failure");

        // Complete valid phone
        await page.fill("#clientPhone", "901234567");
        const formattedPhone = await page.inputValue("#clientPhone");
        assert.equal(formattedPhone, "+998 90 123 45 67", "Phone must format to +998 90 123 45 67");
        await page.fill("#clientAddress", "Toshkent sh., Chilonzor");

        // Submit client
        await clientSubmitBtn.click();
        await page.waitForTimeout(800);
        await page.waitForSelector(`text=${uniqueClientName}`, { timeout: 10000 });

        // Verify clean reset on next open
        await addClientBtn.click();
        await page.waitForTimeout(300);
        const resetName = await page.inputValue("#clientName");
        assert.equal(resetName, "", "Client create form must be completely reset on reopen");
        await clientDrawer.getByRole("button", { name: "Yopish" }).click();
        await page.waitForTimeout(300);

        // Tap client row -> detail drawer opens
        const newClientRow = page.locator(`tr:has-text('${uniqueClientName}')`).first();
        assert(await newClientRow.isVisible(), "New client row must be visible");
        await newClientRow.click();
        await page.waitForTimeout(400);
        const detailDrawer = page.locator("section[role='dialog']");
        assert(await detailDrawer.isVisible(), "Tapping client row must open detail drawer");
        assert(await detailDrawer.locator(`text=${uniqueClientName}`).first().isVisible(), "Detail drawer must show client name");
        await detailDrawer.getByRole("button", { name: "Yopish" }).click();
        await page.waitForTimeout(300);

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const clientsRes = await apiCall("/sales/clients", { token: sellerAuth.accessToken });
        assert(clientsRes.ok, "API GET /sales/clients must succeed");
        const dbClient = clientsRes.data.data.find((c) => c.name === uniqueClientName);
        assert(dbClient, `Created client '${uniqueClientName}' must exist in backend database`);
        assert.equal(dbClient.phone, "+998901234567", "Client phone in DB must match canonical format");
        assert.equal(dbClient.address, "Toshkent sh., Chilonzor", "Client address in DB must match");
        assert.equal(dbClient.status, "ACTIVE", "Client status in DB must be ACTIVE");

        recordResult("Seller", "Client Full Lifecycle (Validation, Phone, Create, Stale Reset, Row Detail)", "YES", "YES", "N/A", "PASS", `Client '${uniqueClientName}' created & verified in API and UI`);

        // --- 1.2 Order Creation & Detail Workflow ---
        await page.goto(`${WEB}/sales/orders`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Seller Orders Page");

        const createOrderBtn = page.getByRole("button", { name: "Buyurtma yaratish" });
        assert(await createOrderBtn.isVisible(), "Buyurtma yaratish button must be visible");
        await assertTouchTarget(createOrderBtn, "Buyurtma yaratish button");
        await createOrderBtn.click();
        await page.waitForTimeout(400);

        const orderDrawer = page.locator("section[role='dialog']");
        assert(await orderDrawer.isVisible(), "Order creation drawer must open");

        // Select client
        await orderDrawer.locator("#orderClient").selectOption({ label: uniqueClientName });
        // Select variant
        const variantSelect = orderDrawer.locator("select[id^='orderItemVariant-']").first();
        await variantSelect.selectOption({ index: 1 });
        // Fill quantity and price
        const qtyInput = orderDrawer.locator("input[id^='orderItemQuantity-']").first();
        await qtyInput.fill("25");
        const priceInput = orderDrawer.locator("input[id^='orderItemPrice-']").first();
        await priceInput.fill("14000");

        // Submit order
        const orderSubmitBtn = orderDrawer.getByRole("button", { name: "Buyurtma yaratish" });
        await assertTouchTarget(orderSubmitBtn, "Order submit button");
        await orderSubmitBtn.click();
        await page.waitForTimeout(1000);

        // Verify order in table
        await page.waitForSelector(`tr:has-text('${uniqueClientName}')`, { timeout: 10000 });
        const createdOrderRow = page.locator(`tr:has-text('${uniqueClientName}')`).first();
        assert(await createdOrderRow.isVisible(), "New order must appear in orders table");
        const rowText = (await createdOrderRow.textContent()).replace(/\s+/g, " ");
        assert(/350[, ]000/.test(rowText), "Order total (25 * 14000 = 350,000) must appear in table row");

        // Tap order row -> details drawer
        await createdOrderRow.click();
        await page.waitForTimeout(400);
        const orderDetailDrawer = page.locator("section[role='dialog']");
        assert(await orderDetailDrawer.isVisible(), "Order detail drawer must open on row tap");
        const detailText = (await orderDetailDrawer.textContent()).replace(/\s+/g, " ");
        assert(/350[, ]000/.test(detailText), "Order detail must show 350,000 so'm total");
        await orderDetailDrawer.getByRole("button", { name: "Yopish" }).click();
        await page.waitForTimeout(300);

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const ordersRes = await apiCall("/sales/orders", { token: sellerAuth.accessToken });
        assert(ordersRes.ok, "API GET /sales/orders must succeed");
        const dbOrder = ordersRes.data.data.find((o) => o.client.name === uniqueClientName);
        assert(dbOrder, `Order for client '${uniqueClientName}' must exist in backend database`);
        assert.equal(Number(dbOrder.totalAmount), 350000, "Order totalAmount in DB must be exactly 350,000");
        assert.equal(dbOrder.items.length, 1, "Order must have exactly 1 line item");
        assert.equal(dbOrder.items[0].quantity, 25, "Order item quantity in DB must be 25");
        assert.equal(Number(dbOrder.items[0].unitPrice), 14000, "Order item unitPrice in DB must be 14,000");

        recordResult("Seller", "Order Creation & Details (Variant Select, Calculation, Server Persist)", "YES", "YES", "N/A", "PASS", "Order for 350,000 so'm created & verified in API and UI");

        // --- 1.3 Payment Allocation Workflow ---
        // Capture debt state before payment via API
        const debtsBeforeRes = await apiCall("/sales/debts", { token: sellerAuth.accessToken });
        assert(debtsBeforeRes.ok, "API GET /sales/debts must succeed");
        const andijonDebtBefore = debtsBeforeRes.data.data.find((d) => d.client.name === "Andijon Savdo");
        assert(andijonDebtBefore, "Andijon Savdo debt record must exist before payment");
        const beforeDebtAmount = Number(andijonDebtBefore.debt);
        const beforePaidAmount = Number(andijonDebtBefore.totalPaid);

        await page.goto(`${WEB}/sales/payments`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Seller Payments Page");

        const paymentBtn = page.getByRole("button", { name: "To‘lov qayd qilish" });
        assert(await paymentBtn.isVisible(), "To‘lov qayd qilish button must be visible");
        await assertTouchTarget(paymentBtn, "To‘lov qayd qilish button");
        await paymentBtn.click();
        await page.waitForTimeout(400);

        const paymentDrawer = page.locator("section[role='dialog']");
        assert(await paymentDrawer.isVisible(), "Payment receipt drawer must open");

        // Select client with confirmed orders
        await paymentDrawer.locator("#paymentClient").selectOption({ label: "Andijon Savdo" });
        await page.waitForTimeout(400);

        // Fill payment amount
        await paymentDrawer.locator("#paymentAmount").fill("50000");
        // Select order allocation
        const allocOrderSelect = paymentDrawer.locator("select[id^='paymentAllocationOrder-']").first();
        await allocOrderSelect.selectOption({ index: 1 });
        const allocAmountInput = paymentDrawer.locator("input[id^='paymentAllocationAmount-']").first();
        await allocAmountInput.fill("50000");

        // Submit payment
        const paymentSubmitBtn = paymentDrawer.getByRole("button", { name: "To‘lov qayd qilish" });
        await assertTouchTarget(paymentSubmitBtn, "Payment submit button");
        await paymentSubmitBtn.click();
        await page.waitForTimeout(1000);

        // Verify payment is listed in UI
        await page.waitForSelector("tbody tr", { timeout: 10000 });
        const paymentsTableText = (await page.locator("tbody").textContent()).replace(/\s+/g, " ");
        assert(/50[, ]000/.test(paymentsTableText), "Payment table must include 50,000 so'm");

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const debtsAfterRes = await apiCall("/sales/debts", { token: sellerAuth.accessToken });
        assert(debtsAfterRes.ok, "API GET /sales/debts must succeed");
        const andijonDebtAfter = debtsAfterRes.data.data.find((d) => d.client.name === "Andijon Savdo");
        assert(andijonDebtAfter, "Andijon Savdo debt record must exist after payment");
        const afterDebtAmount = Number(andijonDebtAfter.debt);
        const afterPaidAmount = Number(andijonDebtAfter.totalPaid);

        assert.equal(
          afterDebtAmount,
          beforeDebtAmount - 50000,
          `Client debt must decrease by exactly 50,000 (before: ${beforeDebtAmount}, after: ${afterDebtAmount})`,
        );
        assert.equal(
          afterPaidAmount,
          beforePaidAmount + 50000,
          `Client totalPaid must increase by exactly 50,000 (before: ${beforePaidAmount}, after: ${afterPaidAmount})`,
        );

        const paymentsRes = await apiCall("/sales/payments", { token: sellerAuth.accessToken });
        assert(paymentsRes.ok, "API GET /sales/payments must succeed");
        const latestPayment = paymentsRes.data.data[0];
        assert(latestPayment, "Latest payment record must exist in DB");
        assert.equal(Number(latestPayment.amount), 50000, "Payment amount in DB must be exactly 50,000");
        assert.equal(latestPayment.client.name, "Andijon Savdo", "Payment client in DB must be Andijon Savdo");
        assert(latestPayment.allocations.length > 0, "Payment must have allocations in DB");
        assert.equal(Number(latestPayment.allocations[0].amount), 50000, "Allocation amount in DB must be 50,000");

        recordResult("Seller", "Payment Receipt & Allocation (Amount entry, Allocation, Server Persist)", "YES", "YES", "N/A", "PASS", "Payment of 50,000 so'm recorded, debt reduced by 50,000 in DB & UI");

        // --- 1.4 RBAC Negative Tests (Frontend & Direct Backend API) ---
        await assertRbacDenied(page, "/finance", "Seller");
        await assertRbacDenied(page, "/finance/payroll", "Seller");
        await assertRbacDenied(page, "/production", "Seller");
        await assertRbacDenied(page, "/admin/tenants", "Seller");

        await assertApiRbacDenied("/finance/summary", sellerAuth.accessToken);
        await assertApiRbacDenied("/finance/expenses", sellerAuth.accessToken);
        await assertApiRbacDenied("/production/stage-movements", sellerAuth.accessToken, "POST", {});
        await assertApiRbacDenied("/platform-admin/tenants", sellerAuth.accessToken);

        recordResult("Seller", "RBAC Negative Access (/finance, /finance/payroll, /production, /admin)", "YES", "N/A", "ENFORCED", "PASS", "All 4 routes blocked in UI and direct API returned 401/403");

      } catch (err) {
        recordResult("Seller", "Seller Full Acceptance", "FAILED", "FAILED", "FAILED", "FAIL", err.message);
        throw err;
      } finally {
        await context.close();
      }
    }

    // =========================================================================
    // 2. SHIFT RECEIVER (@ 390x844)
    // =========================================================================
    console.log("\n>>> TESTING ROLE: SHIFT RECEIVER (shift@paypoq.local) on 390x844");
    {
      const shiftAuth = await getAuthToken("shift@paypoq.local");
      const context = await browser.newContext({
        viewport: { width: mobileVp.width, height: mobileVp.height },
        isMobile: mobileVp.isMobile,
        hasTouch: mobileVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await loginUser(page, "shift@paypoq.local", "ChangeMe123!", "/production");
        await checkNoHorizontalOverflow(page, "Shift Receiver Board (/production)");

        // --- 2.1 Machine Output Intake ---
        // Capture initial stage inventory for running run via API
        const runsRes = await apiCall("/production/runs", {
          token: shiftAuth.accessToken,
          activeFactoryId: shiftAuth.activeFactoryId,
        });
        assert(runsRes.ok, "API GET /production/runs must succeed");
        const runningRun = runsRes.data.data.find((r) => r.status === "RUNNING");
        assert(runningRun, "At least one RUNNING machine run must exist for intake test");

        const stageInvBeforeRes = await apiCall("/production/stage-inventory", {
          token: shiftAuth.accessToken,
          activeFactoryId: shiftAuth.activeFactoryId,
        });
        assert(stageInvBeforeRes.ok, "API GET /production/stage-inventory must succeed");
        const firstStageItemBefore = stageInvBeforeRes.data.data.find(
          (si) => si.productVariant.id === runningRun.productVariantId && si.stage.sortOrder === 1,
        );
        const beforeFirstStageQty = firstStageItemBefore ? firstStageItemBefore.quantity : 0;

        await page.goto(`${WEB}/machines#machine-output`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Machines Output Section");

        const intakeInput = page.locator("#machine-output input[type='number']").first();
        assert(await intakeInput.isVisible(), "Machine intake number input must be visible");
        const intakeMode = await intakeInput.getAttribute("inputmode");
        assert.equal(intakeMode, "numeric", "Intake input must have inputmode='numeric'");

        await intakeInput.fill("12");
        const intakeSubmitBtn = page.locator("#machine-output button:has-text('Chiqqan mahsulotni qabul qilish')").first();
        assert(await intakeSubmitBtn.isVisible(), "Intake submit button must be visible");
        await assertTouchTarget(intakeSubmitBtn, "Intake submit button");
        await intakeSubmitBtn.click();
        await page.waitForTimeout(1000);

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const stageInvAfterRes = await apiCall("/production/stage-inventory", {
          token: shiftAuth.accessToken,
          activeFactoryId: shiftAuth.activeFactoryId,
        });
        assert(stageInvAfterRes.ok, "API GET /production/stage-inventory after intake must succeed");
        const firstStageItemAfter = stageInvAfterRes.data.data.find(
          (si) => si.productVariant.id === runningRun.productVariantId && si.stage.sortOrder === 1,
        );
        assert(firstStageItemAfter, "First stage inventory must exist after machine intake");
        assert.equal(
          firstStageItemAfter.quantity,
          beforeFirstStageQty + 12,
          `First stage inventory must increase by exactly 12 pieces (before: ${beforeFirstStageQty}, after: ${firstStageItemAfter.quantity})`,
        );

        const activitiesRes = await apiCall("/production/worker-activities", {
          token: shiftAuth.accessToken,
          activeFactoryId: shiftAuth.activeFactoryId,
        });
        assert(activitiesRes.ok, "API GET /production/worker-activities must succeed");
        const recentActivities = activitiesRes.data.data.slice(0, 5);
        assert(
          recentActivities.some((a) => a.quantity === 12),
          "Worker activity of 12 pieces must be logged for machine operator/mechanic",
        );

        recordResult("Shift Receiver", "Machine Output Intake (Virtual dialpad, 1-tap intake, server save)", "YES", "YES", "N/A", "PASS", "12 units accepted, stage inventory +12 and worker activity verified in DB");

        // --- 2.2 Stage Inventory Movement (Core Operational Mutation) ---
        // Query available inventory via API before UI movement
        const currentInvRes = await apiCall("/production/stage-inventory", {
          token: shiftAuth.accessToken,
          activeFactoryId: shiftAuth.activeFactoryId,
        });
        assert(currentInvRes.ok, "API GET /production/stage-inventory must succeed");
        const movableInv = currentInvRes.data.data.find((si) => si.quantity >= 5 && si.stage.sortOrder < 10);
        assert(movableInv, "Movable stage inventory with quantity >= 5 must exist");

        const sourceStageId = movableInv.stage.id;
        const moveVariantId = movableInv.productVariant.id;
        const beforeSourceQty = movableInv.quantity;
        const nextSortOrder = movableInv.stage.sortOrder + 1;
        const destInvBefore = currentInvRes.data.data.find(
          (si) => si.productVariant.id === moveVariantId && si.stage.sortOrder === nextSortOrder,
        );
        const beforeDestQty = destInvBefore ? destInvBefore.quantity : 0;
        const moveQty = Math.min(5, beforeSourceQty);

        await page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Production Board");

        const moveBtn = page.getByRole("button", { name: "Keyingi bosqichga o‘tkazish" });
        assert(await moveBtn.isVisible(), "Keyingi bosqichga o‘tkazish button must be visible");
        await assertTouchTarget(moveBtn, "Keyingi bosqichga o‘tkazish button");
        await moveBtn.click();
        await page.waitForTimeout(500);

        const moveDrawer = page.locator("section[role='dialog']");
        assert(await moveDrawer.isVisible(), "Stage movement drawer must open");

        // Select product variant
        await moveDrawer.locator("#moveProductVariantId").selectOption(moveVariantId);
        await page.waitForTimeout(300);

        // Select source stage
        await moveDrawer.locator("#sourceStageId").selectOption(sourceStageId);
        await page.waitForTimeout(300);

        // Select worker
        const workerCheckbox = moveDrawer.locator("input[type='checkbox']").first();
        assert(await workerCheckbox.isVisible(), "Worker checkbox must be visible");
        await workerCheckbox.check();
        await page.waitForTimeout(200);

        // Set quantity
        await moveDrawer.locator("#moveQuantity").fill(String(moveQty));
        await page.waitForTimeout(200);

        // Submit movement
        const moveSubmitBtn = moveDrawer.getByRole("button", { name: "Smenani saqlash" });
        assert(await moveSubmitBtn.isVisible(), "Smenani saqlash button must be visible");
        await assertTouchTarget(moveSubmitBtn, "Smenani saqlash submit button");
        await moveSubmitBtn.click();
        await page.waitForTimeout(1000);

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const postMoveInvRes = await apiCall("/production/stage-inventory", {
          token: shiftAuth.accessToken,
          activeFactoryId: shiftAuth.activeFactoryId,
        });
        assert(postMoveInvRes.ok, "API GET /production/stage-inventory after move must succeed");
        const sourceInvAfter = postMoveInvRes.data.data.find(
          (si) => si.stage.id === sourceStageId && si.productVariant.id === moveVariantId,
        );
        assert(sourceInvAfter, "Source stage inventory must exist after move");
        assert.equal(
          sourceInvAfter.quantity,
          beforeSourceQty - moveQty,
          `Source stage inventory must decrease by ${moveQty} (before: ${beforeSourceQty}, after: ${sourceInvAfter.quantity})`,
        );

        const destInvAfter = postMoveInvRes.data.data.find(
          (si) => si.productVariant.id === moveVariantId && si.stage.sortOrder === nextSortOrder,
        );
        assert(destInvAfter, "Destination stage inventory must exist after move");
        assert.equal(
          destInvAfter.quantity,
          beforeDestQty + moveQty,
          `Destination stage inventory must increase by ${moveQty} (before: ${beforeDestQty}, after: ${destInvAfter.quantity})`,
        );

        const moveActivitiesRes = await apiCall("/production/worker-activities", {
          token: shiftAuth.accessToken,
          activeFactoryId: shiftAuth.activeFactoryId,
        });
        assert(moveActivitiesRes.ok, "API GET /production/worker-activities must succeed");
        const latestMoveAct = moveActivitiesRes.data.data[0];
        assert(latestMoveAct, "Latest worker activity must exist");
        assert.equal(latestMoveAct.quantity, moveQty, `Worker activity must log moved quantity ${moveQty}`);

        recordResult("Shift Receiver", "Stage Movement (Source to Dest, Worker Activity Logged, Stock Updated)", "YES", "YES", "N/A", "PASS", `${moveQty} pieces moved: source -${moveQty}, dest +${moveQty}, worker activity verified in DB`);

        // --- 2.3 Defect Registration ---
        const defectBtn = page.getByRole("button", { name: "Brak qayd qilish" });
        assert(await defectBtn.isVisible(), "Brak qayd qilish button must be visible");
        await assertTouchTarget(defectBtn, "Brak qayd qilish button");
        await defectBtn.click();
        await page.waitForTimeout(500);

        const defectDrawer = page.locator("section[role='dialog']");
        assert(await defectDrawer.isVisible(), "Defect registration drawer must open");

        // Select stage, worker, product variant
        await defectDrawer.locator("#defectStageId").selectOption({ index: 1 });
        await defectDrawer.locator("#defectEmployeeId").selectOption({ index: 1 });
        await defectDrawer.locator("#defectProductVariantId").selectOption({ index: 1 });
        // Quantity
        await defectDrawer.locator("#defectQuantity").fill("2");
        // Unique reason
        const uniqueDefectReason = `Tikuv nuqsoni ${Date.now().toString().slice(-4)}`;
        await defectDrawer.locator("#defectReason").fill(uniqueDefectReason);

        // Submit defect
        const defectSubmitBtn = defectDrawer.getByRole("button", { name: "Brak qayd qilish" });
        await assertTouchTarget(defectSubmitBtn, "Defect submit button");
        await defectSubmitBtn.click();
        await page.waitForTimeout(1000);

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const defectsRes = await apiCall("/production/defects", {
          token: shiftAuth.accessToken,
          activeFactoryId: shiftAuth.activeFactoryId,
        });
        assert(defectsRes.ok, "API GET /production/defects must succeed");
        const createdDefect = defectsRes.data.data.find((d) => d.reason === uniqueDefectReason);
        assert(createdDefect, `Defect record '${uniqueDefectReason}' must exist in backend database`);
        assert.equal(createdDefect.quantity, 2, "Defect quantity in DB must be exactly 2");
        assert(createdDefect.stage, "Defect stage reference must exist in DB");
        assert(createdDefect.employee, "Defect employee reference must exist in DB");
        assert(createdDefect.productVariant, "Defect product variant reference must exist in DB");

        recordResult("Shift Receiver", "Defect Registration (Stage, Worker, Scrap Count, Reason)", "YES", "YES", "N/A", "PASS", "2 defects recorded and verified in DB with domain attributes");

        // --- 2.4 RBAC Negative Tests (Frontend & Direct Backend API) ---
        await assertRbacDenied(page, "/finance", "Shift Receiver");
        await assertRbacDenied(page, "/sales", "Shift Receiver");
        await assertRbacDenied(page, "/settings", "Shift Receiver");

        await assertApiRbacDenied("/finance/expenses", shiftAuth.accessToken);
        await assertApiRbacDenied("/sales/clients", shiftAuth.accessToken, "POST", { name: "Forbidden" });
        await assertApiRbacDenied("/settings/roles", shiftAuth.accessToken);

        recordResult("Shift Receiver", "RBAC Negative Access (/finance, /sales, /settings)", "YES", "N/A", "ENFORCED", "PASS", "All 3 forbidden domains denied in UI and direct API returned 401/403");

      } catch (err) {
        recordResult("Shift Receiver", "Shift Receiver Full Acceptance", "FAILED", "FAILED", "FAILED", "FAIL", err.message);
        throw err;
      } finally {
        await context.close();
      }
    }

    // =========================================================================
    // 3. WAREHOUSE OPERATOR (@ 390x844)
    // =========================================================================
    console.log("\n>>> TESTING ROLE: WAREHOUSE OPERATOR (warehouse@paypoq.local) on 390x844");
    {
      const warehouseAuth = await getAuthToken("warehouse@paypoq.local");
      const context = await browser.newContext({
        viewport: { width: mobileVp.width, height: mobileVp.height },
        isMobile: mobileVp.isMobile,
        hasTouch: mobileVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await loginUser(page, "warehouse@paypoq.local", "ChangeMe123!", "/warehouse");
        await checkNoHorizontalOverflow(page, "Warehouse Operator Landing (/warehouse)");

        // --- 3.1 Material Receipt (Stock Increasing Mutation) ---
        // Query material stock via API before mutation
        const matStocksBeforeRes = await apiCall("/warehouse/material-stock", {
          token: warehouseAuth.accessToken,
          activeFactoryId: warehouseAuth.activeFactoryId,
        });
        assert(matStocksBeforeRes.ok, "API GET /warehouse/material-stock must succeed");
        assert(matStocksBeforeRes.data.data.length > 0, "Warehouse must have material stock items");
        const targetMatStockBefore = matStocksBeforeRes.data.data[0];
        const beforeMaterialQty = Number(targetMatStockBefore.quantity);
        const targetMaterialId = targetMatStockBefore.material.id;
        const targetZoneId = targetMatStockBefore.zone.id;

        await page.goto(`${WEB}/warehouse/materials`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Warehouse Materials Page");

        const receiveBtn = page.getByRole("button", { name: "Material qabul qilish" });
        assert(await receiveBtn.isVisible(), "Material qabul qilish button must be visible");
        await assertTouchTarget(receiveBtn, "Material qabul qilish button");
        await receiveBtn.click();
        await page.waitForTimeout(400);

        const matDrawer = page.locator("section[role='dialog']");
        assert(await matDrawer.isVisible(), "Material receipt drawer must open");

        // Select material matching target
        await matDrawer.locator("#materialReceiptMaterialId").selectOption(targetMaterialId);
        // Select zone matching target
        await matDrawer.locator("#materialReceiptZoneId").selectOption(targetZoneId);
        // Quantity: 35
        await matDrawer.locator("#materialReceiptQuantity").fill("35");
        // Unit: kg
        await matDrawer.locator("#materialReceiptUnit").fill("kg");
        const uniqueMatNote = `Mobil qabul tekshiruvi ${Date.now().toString().slice(-4)}`;
        await matDrawer.locator("#materialReceiptNote").fill(uniqueMatNote);

        // Submit receipt
        const matSubmitBtn = matDrawer.getByRole("button", { name: "Materialni qabul qilish" });
        await assertTouchTarget(matSubmitBtn, "Materialni qabul qilish submit button");
        await matSubmitBtn.click();
        await page.waitForTimeout(1000);

        // Verify stock updated on screen
        await page.goto(`${WEB}/warehouse`, { waitUntil: "networkidle" });
        assert(await page.locator("text=Paxta").first().isVisible(), "Paxta stock must be visible in warehouse balances");

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const matStocksAfterRes = await apiCall("/warehouse/material-stock", {
          token: warehouseAuth.accessToken,
          activeFactoryId: warehouseAuth.activeFactoryId,
        });
        assert(matStocksAfterRes.ok, "API GET /warehouse/material-stock after receipt must succeed");
        const targetMatStockAfter = matStocksAfterRes.data.data.find((ms) => ms.id === targetMatStockBefore.id);
        assert(targetMatStockAfter, "Target material stock record must exist after receipt");
        assert.equal(
          Number(targetMatStockAfter.quantity),
          beforeMaterialQty + 35,
          `Material stock must increase by exactly 35 kg (before: ${beforeMaterialQty}, after: ${targetMatStockAfter.quantity})`,
        );

        const movementsRes = await apiCall("/warehouse/movements", {
          token: warehouseAuth.accessToken,
          activeFactoryId: warehouseAuth.activeFactoryId,
        });
        assert(movementsRes.ok, "API GET /warehouse/movements must succeed");
        const latestMove = movementsRes.data.data[0];
        assert(latestMove, "Latest movement must exist in DB");
        assert.equal(latestMove.movementType, "RECEIPT", "Latest movement type must be RECEIPT");
        assert.equal(Number(latestMove.quantity), 35, "Movement quantity must be exactly 35");

        recordResult("Warehouse Operator", "Material Receipt (Material Select, Zone, Quantity, Stock Increase)", "YES", "YES", "N/A", "PASS", "35 kg material received, stock increased by exactly +35 in DB and verified in movements");

        // --- 3.2 Movements History & Row Details (READ-ONLY) ---
        await page.goto(`${WEB}/warehouse/movements`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Warehouse Movements Page");

        const firstMoveRow = page.locator("tbody tr").first();
        assert(await firstMoveRow.isVisible(), "Movements table must have records");
        await firstMoveRow.click();
        await page.waitForTimeout(400);

        const moveDetailDrawer = page.locator("section[role='dialog']");
        assert(await moveDetailDrawer.isVisible(), "Movement detail drawer must open on row tap");
        await moveDetailDrawer.getByRole("button", { name: "Yopish" }).click();
        await page.waitForTimeout(300);

        recordResult("Warehouse Operator", "Movements Exploration & Row Tap Details", "YES", "N/A", "N/A", "PASS", "Movement detail drawer opened smoothly on 390px phone (read-only view)");

        // --- 3.3 RBAC Negative Tests (Frontend & Direct Backend API) ---
        await assertRbacDenied(page, "/sales", "Warehouse Operator");
        await assertRbacDenied(page, "/finance/payroll", "Warehouse Operator");
        await assertRbacDenied(page, "/production", "Warehouse Operator");

        await assertApiRbacDenied("/sales/orders", warehouseAuth.accessToken, "POST", {});
        await assertApiRbacDenied("/production/stage-movements", warehouseAuth.accessToken, "POST", {});
        await assertApiRbacDenied("/finance/payroll-periods", warehouseAuth.accessToken);

        recordResult("Warehouse Operator", "RBAC Negative Access (/sales, /finance/payroll, /production)", "YES", "N/A", "ENFORCED", "PASS", "Access to forbidden modules blocked in UI and direct API returned 401/403");

      } catch (err) {
        recordResult("Warehouse Operator", "Warehouse Operator Full Acceptance", "FAILED", "FAILED", "FAILED", "FAIL", err.message);
        throw err;
      } finally {
        await context.close();
      }
    }

    // =========================================================================
    // 4. ACCOUNTANT (@ 390x844)
    // =========================================================================
    console.log("\n>>> TESTING ROLE: ACCOUNTANT (accountant@paypoq.local) on 390x844");
    {
      const accountantAuth = await getAuthToken("accountant@paypoq.local");
      const context = await browser.newContext({
        viewport: { width: mobileVp.width, height: mobileVp.height },
        isMobile: mobileVp.isMobile,
        hasTouch: mobileVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await loginUser(page, "accountant@paypoq.local", "ChangeMe123!", "/finance");
        await checkNoHorizontalOverflow(page, "Accountant Landing (/finance)");

        // --- 4.1 Payroll Overview (READ-ONLY) ---
        await page.goto(`${WEB}/finance/payroll`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Payroll Page");
        assert(await page.locator("text=Ish haqi hisob-kitobi").first().isVisible(), "Payroll report header must be visible");

        recordResult("Accountant", "Payroll Monitoring & Employee Breakdown View", "YES", "N/A", "N/A", "PASS", "Payroll period summary rendered cleanly on phone (read-only view)");

        // --- 4.2 Expense Request Creation ---
        await page.goto(`${WEB}/finance/expenses`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Expenses Page");

        const addExpenseBtn = page.getByRole("button", { name: "Xarajat yaratish" });
        assert(await addExpenseBtn.isVisible(), "Xarajat yaratish button must be visible");
        await assertTouchTarget(addExpenseBtn, "Xarajat yaratish button");
        await addExpenseBtn.click();
        await page.waitForTimeout(400);

        const expenseDrawer = page.locator("section[role='dialog']");
        assert(await expenseDrawer.isVisible(), "Expense create drawer must open");

        // Select category
        await expenseDrawer.locator("#expense-category").selectOption({ index: 1 });
        // Amount: 175000
        await expenseDrawer.locator("#expense-amount").fill("175000");
        // Reason
        const uniqueReason = `Mobil xarajat ${Date.now().toString().slice(-4)}`;
        await expenseDrawer.locator("#expense-reason").fill(uniqueReason);

        // Submit
        const expenseSubmitBtn = expenseDrawer.getByRole("button", { name: "So‘rov ochish" });
        await assertTouchTarget(expenseSubmitBtn, "So‘rov ochish submit button");
        await expenseSubmitBtn.click();
        await page.waitForTimeout(1000);

        // Verify expense is in table
        await page.waitForSelector(`text=${uniqueReason}`, { timeout: 10000 });

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const expensesRes = await apiCall("/finance/expenses", {
          token: accountantAuth.accessToken,
          activeFactoryId: accountantAuth.activeFactoryId,
        });
        assert(expensesRes.ok, "API GET /finance/expenses must succeed");
        const createdExpense = expensesRes.data.data.find((e) => e.reason === uniqueReason);
        assert(createdExpense, `Expense '${uniqueReason}' must exist in backend database`);
        assert.equal(Number(createdExpense.amount), 175000, "Expense amount in DB must be exactly 175,000");
        assert.equal(createdExpense.status, "REQUESTED", "Expense status in DB must be REQUESTED");
        assert(createdExpense.category, "Expense category must be linked in DB");

        recordResult("Accountant", "Expense Request Creation (Category, Decimal amount, Server save)", "YES", "YES", "N/A", "PASS", `Expense '${uniqueReason}' for 175,000 so'm verified in DB and UI`);

        // --- 4.3 Supplier Creation with Phone Validation ---
        await page.goto(`${WEB}/finance/suppliers`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Suppliers Page");

        const addSupplierBtn = page.getByRole("button", { name: "Yangi yetkazib beruvchi" });
        assert(await addSupplierBtn.isVisible(), "Yangi yetkazib beruvchi button must be visible");
        await assertTouchTarget(addSupplierBtn, "Yangi yetkazib beruvchi button");
        await addSupplierBtn.click();
        await page.waitForTimeout(400);

        const supplierDrawer = page.locator("section[role='dialog']");
        assert(await supplierDrawer.isVisible(), "Supplier create drawer must open");

        const uniqueSupplierName = `Ip Ta'minot ${Date.now().toString().slice(-4)}`;
        await page.fill("#supplierName", uniqueSupplierName);
        await page.fill("#supplierPhone", "935556677");
        const supPhoneFormatted = await page.inputValue("#supplierPhone");
        assert.equal(supPhoneFormatted, "+998 93 555 66 77", "Supplier phone must format to +998 93 555 66 77");
        await page.fill("#supplierNotes", "Avtomatlashgan qabul testi");

        // Submit supplier
        const supplierSubmitBtn = supplierDrawer.getByRole("button", { name: "Yetkazib beruvchi yaratish" });
        await assertTouchTarget(supplierSubmitBtn, "Yetkazib beruvchi yaratish submit button");
        await supplierSubmitBtn.click();
        await page.waitForTimeout(1000);

        // Verify supplier appears in suppliers list
        await page.waitForSelector(`text=${uniqueSupplierName}`, { timeout: 10000 });

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const suppliersRes = await apiCall("/supplier/suppliers", {
          token: accountantAuth.accessToken,
          activeFactoryId: accountantAuth.activeFactoryId,
        });
        assert(suppliersRes.ok, "API GET /supplier/suppliers must succeed");
        const createdSupplier = suppliersRes.data.data.find((s) => s.name === uniqueSupplierName);
        assert(createdSupplier, `Supplier '${uniqueSupplierName}' must exist in backend database`);
        assert.equal(createdSupplier.phone, "+998935556677", "Supplier phone in DB must be canonical");
        assert.equal(createdSupplier.status, "ACTIVE", "Supplier status in DB must be ACTIVE");

        recordResult("Accountant", "Supplier Creation with Uzbekistan Phone Validation", "YES", "YES", "N/A", "PASS", `Supplier '${uniqueSupplierName}' created & verified in API and UI`);

        // --- 4.4 RBAC Negative Tests (Frontend & Direct Backend API) ---
        await assertRbacDenied(page, "/production", "Accountant");
        await assertRbacDenied(page, "/admin", "Accountant");

        await assertApiRbacDenied("/production/stage-movements", accountantAuth.accessToken, "POST", {});
        await assertApiRbacDenied("/platform-admin/tenants", accountantAuth.accessToken);

        recordResult("Accountant", "RBAC Negative Access (/production, /admin)", "YES", "N/A", "ENFORCED", "PASS", "Forbidden domains blocked in UI and direct API returned 401/403");

      } catch (err) {
        recordResult("Accountant", "Accountant Full Acceptance", "FAILED", "FAILED", "FAILED", "FAIL", err.message);
        throw err;
      } finally {
        await context.close();
      }
    }

    // =========================================================================
    // 5. MANAGER (@ 390x844)
    // =========================================================================
    console.log("\n>>> TESTING ROLE: MANAGER (manager@paypoq.local) on 390x844");
    {
      const managerAuth = await getAuthToken("manager@paypoq.local");
      const context = await browser.newContext({
        viewport: { width: mobileVp.width, height: mobileVp.height },
        isMobile: mobileVp.isMobile,
        hasTouch: mobileVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await loginUser(page, "manager@paypoq.local", "ChangeMe123!", "/dashboard/executive");
        await checkNoHorizontalOverflow(page, "Manager Executive Dashboard");
        assert(await page.locator("text=Boshqaruv paneli").first().isVisible(), "Executive dashboard header must be visible");

        await page.goto(`${WEB}/machines`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Manager Machines Monitoring");

        await page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Manager Production Overview");

        await page.goto(`${WEB}/warehouse`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Manager Warehouse Overview");

        recordResult("Manager", "Management Dashboards, Machines & Operations Oversight", "YES", "N/A", "N/A", "PASS", "Cross-domain pilot management pages rendered with 0 overflow (read-only oversight)");

        // RBAC Negative: Manager cannot access /settings/company (Owner only) or /admin
        await assertRbacDenied(page, "/settings/company", "Manager");
        await assertRbacDenied(page, "/admin", "Manager");

        await assertApiRbacDenied("/organization/factories", managerAuth.accessToken, "POST", { name: "Forbidden Factory" });
        await assertApiRbacDenied("/platform-admin/tenants", managerAuth.accessToken);

        recordResult("Manager", "RBAC Negative Access (/settings/company, /admin)", "YES", "N/A", "ENFORCED", "PASS", "Owner-only settings and Platform Admin safely blocked in UI and API");

      } catch (err) {
        recordResult("Manager", "Manager Full Acceptance", "FAILED", "FAILED", "FAILED", "FAIL", err.message);
        throw err;
      } finally {
        await context.close();
      }
    }

    // =========================================================================
    // 6. OWNER (@ 390x844)
    // =========================================================================
    console.log("\n>>> TESTING ROLE: OWNER (owner@paypoq.local) on 390x844");
    {
      const ownerAuth = await getAuthToken("owner@paypoq.local");
      const context = await browser.newContext({
        viewport: { width: mobileVp.width, height: mobileVp.height },
        isMobile: mobileVp.isMobile,
        hasTouch: mobileVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await loginUser(page, "owner@paypoq.local", "ChangeMe123!", "/dashboard/executive");
        await checkNoHorizontalOverflow(page, "Owner Executive Dashboard");

        // Mobile sidebar navigation & active factory badge
        const menuBtn = page.locator("header button[aria-label='Menyuni ochish']");
        await assertTouchTarget(menuBtn, "Mobile hamburger menu button");
        await menuBtn.click();
        await page.waitForTimeout(300);
        const aside = page.locator("aside");
        assert(await aside.isVisible(), "Mobile sidebar must open on hamburger tap");
        assert(await aside.locator("text=Paypoq OS").first().isVisible(), "Sidebar must show Paypoq OS branding");
        assert(await aside.locator("span.uppercase.tracking-wider").isVisible(), "Sidebar must show active factory badge");
        await page.locator("aside button[aria-label='Menyuni yopish']").click();
        await page.waitForTimeout(200);

        // Check company settings (Owner exclusive)
        await page.goto(`${WEB}/settings/company`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Owner Company Settings");
        assert(await page.locator("text=Korxona sozlamalari").first().isVisible(), "Company settings page must load for Owner");

        // Check employee directory
        await page.goto(`${WEB}/employees`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(page, "Owner Employees Directory");
        assert(await page.locator("text=Xodimlar").first().isVisible(), "Employee directory must load");

        recordResult("Owner", "Multi-Domain Oversight, Sidebar Factory Badge, Company Settings", "YES", "N/A", "N/A", "PASS", "Full tenant owner privileges accessible on smartphone (read-only oversight)");

        // RBAC Negative: Owner cannot access platform super admin
        await assertRbacDenied(page, "/admin/tenants", "Owner");
        await assertApiRbacDenied("/platform-admin/tenants", ownerAuth.accessToken);

        recordResult("Owner", "RBAC Negative Access (/admin/tenants)", "YES", "N/A", "ENFORCED", "PASS", "Platform Admin blocked for Tenant Owner in UI and API");

      } catch (err) {
        recordResult("Owner", "Owner Full Acceptance", "FAILED", "FAILED", "FAILED", "FAIL", err.message);
        throw err;
      } finally {
        await context.close();
      }
    }

    // =========================================================================
    // 7. PLATFORM SUPER ADMIN (@ 390x844)
    // =========================================================================
    console.log("\n>>> TESTING ROLE: SUPER ADMIN (platform@paypoq.local) on 390x844");
    {
      const platformAuth = await getAuthToken("platform@paypoq.local", "ChangeMe123!", true);
      const context = await browser.newContext({
        viewport: { width: mobileVp.width, height: mobileVp.height },
        isMobile: mobileVp.isMobile,
        hasTouch: mobileVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${WEB}/admin/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "platform@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL((url) => url.pathname.includes("/admin/tenants"), { timeout: 15000 });
        await checkNoHorizontalOverflow(page, "Super Admin Tenants Page");

        // --- 7.1 Tenant Creation with 'Mustaqil korxona' ---
        const createTenantBtn = page.getByRole("button", { name: "Korxona yaratish" });
        assert(await createTenantBtn.isVisible(), "Korxona yaratish button must be visible");
        await assertTouchTarget(createTenantBtn, "Korxona yaratish button");
        await createTenantBtn.click();
        await page.waitForTimeout(400);

        const tenantDrawer = page.locator("section[role='dialog']");
        assert(await tenantDrawer.isVisible(), "Tenant creation drawer must open");

        const branchModeOption = tenantDrawer.locator("#branch-mode option[value='SINGLE']");
        const branchModeText = await branchModeOption.textContent();
        assert(branchModeText.includes("Mustaqil korxona"), "Branch mode must display 'Mustaqil korxona'");

        const uniqueTenantName = `Mobile Test Fabrika ${Date.now().toString().slice(-4)}`;
        await page.fill("#tenant-name", uniqueTenantName);
        await page.fill("#contact-name", "Bobur Menejer");
        await page.fill("#contact-phone", "907778899");
        await page.fill("#contact-email", `admin-${Date.now()}@paypoq.test`);

        const saveTenantBtn = tenantDrawer.locator("button[type='submit']");
        await assertTouchTarget(saveTenantBtn, "Tenant save button");
        await saveTenantBtn.click();
        await page.waitForTimeout(1000);

        // Verify newly created tenant appears in list
        await page.waitForSelector(`text=${uniqueTenantName}`, { timeout: 10000 });
        const tenantCard = page.locator(`a:has-text('${uniqueTenantName}')`).first();
        assert(await tenantCard.isVisible(), "New tenant must appear in tenants list");
        assert(await tenantCard.locator("text=Mustaqil korxona").isVisible(), "Tenant card must display 'Mustaqil korxona' badge");

        // SERVER-SIDE MUTATION VERIFICATION (API)
        const tenantsRes = await apiCall("/platform-admin/tenants", { token: platformAuth.accessToken });
        assert(tenantsRes.ok, "API GET /platform-admin/tenants must succeed");
        const dbTenant = tenantsRes.data.data.find((t) => t.name === uniqueTenantName);
        assert(dbTenant, `Created tenant '${uniqueTenantName}' must exist in platform backend database`);
        assert.equal(dbTenant.branchMode, "SINGLE", "Tenant branchMode in DB must be SINGLE");
        assert.equal(dbTenant.contactPhone, "+998907778899", "Tenant contactPhone in DB must be canonical");
        assert(Number(dbTenant.factoryCount) >= 1, "Auto-provisioned factory must exist for tenant");

        recordResult("Super Admin", "Tenant Creation & 'Mustaqil korxona' Terminology", "YES", "YES", "N/A", "PASS", `Tenant '${uniqueTenantName}' created & verified in API and UI`);

      } catch (err) {
        recordResult("Super Admin", "Super Admin Full Acceptance", "FAILED", "FAILED", "FAILED", "FAIL", err.message);
        throw err;
      } finally {
        await context.close();
      }
    }

    // =========================================================================
    // 8. REAL DOUBLE-SUBMIT / IN-FLIGHT DISABLING TEST
    // =========================================================================
    console.log("\n>>> TESTING DOUBLE-SUBMIT / IN-FLIGHT DISABLING");
    {
      const sellerAuth = await getAuthToken("seller@paypoq.local");
      const context = await browser.newContext({
        viewport: { width: mobileVp.width, height: mobileVp.height },
        isMobile: mobileVp.isMobile,
        hasTouch: mobileVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await loginUser(page, "seller@paypoq.local", "ChangeMe123!", "/sales");
        await page.goto(`${WEB}/sales/clients`, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Mijoz qo‘shish" }).click();
        await page.waitForTimeout(300);

        const uniqueDoubleName = `Double Tap Real ${Date.now().toString().slice(-4)}`;
        await page.fill("#clientName", uniqueDoubleName);
        await page.fill("#clientPhone", "909998877");
        const submitBtn = page.getByRole("button", { name: "Mijoz yaratish" });

        // Intercept network requests to count actual outgoing POST calls
        let postCount = 0;
        page.on("request", (req) => {
          if (req.method() === "POST" && req.url().includes("/sales/clients")) {
            postCount++;
          }
        });

        // Rapid double-tap simulation: trigger first click and immediately dispatch second click
        await submitBtn.click();
        await page.evaluate(() => {
          const btn = document.querySelector('section[role="dialog"] button[type="submit"]');
          if (btn) btn.click();
        });

        await page.waitForTimeout(1000);

        // Verify outgoing request count
        assert.equal(
          postCount,
          1,
          `Expected exactly 1 outgoing POST request for double tap, intercepted ${postCount}`,
        );

        // SERVER-SIDE VERIFICATION: Verify database has exactly 1 record
        const clientsRes = await apiCall("/sales/clients", { token: sellerAuth.accessToken });
        assert(clientsRes.ok, "API GET /sales/clients must succeed");
        const matchingClients = clientsRes.data.data.filter((c) => c.name === uniqueDoubleName);
        assert.equal(
          matchingClients.length,
          1,
          `Expected exactly 1 client with name '${uniqueDoubleName}' in database, found ${matchingClients.length}`,
        );

        recordResult("Shared", "Rapid Double-Tap Protection on Form Submission", "YES", "YES", "N/A", "PASS", "Double-tap intercepted: exactly 1 POST dispatched and 1 DB record created");

      } catch (err) {
        recordResult("Shared", "Double-Tap Protection", "FAILED", "FAILED", "FAILED", "FAIL", err.message);
        throw err;
      } finally {
        await context.close();
      }
    }

    // =========================================================================
    // 9. VIEWPORT STRESS (320px, 412px) & DESKTOP NON-REGRESSION (1440px)
    // =========================================================================
    console.log("\n>>> TESTING VIEWPORT STRESS & DESKTOP NON-REGRESSION");
    {
      // 9.1 Small Phone (320x568)
      const smallContext = await browser.newContext({
        viewport: { width: VIEWPORTS.smallPhone.width, height: VIEWPORTS.smallPhone.height },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      });
      const smallPage = await smallContext.newPage();
      try {
        await loginUser(smallPage, "owner@paypoq.local", "ChangeMe123!", "/dashboard");
        await checkNoHorizontalOverflow(smallPage, "Small Phone Dashboard (320px)");
        await smallPage.goto(`${WEB}/production`, { waitUntil: "networkidle" });
        await checkNoHorizontalOverflow(smallPage, "Small Phone Production (320px)");
        recordResult("System", "Small Phone (320x568) Viewport Stress Test", "YES", "N/A", "N/A", "PASS", "Zero horizontal scroll or clipping at 320px");
      } finally {
        await smallContext.close();
      }

      // 9.2 Large Phone (412x915)
      const largeContext = await browser.newContext({
        viewport: { width: VIEWPORTS.largePhone.width, height: VIEWPORTS.largePhone.height },
        isMobile: true,
        hasTouch: true,
        colorScheme: "dark",
      });
      const largePage = await largeContext.newPage();
      try {
        await loginUser(largePage, "manager@paypoq.local", "ChangeMe123!", "/dashboard");
        await checkNoHorizontalOverflow(largePage, "Large Phone Dashboard (412px)");
        recordResult("System", "Large Phone (412x915) Viewport Test", "YES", "N/A", "N/A", "PASS", "Fluid layout on 412px large screen");
      } finally {
        await largeContext.close();
      }

      // 9.3 Desktop Non-Regression (1440x900)
      const deskContext = await browser.newContext({
        viewport: { width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height },
        isMobile: false,
        hasTouch: false,
        colorScheme: "dark",
      });
      const deskPage = await deskContext.newPage();
      try {
        await loginUser(deskPage, "owner@paypoq.local", "ChangeMe123!", "/dashboard");
        const aside = deskPage.locator("aside");
        assert(await aside.isVisible(), "Desktop sidebar must be permanently visible");
        const hamburger = deskPage.locator("header button[aria-label='Menyuni ochish']");
        assert(!(await hamburger.isVisible()), "Mobile hamburger button must be hidden on desktop");
        await checkNoHorizontalOverflow(deskPage, "Desktop (1440px)");
        recordResult("System", "Desktop (1440x900) Non-Regression Verification", "NO", "N/A", "N/A", "PASS", "Desktop sidebar and layout 100% intact");
      } finally {
        await deskContext.close();
      }
    }

  } finally {
    await browser.close();
  }

  // =========================================================================
  // PRINT FINAL ACCEPTANCE TABLE
  // =========================================================================
  console.log("\n===============================================================================");
  console.log("FINAL BUSINESS ACCEPTANCE & ROLE MATRIX REPORT");
  console.log("===============================================================================");
  console.table(
    results.map((r) => ({
      Role: r.role,
      Workflow: r.workflow.slice(0, 45),
      Mobile: r.mobile,
      "Mutation Verified": r.mutationVerified,
      RBAC: r.rbac,
      Result: r.status,
    })),
  );

  const failCount = results.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL AUDIT CHECKS: ${results.length} | PASS: ${results.length - failCount} | FAIL: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runAcceptanceAudit().catch((err) => {
  console.error("FATAL ERROR IN ACCEPTANCE AUDIT:", err);
  process.exit(1);
});
