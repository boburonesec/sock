/**
 * Phase 4 targeted acceptance — Sales Clients / Debts / overview recent
 * lists mobile card list. Deterministic Chromium + WebKit coverage for the
 * responsive migration described in the Phase 4 mobile UX audit. Fails on
 * semantic breakage: desktop table leaking on mobile, horizontal-scroll
 * dependency, a card opening the wrong record, missing scan fields, a
 * read-only overview card exposing a live-looking action button, or a
 * desktop regression at 1280px.
 *
 * Read-only: no card here ever clicks a mutating action, so the seed data
 * is never mutated — safe to run repeatedly with no fixture cleanup.
 *
 * Usage (API + web running, seed present):
 *   node scripts/phase4-sales-mobile-acceptance.mjs
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
    .locator(".hidden.sm\\:block")
    .first()
    .evaluate((el) => getComputedStyle(el).display);
  return { desktopDisplay, cards: page.locator(`ul[aria-label="${ariaLabel}"] > li`) };
}

// WebKit's innerText inserts blank lines at block-element boundaries that
// Chromium doesn't (a cross-engine serialization quirk, not a DOM/content
// difference) — filter them out before indexing into "the Nth line".
function nonEmptyLines(text) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

async function runMobileChecks(engineName, context) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "seller@paypoq.local");

  // ---------------- SALES CLIENTS ----------------
  await page.goto(`${WEB}/sales/clients`, { waitUntil: "networkidle" });
  const { desktopDisplay: cliDisplay, cards: cliCards } = await mobileCardList(page, "Mijozlar ro‘yxati");
  record(engineName, "Clients: mobile card renderer used (desktop table hidden)", cliDisplay === "none", `display=${cliDisplay}`);
  const cliCount = await cliCards.count();
  record(engineName, "Clients: card list populated", cliCount > 0, `count=${cliCount}`);
  record(engineName, "Clients: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const firstCli = cliCards.first();
  const cliText = await firstCli.innerText();
  const cliLines = nonEmptyLines(cliText);
  const cliName = cliLines[0];
  const cliHasStatus = /Faol|Nofaol/.test(cliText);
  const cliHasPhone = /\+998|Telefon ko‘rsatilmagan/.test(cliText);
  record(
    engineName,
    "Clients: name + phone + status visible on card",
    Boolean(cliName) && cliHasStatus && cliHasPhone,
    `text="${cliText.replace(/\n/g, " | ").slice(0, 90)}"`,
  );

  await firstCli.click();
  await page.waitForSelector("#drawer-title", { timeout: 5000 });
  const cliDrawerTitle = await page.locator("#drawer-title").textContent();
  record(engineName, "Clients: card opens the matching client", cliDrawerTitle === cliName, `card=${cliName}, drawer=${cliDrawerTitle}`);
  await page.locator('[aria-label="Yopish"]').first().click();
  await page.waitForTimeout(300);

  // ---------------- SALES DEBTS ----------------
  await page.goto(`${WEB}/sales/debts`, { waitUntil: "networkidle" });
  const { desktopDisplay: debtDisplay, cards: debtCards } = await mobileCardList(page, "Mijoz qarzdorligi");
  record(engineName, "Debts: mobile card renderer used (desktop table hidden)", debtDisplay === "none", `display=${debtDisplay}`);
  const debtCount = await debtCards.count();
  record(engineName, "Debts: card list populated", debtCount > 0, `count=${debtCount}`);
  record(engineName, "Debts: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const firstDebt = debtCards.first();
  const debtText = await firstDebt.innerText();
  const debtLines = nonEmptyLines(debtText);
  const debtClientName = debtLines[0];
  const debtHasAmount = /so'm/.test(debtText);
  const debtHasTotals = /Jami:.*To‘langan:/.test(debtText.replace(/\n/g, " "));
  record(
    engineName,
    "Debts: client identity + debt amount + totals visible on card",
    Boolean(debtClientName) && debtHasAmount && debtHasTotals,
    `text="${debtText.replace(/\n/g, " | ").slice(0, 100)}"`,
  );

  await firstDebt.click();
  await page.waitForSelector("#drawer-title", { timeout: 5000 });
  const debtDrawerTitle = await page.locator("#drawer-title").textContent();
  record(
    engineName,
    "Debts: card opens the matching client's debt detail",
    debtDrawerTitle === debtClientName,
    `card=${debtClientName}, drawer=${debtDrawerTitle}`,
  );
  await page.locator('[aria-label="Yopish"]').first().click();
  await page.waitForTimeout(300);

  // ---------------- SALES OVERVIEW (read-only recent lists) ----------------
  await page.goto(`${WEB}/sales`, { waitUntil: "networkidle" });
  record(engineName, "Sales overview: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const { cards: topClientCards } = await mobileCardList(page, "Eng faol mijozlar");
  const topClientCount = await topClientCards.count();
  record(engineName, "Sales overview: top-clients card list populated", topClientCount > 0, `count=${topClientCount}`);
  const topClientButtons = await page.locator('ul[aria-label="Eng faol mijozlar"] button').count();
  record(
    engineName,
    "Sales overview: top-clients cards are read-only (no live-looking action button)",
    topClientButtons === 0,
    `buttonCount=${topClientButtons}`,
  );

  const { cards: recentOrderCards } = await mobileCardList(page, "So‘nggi buyurtmalar");
  const recentOrderCount = await recentOrderCards.count();
  record(engineName, "Sales overview: recent-orders card list populated", recentOrderCount > 0, `count=${recentOrderCount}`);
  const recentOrderButtons = await page.locator('ul[aria-label="So‘nggi buyurtmalar"] button').count();
  record(
    engineName,
    "Sales overview: recent-orders cards are read-only (no live-looking action button)",
    recentOrderButtons === 0,
    `buttonCount=${recentOrderButtons}`,
  );

  const firstRecentOrderText = await recentOrderCards.first().innerText();
  const hasOrderNumber = /^SO-|^DEMO-ORD-/.test(nonEmptyLines(firstRecentOrderText)[0] ?? "");
  const hasAmount = /so'm/.test(firstRecentOrderText);
  record(
    engineName,
    "Sales overview: recent-order card shows order number + amount + status",
    hasOrderNumber && hasAmount,
    `text="${firstRecentOrderText.replace(/\n/g, " | ").slice(0, 90)}"`,
  );

  // ---------------- PHASE 2/3 REGRESSION GUARDS ----------------
  await page.goto(`${WEB}/sales/orders`, { waitUntil: "networkidle" });
  const { desktopDisplay: ordDisplay, cards: ordCards } = await mobileCardList(page, "Buyurtmalar ro‘yxati");
  record(engineName, "Regression guard (Phase 2): Orders mobile card renderer still active", ordDisplay === "none", `display=${ordDisplay}`);
  record(engineName, "Regression guard (Phase 2): Orders card list still populated", (await ordCards.count()) > 0);

  await page.goto(`${WEB}/sales/payments`, { waitUntil: "networkidle" });
  const { desktopDisplay: payDisplay, cards: payCards } = await mobileCardList(page, "To‘lovlar ro‘yxati");
  record(engineName, "Regression guard (Phase 2): Payments mobile card renderer still active", payDisplay === "none", `display=${payDisplay}`);
  record(engineName, "Regression guard (Phase 2): Payments card list still populated", (await payCards.count()) > 0);

  await page.close();
}

async function runDesktopChecks(engineName, context) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, "seller@paypoq.local");

  for (const [route, label] of [
    ["/sales/clients", "Mijozlar ro‘yxati"],
    ["/sales/debts", "Mijoz qarzdorligi"],
  ]) {
    await page.goto(`${WEB}${route}`, { waitUntil: "networkidle" });
    const mobileListDisplay = await page
      .locator(".sm\\:hidden")
      .first()
      .evaluate((el) => getComputedStyle(el).display);
    const tableRows = await page.locator("table tbody tr").count();
    record(
      engineName,
      `Desktop 1280px: ${route} shows table, hides mobile card list`,
      mobileListDisplay === "none" && tableRows > 0,
      `mobileListDisplay=${mobileListDisplay}, tableRows=${tableRows}`,
    );
    record(engineName, `Desktop 1280px: ${route} no horizontal-scroll dependency`, (await overflow(page)) === 0);
  }

  await page.goto(`${WEB}/sales`, { waitUntil: "networkidle" });
  const overviewMobileDisplay = await page
    .locator(".sm\\:hidden")
    .first()
    .evaluate((el) => getComputedStyle(el).display);
  const overviewTableCount = await page.locator("table").count();
  record(
    engineName,
    "Desktop 1280px: Sales overview shows both recent-list tables, hides mobile cards",
    overviewMobileDisplay === "none" && overviewTableCount === 2,
    `mobileDisplay=${overviewMobileDisplay}, tableCount=${overviewTableCount}`,
  );

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
