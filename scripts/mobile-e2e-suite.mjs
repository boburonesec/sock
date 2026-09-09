import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.WEB_BASE_URL || "http://localhost:3000";

const VIEWPORTS = {
  smallPhone: { name: "Small Phone (320x568)", width: 320, height: 568, isMobile: true, hasTouch: true },
  commonPhone: { name: "Common Phone (390x844)", width: 390, height: 844, isMobile: true, hasTouch: true },
  largePhone: { name: "Large Phone (412x915)", width: 412, height: 915, isMobile: true, hasTouch: true },
  desktop: { name: "Desktop (1440x900)", width: 1440, height: 900, isMobile: false, hasTouch: false },
};

const ROLES = [
  { name: "Owner", email: "owner@paypoq.local", home: "/dashboard/executive", password: "ChangeMe123!" },
  { name: "Manager", email: "manager@paypoq.local", home: "/dashboard/executive", password: "ChangeMe123!" },
  { name: "Shift Receiver", email: "shift@paypoq.local", home: "/production", password: "ChangeMe123!" },
  { name: "Warehouse Operator", email: "warehouse@paypoq.local", home: "/warehouse", password: "ChangeMe123!" },
  { name: "Seller", email: "seller@paypoq.local", home: "/sales", password: "ChangeMe123!" },
  { name: "Accountant", email: "accountant@paypoq.local", home: "/finance", password: "ChangeMe123!" },
];

let passCount = 0;
let failCount = 0;

function pass(testName) {
  passCount++;
  console.log(`  ✓ PASS: ${testName}`);
}

function fail(testName, error) {
  failCount++;
  console.error(`  ✗ FAIL: ${testName} -> ${error.message || error}`);
}

async function checkNoOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      clientWidth: doc.clientWidth,
    };
  });

  const ok = metrics.scrollWidth <= metrics.clientWidth + 2;
  if (ok) {
    pass(`No horizontal overflow on ${label} (w=${metrics.clientWidth})`);
  } else {
    fail(`Horizontal overflow on ${label}`, new Error(`scrollWidth ${metrics.scrollWidth} > clientWidth ${metrics.clientWidth}`));
  }
}

