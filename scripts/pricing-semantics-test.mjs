import { chromium } from "playwright";
import assert from "assert";

const WEB = "http://localhost:3000";
const API = "http://localhost:3001";

async function apiCall(endpoint, { method = "GET", token, activeFactoryId, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (activeFactoryId) headers["X-Factory-Id"] = activeFactoryId;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function getAuthToken(email) {
  const loginRes = await apiCall("/auth/login", {
    method: "POST",
    body: { email, password: "ChangeMe123!" },
  });
  if (!loginRes.ok) throw new Error(`Auth failed: ${JSON.stringify(loginRes.data)}`);
  
  const meRes = await apiCall("/auth/me", { token: loginRes.data.data.accessToken });
  return { token: loginRes.data.data.accessToken, activeFactoryId: meRes.data.data.activeFactoryId };
}

function parseCurrency(str) {
  return Number(str.replace(/\D/g, ''));
}

async function main() {
  console.log("==========================================");
  console.log("PRICING SEMANTICS & EDGE CASES ACCEPTANCE");
  console.log("==========================================");

  const ownerAuth = await getAuthToken("owner@paypoq.local");
  const tId = Date.now().toString().slice(-6);

  // 1. Setup isolated data
  let colorA, colorB, colorC, colorD, material, season, product, varA, varB, varC, varD, client;
  
  try {
    colorA = (await apiCall("/product/colors", { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { name: `C_A_${tId}` } })).data.data;
    colorB = (await apiCall("/product/colors", { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { name: `C_B_${tId}` } })).data.data;
    colorC = (await apiCall("/product/colors", { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { name: `C_C_${tId}` } })).data.data;
    colorD = (await apiCall("/product/colors", { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { name: `C_D_${tId}` } })).data.data;
    
    material = (await apiCall("/product/materials", { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { name: `M_${tId}` } })).data.data;
    season = (await apiCall("/product/seasons", { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { name: `S_${tId}` } })).data.data;
    product = (await apiCall("/product/products", { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { name: `P_${tId}` } })).data.data;
    
    varA = (await apiCall(`/product/products/${product.id}/variants`, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { colorId: colorA.id, materialId: material.id, seasonId: season.id } })).data.data;
    varB = (await apiCall(`/product/products/${product.id}/variants`, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { colorId: colorB.id, materialId: material.id, seasonId: season.id } })).data.data;
    varC = (await apiCall(`/product/products/${product.id}/variants`, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { colorId: colorC.id, materialId: material.id, seasonId: season.id } })).data.data;
    varD = (await apiCall(`/product/products/${product.id}/variants`, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { colorId: colorD.id, materialId: material.id, seasonId: season.id } })).data.data;
    
    client = (await apiCall("/sales/clients", { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { name: `Client_${tId}` } })).data.data;

    // Set prices
    await apiCall(`/product/variants/${varA.id}/prices`, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { amount: "11111", effectiveFrom: new Date().toISOString() } });
    await apiCall(`/product/variants/${varB.id}/prices`, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { amount: "22222", effectiveFrom: new Date().toISOString() } });
    await apiCall(`/product/variants/${varD.id}/prices`, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { amount: "33333", effectiveFrom: new Date().toISOString() } });
    // Variant C gets NO price.
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    let createdOrderId = null;

    try {
      // Login as Seller
      await page.goto(`${WEB}/login`);
      await page.fill("#email", "seller@paypoq.local");
      await page.fill("#password", "ChangeMe123!");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/sales");
      await page.goto(`${WEB}/sales/orders`);

      // ==========================================
      // Scenario A & D: Readonly Active Price & 3-Item Order
      // ==========================================
      console.log("-> Testing Scenario A & D (Readonly active price, 3-item layout)");
      await page.click('button:has-text("Buyurtma yaratish")');
      await page.waitForSelector('select[name="clientId"]');
      await page.selectOption('select[name="clientId"]', client.id);

      const addItemBtn = page.locator('button:has-text("Mahsulot qo‘shish")');
      const variantSelects = page.locator("select[id^='orderItemVariant-']");
      const priceInputs = page.locator("input[id^='orderItemPrice-']");
      const qtyInputs = page.locator("input[id^='orderItemQuantity-']");
      const deleteBtns = page.locator('button[aria-label="Mahsulotni o‘chirish"]');
      
      // Item 1 (Var A)
      await variantSelects.nth(0).selectOption(varA.id);
      await page.waitForTimeout(500); // wait for fetch
      await qtyInputs.nth(0).fill("2");
      await page.waitForTimeout(100);
      assert.strictEqual(await priceInputs.nth(0).inputValue(), "11111");
      assert.strictEqual(await priceInputs.nth(0).isDisabled(), true);

      // Item 2 (Var B)
      await addItemBtn.click();
      await variantSelects.nth(1).selectOption(varB.id);
      await page.waitForTimeout(500);
      await qtyInputs.nth(1).fill("3");
      await page.waitForTimeout(100);
      assert.strictEqual(await priceInputs.nth(1).inputValue(), "22222");

      // Item 3 (Var D)
      await addItemBtn.click();
      await variantSelects.nth(2).selectOption(varD.id);
      await page.waitForTimeout(500);
      await qtyInputs.nth(2).fill("4");
      await page.waitForTimeout(100);
      assert.strictEqual(await priceInputs.nth(2).inputValue(), "33333");

      // Total
      const totalEl = page.locator("p.text-2xl.font-bold");
      assert.strictEqual(parseCurrency(await totalEl.textContent()), 222220); // 22222+66666+133332

      // Remove middle (Item 2)
      await deleteBtns.nth(1).click();
      await page.waitForTimeout(200);

      assert.strictEqual(parseCurrency(await totalEl.textContent()), 155554); // 22222 + 133332
      
      // Submit order
      await page.click(`button[type="submit"]`);
      await page.waitForTimeout(1000);
      
      // Verify via API
      const ordersRes = await apiCall("/sales/orders", { token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId });
      const orders = ordersRes.data.data.filter(o => o.client.id === client.id);
      assert.strictEqual(orders.length, 1);
      const order = orders[0];
      createdOrderId = order.id;
      assert.strictEqual(order.items.length, 2);
      assert.strictEqual(Number(order.totalAmount), 155554);
            const itemA = order.items.find(i => i.productVariant.id === varA.id);
      const itemD = order.items.find(i => i.productVariant.id === varD.id);
      assert.strictEqual(Number(itemA.unitPrice), 11111);
      assert.strictEqual(Number(itemD.unitPrice), 33333);
      
      console.log("  ✓ [PASS] Scenarios A & D: Readonly active price, 3-item layout stability, exact persistence.");

      // ==========================================
      // Scenario B: Missing Price
      // ==========================================
      console.log("-> Testing Scenario B (Missing Price)");
      await page.click('button:has-text("Buyurtma yaratish")');
      await page.waitForSelector('select[name="clientId"]');
      await page.selectOption('select[name="clientId"]', client.id);

      // First select A to ensure price populates
      await variantSelects.nth(0).selectOption(varA.id);
      await page.waitForTimeout(500);
      assert.strictEqual(await priceInputs.nth(0).inputValue(), "11111");

      // Switch to C
      await variantSelects.nth(0).selectOption(varC.id);
      await page.waitForTimeout(500);
      assert.strictEqual(await priceInputs.nth(0).inputValue(), ""); // Should be empty

      const missingWarning = page.locator('.text-rose-500').filter({ hasText: "aktiv narx yo‘q" }).first();
      assert(await missingWarning.isVisible(), "Missing price warning not visible");

      const submitBtn = page.locator(`button[type="submit"]`);
      assert(await submitBtn.isDisabled(), "Submit button should be disabled when price is missing");
      console.log("  ✓ [PASS] Scenario B: Missing active price handles correctly (cleared value, warning, blocks submit)");

      // ==========================================
      // Scenario C: Race condition
      // ==========================================
      console.log("-> Testing Scenario C (Stale-response race condition)");
      await page.goto(`${WEB}/sales/orders`);
      await page.click('button:has-text("Buyurtma yaratish")');
      await page.waitForSelector('select[name="clientId"]');
      
      // Setup delay
      await page.unrouteAll({ behavior: 'wait' });
      await page.route("**/active-price", async (route) => {
        const url = route.request().url();
        if (url.includes(varA.id)) {
          setTimeout(() => route.continue(), 1500); // 1.5s delay for A
        } else {
          route.continue();
        }
      });

      await variantSelects.nth(0).selectOption(varA.id);
      // Immediately switch to B
      await variantSelects.nth(0).selectOption(varB.id);

      // Wait 2s for both to resolve
      await page.waitForTimeout(2000);
      
      const priceText = await priceInputs.nth(0).inputValue();
      assert.strictEqual(priceText, "22222", `Race condition failed! Expected 22 222 exactly, got ${priceText}`);
      
      await qtyInputs.nth(0).fill("2");
      await page.waitForTimeout(100);
      console.log("  ✓ [PASS] Scenario C: Exact stale-response race protection");

      // ==========================================
      // Scenario E & F: Historical Preservation & Explicit Repricing
      // ==========================================
      console.log("-> Testing Scenario E & F (Historical Preservation & Explicit Repricing)");
      await page.unrouteAll();
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Update catalog price for Var A to 44444
      await apiCall(`/product/variants/${varA.id}/prices`, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId, body: { amount: "44444", effectiveFrom: new Date().toISOString() } });

      // Edit the created order in UI
      await page.unrouteAll({ behavior: 'wait' }); // Disable interceptors
      await page.goto(`${WEB}/sales/orders`);
      
      // Click edit on the first order
      await page.locator('tbody tr').first().click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Tahrirlash")').click();
      
      // Wait for drawer
      await page.waitForSelector(`select[name="clientId"]`);
      await page.waitForTimeout(1000); // Wait for data to populate
      
      // Assert price is still 11 111 (historical)
      const val0 = await priceInputs.nth(0).inputValue();
      const val1 = await priceInputs.nth(1).inputValue();
      const indexOfA = val0 === "11111" ? 0 : 1;
      assert(val0 === "11111" || val1 === "11111", "Historical price was not preserved!");
      
      // Change Note (unrelated field)
      await page.fill('textarea[name="note"]', "Edited Note");
      await page.click(`button[type="submit"]`);
      await page.waitForTimeout(1000);
      
      // Fetch order from API, assert price is still 11111
      let updatedOrderRes = await apiCall("/sales/orders", { token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId });
      let uOrder = updatedOrderRes.data.data.find(o => o.id === createdOrderId);
      let uItemA = uOrder.items.find(i => i.productVariant.id === varA.id);
      assert.strictEqual(Number(uItemA.unitPrice), 11111);
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Explicit Repricing: Edit order, change Variant to B
      await page.locator('tbody tr').first().click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Tahrirlash")').click();
      await page.waitForSelector(`select[name="clientId"]`);
      await page.waitForTimeout(500);
      
      await variantSelects.nth(indexOfA).selectOption(varB.id);
      await page.waitForTimeout(500);
      
      // Price should now be 22222
      assert.strictEqual(await priceInputs.nth(indexOfA).inputValue(), "22222", "Price did not update on explicit variant change");
      
      await page.click(`button[type="submit"]`);
      await page.waitForTimeout(1000);
      
      updatedOrderRes = await apiCall("/sales/orders", { token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId });
      uOrder = updatedOrderRes.data.data.find(o => o.id === createdOrderId);
      let uItemB = uOrder.items.find(i => i.productVariant.id === varB.id);
      assert.strictEqual(Number(uItemB.unitPrice), 22222);
      
      console.log("  ✓ [PASS] Scenarios E & F: Historical preservation on unrelated edits, explicit repricing on variant change");
      
    } finally {
      await browser.close();
    }
  } finally {
    console.log("-> Cleaning up fixtures...");
    const cleanupCall = async (endpoint) => await apiCall(endpoint, { method: "POST", token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId });
    if (client) await cleanupCall(`/sales/clients/${client.id}/archive`);
    if (varA) await cleanupCall(`/product/variants/${varA.id}/archive`);
    if (varB) await cleanupCall(`/product/variants/${varB.id}/archive`);
    if (varC) await cleanupCall(`/product/variants/${varC.id}/archive`);
    if (varD) await cleanupCall(`/product/variants/${varD.id}/archive`);
    if (product) await cleanupCall(`/product/products/${product.id}/archive`);
    if (colorA) await cleanupCall(`/product/colors/${colorA.id}/archive`);
    if (colorB) await cleanupCall(`/product/colors/${colorB.id}/archive`);
    if (colorC) await cleanupCall(`/product/colors/${colorC.id}/archive`);
    if (colorD) await cleanupCall(`/product/colors/${colorD.id}/archive`);
    if (material) await cleanupCall(`/product/materials/${material.id}/archive`);
    if (season) await cleanupCall(`/product/seasons/${season.id}/archive`);
    console.log("  ✓ [PASS] Cleanup complete");
  }
}

main().catch(e => {
  console.error("FATAL ERROR IN PRICING SEMANTICS TEST:", e);
  process.exit(1);
});
