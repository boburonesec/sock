/**
 * UI route + responsive critical-control smoke.
 * Repository contract: pnpm playwright:install && pnpm test:ui-routes
 */
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("playwright");

const BASE = process.env.WEB_BASE_URL || "http://localhost:3000";
const results = [];

function ok(n, d = "") {
  results.push({ n, s: "PASS", d });
  console.log(`PASS  ${n}${d ? ` — ${d}` : ""}`);
}
function fail(n, d = "") {
  results.push({ n, s: "FAIL", d });
  console.error(`FAIL  ${n}${d ? ` — ${d}` : ""}`);
}

const ROUTES = [
  "/dashboard/executive",
  "/dashboard/operations",
  "/production",
  "/warehouse",
  "/warehouse/materials",
  "/warehouse/movements",
  "/warehouse/zones",
  "/sales",
  "/sales/clients",
  "/sales/orders",
  "/sales/payments",
  "/sales/debts",
  "/finance",
  "/finance/suppliers",
  "/finance/payroll",
  "/finance/advances",
  "/finance/expenses",
  "/employees",
  "/reports",
  "/settings",
  "/settings/products",
  "/settings/company",
  "/settings/telegram",
  "/profile",
  "/tv",
];

async function login(page) {
  const loginDiagnostics = [];
  const onResponse = (response) => {
    if (response.url().includes("/auth/")) {
      loginDiagnostics.push(`${response.status()} ${response.url()}`);
    }
  };
  const onRequestFailed = (request) => {
    if (request.url().includes("/auth/")) {
      loginDiagnostics.push(`FAILED ${request.url()}: ${request.failure()?.errorText}`);
    }
  };
  const onConsole = (message) => {
    if (message.type() === "error") loginDiagnostics.push(`CONSOLE ${message.text()}`);
  };
  const onPageError = (error) => loginDiagnostics.push(`PAGE ${error.message}`);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#email", { timeout: 15000 });
  // Let session bootstrap (refresh 401) settle
  await page.waitForTimeout(1200);
  await page.fill("#email", "owner@paypoq.local");
  await page.fill("#password", "ChangeMe123!");
  await page.click('button[type="submit"]');
  // Client-side navigation; poll URL because waitForURL can race with SPA
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const url = page.url();
    if (url.includes("/dashboard")) {
      page.off("response", onResponse);
      page.off("requestfailed", onRequestFailed);
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      return;
    }
    // surface login error if shown
    const err = page.locator("text=Email/parol noto");
    if (await err.count()) {
      throw new Error(`Login form showed error (${loginDiagnostics.join(", ") || "no auth response"})`);
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`Login did not reach dashboard. url=${page.url()} (${loginDiagnostics.join(", ")})`);
}

async function verifyNoDocumentOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (overflow.scrollWidth <= overflow.clientWidth + 2) {
    ok(`${label} no document overflow`, `${overflow.scrollWidth}<=${overflow.clientWidth}`);
  } else {
    fail(`${label} no document overflow`, `${overflow.scrollWidth}>${overflow.clientWidth}`);
  }
}

async function verifyCriticalControls(page, label) {
  await page.goto(`${BASE}/production`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  for (const actionName of [
    "Smena o‘tkazish (+ ishchilar)",
    "Qo‘shimcha faollik kiritish",
    "Brak qayd qilish",
    "Omborga qabul qilish",
  ]) {
    const button = page.getByRole("button", { name: actionName });
    const visible = await button.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false);
    if (visible) {
      await button.click();
      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible().catch(() => false)) ok(`${label} ${actionName} reachable`);
      else fail(`${label} ${actionName} reachable`, "drawer did not open");
      await page.goto(`${BASE}/production`, { waitUntil: "domcontentloaded" });
      await page
        .getByRole("button", { name: "Smena o‘tkazish (+ ishchilar)" })
        .waitFor({ state: "visible", timeout: 10_000 });
    } else {
      fail(`${label} ${actionName} reachable`, `control missing at ${page.url()}`);
    }
  }
  await verifyNoDocumentOverflow(page, `${label} production`);

  for (const [route, control] of [
    ["/warehouse/materials", "Material qabul qilish"],
    ["/sales/orders", "Buyurtma yaratish"],
    ["/sales/payments", "To‘lov qayd qilish"],
    ["/finance/payroll", "Yangi davr"],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const button = page.getByRole("button", { name: control }).first();
    const visible = await button.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false);
    if (visible) {
      await button.click();
      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible().catch(() => false)) ok(`${label} ${control} reachable`);
      else fail(`${label} ${control} reachable`, "drawer did not open");
    } else {
      fail(`${label} ${control} reachable`, `control missing at ${page.url()}`);
    }
    await verifyNoDocumentOverflow(page, `${label} ${route}`);
  }
  await page.goto(`${BASE}/dashboard/executive`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Menyuni ochish/i }).waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
}

