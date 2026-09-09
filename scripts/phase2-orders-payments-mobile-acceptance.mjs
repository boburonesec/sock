/**
 * Phase 2 targeted acceptance — Sales Orders & Payments mobile card list.
 * Deterministic Chromium + WebKit coverage for the responsive migration
 * described in docs (mobile-first UX audit Phase 2). Fails on semantic
 * breakage: desktop table leaking on mobile, horizontal-scroll dependency,
 * a card opening the wrong record, missing scan fields, or the raw
 * ClientPayment database id resurfacing as the mobile card's identity.
 *
 * Usage (API + web running, seed present):
 *   node scripts/phase2-orders-payments-mobile-acceptance.mjs
 */
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";

const results = [];
function record(engine, name, passed, detail) {
  results.push({ engine, name, passed, detail });
  console.log(`[${passed ? "PASS" : "FAIL"}] [${engine}] ${name}${detail ? ` — ${detail}` : ""}`);
}

// A Prisma cuid() is a lowercase-alnum token starting with "c", ~25 chars,
// with no separators — nothing else legitimately rendered on these cards
// looks like this (order numbers are "SO-YYYYMMDD-HEX8", client names are
// free text, amounts/dates contain digits+separators/spaces).
const CUID_LIKE = /\bc[a-z0-9]{20,}\b/;

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

async function runForEngine(engineName, launcher) {
  const browser = await launcher.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await login(page, "seller@paypoq.local");

    // ---------------- ORDERS ----------------
    await page.goto(`${WEB}/sales/orders`, { waitUntil: "networkidle" });

    const ordersTableDisplay = await page.locator(".hidden.sm\\:block").first().evaluate((el) => getComputedStyle(el).display);
    record(engineName, "Orders: mobile card renderer used (desktop table hidden)", ordersTableDisplay === "none", `display=${ordersTableDisplay}`);

    const orderCards = page.locator('ul[aria-label="Buyurtmalar ro‘yxati"] > li');
    const orderCardCount = await orderCards.count();
    record(engineName, "Orders: card list populated", orderCardCount > 0, `count=${orderCardCount}`);

    const ordersOverflow = await overflow(page);
    record(engineName, "Orders: no horizontal-scroll dependency", ordersOverflow === 0, `scrollWidth-clientWidth=${ordersOverflow}`);

    const firstOrderCard = orderCards.first().locator("button");
    const orderCardText = await firstOrderCard.innerText();
    const expectedOrderNumber = await firstOrderCard.locator("span[title]").getAttribute("title");
    const hasClientLine = orderCardText.split("\n").length >= 2;
    record(
      engineName,
      "Orders: client/amount/status visible on card",
      Boolean(expectedOrderNumber) && hasClientLine && /so'm/.test(orderCardText),
      `text="${orderCardText.replace(/\n/g, " | ").slice(0, 90)}"`,
    );

    await firstOrderCard.click();
    await page.waitForSelector("#drawer-title", { timeout: 5000 });
    const orderDrawerTitle = await page.locator("#drawer-title").textContent();
    record(engineName, "Orders: card opens matching order", orderDrawerTitle === expectedOrderNumber, `card=${expectedOrderNumber}, drawer=${orderDrawerTitle}`);
    await page.locator('[aria-label="Yopish"]').first().click();
    await page.waitForTimeout(300);

    // ---------------- PAYMENTS ----------------
    await page.goto(`${WEB}/sales/payments`, { waitUntil: "networkidle" });

    const paymentsTableDisplay = await page.locator(".hidden.sm\\:block").first().evaluate((el) => getComputedStyle(el).display);
    record(engineName, "Payments: mobile card renderer used (desktop table hidden)", paymentsTableDisplay === "none", `display=${paymentsTableDisplay}`);

    const paymentCards = page.locator('ul[aria-label="To‘lovlar ro‘yxati"] > li');
    const paymentCardCount = await paymentCards.count();
    record(engineName, "Payments: card list populated", paymentCardCount > 0, `count=${paymentCardCount}`);

    const paymentsOverflow = await overflow(page);
    record(engineName, "Payments: no horizontal-scroll dependency", paymentsOverflow === 0, `scrollWidth-clientWidth=${paymentsOverflow}`);

    const firstPaymentCard = paymentCards.first().locator("button");
    const paymentCardText = await firstPaymentCard.innerText();
    const hasAmount = /so'm/.test(paymentCardText);
    const hasDate = /\d{2}\.\d{2}\.\d{4}/.test(paymentCardText);
    const hasMethod = /(Naqd|O‘tkazma|Boshqa)/.test(paymentCardText);
    record(
      engineName,
      "Payments: client/amount/method/date visible on card",
      hasAmount && hasDate && hasMethod,
      `text="${paymentCardText.replace(/\n/g, " | ").slice(0, 100)}"`,
    );

    record(
      engineName,
      "Payments: raw database CUID is not the card's primary identity",
      !CUID_LIKE.test(paymentCardText),
      CUID_LIKE.test(paymentCardText) ? `FOUND cuid-like token in: "${paymentCardText.slice(0, 60)}"` : "no cuid-like token present",
    );

    const expectedPaymentClient = paymentCardText.split("\n")[0];

    await firstPaymentCard.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const paymentDialogOpen = await page.locator('[role="dialog"]').isVisible();
    record(engineName, "Payments: card opens payment detail", paymentDialogOpen, `dialogOpen=${paymentDialogOpen}`);

    // The drawer title used to be the raw payment.id (Prisma cuid) — assert
    // it isn't, and that the drawer shows the same payment the card opened
    // (not merely that *a* dialog appeared).
    const paymentDrawerTitle = await page.locator("#drawer-title").textContent();
    record(
      engineName,
      "Payments: drawer title is not a raw CUID",
      Boolean(paymentDrawerTitle) && !CUID_LIKE.test(paymentDrawerTitle),
      `title="${paymentDrawerTitle}"`,
    );
    const paymentDrawerText = await page.locator('[role="dialog"]').innerText();
    record(
      engineName,
      "Payments: detail drawer shows the correct payment (client matches card)",
      paymentDrawerText.includes(expectedPaymentClient),
      `card client="${expectedPaymentClient}"`,
    );
    record(
      engineName,
      "Payments: no raw CUID anywhere in the visible detail drawer",
      !CUID_LIKE.test(paymentDrawerText),
      CUID_LIKE.test(paymentDrawerText) ? "FOUND cuid-like token in drawer" : "clean",
    );

    await page.locator('[aria-label="Yopish"]').first().click();
  } finally {
    await context.close();
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
