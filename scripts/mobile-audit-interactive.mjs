import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.WEB_BASE_URL || "http://localhost:3000";

const VIEWPORTS = {
  smallPhone: { name: "Small Phone (320x640)", width: 320, height: 640, isMobile: true, hasTouch: true },
  commonPhone: { name: "Common Phone (390x844)", width: 390, height: 844, isMobile: true, hasTouch: true },
  largePhone: { name: "Large Phone (412x915)", width: 412, height: 915, isMobile: true, hasTouch: true },
};

const ROLES = [
  { name: "Owner", email: "owner@paypoq.local", home: "/dashboard/executive", password: "ChangeMe123!" },
  { name: "Manager", email: "manager@paypoq.local", home: "/dashboard/executive", password: "ChangeMe123!" },
  { name: "Shift Receiver", email: "shift@paypoq.local", home: "/production", password: "ChangeMe123!" },
  { name: "Warehouse Operator", email: "warehouse@paypoq.local", home: "/warehouse", password: "ChangeMe123!" },
  { name: "Seller", email: "seller@paypoq.local", home: "/sales", password: "ChangeMe123!" },
  { name: "Accountant", email: "accountant@paypoq.local", home: "/finance", password: "ChangeMe123!" },
];

async function checkOverflow(page, contextStr) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      clientWidth: doc.clientWidth,
      innerWidth: window.innerWidth,
    };
  });

  const hasOverflow = metrics.scrollWidth > metrics.clientWidth + 2;
  return {
    hasOverflow,
    metrics,
    contextStr,
  };
}

async function findSmallTouchTargets(page) {
  return await page.evaluate(() => {
    const clickable = Array.from(
      document.querySelectorAll("button, a, select, input, [role='button']")
    );
    const smallTargets = [];

    for (const el of clickable) {
      // ignore hidden or zero-size elements
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (window.getComputedStyle(el).display === "none") continue;
      if (window.getComputedStyle(el).visibility === "hidden") continue;

      // check if inside viewport
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

      if (rect.width < 32 || rect.height < 32) {
        smallTargets.push({
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          className: el.className ? el.className.toString().slice(0, 50) : "",
        });
      }
    }
    return smallTargets.slice(0, 10);
  });
}