async function main() {
  console.log(`\n=== UI route case test @ ${BASE} ===\n`);
  const browser = await chromium.launch({ headless: true });

  // Desktop
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);

    await page.goto(`${BASE}/login`);
    if (await page.locator("#email").count()) ok("Desktop login page renders");
    else fail("Desktop login page renders");

    await login(page);
    ok("Desktop owner login redirects to dashboard");
    await verifyCriticalControls(page, "1440px");

    await page.goto(`${BASE}/machines`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const machineTaskChooser = page.getByRole("button", {
      name: "Yangi stanok qo‘shish",
    });
    if ((await machineTaskChooser.count()) === 1) {
      const formsBefore = await page.locator("main form").count();
      await machineTaskChooser.click();
      const formsAfter = await page.locator("main form").count();
      if (formsBefore === 0 && formsAfter === 1) {
        ok("Desktop machines opens one selected workflow");
      } else {
        fail(
          "Desktop machines opens one selected workflow",
          `forms before=${formsBefore} after=${formsAfter}`,
        );
      }
    } else {
      fail("Desktop machines task chooser", "primary task button missing");
    }

    for (const route of ROUTES) {
      const res = await page.goto(`${BASE}${route}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(700);
      const status = res?.status() ?? 0;
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const hasCrash =
        /Application error|Unhandled Runtime Error|Something went wrong/i.test(
          bodyText,
        );
      if (status < 400 && !hasCrash) ok(`Desktop ${route}`, `HTTP ${status}`);
      else fail(`Desktop ${route}`, `HTTP ${status} crash=${hasCrash}`);
    }

    // Open mobile menu not needed on desktop
    await context.close();
  }

  // Mobile viewport
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "dark",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);

    await login(page);
    ok("Mobile login works");
    await verifyCriticalControls(page, "390px");

    await page.goto(`${BASE}/machines`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const mobileMachineTask = page.getByRole("button", {
      name: "Yangi stanok qo‘shish",
    });
    if ((await mobileMachineTask.count()) === 1) {
      await mobileMachineTask.click();
      const machineCode = page.getByRole("textbox", { name: "Stanok kodi" });
      if ((await machineCode.count()) === 1) {
        ok("Mobile machines task opens with accessible fields");
      } else {
        fail("Mobile machines task opens with accessible fields");
      }
    } else {
      fail("Mobile machines task chooser", "primary task button missing");
    }

    // hamburger should open sidebar
    const menuBtn = page.getByRole("button", { name: /Menyuni ochish/i });
    if (await menuBtn.count()) {
      await menuBtn.click();
      await page.waitForTimeout(400);
      const sidebarLink = page
        .getByRole("navigation")
        .getByRole("link", { name: "Ishlab chiqarish" });
      if (await sidebarLink.isVisible()) ok("Mobile sidebar opens");
      else fail("Mobile sidebar opens", "link not visible");
      await sidebarLink.click();
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline && !page.url().includes("/production")) {
        await page.waitForTimeout(200);
      }
      if (page.url().includes("/production")) ok("Mobile nav to production");
      else fail("Mobile nav to production", page.url());
    } else {
      fail("Mobile sidebar opens", "menu button missing");
    }

    // production quick actions visible early
    await page.goto(`${BASE}/production`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const qa = page.getByText("Tezkor amallar");
    if (await qa.count()) ok("Mobile production quick actions visible");
    else fail("Mobile production quick actions visible");

    // open action drawer
    const movementBtn = page.getByRole("button", {
      name: "Smena o‘tkazish (+ ishchilar)",
    });
    if ((await movementBtn.count()) === 1) {
      await movementBtn.click();
      await page.waitForTimeout(500);
      const dialog = page.getByRole("dialog", { name: "Smena o‘tkazish" });
      const workerGuidance = dialog.getByText("Kim ishladi? (shu bosqich ishchilari)");
      if ((await dialog.count()) === 1 && (await workerGuidance.count()) === 1) {
        ok("Mobile workforce-aware production drawer opens");
      } else {
        fail("Mobile workforce-aware production drawer opens");
      }
    } else {
      fail("Mobile workforce-aware production drawer opens", "button missing or duplicate");
    }

    // sales orders table scroll container
    await page.goto(`${BASE}/sales/orders`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const body = await page.locator("body").innerText();
    if (!/Application error/i.test(body)) ok("Mobile sales/orders renders");
    else fail("Mobile sales/orders renders");

    // no horizontal document overflow
    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    if (overflow.scrollWidth <= overflow.clientWidth + 2) {
      ok("Mobile no page horizontal overflow", `${overflow.scrollWidth}<=${overflow.clientWidth}`);
    } else {
      fail(
        "Mobile no page horizontal overflow",
        `${overflow.scrollWidth}>${overflow.clientWidth}`,
      );
    }

    // admin login page
    await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
    if (await page.locator("#email").count()) ok("Mobile admin login page");
    else fail("Mobile admin login page");

    await context.close();
  }

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 768, height: 1024 },
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: viewport.width === 320,
      hasTouch: viewport.width === 320,
      colorScheme: "dark",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await login(page);
    ok(`${viewport.width}px login works`);
    await verifyCriticalControls(page, `${viewport.width}px`);
    await context.close();
  }

  await browser.close();

  const pass = results.filter((r) => r.s === "PASS").length;
  const failN = results.filter((r) => r.s === "FAIL").length;
  console.log("\n=== UI SUMMARY ===");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${failN}`);
  if (failN) {
    for (const r of results.filter((x) => x.s === "FAIL")) {
      console.log(` - ${r.n}: ${r.d}`);
    }
  }
  process.exit(failN ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
