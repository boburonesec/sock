import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";
const now = new Date().toISOString();
const supplierA = { id: "supplier-a", name: "Atlas Ip", phone: "+998 90 111 22 33", notes: "Asosiy ip", status: "ACTIVE" };
const supplierB = { id: "supplier-b", name: "Baraka Elastik", phone: null, notes: null, status: "ACTIVE" };
const supplierInactive = { id: "supplier-inactive", name: "Eski Hamkor", phone: null, notes: null, status: "INACTIVE" };
const purchaseA = { id: "purchase-a", purchaseNumber: "SP-20260731-ATLAS", totalAmount: "100.00", paymentStatus: "PARTIALLY_PAID", purchasedAt: now, cancelledAt: null, createdAt: now, updatedAt: now, supplier: supplierA, createdBy: null, items: [{ id: "line-a", quantity: "2.000", unit: "kg", unitPrice: "50.00", totalPrice: "100.00", material: { id: "material-a", name: "Paxta ip" } }] };
const purchaseB = { ...purchaseA, id: "purchase-b", purchaseNumber: "SP-20260731-BARAKA", totalAmount: "80.00", paymentStatus: "UNPAID", supplier: supplierB };
const debts = [{ supplier: supplierA, totalPurchases: "100.00", totalPaid: "40.00", debt: "60.00" }, { supplier: supplierB, totalPurchases: "80.00", totalPaid: "0", debt: "80.00" }, { supplier: supplierInactive, totalPurchases: "0", totalPaid: "0", debt: "0" }];
const paymentA = { id: "payment-a", amount: "40.00", method: "TRANSFER", paymentDate: now, note: "Birinchi qism", createdAt: now, supplier: supplierA, recordedBy: null, allocations: [{ id: "allocation-a", amount: "40.00", purchase: { id: purchaseA.id, purchaseNumber: purchaseA.purchaseNumber } }] };

async function login(page) {
  const refresh = page.waitForResponse((response) => response.url().includes("/auth/refresh"));
  await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
  await refresh;
  await page.locator("#email").fill("owner@paypoq.local");
  await page.locator("#password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Kirish" }).click();
  await page.waitForURL(/\/dashboard\//, { waitUntil: "domcontentloaded" });
}