async function runAudit() {
  console.log(`Starting comprehensive Mobile-First interactive audit against ${BASE} ...`);
  const browser = await chromium.launch({ headless: true });
  const auditReport = [];

  for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
    console.log(`\n======================================================`);
    console.log(`AUDITING VIEWPORT: ${vp.name}`);
    console.log(`======================================================`);

    for (const role of ROLES) {
      console.log(`\n--- Role: ${role.name} (${role.email}) @ ${vp.name} ---`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        colorScheme: "dark",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      try {
        // 1. Login
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => {
          const el = document.querySelector("#email");
          return el && !el.disabled;
        }, { timeout: 15000 });

        await page.fill("#email", role.email);
        await page.fill("#password", role.password);
        await page.click("button[type='submit']");

        // Wait for redirect to home
        await page.waitForFunction((home) => window.location.pathname.includes(home) || !window.location.pathname.includes("/login"), role.home, { timeout: 15000 });
        console.log(`  ✓ Logged in. Reached: ${page.url()}`);

        const overflowHome = await checkOverflow(page, `${role.name} Home (${page.url()})`);
        if (overflowHome.hasOverflow) {
          console.warn(`  ⚠️ OVERFLOW on ${overflowHome.contextStr}: scrollWidth ${overflowHome.metrics.scrollWidth} > clientWidth ${overflowHome.metrics.clientWidth}`);
          auditReport.push({ severity: "P0", type: "OVERFLOW", role: role.name, vp: vp.name, page: page.url(), detail: `scrollWidth ${overflowHome.metrics.scrollWidth} > clientWidth ${overflowHome.metrics.clientWidth}` });
        } else {
          console.log(`  ✓ No horizontal overflow on landing page.`);
        }

        // 2. Mobile Menu / Sidebar test
        const menuBtn = page.locator("header button[aria-label='Menyuni ochish']");
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(300);
          const aside = page.locator("aside");
          const asideVisible = await aside.isVisible();
          console.log(`  ✓ Mobile menu toggle: aside is ${asideVisible ? "VISIBLE" : "HIDDEN"}`);

          // Check menu links touch targets
          const smallNavTargets = await findSmallTouchTargets(page);
          if (smallNavTargets.length > 0) {
            console.log(`  ℹ️ Found ${smallNavTargets.length} small clickable targets in menu/header`);
          }

          // Close menu
          const closeBtn = page.locator("aside button[aria-label='Menyuni yopish']");
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(200);
          }
        }

        // 3. Role-specific primary workflow inspection
        if (role.name === "Shift Receiver" || role.name === "Manager") {
          // Check /production page
          await page.goto(`${BASE}/production`, { waitUntil: "networkidle" });
          const prodOverflow = await checkOverflow(page, "/production");
          if (prodOverflow.hasOverflow) {
            console.warn(`  ⚠️ OVERFLOW on /production: ${prodOverflow.metrics.scrollWidth} > ${prodOverflow.metrics.clientWidth}`);
            auditReport.push({ severity: "P0", type: "OVERFLOW", role: role.name, vp: vp.name, page: "/production", detail: `scrollWidth ${prodOverflow.metrics.scrollWidth} > clientWidth ${prodOverflow.metrics.clientWidth}` });
          }

          // Test opening a production action drawer (e.g. Stage movement or Intake)
          const actionBtn = page.locator("button:has-text('Ko‘chirish'), button:has-text('O‘tkazish')").first();
          if (await actionBtn.isVisible()) {
            console.log("  Testing Stage Movement Drawer on mobile...");
            await actionBtn.click();
            await page.waitForTimeout(500);

            const drawerDialog = page.locator("section[role='dialog']");
            if (await drawerDialog.isVisible()) {
              console.log("  ✓ Drawer dialog opened.");
              // Verify drawer overflow
              const drawerBox = await drawerDialog.boundingBox();
              console.log(`  Drawer dimensions: w=${drawerBox?.width}, h=${drawerBox?.height} (viewport: ${vp.width}x${vp.height})`);

              // Check if submit button is reachable
              const submitBtn = drawerDialog.locator("button[type='submit']");
              const isSubmitVisible = await submitBtn.isVisible();
              console.log(`  Submit button visible: ${isSubmitVisible}`);

              // Close drawer
              const drawerClose = drawerDialog.locator("button[aria-label='Yopish']");
              await drawerClose.click();
              await page.waitForTimeout(300);
            }
          }
        }

        if (role.name === "Seller") {
          // Check /sales/clients and /sales/orders
          await page.goto(`${BASE}/sales/clients`, { waitUntil: "networkidle" });
          const clientOverflow = await checkOverflow(page, "/sales/clients");
          if (clientOverflow.hasOverflow) {
            console.warn(`  ⚠️ OVERFLOW on /sales/clients: ${clientOverflow.metrics.scrollWidth} > ${clientOverflow.metrics.clientWidth}`);
            auditReport.push({ severity: "P0", type: "OVERFLOW", role: role.name, vp: vp.name, page: "/sales/clients", detail: `${clientOverflow.metrics.scrollWidth} > ${clientOverflow.metrics.clientWidth}` });
          }

          const addClientBtn = page.locator("button:has-text('Mijoz qo‘shish')");
          if (await addClientBtn.isVisible()) {
            await addClientBtn.click();
            await page.waitForTimeout(400);
            const clientDrawer = page.locator("section[role='dialog']");
            if (await clientDrawer.isVisible()) {
              console.log("  ✓ Client creation drawer opened on mobile.");
              const phoneInput = clientDrawer.locator("#clientPhone");
              if (await phoneInput.isVisible()) {
                await phoneInput.focus();
                await phoneInput.fill("901234567");
                const val = await phoneInput.inputValue();
                console.log(`  ✓ Phone typing on mobile formatted to: ${val}`);
              }
              await clientDrawer.locator("button[aria-label='Yopish']").click();
            }
          }

          // Check /sales/orders
          await page.goto(`${BASE}/sales/orders`, { waitUntil: "networkidle" });
          const orderOverflow = await checkOverflow(page, "/sales/orders");
          if (orderOverflow.hasOverflow) {
            console.warn(`  ⚠️ OVERFLOW on /sales/orders: ${orderOverflow.metrics.scrollWidth} > ${orderOverflow.metrics.clientWidth}`);
            auditReport.push({ severity: "P0", type: "OVERFLOW", role: role.name, vp: vp.name, page: "/sales/orders", detail: `${orderOverflow.metrics.scrollWidth} > ${orderOverflow.metrics.clientWidth}` });
          }

          const createOrderBtn = page.locator("button:has-text('Buyurtma yaratish')");
          if (await createOrderBtn.isVisible()) {
            await createOrderBtn.click();
            await page.waitForTimeout(500);
            const orderDrawer = page.locator("section[role='dialog']");
            if (await orderDrawer.isVisible()) {
              console.log("  ✓ Order creation drawer opened on mobile.");
              const orderBox = await orderDrawer.boundingBox();
              console.log(`  Order drawer size: w=${orderBox?.width}, h=${orderBox?.height}`);
              await orderDrawer.locator("button[aria-label='Yopish']").click();
            }
          }
        }

        if (role.name === "Warehouse Operator") {
          await page.goto(`${BASE}/warehouse`, { waitUntil: "networkidle" });
          const whOverflow = await checkOverflow(page, "/warehouse");
          if (whOverflow.hasOverflow) {
            console.warn(`  ⚠️ OVERFLOW on /warehouse: ${whOverflow.metrics.scrollWidth} > ${whOverflow.metrics.clientWidth}`);
            auditReport.push({ severity: "P0", type: "OVERFLOW", role: role.name, vp: vp.name, page: "/warehouse", detail: `${whOverflow.metrics.scrollWidth} > ${whOverflow.metrics.clientWidth}` });
          }

          await page.goto(`${BASE}/warehouse/materials`, { waitUntil: "networkidle" });
          const matOverflow = await checkOverflow(page, "/warehouse/materials");
          if (matOverflow.hasOverflow) {
            console.warn(`  ⚠️ OVERFLOW on /warehouse/materials: ${matOverflow.metrics.scrollWidth} > ${matOverflow.metrics.clientWidth}`);
            auditReport.push({ severity: "P0", type: "OVERFLOW", role: role.name, vp: vp.name, page: "/warehouse/materials", detail: `${matOverflow.metrics.scrollWidth} > ${matOverflow.metrics.clientWidth}` });
          }

          const receiveBtn = page.locator("button:has-text('Material qabul qilish')");
          if (await receiveBtn.isVisible()) {
            await receiveBtn.click();
            await page.waitForTimeout(400);
            const matDrawer = page.locator("section[role='dialog']");
            if (await matDrawer.isVisible()) {
              console.log("  ✓ Material receipt drawer opened on mobile.");
              await matDrawer.locator("button[aria-label='Yopish']").click();
            }
          }
        }

        if (role.name === "Accountant") {
          await page.goto(`${BASE}/finance/payroll`, { waitUntil: "networkidle" });
          const payrollOverflow = await checkOverflow(page, "/finance/payroll");
          if (payrollOverflow.hasOverflow) {
            console.warn(`  ⚠️ OVERFLOW on /finance/payroll: ${payrollOverflow.metrics.scrollWidth} > ${payrollOverflow.metrics.clientWidth}`);
            auditReport.push({ severity: "P0", type: "OVERFLOW", role: role.name, vp: vp.name, page: "/finance/payroll", detail: `${payrollOverflow.metrics.scrollWidth} > ${payrollOverflow.metrics.clientWidth}` });
          }

          await page.goto(`${BASE}/finance/expenses`, { waitUntil: "networkidle" });
          const expOverflow = await checkOverflow(page, "/finance/expenses");
          if (expOverflow.hasOverflow) {
            console.warn(`  ⚠️ OVERFLOW on /finance/expenses: ${expOverflow.metrics.scrollWidth} > ${expOverflow.metrics.clientWidth}`);
            auditReport.push({ severity: "P0", type: "OVERFLOW", role: role.name, vp: vp.name, page: "/finance/expenses", detail: `${expOverflow.metrics.scrollWidth} > ${expOverflow.metrics.clientWidth}` });
          }
        }

      } catch (err) {
        console.error(`  ❌ Error testing ${role.name} @ ${vp.name}:`, err.message);
        auditReport.push({ severity: "P0", type: "ERROR", role: role.name, vp: vp.name, detail: err.message });
      } finally {
        await context.close();
      }
    }

    // Platform Super Admin
    console.log(`\n--- Role: Super Admin (platform@paypoq.local) @ ${vp.name} ---`);
    const adminContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      colorScheme: "dark",
    });
    const adminPage = await adminContext.newPage();
    try {
      await adminPage.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
      await adminPage.waitForFunction(() => {
        const el = document.querySelector("#email");
        return el && !el.disabled;
      }, { timeout: 15000 });
      await adminPage.fill("#email", "platform@paypoq.local");
      await adminPage.fill("#password", "ChangeMe123!");
      await adminPage.click("button[type='submit']");
      await adminPage.waitForURL(url => url.pathname.includes("/admin/tenants"), { timeout: 15000 });
      console.log(`  ✓ Super Admin logged in. Reached: ${adminPage.url()}`);

      const tenantOverflow = await checkOverflow(adminPage, "/admin/tenants");
      if (tenantOverflow.hasOverflow) {
        console.warn(`  ⚠️ OVERFLOW on /admin/tenants: ${tenantOverflow.metrics.scrollWidth} > ${tenantOverflow.metrics.clientWidth}`);
        auditReport.push({ severity: "P0", type: "OVERFLOW", role: "Super Admin", vp: vp.name, page: "/admin/tenants", detail: `${tenantOverflow.metrics.scrollWidth} > ${tenantOverflow.metrics.clientWidth}` });
      } else {
        console.log(`  ✓ No horizontal overflow on /admin/tenants.`);
      }

      const createTenantBtn = adminPage.locator("button:has-text('Korxona yaratish')");
      if (await createTenantBtn.isVisible()) {
        await createTenantBtn.click();
        await adminPage.waitForTimeout(400);
        const tenantDrawer = adminPage.locator("section[role='dialog']");
        if (await tenantDrawer.isVisible()) {
          console.log("  ✓ Tenant create drawer opened on mobile.");
          const selectText = await tenantDrawer.locator("#branch-mode").textContent();
          console.log(`  Branch mode option text: ${selectText?.includes("Mustaqil korxona") ? "Mustaqil korxona PRESENT" : "MISSING"}`);
          await tenantDrawer.locator("button[aria-label='Yopish']").click();
        }
      }
    } catch (err) {
      console.error(`  ❌ Error testing Super Admin @ ${vp.name}:`, err.message);
      auditReport.push({ severity: "P0", type: "ERROR", role: "Super Admin", vp: vp.name, detail: err.message });
    } finally {
      await adminContext.close();
    }
  }

  await browser.close();

  console.log("\n======================================================");
  console.log("AUDIT FINDINGS SUMMARY");
  console.log("======================================================");
  console.log(`Total Issues Recorded: ${auditReport.length}`);
  for (const item of auditReport) {
    console.log(`[${item.severity}] ${item.type} (${item.role} @ ${item.vp}): ${item.detail}`);
  }
}

runAudit().catch(e => { console.error(e); process.exit(1); });
