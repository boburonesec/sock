/**
 * Continue UI demo from existing factory data (no DB wipe).
 * Run after walkthrough partially filled operators/products/employees.
 */
import { createRequire } from "node:module";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.WEB_BASE_URL || "http://localhost:3000";
const PASSWORD = "ChangeMe123!";
const OUT = path.join(ROOT, "docs", "demo-walkthrough");
const log = [];
const step = (m) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`;
  console.log(line);
  log.push(line);
};

async function waitNetwork(page) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(350);
}

async function closeDialog(page) {
  const dialogs = page.locator('[role="dialog"]');
  const n = await dialogs.count();
  if (n < 1) return;
  await dialogs
    .nth(n - 1)
    .locator('button[aria-label="Yopish"]')
    .click()
    .catch(async () => page.keyboard.press("Escape"));
  await page.waitForTimeout(350);
}

async function closeAllDialogs(page) {
  for (let i = 0; i < 5; i++) {
    if ((await page.locator('[role="dialog"]').count()) === 0) break;
    await closeDialog(page);
  }
}

async function selectFirstRealOption(page, select) {
  await select.waitFor({ state: "visible", timeout: 15000 });
  const options = select.locator("option");
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const val = await options.nth(i).getAttribute("value");
    const disabled = await options.nth(i).isDisabled();
    if (val && !disabled) {
      await select.selectOption({ index: i });
      return val;
    }
  }
  throw new Error("No real option in select");
}

async function login(page, email) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* */
    }
  });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(800);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('form button[type="submit"]').click({ force: true });
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 25000 });
  await waitNetwork(page);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(20000);

  try {
    // Ensure variants exist
    step("A) Owner: ensure variants + prices");
    await login(page, "owner@andijon-paypoq.local");
    await page.goto(`${BASE}/settings/products`, { waitUntil: "networkidle" });
    for (const name of ["Klassik Paypoq", "Sport Paypoq", "Premium Paypoq"]) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name }).first().click();
      await page.waitForTimeout(500);
      // if no variants, add two
      const empty = await page.getByText(/Variantlar mavjud emas/i).isVisible().catch(() => false);
      const addVariant = async (ci, mi, si, price) => {
        await page.getByRole("button", { name: /Variant qo.?.shish/i }).click();
        await page.waitForTimeout(400);
        const d = page.locator('[role="dialog"]').last();
        const selects = d.locator("select");
        for (let s = 0; s < 3; s++) {
          const sel = selects.nth(s);
          const opts = sel.locator("option");
          let real = [];
          for (let i = 0; i < (await opts.count()); i++) {
            const v = await opts.nth(i).getAttribute("value");
            if (v && !(await opts.nth(i).isDisabled())) real.push(i);
          }
          await sel.selectOption({ index: real[[ci, mi, si][s] % real.length] });
        }
        await d.locator('form button[type="submit"]').click();
        await waitNetwork(page);
        await page.waitForTimeout(600);
        if ((await page.locator('[role="dialog"]').count()) > 1) await closeDialog(page);
        const priceBtn = page.getByRole("button", { name: /Narx qo.?.shish/i }).first();
        if (await priceBtn.isVisible().catch(() => false)) {
          await priceBtn.click();
          const top = page.locator('[role="dialog"]').last();
          await top.locator("input").first().fill(String(price));
          const date = top.locator('input[type=date]');
          if (await date.count()) await date.fill("2026-01-01");
          await top.locator('form button[type="submit"]').click();
          await waitNetwork(page);
          if ((await page.locator('[role="dialog"]').count()) > 1) await closeDialog(page);
        }
      };
      if (empty) {
        await addVariant(0, 0, 0, 12000);
        await addVariant(1, 1, 1, 14000);
      }
      await closeAllDialogs(page);
    }

    // Shift: production moves
    step("B) Shift: stage moves + defects");
    await login(page, "shift@andijon-paypoq.local");
    await page.goto(`${BASE}/production`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    for (let i = 0; i < 10; i++) {
      step(`  move #${i + 1}`);
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Smena o.?.tkazish/i }).click();
      await page.waitForTimeout(600);
      const d = page.locator('[role="dialog"]').last();
      const selects = d.locator("select");
      // product, source, destination — order from form
      if ((await selects.count()) >= 3) {
        await selectFirstRealOption(page, selects.nth(0)); // product
        // source = Averlog if present
        const src = selects.nth(1);
        const srcText = await src.locator("option").allTextContents();
        const averlog = srcText.findIndex((t) => /Averlog/i.test(t));
        if (averlog >= 0) await src.selectOption({ index: averlog });
        else await selectFirstRealOption(page, src);
        await page.waitForTimeout(400); // load stage workers
        const dest = selects.nth(2);
        const destText = await dest.locator("option").allTextContents();
        const dazmol = destText.findIndex((t) => /Dazmol/i.test(t) && !/Par/i.test(t));
        if (dazmol >= 0) await dest.selectOption({ index: dazmol });
        else {
          let reals = [];
          const opts = dest.locator("option");
          for (let j = 0; j < (await opts.count()); j++) {
            const v = await opts.nth(j).getAttribute("value");
            if (v && !(await opts.nth(j).isDisabled())) reals.push(j);
          }
          if (reals.length > 1) await dest.selectOption({ index: reals[1] });
        }
      }
      await d.locator("#moveQuantity").fill(String(30 + i * 5));
      await page.waitForTimeout(300);
      const checks = d.locator('input[type=checkbox]');
      const cc = await checks.count();
      step(`    workers checkboxes=${cc}`);
      if (cc === 0) {
        step("    no workers on source stage — skip move");
        await closeAllDialogs(page);
        continue;
      }
      await checks.first().check();
      await page.waitForTimeout(200);
      await d.getByRole("button", { name: /Teng bo.?.lish/i }).click().catch(() => {});
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await page.waitForTimeout(800);
      const err = d.locator('[role=alert], .text-rose-500');
      if (await err.isVisible().catch(() => false)) {
        step(`    move error: ${await err.innerText()}`);
      }
      await closeAllDialogs(page);
    }

    // defect
    await page.getByRole("button", { name: /Brak qayd/i }).click();
    await page.waitForTimeout(400);
    {
      const d = page.locator('[role="dialog"]').last();
      const selects = d.locator("select");
      for (let i = 0; i < Math.min(await selects.count(), 3); i++) {
        await selectFirstRealOption(page, selects.nth(i)).catch(() => {});
      }
      await d.locator('input[type=number]').first().fill("3");
      await d.locator("textarea").first().fill("Ip uzilishi / sifatsiz tikuv (UI demo)");
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
    }

    // Warehouse operator
    step("C) Warehouse: material receipt + finished receipt");
    await login(page, "warehouse@andijon-paypoq.local");
    await page.getByRole("button", { name: "OK" }).click().catch(() => {});
    await page.goto(`${BASE}/warehouse/materials`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "OK" }).click().catch(() => {});
    for (let i = 0; i < 4; i++) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Material qabul qilish/i }).click();
      await page.waitForTimeout(500);
      const d = page.locator('[role="dialog"]').last();
      const selects = d.locator("select");
      for (let s = 0; s < (await selects.count()); s++) {
        await selectFirstRealOption(page, selects.nth(s)).catch(() => {});
      }
      const qty = d.locator('input[type=number], input').first();
      await qty.fill(String(40 + i * 15));
      const unit = d.getByLabel(/Birlik/i);
      if (await unit.count()) await unit.fill("kg");
      await d.locator('form button[type="submit"]:not([disabled])').click({ timeout: 10000 }).catch(async () => {
        await d.locator('form button[type="submit"]').click({ force: true });
      });
      await waitNetwork(page);
      await closeAllDialogs(page);
    }

    // finished receipt from production as owner (needs stock at packing/ombor stage)
    await login(page, "owner@andijon-paypoq.local");
    await page.goto(`${BASE}/production`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Omborga qabul/i }).click().catch(() => {});
    await page.waitForTimeout(500);
    if (await page.locator('[role="dialog"]').count()) {
      const d = page.locator('[role="dialog"]').last();
      await selectFirstRealOption(page, d.locator("select").first()).catch(() => {});
      await d.locator('input[type=number]').first().fill("50");
      const submit = d.locator('form button[type="submit"]:not([disabled])');
      if (await submit.count()) {
        await submit.click();
        await waitNetwork(page);
      } else {
        step("  finished receipt submit disabled (no packing stock) — skip");
      }
      await closeAllDialogs(page);
    }

    // Seller: clients orders payments
    step("D) Seller: clients, orders, payments");
    await login(page, "seller@andijon-paypoq.local");
    await page.goto(`${BASE}/sales/clients`, { waitUntil: "networkidle" });
    for (const [name, phone] of [
      ["Andijon Savdo", "+998 91 100 20 30"],
      ["Fargona Optom", "+998 93 200 30 40"],
      ["Toshkent Market", "+998 97 300 40 50"],
      ["Namangan Boutique", "+998 94 400 50 60"],
    ]) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Mijoz qo.?.shish|Yangi mijoz/i }).first().click();
      await page.waitForTimeout(400);
      const d = page.locator('[role="dialog"]').last();
      await d.locator("input").first().fill(name);
      if ((await d.locator("input").count()) > 1) await d.locator("input").nth(1).fill(phone);
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
    }

    await page.goto(`${BASE}/sales/orders`, { waitUntil: "networkidle" });
    for (let i = 0; i < 5; i++) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Buyurtma|Yangi/i }).first().click();
      await page.waitForTimeout(500);
      const d = page.locator('[role="dialog"]').last();
      const selects = d.locator("select");
      for (let s = 0; s < (await selects.count()); s++) {
        await selectFirstRealOption(page, selects.nth(s)).catch(() => {});
      }
      await d.locator('input[type=number]').first().fill(String(80 + i * 20));
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
    }

    await page.goto(`${BASE}/sales/payments`, { waitUntil: "networkidle" });
    for (let i = 0; i < 3; i++) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /To.?.lov|Yangi/i }).first().click();
      await page.waitForTimeout(500);
      const d = page.locator('[role="dialog"]').last();
      const selects = d.locator("select");
      for (let s = 0; s < (await selects.count()); s++) {
        await selectFirstRealOption(page, selects.nth(s)).catch(() => {});
      }
      await d.locator("input").first().fill(String(400000 + i * 150000));
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
    }

    // Accountant: suppliers, expenses, advances, payroll
    step("E) Accountant: suppliers, finance, payroll");
    await login(page, "accountant@andijon-paypoq.local");
    await page.goto(`${BASE}/finance/suppliers`, { waitUntil: "networkidle" });
    for (const name of ["Paxta Yetkazib Beruvchi", "Ip Import LLC", "Qadoq Servis"]) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Yetkazib|Supplier|qo.?.shish|Yangi/i }).first().click();
      await page.waitForTimeout(400);
      const d = page.locator('[role="dialog"]').last();
      await d.locator("input").first().fill(name);
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
    }

    await page.goto(`${BASE}/finance/expenses`, { waitUntil: "networkidle" });
    for (let i = 0; i < 3; i++) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Xarajat|Yangi|qo.?.shish/i }).first().click();
      await page.waitForTimeout(400);
      const d = page.locator('[role="dialog"]').last();
      if (await d.locator("select").count()) await selectFirstRealOption(page, d.locator("select").first());
      await d.locator("input").first().fill(String(180000 + i * 40000));
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
    }
    for (const label of [/Tasdiqlash/i, /To.?.lash/i]) {
      const btns = page.getByRole("button", { name: label });
      for (let i = 0; i < Math.min(await btns.count(), 2); i++) {
        await btns.nth(i).click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }

    await page.goto(`${BASE}/finance/advances`, { waitUntil: "networkidle" });
    for (let i = 0; i < 3; i++) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Avans|Yangi|qo.?.shish/i }).first().click();
      await page.waitForTimeout(400);
      const d = page.locator('[role="dialog"]').last();
      if (await d.locator("select").count()) await selectFirstRealOption(page, d.locator("select").first());
      await d.locator("input").first().fill(String(90000 + i * 20000));
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
    }
    for (const label of [/Tasdiqlash/i, /To.?.lash/i]) {
      const btns = page.getByRole("button", { name: label });
      for (let i = 0; i < Math.min(await btns.count(), 2); i++) {
        await btns.nth(i).click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }

    await page.goto(`${BASE}/finance/payroll`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Davr|Yangi|qo.?.shish/i }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    if (await page.locator('[role="dialog"]').count()) {
      const d = page.locator('[role="dialog"]').last();
      const dates = d.locator('input[type=date]');
      if ((await dates.count()) >= 2) {
        await dates.nth(0).fill("2026-06-01");
        await dates.nth(1).fill("2026-06-30");
      }
      await d.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
    }
    await page.getByRole("button", { name: /Hisoblash/i }).first().click().catch(() => {});
    await page.waitForTimeout(1500);

    // Dashboards
    step("F) Dashboards + role logins");
    await login(page, "owner@andijon-paypoq.local");
    for (const path of [
      "/dashboard/executive",
      "/dashboard/operations",
      "/reports",
      "/audit",
      "/sales/debts",
      "/warehouse",
      "/tv",
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      await page.screenshot({
        path: path.join(OUT, `cont${path.replace(/\//g, "-") || "-home"}.png`),
        fullPage: true,
      });
    }

    for (const email of [
      "manager@andijon-paypoq.local",
      "seller@andijon-paypoq.local",
      "warehouse@andijon-paypoq.local",
      "shift@andijon-paypoq.local",
      "accountant@andijon-paypoq.local",
    ]) {
      await login(page, email);
      step(`login OK ${email} -> ${page.url()}`);
    }

    step("CONTINUE DONE");
    await writeFile(path.join(OUT, "continue-log.txt"), log.join("\n") + "\n");
  } catch (e) {
    step(`FAILED: ${e instanceof Error ? e.message : e}`);
    await page.screenshot({ path: path.join(OUT, "continue-failure.png"), fullPage: true }).catch(() => {});
    await writeFile(path.join(OUT, "continue-log.txt"), log.join("\n") + "\n");
    throw e;
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
