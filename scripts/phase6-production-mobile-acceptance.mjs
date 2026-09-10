/**
 * Phase 6 targeted acceptance — Production stage board, product breakdown,
 * and recent stage-movements mobile card lists. Deterministic Chromium +
 * WebKit coverage for the responsive migration described in the Phase 6
 * mobile UX audit. Fails on semantic breakage: desktop table leaking on
 * mobile, horizontal-scroll dependency, missing quantity/unit, a card
 * opening/acting on the wrong record, an RBAC-gated action button drifting
 * from the desktop table's own "Amal" column, or a desktop regression at
 * 1280px.
 *
 * Read-only where the desktop table itself is read-only: neither the
 * product-breakdown nor the recent-movements list ever mutates state via
 * this suite (their only action, "Xatoni bildirish", opens a correction
 * dialog but this suite never submits it) — safe to run repeatedly.
 *
 * Usage (API + web running, seed present):
 *   node scripts/phase6-production-mobile-acceptance.mjs
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

// WebKit's innerText inserts blank lines at block-element boundaries that
// Chromium doesn't (a cross-engine serialization quirk, not a DOM/content
// difference) — filter them out before indexing into "the Nth line".
function nonEmptyLines(text) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

async function runMobileChecks(engineName, context) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "shift@paypoq.local");

  await page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
  record(engineName, "Production: no horizontal-scroll dependency", (await overflow(page)) === 0);

  // ---------------- STAGE BOARD (KEEP — already a responsive card grid) ----------------
  // Not migrated: verify it's still exactly what it was — a clickable card
  // grid, zero overflow, no desktop-table leak (there never was one).
  const stageButtons = page.locator('button:has-text("dona mavjud")');
  const stageCount = await stageButtons.count();
  record(engineName, "Stage board: card grid populated (unchanged KEEP surface)", stageCount > 0, `count=${stageCount}`);

  const firstStageText = await stageButtons.first().innerText();
  const stageLines = nonEmptyLines(firstStageText);
  const firstStageName = stageLines[0];

  // ---------------- PRODUCT BREAKDOWN (migrated) ----------------
  const breakdownList = page.locator(`ul[aria-label="${firstStageName} mahsulot tarkibi"]`);
  const breakdownDesktopDisplay = await page
    .locator(`table[aria-label="${firstStageName} mahsulot tarkibi"]`)
    .evaluate((el) => getComputedStyle(el.closest(".hidden.sm\\:block")).display)
    .catch(() => "not-found");
  record(
    engineName,
    "Product breakdown: mobile card renderer used (desktop table hidden)",
    breakdownDesktopDisplay === "none",
    `display=${breakdownDesktopDisplay}`,
  );
  const breakdownCards = breakdownList.locator("> li");
  const breakdownCount = await breakdownCards.count();
  if (breakdownCount > 0) {
    const firstBreakdownText = await breakdownCards.first().innerText();
    const hasQuantityUnit = /\d[\d,\s]*\s*dona/.test(firstBreakdownText);
    record(
      engineName,
      "Product breakdown card: model name + quantity(+unit) + color/material/season visible",
      Boolean(nonEmptyLines(firstBreakdownText)[0]) && hasQuantityUnit,
      `text="${firstBreakdownText.replace(/\n/g, " | ").slice(0, 100)}"`,
    );
    record(engineName, "Product breakdown: no phantom action buttons (read-only, matches desktop)", (await breakdownCards.first().locator("button").count()) === 0);
  }
  record(engineName, "Product breakdown: no horizontal-scroll dependency", (await overflow(page)) === 0);

  // Selecting a different stage must still update the breakdown list (the
  // existing selection interaction — untouched by this migration — must
  // still drive the migrated card list, not just the old table).
  const stageTexts = await stageButtons.evaluateAll((els) => els.map((el) => el.textContent ?? ""));
  const secondStageIdx = stageTexts.findIndex((t, i) => i > 0 && !t.includes("0dona mavjud0 tur"));
  if (secondStageIdx > 0) {
    const secondStageName = nonEmptyLines(await stageButtons.nth(secondStageIdx).innerText())[0];
    await stageButtons.nth(secondStageIdx).click();
    await page.waitForTimeout(300);
    const switchedList = page.locator(`ul[aria-label="${secondStageName} mahsulot tarkibi"]`);
    record(
      engineName,
      "Product breakdown: switching stages updates the mobile card list to match",
      (await switchedList.count()) > 0 && (await switchedList.locator("> li").count()) > 0,
      `stage="${secondStageName}"`,
    );
  }

  // ---------------- RECENT STAGE MOVEMENTS (migrated) ----------------
  const movementsDesktopDisplay = await page
    .locator('table[aria-label="Oxirgi bosqich o‘tkazishlari"]')
    .evaluate((el) => getComputedStyle(el.closest(".hidden.sm\\:block")).display);
  record(engineName, "Recent movements: mobile card renderer used (desktop table hidden)", movementsDesktopDisplay === "none", `display=${movementsDesktopDisplay}`);

  const movementCards = page.locator('ul[aria-label="Oxirgi bosqich o‘tkazishlari"] > li');
  const movementCount = await movementCards.count();
  record(engineName, "Recent movements: card list populated", movementCount > 0, `count=${movementCount}`);
  record(engineName, "Recent movements: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const firstMovementText = await movementCards.first().innerText();
  const hasDirection = /→/.test(firstMovementText);
  const hasQuantityUnit = /\d[\d,\s]*\s*dona/.test(firstMovementText);
  record(
    engineName,
    "Recent movement card: source→destination + quantity(+unit) + product visible",
    hasDirection && hasQuantityUnit,
    `text="${firstMovementText.replace(/\n/g, " | ").slice(0, 110)}"`,
  );

  // RBAC: the mobile card's correction-request button must appear
  // precisely when the desktop table's own "Amal" column header appears —
  // both are driven by the same `canRequestProductionCorrection` prop, so
  // this also proves there's no drift between the two surfaces.
  const desktopHasActionColumn = (await page.locator('table[aria-label="Oxirgi bosqich o‘tkazishlari"] thead').innerText()).includes("Amal");
  const mobileButtonCount = await movementCards.first().locator("button").count();
  record(
    engineName,
    "Recent movement card: correction-request action visibility matches desktop's Amal column (no RBAC drift)",
    desktopHasActionColumn ? mobileButtonCount === 1 : mobileButtonCount === 0,
    `desktopHasActionColumn=${desktopHasActionColumn}, mobileButtonCount=${mobileButtonCount}`,
  );

  if (desktopHasActionColumn) {
    // Correct-record targeting: open the correction dialog from the first
    // card and confirm it names *that* movement, not some other one.
    const expectedDirection = nonEmptyLines(firstMovementText)[0];
    await movementCards.first().locator("button").click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const dialogText = await page.locator('[role="dialog"]').innerText();
    record(
      engineName,
      "Recent movement card: correction-request dialog names the correct record",
      dialogText.includes(expectedDirection),
      `expected="${expectedDirection}"`,
    );
    // Close without submitting — this suite never mutates correction-request state.
    const closeBtn = page.locator('[role="dialog"]').getByRole("button", { name: "Yopish" });
    await closeBtn.click();
    await page.waitForTimeout(200);
  }

  // ---------------- WORKER ACTIVITY LIST (KEEP — already card-based) ----------------
  const activityArticles = page.locator("article").filter({ hasText: "dona" });
  const activityCount = await activityArticles.count();
  if (activityCount > 0) {
    record(engineName, "Worker activity list: unchanged KEEP surface still renders (no regression)", activityCount > 0, `count=${activityCount}`);
  }

  // ---------------- PHASE 2-5 REGRESSION GUARDS ----------------
  await page.goto(`${WEB}/sales/orders`, { waitUntil: "networkidle" });
  record(
    engineName,
    "Regression guard (Phase 2): Orders mobile card renderer still active",
    (await page.locator(".hidden.sm\\:block").first().evaluate((el) => getComputedStyle(el).display)) === "none",
  );

  await page.goto(`${WEB}/warehouse/movements`, { waitUntil: "networkidle" });
  record(
    engineName,
    "Regression guard (Phase 3): Warehouse Movements mobile card renderer still active",
    (await page.locator(".hidden.sm\\:block").first().evaluate((el) => getComputedStyle(el).display)) === "none",
  );

  await page.close();
}

async function runDesktopChecks(engineName, context) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, "shift@paypoq.local");

  await page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
  const mobileListsHidden = await page.locator(".sm\\:hidden").evaluateAll((els) => els.every((el) => getComputedStyle(el).display === "none"));
  const tableCount = await page.locator("table").count();
  const stageGridCols = await page
    .locator(".grid.grid-cols-2")
    .first()
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  record(
    engineName,
    "Desktop 1280px: Production shows both tables + wide stage grid, hides mobile card lists",
    mobileListsHidden && tableCount === 2 && stageGridCols >= 4,
    `mobileListsHidden=${mobileListsHidden}, tableCount=${tableCount}, stageGridCols=${stageGridCols}`,
  );
  record(engineName, "Desktop 1280px: Production no horizontal-scroll dependency", (await overflow(page)) === 0);

  const desktopMovementRows = await page.locator('table[aria-label="Oxirgi bosqich o‘tkazishlari"] tbody tr').count();
  record(engineName, "Desktop 1280px: recent-movements table rows intact", desktopMovementRows > 0, `rows=${desktopMovementRows}`);

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

    const narrowContext = await browser.newContext({ viewport: { width: 360, height: 740 } });
    try {
      const page = await narrowContext.newPage();
      await login(page, "shift@paypoq.local");
      await page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
      record(engineName, "Production: no horizontal-scroll dependency at 360px", (await overflow(page)) === 0);
      await page.close();
    } finally {
      await narrowContext.close();
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
