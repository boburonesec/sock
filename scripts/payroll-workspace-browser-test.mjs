import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";

const period = {
  id: "ui-payroll-period", month: "2099-01-01T00:00:00.000Z", status: "CALCULATED",
  totalWorkedAmount: "120000", totalBonusAmount: "10000", totalPenaltyAmount: "0",
  totalAdvanceAmount: "0", totalFinalAmount: "130000", totalPaidAmount: "0",
  totalRemainingAmount: "130000", calculatedAt: new Date().toISOString(), closedAt: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};
const item = {
  id: "ui-payroll-item", workedAmount: "120000", bonusAmount: "10000", penaltyAmount: "0",
  advanceAmount: "0", finalAmount: "130000", paidAmount: "0", remainingAmount: "130000",
  status: "CALCULATED", employee: { id: "ui-employee", name: "Sinov xodimi", status: "ACTIVE" },
};

async function login(page) {
  const refresh = page.waitForResponse((response) => response.url().includes("/auth/refresh"));
  await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
  await refresh;
  await page.locator("#email").fill("owner@paypoq.local");
  await page.locator("#password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Kirish" }).click();
  await page.waitForURL(/\/dashboard\//, { waitUntil: "domcontentloaded" });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15_000);
  try {
    await login(page);
    let releasePeriods;
    let firstPeriodsRequest = true;
    const periodsGate = new Promise((resolve) => { releasePeriods = resolve; });
    await page.route("**/finance/payroll-periods", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      if (firstPeriodsRequest) { firstPeriodsRequest = false; await periodsGate; }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [period] }) });
    });
    await page.route("**/finance/payroll-periods/ui-payroll-period/items", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [item] }) }));
    await page.route("**/employees", (route) => route.request().method() === "GET"
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [item.employee] }) })
      : route.continue());
    await page.goto(`${WEB}/finance/payroll`, { waitUntil: "domcontentloaded" });
    await page.getByText("Ish haqi davrlari yuklanmoqda...").waitFor();
    releasePeriods();

    await page.getByText(/2099/, { exact: false }).first().waitFor();
    assert.equal(await page.getByText("CALCULATED", { exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Qayta hisoblash" }).count(), 1);

    await page.getByRole("button", { name: "Xodimga to‘lov" }).click();
    const drawer = page.getByRole("dialog", { name: "Ish haqi to‘lovi" });
    await drawer.getByRole("button", { name: "To‘lovni tekshirish" }).click();
    await drawer.getByText("Xodim ish haqi qatori tanlanishi shart.").waitFor();
    await drawer.getByLabel("Xodim").selectOption(item.id);
    await drawer.getByRole("button", { name: "To‘lovni tekshirish" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Ish haqi to‘lovini tasdiqlash" });
    await confirm.getByText("Sinov xodimi", { exact: false }).waitFor();

    let requests = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const paymentPattern = "**/finance/payroll-periods/ui-payroll-period/pay";
    const failureHandler = async (route) => {
      requests += 1; await gate;
      await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ message: "To‘lov qoldiqdan oshib ketdi." }) });
    };
    await page.route(paymentPattern, failureHandler);
    const submit = confirm.locator("button").last();
    await submit.evaluate((button) => { button.click(); button.click(); });
    await page.waitForTimeout(100);
    assert.equal(requests, 1);
    assert.equal(await submit.isDisabled(), true);
    release();
    await confirm.getByRole("alert").waitFor();
    assert.equal(await drawer.getByLabel("Summa").inputValue(), "130000");
    assert.equal(await confirm.isVisible(), true);

    await page.unroute(paymentPattern, failureHandler);
    await page.route(paymentPattern, (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { id: "ui-payment" } }) }));
    await confirm.getByRole("button", { name: "To‘lovni tasdiqlash" }).click();
    await page.getByText("Ish haqi to‘lovi yozildi.").waitFor();
    await confirm.waitFor({ state: "hidden" });

    const closePeriodButton = page.getByRole("button", { name: "Davrni yopish" });
    assert.equal(await closePeriodButton.isEnabled(), true);
    await closePeriodButton.click();
    const closeConfirm = page.getByRole("alertdialog", { name: "Ish haqi davrini yopish" });
    await closeConfirm.getByText("130000 so‘m", { exact: false }).waitFor();
    assert.equal(await closeConfirm.getByRole("button", { name: "Yopish" }).count(), 1);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: /2099/ }).first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    console.log("payroll workspace: 11 passed, 0 failed");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
