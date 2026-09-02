import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function runBrowserAcceptance() {
  console.log("=== STARTING PLAYWRIGHT REAL BROWSER ACCEPTANCE TESTS ===");
  
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  // -------------------------------------------------------------
  // TEST 1-8: Owner & Desktop / Mobile Interactions
  // -------------------------------------------------------------
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    console.log("\n[TEST 1] Testing Owner Login & Navigation...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "owner@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    
    await page.waitForURL("**/dashboard/executive", { timeout: 10000 });
    console.log("✓ Owner successfully logged in. Landed on:", page.url());

    // Check Sidebar 'Qo‘llanma' link
    console.log("\n[TEST 2] Testing Sidebar 'Qo‘llanma' link click...");
    const sidebarGuideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await sidebarGuideLink.isVisible(), true, "Sidebar must contain Qo'llanma link");
    await sidebarGuideLink.click();
    await page.waitForURL("**/guide", { timeout: 5000 });
    console.log("✓ Navigated to /guide via Sidebar. Current URL:", page.url());

    // Check Topbar Guide button
    console.log("\n[TEST 3] Testing Topbar Guide button click...");
    await page.goto(`${BASE_URL}/dashboard/executive`);
    const topbarGuideBtn = page.locator("header button[aria-label='Tizim qo‘llanmasi']");
    await topbarGuideBtn.waitFor({ state: "visible", timeout: 5000 });
    assert.equal(await topbarGuideBtn.isVisible(), true, "Topbar must contain Guide button");
    await topbarGuideBtn.click();
    await page.waitForURL("**/guide", { timeout: 5000 });
    console.log("✓ Navigated to /guide via Topbar button. Current URL:", page.url());

    // Check TOC
    console.log("\n[TEST 4] Testing TOC buttons and scroll...");
    const tocButtons = page.locator("nav[aria-label='Qo‘llanma mundarijasi'] button");
    const tocCount = await tocButtons.count();
    assert.equal(tocCount, 11, "Should have 11 TOC navigation buttons");

    const prodTocBtn = page.locator("nav[aria-label='Qo‘llanma mundarijasi'] button", { hasText: "6. Ishlab chiqarish" });
    await prodTocBtn.click();
    await page.waitForTimeout(500);
    
    const prodSection = page.locator("#production-flow");
    assert.equal(await prodSection.isVisible(), true, "#production-flow section must be visible");
    console.log("✓ TOC button clicked and scrolled to #production-flow section.");

    // Check Walkthrough checkboxes
    console.log("\n[TEST 5] Testing Walkthrough Checkboxes & Progress Bar...");
    const testTocBtn = page.locator("nav[aria-label='Qo‘llanma mundarijasi'] button", { hasText: "11. 10 qadamli Sinov" });
    await testTocBtn.click();
    await page.waitForTimeout(500);

    const step1Btn = page.locator("button[aria-label='Qadam 1 ni belgilash']");
    await step1Btn.click();
    await page.waitForTimeout(200);

    const step2Btn = page.locator("button[aria-label='Qadam 2 ni belgilash']");
    await step2Btn.click();
    await page.waitForTimeout(200);

    const isProgressUpdated = await page.locator("#test-walkthrough").getByText("2 / 10 qadam bajarildi").isVisible();
    assert.equal(isProgressUpdated, true, "Progress must show 2/10 steps done");
    console.log("✓ Walkthrough checkbox click updated progress to 2/10 (20%).");

    // Check Role Matrix
    console.log("\n[TEST 6] Testing Role Matrix Table Click Interaction...");
    const shiftReceiverRow = page.locator("#roles-matrix table tbody tr", { hasText: "Shift Receiver" });
    await shiftReceiverRow.click();
    await page.waitForTimeout(300);

    const detailCard = page.locator("#roles-matrix h4", { hasText: "Shift Receiver" });
    assert.equal(await detailCard.isVisible(), true, "Detail card should display Shift Receiver");
    console.log("✓ Role matrix row click updated detail card to Shift Receiver.");

    // Check Desktop Overflow
    console.log("\n[TEST 7] Checking for unwanted horizontal scroll on Desktop...");
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    console.log(`Document scroll width: ${bodyScrollWidth}px, Viewport width: ${windowWidth}px`);
    assert.ok(bodyScrollWidth <= windowWidth + 5, "No horizontal body overflow on Desktop");
    console.log("✓ No unwanted horizontal overflow on Desktop.");

    // Check Mobile Viewport
    console.log("\n[TEST 8] Testing Mobile Viewport (375x667)...");
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/guide`);
    await page.waitForLoadState("networkidle");

    const mobileScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    console.log(`Mobile scroll width: ${mobileScrollWidth}px, Mobile viewport width: 375px`);
    assert.ok(mobileScrollWidth <= 380, "No horizontal body overflow on Mobile");
    console.log("✓ Mobile layout rendered cleanly without horizontal page break.");

    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 9: Manager Persona
  // -------------------------------------------------------------
  {
    console.log("\n[TEST 9] Testing Manager Persona...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "manager@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard/executive", { timeout: 10000 });
    console.log("✓ Manager logged in. Landed on:", page.url());

    const guideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await guideLink.isVisible(), true, "Manager must see Qo'llanma in sidebar");
    await guideLink.click();
    await page.waitForURL("**/guide", { timeout: 5000 });
    console.log("✓ Manager opened /guide successfully.");
    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 10: Shift Receiver Persona
  // -------------------------------------------------------------
  {
    console.log("\n[TEST 10] Testing Shift Receiver Persona...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "shift@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/production", { timeout: 10000 });
    console.log("✓ Shift Receiver logged in. Landed on:", page.url());

    const guideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await guideLink.isVisible(), true, "Shift Receiver must see Qo'llanma in sidebar");
    await guideLink.click();
    await page.waitForURL("**/guide", { timeout: 5000 });
    console.log("✓ Shift Receiver opened /guide successfully.");
    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 11: Seller Persona
  // -------------------------------------------------------------
  {
    console.log("\n[TEST 11] Testing Seller Persona...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "seller@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/sales", { timeout: 10000 });
    console.log("✓ Seller logged in. Landed on:", page.url());

    const guideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await guideLink.isVisible(), true, "Seller must see Qo'llanma in sidebar");
    await guideLink.click();
    await page.waitForURL("**/guide", { timeout: 5000 });
    console.log("✓ Seller opened /guide successfully.");
    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 12: Accountant Persona
  // -------------------------------------------------------------
  {
    console.log("\n[TEST 12] Testing Accountant Persona...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "accountant@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/finance", { timeout: 10000 });
    console.log("✓ Accountant logged in. Landed on:", page.url());

    const guideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await guideLink.isVisible(), true, "Accountant must see Qo'llanma in sidebar");
    await guideLink.click();
    await page.waitForURL("**/guide", { timeout: 5000 });
    console.log("✓ Accountant opened /guide successfully.");
    await context.close();
  }

  // -------------------------------------------------------------
  // TEST 13: Warehouse Operator Persona
  // -------------------------------------------------------------
  {
    console.log("\n[TEST 13] Testing Warehouse Operator Persona...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "warehouse@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/warehouse", { timeout: 10000 });
    console.log("✓ Warehouse Operator logged in. Landed on:", page.url());

    const guideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await guideLink.isVisible(), true, "Warehouse Operator must see Qo'llanma in sidebar");
    await guideLink.click();
    await page.waitForURL("**/guide", { timeout: 5000 });
    console.log("✓ Warehouse Operator opened /guide successfully.");
    await context.close();
  }

  await browser.close();
  console.log("\n=========================================================================");
  console.log("ALL REAL BROWSER ACCEPTANCE TESTS PASSED ACROSS ALL ROLES (13/13 CHECKS)");
  console.log("=========================================================================");
}

runBrowserAcceptance().catch((err) => {
  console.error("Browser Acceptance Test Failed:", err);
  process.exit(1);
});
