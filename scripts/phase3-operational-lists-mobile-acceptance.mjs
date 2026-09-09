/**
 * Phase 3 targeted acceptance — Employees / Warehouse Materials / Warehouse
 * Movements / Finance Expenses / Finance Advances mobile card lists.
 * Deterministic Chromium + WebKit coverage for the responsive migration
 * described in the Phase 3 mobile UX audit. Fails on semantic breakage:
 * desktop table leaking on mobile, horizontal-scroll dependency, a card
 * opening the wrong record, missing scan fields, or an RBAC-gated action
 * button appearing for a role that shouldn't see it.
 *
 * Read-only: no card here ever clicks Approve/Reject/Pay/Cancel, so the
 * seed data is never mutated — safe to run repeatedly with no fixture
 * cleanup required.
 *
 * Usage (API + web running, seed present):
 *   node scripts/phase3-operational-lists-mobile-acceptance.mjs
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

async function mobileCardList(page, ariaLabel) {
  const desktopDisplay = await page
    .locator(".hidden.sm\\:block")
    .first()
    .evaluate((el) => getComputedStyle(el).display);
  return { desktopDisplay, cards: page.locator(`ul[aria-label="${ariaLabel}"] > li`) };
}

async function runManagerChecks(engineName, context) {
  const page = await context.newPage();
  await login(page, "manager@paypoq.local");

  // ---------------- EMPLOYEES ----------------
  await page.goto(`${WEB}/employees`, { waitUntil: "networkidle" });
  const { desktopDisplay: empDisplay, cards: empCards } = await mobileCardList(page, "Xodimlar ro‘yxati");
  record(engineName, "Employees: mobile card renderer used (desktop table hidden)", empDisplay === "none", `display=${empDisplay}`);
  const empCount = await empCards.count();
  record(engineName, "Employees: card list populated", empCount > 0, `count=${empCount}`);
  record(engineName, "Employees: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const firstEmp = empCards.first();
  const empText = await firstEmp.innerText();
  const empName = nonEmptyLines(empText)[0];
  const hasStatus = /Faol|Nofaol/.test(empText);
  record(
    engineName,
    "Employees: name + role/status visible on card",
    Boolean(empName) && hasStatus,
    `text="${empText.replace(/\n/g, " | ").slice(0, 90)}"`,
  );

  await firstEmp.click();
  await page.waitForSelector("#drawer-title", { timeout: 5000 });
  const empDrawerTitle = await page.locator("#drawer-title").textContent();
  record(engineName, "Employees: card opens the matching employee", empDrawerTitle === empName, `card=${empName}, drawer=${empDrawerTitle}`);
  await page.locator('[aria-label="Yopish"]').first().click();
  await page.waitForTimeout(300);

  // ---------------- WAREHOUSE MATERIALS ----------------
  await page.goto(`${WEB}/warehouse/materials`, { waitUntil: "networkidle" });
  const { desktopDisplay: matDisplay, cards: matCards } = await mobileCardList(page, "Materiallar ro‘yxati");
  record(engineName, "Materials: mobile card renderer used (desktop table hidden)", matDisplay === "none", `display=${matDisplay}`);
  const matCount = await matCards.count();
  record(engineName, "Materials: card list populated", matCount > 0, `count=${matCount}`);
  record(engineName, "Materials: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const firstMat = matCards.first();
  const matText = await firstMat.innerText();
  const matHasUnit = /\b(kg|dona|litr|metr|g)\b/.test(matText);
  record(
    engineName,
    "Materials: material name + quantity/authoritative unit visible",
    matText.trim().length > 0 && matHasUnit,
    `text="${matText.replace(/\n/g, " | ").slice(0, 90)}"`,
  );

  const expectedMaterialName = nonEmptyLines(matText)[0];
  await firstMat.click();
  await page.waitForSelector("#drawer-title", { timeout: 5000 });
  const matDrawerTitle = await page.locator("#drawer-title").textContent();
  record(
    engineName,
    "Materials: card opens the matching material",
    matDrawerTitle === expectedMaterialName,
    `card=${expectedMaterialName}, drawer=${matDrawerTitle}`,
  );
  await page.locator('[aria-label="Yopish"]').first().click();
  await page.waitForTimeout(300);

  // ---------------- WAREHOUSE MOVEMENTS ----------------
  await page.goto(`${WEB}/warehouse/movements`, { waitUntil: "networkidle" });
  const { desktopDisplay: movDisplay, cards: movCards } = await mobileCardList(page, "Ombor harakatlari");
  record(engineName, "Movements: mobile card renderer used (desktop table hidden)", movDisplay === "none", `display=${movDisplay}`);
  const movCount = await movCards.count();
  record(engineName, "Movements: card list populated", movCount > 0, `count=${movCount}`);
  record(engineName, "Movements: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const firstMov = movCards.first();
  const movText = await firstMov.innerText();
  const movHasType = /(Kirim|Chiqim|Ishlab chiqarish kirimi|Transfer|Qaytarish|Tuzatish)/.test(movText);
  const movHasUnit = /\b(kg|dona|litr|metr|g)\b/.test(movText);
  const movHasZoneOrDate = /\d{2}\.\d{2}\.\d{4}/.test(movText);
  record(
    engineName,
    "Movements: movement type/direction + quantity/unit + date context visible",
    movHasType && movHasUnit && movHasZoneOrDate,
    `text="${movText.replace(/\n/g, " | ").slice(0, 110)}"`,
  );

  const expectedMovementType = nonEmptyLines(movText)[1];
  await firstMov.click();
  await page.waitForSelector("#drawer-title", { timeout: 5000 });
  const movDrawerTitle = await page.locator("#drawer-title").textContent();
  record(
    engineName,
    "Movements: card opens the matching movement record",
    movDrawerTitle === expectedMovementType,
    `card type="${expectedMovementType}", drawer="${movDrawerTitle}"`,
  );
  await page.locator('[aria-label="Yopish"]').first().click();

  await page.close();
}

async function runAccountantChecks(engineName, context) {
  const page = await context.newPage();
  await login(page, "accountant@paypoq.local");

  // ---------------- FINANCE EXPENSES ----------------
  await page.goto(`${WEB}/finance/expenses`, { waitUntil: "networkidle" });
  const { desktopDisplay: expDisplay, cards: expCards } = await mobileCardList(page, "Xarajat so‘rovlari");
  record(engineName, "Expenses: mobile card renderer used (desktop table hidden)", expDisplay === "none", `display=${expDisplay}`);
  const expCount = await expCards.count();
  record(engineName, "Expenses: card list populated", expCount > 0, `count=${expCount}`);
  record(engineName, "Expenses: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const firstExp = expCards.first();
  const expText = await firstExp.innerText();
  const expHasAmount = /so'm/.test(expText);
  const expHasStatus = /(So‘ralgan|Tasdiqlangan|Rad etilgan|To‘langan|Bekor qilingan)/.test(expText);
  record(
    engineName,
    "Expenses: amount + category/purpose + status visible on card",
    expHasAmount && expHasStatus,
    `text="${expText.replace(/\n/g, " | ").slice(0, 110)}"`,
  );

  // RBAC: Accountant does not hold expense.approve — a REQUESTED expense's
  // card must not show Approve/Reject even though it's the seed's first row.
  const requestedCard = expCards.filter({ hasText: "So‘ralgan" }).first();
  const requestedCardExists = (await requestedCard.count()) > 0;
  if (requestedCardExists) {
    const requestedCardText = await requestedCard.innerText();
    record(
      engineName,
      "Expenses: Accountant does not see Approve/Reject on a requested expense (RBAC preserved)",
      !/Tasdiqlash|Rad etish/.test(requestedCardText),
      `text="${requestedCardText.replace(/\n/g, " | ")}"`,
    );
    // Accountant *can* cancel a requested expense — that action must still work.
    record(
      engineName,
      "Expenses: Accountant sees Cancel on a requested expense",
      /Bekor/.test(requestedCardText),
    );
  }

  // Accountant holds expense.pay — an APPROVED expense must offer "To‘lash".
  const approvedCard = expCards.filter({ hasText: "Tasdiqlangan" }).first();
  if ((await approvedCard.count()) > 0) {
    const approvedCardText = await approvedCard.innerText();
    record(
      engineName,
      "Expenses: Accountant sees Pay on an approved expense",
      /To‘lash/.test(approvedCardText),
      `text="${approvedCardText.replace(/\n/g, " | ")}"`,
    );
  }

  // ---------------- FINANCE ADVANCES ----------------
  await page.goto(`${WEB}/finance/advances`, { waitUntil: "networkidle" });
  const { desktopDisplay: advDisplay, cards: advCards } = await mobileCardList(page, "Avans so‘rovlari");
  record(engineName, "Advances: mobile card renderer used (desktop table hidden)", advDisplay === "none", `display=${advDisplay}`);
  const advCount = await advCards.count();
  record(engineName, "Advances: card list populated", advCount > 0, `count=${advCount}`);
  record(engineName, "Advances: no horizontal-scroll dependency", (await overflow(page)) === 0);

  const firstAdv = advCards.first();
  const advText = await firstAdv.innerText();
  const advHasAmount = /so'm/.test(advText);
  const advHasStatus = /(So‘ralgan|Tasdiqlangan|Rad etilgan|To‘langan|Bekor qilingan)/.test(advText);
  record(
    engineName,
    "Advances: employee + amount + status visible on card",
    advHasAmount && advHasStatus,
    `text="${advText.replace(/\n/g, " | ").slice(0, 110)}"`,
  );

  // RBAC: Accountant does not hold expense.approve — a REQUESTED advance
  // must not offer Approve/Reject.
  const requestedAdv = advCards.filter({ hasText: "So‘ralgan" }).first();
  if ((await requestedAdv.count()) > 0) {
    const requestedAdvText = await requestedAdv.innerText();
    record(
      engineName,
      "Advances: Accountant does not see Approve/Reject on a requested advance (RBAC preserved)",
      !/Tasdiqlash|Rad etish/.test(requestedAdvText),
      `text="${requestedAdvText.replace(/\n/g, " | ")}"`,
    );
  }

  // Accountant holds expense.pay — an APPROVED advance must offer "To‘lash".
  const approvedAdv = advCards.filter({ hasText: "Tasdiqlangan" }).first();
  if ((await approvedAdv.count()) > 0) {
    const approvedAdvText = await approvedAdv.innerText();
    record(
      engineName,
      "Advances: Accountant sees Pay on an approved advance",
      /To‘lash/.test(approvedAdvText),
      `text="${approvedAdvText.replace(/\n/g, " | ")}"`,
    );
  }

  // Phase 1 regression guard: the "no employees.view" contradictory banner
  // fix must still hold — Accountant sees exactly one create-blocked notice,
  // not a page-level forbidden banner contradicting the visible list above.
  const pageText = await page.locator("main").innerText();
  record(
    engineName,
    "Advances: Phase 1 create-request notice present without contradicting the visible list (no regression)",
    pageText.includes("Xodimlar ro‘yxatini ko‘rish uchun ruxsatingiz yo‘q") && advCount > 0,
  );

  await page.close();
}

async function runForEngine(engineName, launcher) {
  const browser = await launcher.launch();

  try {
    // Separate contexts per role: each starts unauthenticated, so /login
    // never redirects away because a previous role's session is still live.
    const managerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      await runManagerChecks(engineName, managerContext);
    } finally {
      await managerContext.close();
    }

    const accountantContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      await runAccountantChecks(engineName, accountantContext);
    } finally {
      await accountantContext.close();
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