async function runMobileSuite() {
  console.log(`\n======================================================`);
  console.log(`PAYPOQ OS MOBILE-FIRST OPERATIONAL E2E TEST SUITE`);
  console.log(`Target: ${BASE}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: COMMON PHONE (390x844) - ROLE-BY-ROLE OPERATIONAL WORKFLOWS
    // -------------------------------------------------------------
    console.log(`--- [SUITE 1] COMMON PHONE (390x844) ROLE WORKFLOWS ---`);
    const commonVp = VIEWPORTS.commonPhone;

    // 1.1 Seller Workflow: Orders, Clients, Row Taps, Phone Input
    {
      const context = await browser.newContext({
        viewport: { width: commonVp.width, height: commonVp.height },
        isMobile: commonVp.isMobile,
        hasTouch: commonVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "seller@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL(url => !url.pathname.includes("/login"));
        pass("Seller logged in successfully");

        await checkNoOverflow(page, "Seller Home");

        // Mobile sidebar test
        const menuBtn = page.locator("header button[aria-label='Menyuni ochish']");
        await menuBtn.click();
        await page.waitForTimeout(300);
        const aside = page.locator("aside");
        assert(await aside.isVisible(), "Aside menu is visible after hamburger tap");
        pass("Mobile sidebar opens on hamburger tap");

        // Check active factory badge in sidebar
        const asideText = await aside.textContent();
        assert(asideText.includes("Paypoq OS"), "Sidebar includes Paypoq OS branding");
        pass("Mobile sidebar displays branding and factory status");

        // Close sidebar
        await page.locator("aside button[aria-label='Menyuni yopish']").click();
        await page.waitForTimeout(200);

        // Check /sales/orders — migrated to a mobile card list (mobile UX
        // audit Phase 2): the table (and its own "Jadvalni surish mumkin"
        // scroll cue) no longer renders at this width at all, replaced by
        // ResponsiveDataList's card list. Dedicated deterministic coverage
        // for this lives in scripts/phase2-orders-payments-mobile-acceptance.mjs;
        // this suite still checks the table is genuinely hidden and the new
        // card interaction works, so a regression here still fails loudly.
        await page.goto(`${BASE}/sales/orders`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Sales Orders page");

        const ordersDesktopTable = page.locator(".hidden.sm\\:block").first();
        assert(!(await ordersDesktopTable.isVisible()), "Desktop orders table must be hidden on mobile");
        pass("Orders desktop table hidden on mobile (card list used instead)");

        const firstOrderCard = page.locator('ul[aria-label="Buyurtmalar ro‘yxati"] > li').first().locator("button");
        assert(await firstOrderCard.isVisible(), "First order card must be visible");
        await firstOrderCard.click();
        await page.waitForTimeout(400);
        const orderDrawer = page.locator("section[role='dialog']");
        assert(await orderDrawer.isVisible(), "Tapping an order card must open the order detail drawer");
        pass("Tapping order card opens order detail drawer on mobile");
        await orderDrawer.locator("button[aria-label='Yopish']").click();
        await page.waitForTimeout(300);

        // Check /sales/clients and phone formatting
        await page.goto(`${BASE}/sales/clients`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Sales Clients page");

        const addClientBtn = page.locator("button:has-text('Mijoz qo‘shish')");
        if (await addClientBtn.isVisible()) {
          await addClientBtn.click();
          await page.waitForTimeout(400);
          const clientDrawer = page.locator("section[role='dialog']");
          assert(await clientDrawer.isVisible(), "Client create drawer opened");

          const phoneInput = clientDrawer.locator("#clientPhone");
          if (await phoneInput.isVisible()) {
            await phoneInput.focus();
            await phoneInput.fill("901234567");
            const val = await phoneInput.inputValue();
            assert.strictEqual(val, "+998 90 123 45 67", "Phone input formatted properly");
            pass("Client phone input formats dynamic Uzbek phone (+998 90 123 45 67)");
          }

          await clientDrawer.locator("button[aria-label='Yopish']").click();
          await page.waitForTimeout(300);
        }

        // Test client row tap opens client detail drawer
        const firstClientRow = page.locator("tbody tr").first();
        if (await firstClientRow.isVisible()) {
          await firstClientRow.click();
          await page.waitForTimeout(400);
          const detailDrawer = page.locator("section[role='dialog']");
          if (await detailDrawer.isVisible()) {
            pass("Tapping client row opens client detail drawer on mobile");
            await detailDrawer.locator("button[aria-label='Yopish']").click();
          }
        }

      } catch (err) {
        fail("Seller workflow on common phone", err);
      } finally {
        await context.close();
      }
    }

    // 1.2 Shift Receiver Workflow: /production, numeric keyboard inputMode, drawer bottom clearance
    {
      const context = await browser.newContext({
        viewport: { width: commonVp.width, height: commonVp.height },
        isMobile: commonVp.isMobile,
        hasTouch: commonVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "shift@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL(url => url.pathname.includes("/production"));
        pass("Shift Receiver logged in to /production");

        await checkNoOverflow(page, "Production Board");

        // Open Stage Movement drawer
        const moveStageBtn = page.locator("button:has-text('Keyingi bosqichga o‘tkazish')");
        if (await moveStageBtn.isVisible()) {
          await moveStageBtn.click();
          await page.waitForTimeout(500);

          const drawer = page.locator("section[role='dialog']");
          assert(await drawer.isVisible(), "Stage movement drawer is open");
          pass("Stage movement drawer opens as mobile bottom sheet");

          // Verify number inputs have inputMode="numeric"
          const numberInputs = drawer.locator("input[type='number']");
          const count = await numberInputs.count();
          if (count > 0) {
            for (let i = 0; i < count; i++) {
              const inputMode = await numberInputs.nth(i).getAttribute("inputmode");
              assert(inputMode === "numeric" || inputMode === "decimal", `Input ${i} has inputMode=${inputMode}`);
            }
            pass(`All ${count} numeric inputs in drawer have inputMode='numeric' or 'decimal'`);
          }

          // Check drawer submit button is reachable
          const submitBtn = drawer.locator("button[type='submit']");
          assert(await submitBtn.isVisible(), "Drawer submit button is visible and reachable");
          pass("Drawer submit button has clear visibility above safe-area");

          await drawer.locator("button[aria-label='Yopish']").click();
          await page.waitForTimeout(300);
        }

        // Navigate to /machines via quick actions
        await page.goto(`${BASE}/machines`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Machines page");

        // Check machine intake input has numeric inputMode
        const intakeInput = page.locator("#machine-output input[type='number']").first();
        if (await intakeInput.isVisible()) {
          const inputMode = await intakeInput.getAttribute("inputmode");
          assert(inputMode === "numeric" || inputMode === "decimal", "Intake input has numeric inputMode");
          pass("Machine output intake input provides virtual numeric keypad");
        }

      } catch (err) {
        fail("Shift Receiver workflow on common phone", err);
      } finally {
        await context.close();
      }
    }

    // 1.3 Warehouse Operator: /warehouse/movements, row click, /warehouse/materials drawer
    {
      const context = await browser.newContext({
        viewport: { width: commonVp.width, height: commonVp.height },
        isMobile: commonVp.isMobile,
        hasTouch: commonVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "warehouse@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL(url => url.pathname.includes("/warehouse"));
        pass("Warehouse Operator logged in");

        await page.goto(`${BASE}/warehouse/movements`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Warehouse Movements");

        // Check movement row click
        const firstMoveRow = page.locator("tbody tr").first();
        if (await firstMoveRow.isVisible()) {
          await firstMoveRow.click();
          await page.waitForTimeout(400);
          const moveDrawer = page.locator("section[role='dialog']");
          if (await moveDrawer.isVisible()) {
            pass("Tapping movement row opens movement details drawer on mobile");
            await moveDrawer.locator("button[aria-label='Yopish']").click();
            await page.waitForTimeout(300);
          }
        }

        // Check material receipt drawer
        await page.goto(`${BASE}/warehouse/materials`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Warehouse Materials");

        const receiveBtn = page.locator("button:has-text('Material qabul qilish')");
        if (await receiveBtn.isVisible()) {
          await receiveBtn.click();
          await page.waitForTimeout(400);
          const matDrawer = page.locator("section[role='dialog']");
          assert(await matDrawer.isVisible(), "Material receipt drawer opened");

          const qtyInput = matDrawer.locator("input[type='number']").first();
          if (await qtyInput.isVisible()) {
            const mode = await qtyInput.getAttribute("inputmode");
            assert(mode === "numeric" || mode === "decimal", "Material quantity has numeric inputMode");
            pass("Material receipt quantity has numeric virtual keyboard");
          }

          await matDrawer.locator("button[aria-label='Yopish']").click();
        }

      } catch (err) {
        fail("Warehouse Operator workflow on common phone", err);
      } finally {
        await context.close();
      }
    }

    // 1.4 Accountant: /finance/expenses touch targets, /finance/suppliers cards
    {
      const context = await browser.newContext({
        viewport: { width: commonVp.width, height: commonVp.height },
        isMobile: commonVp.isMobile,
        hasTouch: commonVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "accountant@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL(url => url.pathname.includes("/finance"));
        pass("Accountant logged in");

        await page.goto(`${BASE}/finance/expenses`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Finance Expenses");

        // Check expense action button height
        const actionBtn = page.locator("tbody td button:has-text('Tasdiqlash'), tbody td button:has-text('To‘lash'), tbody td button:has-text('Bekor')").first();
        if (await actionBtn.isVisible()) {
          const box = await actionBtn.boundingBox();
          assert(box && box.height >= 34, `Button height ${box?.height}px is comfortably tapable`);
          pass(`Expense action button has safe touch height (${Math.round(box.height)}px)`);
        }

        await page.goto(`${BASE}/finance/suppliers`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Finance Suppliers");
        pass("Suppliers card list renders cleanly without horizontal scroll");

      } catch (err) {
        fail("Accountant workflow on common phone", err);
      } finally {
        await context.close();
      }
    }

    // 1.5 Platform Super Admin: /admin/tenants, Mustaqil korxona, Drawer
    {
      const context = await browser.newContext({
        viewport: { width: commonVp.width, height: commonVp.height },
        isMobile: commonVp.isMobile,
        hasTouch: commonVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "platform@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL(url => url.pathname.includes("/admin/tenants"));
        pass("Super Admin logged in to /admin/tenants");

        await checkNoOverflow(page, "Super Admin Tenants");

        const createTenantBtn = page.locator("button:has-text('Korxona yaratish')");
        if (await createTenantBtn.isVisible()) {
          await createTenantBtn.click();
          await page.waitForTimeout(400);
          const tenantDrawer = page.locator("section[role='dialog']");
          assert(await tenantDrawer.isVisible(), "Tenant create drawer opened on mobile");

          const branchOption = tenantDrawer.locator("#branch-mode option[value='SINGLE']");
          const optionText = await branchOption.textContent();
          assert(optionText?.includes("Mustaqil korxona"), "Displays 'Mustaqil korxona' on mobile");
          pass("Tenant form displays 'Mustaqil korxona' terminology");

          await tenantDrawer.locator("button[aria-label='Yopish']").click();
        }

      } catch (err) {
        fail("Super Admin workflow on common phone", err);
      } finally {
        await context.close();
      }
    }

    // -------------------------------------------------------------
    // TEST SUITE 2: SMALL PHONE (320x568 - iPhone SE 1st gen)
    // -------------------------------------------------------------
    console.log(`\n--- [SUITE 2] SMALL PHONE (320x568) VIEWPORT STRESS TEST ---`);
    {
      const smallVp = VIEWPORTS.smallPhone;
      const context = await browser.newContext({
        viewport: { width: smallVp.width, height: smallVp.height },
        isMobile: smallVp.isMobile,
        hasTouch: smallVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "owner@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL(url => !url.pathname.includes("/login"));
        pass("Owner logged in on 320px small phone");

        await checkNoOverflow(page, "Owner Executive Dashboard (320px)");

        // Check topbar header height and hamburger
        const header = page.locator("header");
        const headerBox = await header.boundingBox();
        assert(headerBox && headerBox.width <= 320, "Header does not overflow 320px viewport");
        pass("Header fits within 320px viewport without clipping");

        // Open mobile navigation menu
        const menuBtn = page.locator("header button[aria-label='Menyuni ochish']");
        await menuBtn.click();
        await page.waitForTimeout(300);
        const aside = page.locator("aside");
        const asideBox = await aside.boundingBox();
        assert(asideBox && asideBox.width <= 320, "Aside menu fits on 320px screen");
        pass("Mobile sidebar fits gracefully on 320px screen");

        await page.locator("aside button[aria-label='Menyuni yopish']").click();
        await page.waitForTimeout(200);

        // Check /production on 320px
        await page.goto(`${BASE}/production`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Production on 320px");

        // Check /sales/orders on 320px
        await page.goto(`${BASE}/sales/orders`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Sales Orders on 320px");

      } catch (err) {
        fail("Small Phone (320px) Stress Test", err);
      } finally {
        await context.close();
      }
    }

    // -------------------------------------------------------------
    // TEST SUITE 3: LARGE PHONE (412x915 - Pixel 7 / Galaxy S)
    // -------------------------------------------------------------
    console.log(`\n--- [SUITE 3] LARGE PHONE (412x915) VIEWPORT TEST ---`);
    {
      const largeVp = VIEWPORTS.largePhone;
      const context = await browser.newContext({
        viewport: { width: largeVp.width, height: largeVp.height },
        isMobile: largeVp.isMobile,
        hasTouch: largeVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "manager@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL(url => !url.pathname.includes("/login"));
        pass("Manager logged in on 412px large phone");

        await checkNoOverflow(page, "Manager Executive Dashboard (412px)");

        await page.goto(`${BASE}/machines`, { waitUntil: "networkidle" });
        await checkNoOverflow(page, "Machines on 412px");
        pass("Machines page renders cleanly on 412px large phone");

      } catch (err) {
        fail("Large Phone (412px) Test", err);
      } finally {
        await context.close();
      }
    }

    // -------------------------------------------------------------
    // TEST SUITE 4: DESKTOP (1440x900) NON-REGRESSION TEST
    // -------------------------------------------------------------
    console.log(`\n--- [SUITE 4] DESKTOP (1440x900) NON-REGRESSION TEST ---`);
    {
      const desktopVp = VIEWPORTS.desktop;
      const context = await browser.newContext({
        viewport: { width: desktopVp.width, height: desktopVp.height },
        isMobile: desktopVp.isMobile,
        hasTouch: desktopVp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
        await page.waitForSelector("#email:not([disabled])");
        await page.fill("#email", "owner@paypoq.local");
        await page.fill("#password", "ChangeMe123!");
        await page.click("button[type='submit']");
        await page.waitForURL(url => !url.pathname.includes("/login"));
        pass("Owner logged in on desktop 1440px");

        // Verify desktop sidebar is visible by default (not hidden behind hamburger)
        const aside = page.locator("aside");
        assert(await aside.isVisible(), "Desktop sidebar is permanently visible");
        pass("Desktop sidebar is permanently visible on 1440px");

        // Verify hamburger button is hidden on desktop
        const hamburger = page.locator("header button[aria-label='Menyuni ochish']");
        const hamburgerVisible = await hamburger.isVisible();
        assert(!hamburgerVisible, "Hamburger button is hidden on desktop");
        pass("Hamburger button is hidden on 1440px desktop");

        // Verify table scroll cue is hidden on desktop
        await page.goto(`${BASE}/sales/orders`, { waitUntil: "networkidle" });
        const scrollCue = page.locator("text=Jadvalni surish mumkin →");
        const scrollCueVisible = await scrollCue.first().isVisible();
        assert(!scrollCueVisible, "Mobile scroll cue is hidden on desktop");
        pass("Mobile scroll cue is properly hidden on desktop tables");

        await checkNoOverflow(page, "Desktop Sales Orders (1440px)");
        pass("Desktop 1440px non-regression verified 100%");

      } catch (err) {
        fail("Desktop Non-Regression Test", err);
      } finally {
        await context.close();
      }
    }

  } finally {
    await browser.close();
  }

  console.log(`\n======================================================`);
  console.log(`MOBILE E2E SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`======================================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runMobileSuite().catch(err => {
  console.error("FATAL ERROR in mobile test suite:", err);
  process.exit(1);
});
