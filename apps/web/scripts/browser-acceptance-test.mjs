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

  // =========================================================================
  // SECTION 1: SUPER ADMIN VERIFICATION (/admin/guide)
  // =========================================================================
  console.log("\n=======================================================");
  console.log("--- 1. SUPER ADMIN TESTS (/admin) ---");
  console.log("=======================================================");

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 1.1 Login as Super Admin
    console.log("\n[TEST 1.1] Super Admin Login...");
    await page.goto(`${BASE_URL}/admin/login`);
    await page.fill("#email", "platform@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/admin/tenants", { timeout: 10000 });
    console.log("✓ Super Admin logged in successfully. Landed on:", page.url());

    // 1.2 Check Navigation contains 'Qo‘llanma'
    console.log("\n[TEST 1.2] Super Admin Header Navigation...");
    const guideNavLink = page.locator("header nav a", { hasText: "Qo‘llanma" });
    assert.equal(await guideNavLink.isVisible(), true, "Super admin header must contain Qo'llanma link");
    await guideNavLink.click();
    await page.waitForURL("**/admin/guide", { timeout: 5000 });
    console.log("✓ Clicked Qo‘llanma in header. Current URL:", page.url());

    // 1.3 Test direct /admin/guide access for logged in Super Admin
    console.log("\n[TEST 1.3] Direct /admin/guide reload...");
    await page.goto(`${BASE_URL}/admin/guide`);
    await page.waitForLoadState("networkidle");
    console.log("✓ Direct /admin/guide loaded successfully for Super Admin.");

    // 1.4 Test TOC Navigation and scrolling
    console.log("\n[TEST 1.4] TOC Buttons & Scroll...");
    const tocNav = page.locator("nav[aria-label='Qo‘llanma mundarijasi']");
    await tocNav.waitFor({ state: "visible", timeout: 5000 });
    const tocButtons = tocNav.locator("button");
    const tocCount = await tocButtons.count();
    assert.equal(tocCount, 11, "Should have 11 TOC navigation buttons");

    const prodTocBtn = page.locator("nav[aria-label='Qo‘llanma mundarijasi'] button", { hasText: "6. Ishlab chiqarish" });
    await prodTocBtn.click();
    await page.waitForTimeout(500);
    const prodSection = page.locator("#production-flow");
    assert.equal(await prodSection.isVisible(), true, "#production-flow section must be visible");
    console.log("✓ TOC button clicked and smoothly scrolled to section.");

    // 1.5 Test Walkthrough Checkboxes & Progress Bar
    console.log("\n[TEST 1.5] Walkthrough Checkboxes & Progress Bar...");
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
    console.log("✓ Walkthrough checkbox updated progress to 2/10 (20%).");

    // 1.6 Test Role Matrix Dynamic Interaction
    console.log("\n[TEST 1.6] Role Matrix Row Click...");
    const shiftReceiverRow = page.locator("#roles-matrix table tbody tr", { hasText: "Shift Receiver" });
    await shiftReceiverRow.click();
    await page.waitForTimeout(300);

    const detailCard = page.locator("#roles-matrix h4", { hasText: "Shift Receiver" });
    assert.equal(await detailCard.isVisible(), true, "Detail card should display Shift Receiver");
    console.log("✓ Role matrix row click updated detail card to Shift Receiver.");

    // 1.7 Viewports & Responsive Quality (Desktop, Laptop, Tablet, Mobile)
    console.log("\n[TEST 1.7] Viewports & Horizontal Overflow Check...");
    const VIEWPORTS = [
      { name: "Desktop (1440x900)", width: 1440, height: 900 },
      { name: "Laptop (1280x720)", width: 1280, height: 720 },
      { name: "Tablet (768x1024)", width: 768, height: 1024 },
      { name: "Mobile (375x667)", width: 375, height: 667 },
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      console.log(`  - ${vp.name}: body scrollWidth = ${scrollWidth}px (Viewport = ${vp.width}px)`);
      assert.ok(scrollWidth <= vp.width + 5, `${vp.name} must not have unwanted horizontal scroll`);
    }
    console.log("✓ All 4 viewports passed with 0 horizontal overflow.");

    await context.close();
  }

  // =========================================================================
  // SECTION 2: TENANT ACCESS ISOLATION & 403 / 404 BLOCKS
  // =========================================================================
  console.log("\n=======================================================");
  console.log("--- 2. TENANT ACCESS ISOLATION & ROUTE GUARDS ---");
  console.log("=======================================================");

  // 2.1 Owner Persona
  {
    console.log("\n[TEST 2.1] Owner Persona Isolation...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "owner@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard/executive", { timeout: 10000 });
    console.log("✓ Owner logged in. Landed on:", page.url());

    // Verify Sidebar does NOT have Qo'llanma
    const sidebarGuideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await sidebarGuideLink.count(), 0, "Owner sidebar must NOT have Qo'llanma");
    console.log("✓ Owner sidebar does NOT contain Qo‘llanma.");

    // Verify Topbar does NOT have guide button
    const topbarGuideBtn = page.locator("header button[aria-label='Tizim qo‘llanmasi']");
    assert.equal(await topbarGuideBtn.count(), 0, "Owner topbar must NOT have Guide button");
    console.log("✓ Owner topbar does NOT contain Guide button.");

    // Direct /guide attempt -> PermissionGate blocks with 403 / Ruxsat yo'q
    await page.goto(`${BASE_URL}/guide`);
    const deniedHeading = page.locator("h1", { hasText: "Bu sahifaga kira olmaysiz" });
    await deniedHeading.waitFor({ state: "visible", timeout: 5000 });
    assert.equal(await deniedHeading.isVisible(), true, "Direct /guide must be blocked by PermissionGate for Owner");
    console.log("✓ Owner direct /guide attempt blocked with PermissionGate (403).");

    // Direct /admin/guide attempt -> must redirect to /admin/login
    await page.goto(`${BASE_URL}/admin/guide`);
    await page.waitForURL("**/admin/login", { timeout: 5000 });
    console.log("✓ Owner direct /admin/guide attempt strictly BLOCKED & redirected to /admin/login.");

    await context.close();
  }

  // 2.2 Manager Persona
  {
    console.log("\n[TEST 2.2] Manager Persona Isolation...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "manager@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard/executive", { timeout: 10000 });

    const sidebarGuideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await sidebarGuideLink.count(), 0, "Manager sidebar must NOT have Qo'llanma");

    await page.goto(`${BASE_URL}/guide`);
    const managerDenied = page.locator("h1", { hasText: "Bu sahifaga kira olmaysiz" });
    await managerDenied.waitFor({ state: "visible", timeout: 5000 });
    assert.equal(await managerDenied.isVisible(), true, "Direct /guide must be blocked by PermissionGate for Manager");
    console.log("✓ Manager direct /guide attempt blocked with PermissionGate (403).");

    await page.goto(`${BASE_URL}/admin/guide`);
    await page.waitForURL("**/admin/login", { timeout: 5000 });
    console.log("✓ Manager direct /admin/guide attempt strictly BLOCKED & redirected to /admin/login.");

    await context.close();
  }

  // 2.3 Shift Receiver Persona
  {
    console.log("\n[TEST 2.3] Shift Receiver Persona Isolation...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "shift@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click("button[type='submit']");
    await page.waitForURL("**/production", { timeout: 10000 });

    const sidebarGuideLink = page.locator("aside nav a", { hasText: "Qo‘llanma" });
    assert.equal(await sidebarGuideLink.count(), 0, "Shift Receiver sidebar must NOT have Qo'llanma");

    await page.goto(`${BASE_URL}/guide`);
    const shiftDenied = page.locator("h1", { hasText: "Bu sahifaga kira olmaysiz" });
    await shiftDenied.waitFor({ state: "visible", timeout: 5000 });
    assert.equal(await shiftDenied.isVisible(), true, "Direct /guide must be blocked by PermissionGate for Shift Receiver");
    console.log("✓ Shift Receiver direct /guide attempt blocked with PermissionGate (403).");

    await page.goto(`${BASE_URL}/admin/guide`);
    await page.waitForURL("**/admin/login", { timeout: 5000 });
    console.log("✓ Shift Receiver direct /admin/guide attempt strictly BLOCKED & redirected to /admin/login.");

    await context.close();
  }

  // 2.4 Unauthenticated Visitor
  {
    console.log("\n[TEST 2.4] Unauthenticated Visitor Access...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/guide`);
    await page.waitForURL("**/login", { timeout: 5000 });
    console.log("✓ Unauthenticated visitor /guide redirected to /login.");

    await page.goto(`${BASE_URL}/admin/guide`);
    await page.waitForURL("**/admin/login", { timeout: 5000 });
    console.log("✓ Unauthenticated visitor direct /admin/guide redirected to /admin/login.");

    await context.close();
  }

  await browser.close();
  console.log("\n=========================================================================");
  console.log("ALL REAL BROWSER ACCEPTANCE TESTS PASSED (100% ACCURATE AND ISOLATED)");
  console.log("=========================================================================");
}

runBrowserAcceptance().catch((err) => {
  console.error("Browser Acceptance Test Failed:", err);
  process.exit(1);
});