async function mockReads(page, { empty = false, failSuppliersOnce = false, delayFirst = false } = {}) {
  let supplierFailure = failSuppliersOnce;
  let release;
  let delayed = delayFirst;
  const gate = new Promise((resolve) => { release = resolve; });
  const rows = empty ? { suppliers: [], debts: [], purchases: [], payments: [], materials: [] } : { suppliers: [supplierA, supplierB], debts, purchases: [purchaseA, purchaseB], payments: [paymentA], materials: [{ id: "material-a", name: "Paxta ip", status: "ACTIVE" }] };
  await page.route("**/supplier/suppliers", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    if (delayed) { delayed = false; await gate; }
    if (supplierFailure) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Yetkazib beruvchilar vaqtincha yuklanmadi." }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: rows.suppliers }) });
  });
  for (const [path, data] of [["debts", rows.debts], ["purchases", rows.purchases], ["payments", rows.payments]]) await page.route(`**/supplier/${path}`, (route) => route.request().method() === "GET" ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) }) : route.continue());
  await page.route("**/product/materials", (route) => route.request().method() === "GET" ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: rows.materials }) }) : route.continue());
  return { release: () => release?.(), allowSupplierSuccess: () => { supplierFailure = false; } };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(15_000);
  try {
    await login(page);
    const reads = await mockReads(page, { delayFirst: true });
    await page.goto(`${WEB}/finance/suppliers`, { waitUntil: "domcontentloaded" });
    await page.getByText("Yetkazib beruvchi ma’lumotlari yuklanmoqda...").waitFor(); reads.release();
    await page.getByRole("region", { name: /Atlas Ip ish maydoni/ }).waitFor();
    console.log("PASS supplier loading and default selection");
    assert.equal(await page.getByRole("button", { name: "Yangi yetkazib beruvchi" }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "Xarid qayd qilish" }).count(), 0);
    await page.getByRole("button", { name: /Baraka Elastik/ }).click();
    const workspace = page.getByRole("region", { name: /Baraka Elastik ish maydoni/ });
    await workspace.waitFor();
    console.log("PASS supplier selection and contextual workspace");

    await workspace.getByRole("button", { name: "Yangi xarid" }).click();
    const purchaseDrawer = page.getByRole("dialog", { name: "Xarid qayd qilish" });
    assert.equal(await purchaseDrawer.getByText("Baraka Elastik", { exact: true }).count(), 2);
    assert.equal(await purchaseDrawer.getByLabel("Yetkazib beruvchi").isDisabled(), true);
    await purchaseDrawer.getByRole("button", { name: "Xaridni tekshirish" }).click();
    await purchaseDrawer.getByText("Material tanlanishi shart.").waitFor();
    await purchaseDrawer.getByLabel("Material").selectOption("material-a");
    await purchaseDrawer.getByLabel("Miqdor").fill("2.000");
    await purchaseDrawer.getByLabel("Birlik narx").fill("50.00");
    await purchaseDrawer.getByRole("button", { name: "Xaridni tekshirish" }).click();
    let review = page.getByRole("alertdialog", { name: "Xaridni tasdiqlash" });
    await review.getByText("Baraka Elastik", { exact: false }).waitFor();
    let purchasePosts = 0;
    await page.route("**/supplier/purchases", (route) => { if (route.request().method() === "POST") purchasePosts += 1; return route.continue(); });
    await review.getByRole("button", { name: "Bekor qilish" }).click();
    assert.equal(purchasePosts, 0);
    console.log("PASS purchase validation, review, and cancellation");
    await purchaseDrawer.getByRole("button", { name: "Xaridni tekshirish" }).click(); review = page.getByRole("alertdialog", { name: "Xaridni tasdiqlash" });

    let releasePurchase; const purchaseGate = new Promise((resolve) => { releasePurchase = resolve; });
    await page.unroute("**/supplier/purchases");
    const failureHandler = async (route) => { if (route.request().method() !== "POST") return route.continue(); purchasePosts += 1; await purchaseGate; return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "Xarid ma’lumoti o‘zgargan." }) }); };
    await page.route("**/supplier/purchases", failureHandler);
    const purchaseSubmit = review.locator("button").last(); await purchaseSubmit.evaluate((button) => { button.click(); button.click(); }); await page.waitForTimeout(100);
    assert.equal(purchasePosts, 1); assert.equal(await purchaseSubmit.isDisabled(), true); releasePurchase();
    await review.getByRole("alert").waitFor(); assert.equal(await purchaseDrawer.getByLabel("Miqdor").inputValue(), "2.000");
    console.log("PASS purchase pending, duplicate prevention, and failure preservation");
    await page.unroute("**/supplier/purchases", failureHandler);
    let purchaseRefreshes = 0;
    await page.route("**/supplier/purchases", (route) => { if (route.request().method() === "POST") return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: purchaseB }) }); purchaseRefreshes += 1; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [purchaseA, purchaseB] }) }); });
    await review.getByRole("button", { name: "Xaridni tasdiqlash" }).click();
    await page.getByText("Yetkazib beruvchi xaridi qayd qilindi.").waitFor(); assert.ok(purchaseRefreshes >= 1);
    console.log("PASS purchase server success and authoritative refresh");

    await workspace.getByRole("button", { name: "To‘lov kiritish" }).click();
    const paymentDrawer = page.getByRole("dialog", { name: "Yetkazib beruvchi to‘lovi" });
    assert.equal(await paymentDrawer.getByLabel("Yetkazib beruvchi").isDisabled(), true);
    await paymentDrawer.getByLabel("To‘lov summasi").fill("80.00");
    await paymentDrawer.getByLabel("Xarid").selectOption("purchase-b");
    await paymentDrawer.getByLabel("Taqsimot summasi").fill("80.00");
    await paymentDrawer.getByRole("button", { name: "To‘lovni tekshirish" }).click();
    const paymentReview = page.getByRole("alertdialog", { name: "Yetkazib beruvchi to‘lovini tasdiqlash" });
    await paymentReview.getByText("SP-20260731-BARAKA", { exact: false }).waitFor();
    let paymentPosts = 0; const paymentKeys = []; await page.route("**/supplier/payments", (route) => { if (route.request().method() === "POST") { paymentPosts += 1; paymentKeys.push(route.request().headers()["idempotency-key"]); } return route.continue(); });
    await paymentReview.getByRole("button", { name: "Bekor qilish" }).click(); assert.equal(paymentPosts, 0);
    console.log("PASS payment review and cancellation");

    await paymentDrawer.getByRole("button", { name: "To‘lovni tekshirish" }).click();
    const paymentReviewRetry = page.getByRole("alertdialog", { name: "Yetkazib beruvchi to‘lovini tasdiqlash" });
    let releasePayment; const paymentGate = new Promise((resolve) => { releasePayment = resolve; });
    const paymentFailure = async (route) => { if (route.request().method() !== "POST") return route.continue(); paymentPosts += 1; paymentKeys.push(route.request().headers()["idempotency-key"]); await paymentGate; return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "Xarid qoldig‘i boshqa to‘lov bilan o‘zgargan." }) }); };
    await page.route("**/supplier/payments", paymentFailure);
    const paymentSubmit = paymentReviewRetry.locator("button").last(); await paymentSubmit.evaluate((button) => { button.click(); button.click(); }); await page.waitForTimeout(100);
    assert.equal(paymentPosts, 1); assert.equal(await paymentSubmit.isDisabled(), true); releasePayment(); await paymentReviewRetry.getByRole("alert").waitFor(); assert.equal(await paymentDrawer.getByLabel("To‘lov summasi").inputValue(), "80.00");
    const failedPaymentKey = paymentKeys.at(-1); assert.match(failedPaymentKey, /^[0-9a-f-]{36}$/i);
    await page.unroute("**/supplier/payments", paymentFailure);
    let paymentRefreshes = 0;
    await page.route("**/supplier/payments", (route) => { if (route.request().method() === "POST") { paymentKeys.push(route.request().headers()["idempotency-key"]); return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: paymentA }) }); } paymentRefreshes += 1; return route.continue(); });
    await paymentReviewRetry.getByRole("button", { name: "To‘lovni tasdiqlash" }).click(); await page.getByText("Yetkazib beruvchi to‘lovi qayd qilindi", { exact: false }).waitFor(); assert.ok(paymentRefreshes >= 1); assert.equal(paymentKeys.at(-1), failedPaymentKey);
    console.log("PASS payment pending, failure preservation, success, and refresh");

    await page.getByRole("button", { name: /Eski Hamkor/ }).click();
    const inactiveWorkspace = page.getByRole("region", { name: /Eski Hamkor ish maydoni/ }); await inactiveWorkspace.waitFor();
    assert.equal(await inactiveWorkspace.getByRole("button", { name: "Yangi xarid" }).count(), 0); assert.equal(await inactiveWorkspace.getByRole("button", { name: "To‘lov kiritish" }).count(), 0); assert.equal(await inactiveWorkspace.getByText("Nofaol", { exact: true }).count(), 1);
    console.log("PASS inactive supplier read-only behavior");

    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);

    const errorPage = await context.newPage(); const errorReads = await mockReads(errorPage, { failSuppliersOnce: true }); await errorPage.goto(`${WEB}/finance/suppliers`, { waitUntil: "domcontentloaded" });
    console.log("CHECK query failure page opened");
    await errorPage.getByRole("button", { name: "Qayta urinish" }).waitFor(); errorReads.allowSupplierSuccess(); await errorPage.getByRole("button", { name: "Qayta urinish" }).click(); await errorPage.getByRole("region", { name: /Atlas Ip ish maydoni/ }).waitFor();
    console.log("PASS query failure and retry");
    const emptyPage = await context.newPage(); await mockReads(emptyPage, { empty: true }); await emptyPage.goto(`${WEB}/finance/suppliers`, { waitUntil: "domcontentloaded" }); await emptyPage.getByText("Hozircha yetkazib beruvchi mavjud emas.").waitFor();
    console.log("PASS empty state");
    console.log("supplier workspace: 25 passed, 0 failed");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
