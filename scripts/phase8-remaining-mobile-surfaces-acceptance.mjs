/**
 * Phase 8 targeted acceptance — the final remaining mobile-hostile
 * surfaces migrated in this phase: Executive Dashboard (top products, top
 * clients, recent activity), Operations Dashboard (today's top workers),
 * and Settings > Products (product list + nested variant list). Fails on
 * semantic breakage: desktop table leaking on mobile, horizontal-scroll
 * dependency, missing key business fields, a card opening/showing the
 * wrong record, or a desktop regression at 1280px.
 *
 * Fully read-only: every screen covered here is either a read-only
 * summary (Dashboard) or is only navigated into, never mutated (Settings
 * Products — this suite opens the product/variant drawers but never
 * submits an edit, create, or archive action). Safe to run repeatedly
 * with no fixture cleanup.
 *
 * Usage (API + web running, seed present):
 *   node scripts/phase8-remaining-mobile-surfaces-acceptance.mjs
 */
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";

const results = [];
function record(engine, name, passed, detail) {
  results.push({ engine, name, passed, detail });
  console.log(`[${passed ? "PASS" : "FAIL"}] [${engine}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function login(page, email) {
  await page.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 12 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', "ChangeMe123!", { delay: 12 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("login"), { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function mobileCardList(page, ariaLabel) {
  const desktopDisplay = await page
    .locator(`table[aria-label="${ariaLabel}"]`)
    .evaluate((el) => getComputedStyle(el.closest(".hidden.sm\\:block")).display);
  return { desktopDisplay, cards: page.locator(`ul[aria-label="${ariaLabel}"] > li`) };
}

function nonEmptyLines(text) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

async function runMobileChecks(engineName, context) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "owner@paypoq.local");

  // ---------------- EXECUTIVE DASHBOARD ----------------
  await page.goto(`${WEB}/dashboard/executive`, { waitUntil: "networkidle" });
  record(engineName, "Executive dashboard: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const { desktopDisplay: topProdDisplay, cards: topProdCards } = await mobileCardList(page, "Top mahsulotlar");
  record(engineName, "Top products: mobile card renderer active (desktop table hidden)", topProdDisplay === "none", `display=${topProdDisplay}`);
  const topProdCount = await topProdCards.count();
  record(engineName, "Top products: card list populated", topProdCount > 0, `count=${topProdCount}`);
  const topProdText = await topProdCards.first().innerText();
  record(
    engineName,
    "Top products: model name + sold value + variant identity visible",
    Boolean(nonEmptyLines(topProdText)[0]) && /so'm/.test(topProdText) && topProdText.includes("·"),
    `text="${topProdText.replace(/\n/g, " | ").slice(0, 100)}"`,
  );

  const { desktopDisplay: topCliDisplay, cards: topCliCards } = await mobileCardList(page, "Eng faol mijozlar");
  record(engineName, "Top clients: mobile card renderer active (desktop table hidden)", topCliDisplay === "none", `display=${topCliDisplay}`);
  const topCliText = await topCliCards.first().innerText();
  record(
    engineName,
    "Top clients: client name + debt-health status + debt amount visible",
    /Yaxshi|Qarzdor|E’tibor kerak/.test(topCliText) && /so'm/.test(topCliText),
    `text="${topCliText.replace(/\n/g, " | ").slice(0, 100)}"`,
  );

  const { desktopDisplay: recentDisplay, cards: recentCards } = await mobileCardList(page, "So‘nggi faollik");
  record(engineName, "Recent activity: mobile card renderer active (desktop table hidden)", recentDisplay === "none", `display=${recentDisplay}`);
  const recentText = await recentCards.first().innerText();
  record(
    engineName,
    "Recent activity: title + type + timestamp visible, no raw id",
    Boolean(nonEmptyLines(recentText)[0]) &&
      /Buyurtma|Xarajat/.test(recentText) &&
      /\d{2}\.\d{2}\.\d{4}/.test(recentText) &&
      !/\bc[a-z0-9]{20,}\b/.test(recentText),
    `text="${recentText.replace(/\n/g, " | ").slice(0, 100)}"`,
  );

  // ---------------- OPERATIONS DASHBOARD ----------------
  await page.goto(`${WEB}/dashboard/operations`, { waitUntil: "networkidle" });
  record(engineName, "Operations dashboard: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const { desktopDisplay: workerDisplay, cards: workerCards } = await mobileCardList(page, "Bugungi eng faol ishchilar");
  record(engineName, "Top workers: mobile card renderer active (desktop table hidden)", workerDisplay === "none", `display=${workerDisplay}`);
  const workerCount = await workerCards.count();
  record(engineName, "Top workers: card list populated", workerCount > 0, `count=${workerCount}`);
  const workerText = await workerCards.first().innerText();
  record(
    engineName,
    "Top workers: employee name + calculated amount + stage/quantity visible",
    Boolean(nonEmptyLines(workerText)[0]) && /so'm/.test(workerText) && /dona/.test(workerText),
    `text="${workerText.replace(/\n/g, " | ").slice(0, 100)}"`,
  );

  // ---------------- SETTINGS > PRODUCTS ----------------
  await page.goto(`${WEB}/settings/products`, { waitUntil: "networkidle" });
  record(engineName, "Settings Products: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const { desktopDisplay: prodDisplay, cards: prodCards } = await mobileCardList(page, "Mahsulotlar jadvali");
  record(engineName, "Products: mobile card renderer active (desktop table hidden)", prodDisplay === "none", `display=${prodDisplay}`);
  const prodCount = await prodCards.count();
  record(engineName, "Products: card list populated", prodCount > 0, `count=${prodCount}`);

  const firstProdCard = prodCards.first();
  const firstProdText = await firstProdCard.innerText();
  const expectedProductName = nonEmptyLines(firstProdText)[0];
  record(
    engineName,
    "Product card: name + variant count visible, no raw id",
    Boolean(expectedProductName) && /variant/.test(firstProdText) && !/\bc[a-z0-9]{20,}\b/.test(firstProdText),
    `text="${firstProdText.replace(/\n/g, " | ").slice(0, 90)}"`,
  );

  // Correct-record interaction: "Ochish" must open the detail drawer for
  // *this* product, not just "a" drawer.
  const openBtn = firstProdCard.getByRole("button", { name: "Ochish" });
  await openBtn.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const dialog = page.locator('[role="dialog"]');
  const dialogTitle = await dialog.locator("h2, #drawer-title").first().textContent();
  record(
    engineName,
    "Product card: 'Ochish' opens the detail drawer for the correct product",
    (dialogTitle ?? "").trim() === expectedProductName,
    `card="${expectedProductName}", drawer="${dialogTitle}"`,
  );

  // Nested variant list, inside the drawer, at the same 390px viewport.
  const variantList = dialog.locator('ul[aria-label="Variantlar"] > li');
  const variantCount = await variantList.count();
  if (variantCount > 0) {
    const variantText = await variantList.first().innerText();
    record(
      engineName,
      "Variant card: color/material/season identity + action buttons visible",
      variantText.includes("·") && /Narxlar/.test(variantText) && /Arxivlash/.test(variantText),
      `text="${variantText.replace(/\n/g, " | ").slice(0, 100)}"`,
    );
    record(engineName, "Variant card: no phantom actions (buttons match desktop's 4 actions)", (await variantList.first().locator("button").count()) === 4);
  } else {
    record(engineName, "Variant card: at least one variant exists to verify", false, "no variants found for the first product");
  }

  await page.close();
}

async function runDesktopChecks(engineName, context) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, "owner@paypoq.local");

  await page.goto(`${WEB}/dashboard/executive`, { waitUntil: "networkidle" });
  const execMobileHidden = await page.locator(".sm\\:hidden").evaluateAll((els) => els.every((el) => getComputedStyle(el).display === "none"));
  const execTableCount = await page.locator("table").count();
  record(
    engineName,
    "Desktop 1280px: Executive dashboard shows all 3 tables, hides mobile cards",
    execMobileHidden && execTableCount === 3,
    `mobileHidden=${execMobileHidden}, tableCount=${execTableCount}`,
  );
  record(engineName, "Desktop 1280px: Executive dashboard no horizontal-scroll dependency", (await overflow(page)) === 0);

  await page.goto(`${WEB}/dashboard/operations`, { waitUntil: "networkidle" });
  const opsTableRows = await page.locator("table tbody tr").count();
  record(engineName, "Desktop 1280px: Operations top-workers table intact", opsTableRows > 0, `rows=${opsTableRows}`);

  await page.goto(`${WEB}/settings/products`, { waitUntil: "networkidle" });
  const prodTableRows = await page.locator("table tbody tr").count();
  const prodMobileHidden = await page.locator(".sm\\:hidden").first().evaluate((el) => getComputedStyle(el).display === "none");
  record(
    engineName,
    "Desktop 1280px: Settings Products table intact, mobile card list hidden",
    prodTableRows > 0 && prodMobileHidden,
    `rows=${prodTableRows}, mobileHidden=${prodMobileHidden}`,
  );
  record(engineName, "Desktop 1280px: Settings Products no horizontal-scroll dependency", (await overflow(page)) === 0);

  await page.close();
}

async function runForEngine(engineName, launcher) {
  const browser = await launcher.launch();

  try {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      await runMobileChecks(engineName, mobileContext);
    } finally {
      await mobileContext.close();
    }

    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      await runDesktopChecks(engineName, desktopContext);
    } finally {
      await desktopContext.close();
    }
  } finally {
    await browser.close();
  }
}

await runForEngine("Chromium", chromium);
await runForEngine("WebKit", webkit);

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.error(`\n${failed.length} FAILED:`);
  for (const f of failed) console.error(`  [${f.engine}] ${f.name}`);
}
process.exit(failed.length > 0 ? 1 : 0);
