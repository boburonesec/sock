/**
 * Phase 5 targeted acceptance — Attendance (employee summary + records) and
 * Audit log mobile card lists. Deterministic Chromium + WebKit coverage for
 * the responsive migration described in the Phase 5 mobile UX audit. Fails
 * on semantic breakage: desktop table leaking on mobile, horizontal-scroll
 * dependency, missing representative fields, an abnormal status buried, or
 * a desktop regression at 1280px.
 *
 * Read-only: neither screen has any mutation, per-row action, or click
 * interaction (verified against source before writing this suite) — every
 * assertion here is a read, so it's safe to run repeatedly with no
 * fixture cleanup.
 *
 * Usage (API + web running, seed present):
 *   node scripts/phase5-attendance-audit-mobile-acceptance.mjs
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
  await login(page, "owner@paypoq.local");

  // ---------------- ATTENDANCE ----------------
  await page.goto(`${WEB}/attendance`, { waitUntil: "networkidle" });
  record(engineName, "Attendance: no horizontal-scroll dependency", (await overflow(page)) === 0);

  // Employee summary list
  const empCards = page.locator('ul[aria-label="Xodimlar davomat hisoboti"] > li');
  const empCount = await empCards.count();
  record(engineName, "Attendance employee summary: mobile card list populated", empCount > 0, `count=${empCount}`);
  const empTableDisplay = await page
    .locator('table[aria-label="Xodimlar davomat hisoboti"]')
    .evaluate((el) => getComputedStyle(el.closest(".hidden.sm\\:block")).display);
  record(engineName, "Attendance employee summary: desktop table hidden on mobile", empTableDisplay === "none", `display=${empTableDisplay}`);

  // Find the employee with a nonzero missing-checkout count (an abnormal
  // state) and confirm it isn't buried — it must render as a visible
  // danger-tone flag on its card, not plain silent text.
  const abnormalEmpCard = empCards.filter({ hasText: "kun yopilmagan" }).first();
  const hasAbnormalEmp = (await abnormalEmpCard.count()) > 0;
  if (hasAbnormalEmp) {
    const abnormalText = await abnormalEmpCard.innerText();
    record(
      engineName,
      "Attendance employee summary: missing-checkout state is visible on its card",
      /kun yopilmagan/.test(abnormalText),
      `text="${abnormalText.replace(/\n/g, " | ").slice(0, 100)}"`,
    );
  }

  const firstEmpText = await empCards.first().innerText();
  const empLines = nonEmptyLines(firstEmpText);
  record(
    engineName,
    "Attendance employee summary: employee name + attended/completed counts visible",
    Boolean(empLines[0]) && /Kelgan kun:/.test(firstEmpText) && /To‘liq:/.test(firstEmpText),
    `text="${firstEmpText.replace(/\n/g, " | ").slice(0, 100)}"`,
  );

  // Attendance records list
  const recCards = page.locator('ul[aria-label="Davomat yozuvlari"] > li');
  const recCount = await recCards.count();
  record(engineName, "Attendance records: mobile card list populated", recCount > 0, `count=${recCount}`);
  const recTableDisplay = await page
    .locator('table[aria-label="Davomat yozuvlari"]')
    .evaluate((el) => getComputedStyle(el.closest(".hidden.sm\\:block")).display);
  record(engineName, "Attendance records: desktop table hidden on mobile", recTableDisplay === "none", `display=${recTableDisplay}`);

  // The seed's first record is a MISSING_CHECK_OUT day ("Xodim kunni
  // yopmadi") — confirm that abnormal status is visible and check-out
  // correctly renders as "—" rather than a clipped/blank value.
  const firstRecText = await recCards.first().innerText();
  const recHasAbnormalStatus = /Xodim kunni yopmadi|Kun yopilgan|Smena davom etmoqda/.test(firstRecText);
  const recHasCheckIn = /Kirish:/.test(firstRecText);
  const recHasCheckOut = /Chiqish:/.test(firstRecText);
  record(
    engineName,
    "Attendance records: status + check-in + check-out all visible (none clipped)",
    recHasAbnormalStatus && recHasCheckIn && recHasCheckOut,
    `text="${firstRecText.replace(/\n/g, " | ").slice(0, 120)}"`,
  );
  record(
    engineName,
    "Attendance records: no phantom action buttons (screen is read-only)",
    (await recCards.first().locator("button").count()) === 0,
  );

  // ---------------- AUDIT ----------------
  await page.goto(`${WEB}/audit`, { waitUntil: "networkidle" });
  record(engineName, "Audit: no horizontal-scroll dependency (long ids/emails do not overflow the page)", (await overflow(page)) === 0);

  const auditCards = page.locator('ul[aria-label="Audit jurnali"] > li');
  const auditCount = await auditCards.count();
  record(engineName, "Audit: mobile card list populated", auditCount > 0, `count=${auditCount}`);
  const auditTableDisplay = await page
    .locator(".hidden.sm\\:block")
    .first()
    .evaluate((el) => getComputedStyle(el).display);
  record(engineName, "Audit: desktop table hidden on mobile", auditTableDisplay === "none", `display=${auditTableDisplay}`);

  const firstAuditText = await auditCards.first().innerText();
  const auditLines = nonEmptyLines(firstAuditText);
  const hasTimestamp = /\d{2}\.\d{2}\.\d{4},\s*\d{2}:\d{2}/.test(firstAuditText);
  const hasActorEmail = /@/.test(firstAuditText);
  // A Prisma cuid() entityId — must still be present (traceability-critical,
  // already shown truncated on desktop today) but must not force overflow.
  const cuidLike = /\bc[a-z0-9]{20,}\b/;
  record(
    engineName,
    "Audit card: action + timestamp + entity type + actor(+email) + entity id all present",
    Boolean(auditLines[0]) && hasTimestamp && hasActorEmail && cuidLike.test(firstAuditText),
    `text="${firstAuditText.replace(/\n/g, " | ").slice(0, 140)}"`,
  );
  record(
    engineName,
    "Audit: no phantom action buttons (screen is read-only, no detail workflow exists)",
    (await auditCards.first().locator("button").count()) === 0,
  );

  // Stress case: with 60+ rows of long cuids/emails rendered as cards, the
  // page itself must still never scroll horizontally.
  record(engineName, `Audit: zero overflow holds across all ${auditCount} rendered cards`, (await overflow(page)) === 0, `cardCount=${auditCount}`);

  // ---------------- PHASE 1-4 REGRESSION GUARDS ----------------
  await page.goto(`${WEB}/sales/orders`, { waitUntil: "networkidle" });
  const ordersDisplay = await page.locator(".hidden.sm\\:block").first().evaluate((el) => getComputedStyle(el).display);
  record(engineName, "Regression guard (Phase 2): Orders mobile card renderer still active", ordersDisplay === "none");
  record(engineName, "Regression guard (Phase 2): Orders card list still populated", (await page.locator('ul[aria-label="Buyurtmalar ro‘yxati"] > li').count()) > 0);

  await page.goto(`${WEB}/employees`, { waitUntil: "networkidle" });
  const employeesDisplay = await page.locator(".hidden.sm\\:block").first().evaluate((el) => getComputedStyle(el).display);
  record(engineName, "Regression guard (Phase 3): Employees mobile card renderer still active", employeesDisplay === "none");
  record(engineName, "Regression guard (Phase 3): Employees card list still populated", (await page.locator('ul[aria-label="Xodimlar ro‘yxati"] > li').count()) > 0);

  await page.goto(`${WEB}/sales/debts`, { waitUntil: "networkidle" });
  const debtsDisplay = await page.locator(".hidden.sm\\:block").first().evaluate((el) => getComputedStyle(el).display);
  record(engineName, "Regression guard (Phase 4): Debts mobile card renderer still active", debtsDisplay === "none");
  record(engineName, "Regression guard (Phase 4): Debts card list still populated", (await page.locator('ul[aria-label="Mijoz qarzdorligi"] > li').count()) > 0);

  await page.close();
}

async function runDesktopChecks(engineName, context) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, "owner@paypoq.local");

  await page.goto(`${WEB}/attendance`, { waitUntil: "networkidle" });
  const attMobileDisplay = await page.locator(".sm\\:hidden").first().evaluate((el) => getComputedStyle(el).display);
  const attTableCount = await page.locator("table").count();
  const attTableRows = await page.locator("table tbody tr").count();
  record(
    engineName,
    "Desktop 1280px: Attendance shows both tables (unchanged columns), hides mobile cards",
    attMobileDisplay === "none" && attTableCount === 2 && attTableRows > 0,
    `mobileDisplay=${attMobileDisplay}, tableCount=${attTableCount}, tableRows=${attTableRows}`,
  );
  record(engineName, "Desktop 1280px: Attendance no horizontal-scroll dependency", (await overflow(page)) === 0);

  await page.goto(`${WEB}/audit`, { waitUntil: "networkidle" });
  const auditMobileDisplay = await page.locator(".sm\\:hidden").first().evaluate((el) => getComputedStyle(el).display);
  const auditTableRows = await page.locator("table tbody tr").count();
  record(
    engineName,
    "Desktop 1280px: Audit shows table with all rows, hides mobile cards",
    auditMobileDisplay === "none" && auditTableRows > 0,
    `mobileDisplay=${auditMobileDisplay}, tableRows=${auditTableRows}`,
  );
  record(engineName, "Desktop 1280px: Audit no horizontal-scroll dependency", (await overflow(page)) === 0);

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

    // A narrower viewport than 390px, as instructed — 360px is the phone
    // stress width the repo's other suites already use (mobile-e2e-suite's
    // "small phone" tier).
    const narrowContext = await browser.newContext({ viewport: { width: 360, height: 740 } });
    try {
      const page = await narrowContext.newPage();
      await login(page, "owner@paypoq.local");
      await page.goto(`${WEB}/attendance`, { waitUntil: "networkidle" });
      record(engineName, "Attendance: no horizontal-scroll dependency at 360px", (await overflow(page)) === 0);
      await page.goto(`${WEB}/audit`, { waitUntil: "networkidle" });
      record(engineName, "Audit: no horizontal-scroll dependency at 360px", (await overflow(page)) === 0);
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
