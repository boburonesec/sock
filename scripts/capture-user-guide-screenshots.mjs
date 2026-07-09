/**
 * Capture Paypoq OS web UI screenshots for docs/USER_GUIDE_V1.md
 *
 * Usage (from repo root, with web+api running):
 *   node scripts/capture-user-guide-screenshots.mjs
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Allow external playwright install (e.g. npm i --prefix /tmp/paypoq-pw playwright)
const require = createRequire(
  process.env.PLAYWRIGHT_PKG
    ? path.join(process.env.PLAYWRIGHT_PKG, "package.json")
    : path.join(process.cwd(), "package.json"),
);
const { chromium } = require(
  process.env.PLAYWRIGHT_PKG
    ? path.join(process.env.PLAYWRIGHT_PKG, "node_modules", "playwright")
    : "playwright",
);
void pathToFileURL;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "screenshots");

const BASE = process.env.WEB_BASE_URL || "http://localhost:3000";
const OWNER = {
  email: process.env.DEMO_EMAIL || "owner@paypoq.local",
  password: process.env.DEMO_PASSWORD || "ChangeMe123!",
};
const PLATFORM = {
  email: process.env.PLATFORM_EMAIL || "platform@paypoq.local",
  password: process.env.PLATFORM_PASSWORD || "ChangeMe123!",
};

const VIEWPORT = { width: 1440, height: 900 };

/** @type {{ file: string; path: string; wait?: string; fullPage?: boolean; settleMs?: number }[]} */
const AUTH_PAGES = [
  { file: "01-login.png", path: "/login", wait: "form", fullPage: true },
  {
    file: "02-dashboard-executive.png",
    path: "/dashboard/executive",
    settleMs: 1500,
  },
  {
    file: "03-dashboard-operations.png",
    path: "/dashboard/operations",
    settleMs: 1500,
  },
  { file: "04-production.png", path: "/production", settleMs: 1500 },
  { file: "05-warehouse.png", path: "/warehouse", settleMs: 1200 },
  {
    file: "06-warehouse-materials.png",
    path: "/warehouse/materials",
    settleMs: 1200,
  },
  {
    file: "07-warehouse-movements.png",
    path: "/warehouse/movements",
    settleMs: 1200,
  },
  { file: "08-warehouse-zones.png", path: "/warehouse/zones", settleMs: 1000 },
  { file: "09-sales.png", path: "/sales", settleMs: 1200 },
  { file: "10-sales-clients.png", path: "/sales/clients", settleMs: 1200 },
  { file: "11-sales-orders.png", path: "/sales/orders", settleMs: 1200 },
  { file: "12-sales-payments.png", path: "/sales/payments", settleMs: 1200 },
  { file: "13-sales-debts.png", path: "/sales/debts", settleMs: 1200 },
  { file: "14-finance.png", path: "/finance", settleMs: 1200 },
  {
    file: "15-finance-suppliers.png",
    path: "/finance/suppliers",
    settleMs: 1200,
  },
  {
    file: "16-finance-payroll.png",
    path: "/finance/payroll",
    settleMs: 1200,
  },
  {
    file: "17-finance-advances.png",
    path: "/finance/advances",
    settleMs: 1000,
  },
  {
    file: "18-finance-expenses.png",
    path: "/finance/expenses",
    settleMs: 1000,
  },
  { file: "19-employees.png", path: "/employees", settleMs: 1200 },
  { file: "20-reports.png", path: "/reports", settleMs: 1000 },
  { file: "21-settings.png", path: "/settings", settleMs: 1200 },
  {
    file: "22-settings-products.png",
    path: "/settings/products",
    settleMs: 1200,
  },
  {
    file: "23-settings-colors.png",
    path: "/settings/colors",
    settleMs: 1000,
  },
  {
    file: "24-settings-materials.png",
    path: "/settings/materials",
    settleMs: 1000,
  },
  {
    file: "25-settings-seasons.png",
    path: "/settings/seasons",
    settleMs: 1000,
  },
  {
    file: "26-settings-stages.png",
    path: "/settings/stages",
    settleMs: 1000,
  },
  {
    file: "27-settings-salary-rates.png",
    path: "/settings/salary-rates",
    settleMs: 1000,
  },
  {
    file: "28-settings-company.png",
    path: "/settings/company",
    settleMs: 1200,
  },
  {
    file: "29-settings-telegram.png",
    path: "/settings/telegram",
    settleMs: 1200,
  },
  { file: "30-profile.png", path: "/profile", settleMs: 800 },
];

async function waitReady(page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 8000 });
  } catch {
    // Some pages keep long-polling; ignore.
  }
}

async function shot(page, file, opts = {}) {
  const outPath = path.join(OUT, file);
  await page.screenshot({
    path: outPath,
    fullPage: Boolean(opts.fullPage),
    animations: "disabled",
  });
  console.log("saved", file);
}

async function loginTenant(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.fill("#email", OWNER.email);
  await page.fill("#password", OWNER.password);
  await Promise.all([
    page.waitForURL(/\/dashboard\//, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await waitReady(page);
}

async function loginPlatform(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  // Clear any previous tenant cookies for a clean platform session in this context
  await page.fill("#email", PLATFORM.email);
  await page.fill("#password", PLATFORM.password);
  await Promise.all([
    page.waitForURL(/\/admin(\/|$)/, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await waitReady(page);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  // Public pages first (no auth)
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await shot(page, "01-login.png", { fullPage: true });

  await page.goto(`${BASE}/tv`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.waitForTimeout(1500);
  await shot(page, "31-factory-tv.png");

  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await shot(page, "32-admin-login.png", { fullPage: true });

  // Tenant authenticated tour
  await loginTenant(page);

  for (const item of AUTH_PAGES) {
    if (item.file === "01-login.png") continue;
    await page.goto(`${BASE}${item.path}`, { waitUntil: "domcontentloaded" });
    await waitReady(page);
    if (item.wait) {
      await page.waitForSelector(item.wait, { timeout: 10000 }).catch(() => {});
    }
    if (item.settleMs) await page.waitForTimeout(item.settleMs);
    await shot(page, item.file, { fullPage: item.fullPage });
  }

  // Platform admin (separate context to avoid cookie clash)
  const adminContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const adminPage = await adminContext.newPage();
  adminPage.setDefaultTimeout(25000);
  await loginPlatform(adminPage);
  await adminPage.waitForTimeout(1200);
  await shot(adminPage, "33-admin-home.png");
  await adminPage.goto(`${BASE}/admin/tenants`, {
    waitUntil: "domcontentloaded",
  });
  await waitReady(adminPage);
  await adminPage.waitForTimeout(1200);
  await shot(adminPage, "34-admin-tenants.png");

  await adminContext.close();
  await browser.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    viewport: VIEWPORT,
    files: [
      ...AUTH_PAGES.map((p) => p.file),
      "31-factory-tv.png",
      "32-admin-login.png",
      "33-admin-home.png",
      "34-admin-tenants.png",
    ],
  };
  await writeFile(
    path.join(OUT, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log("done", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
