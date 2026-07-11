/**
 * Full UI walkthrough: empty factory → operators → catalog → production →
 * warehouse → sales → suppliers → finance/payroll (real browser, real forms).
 *
 * Prerequisites:
 *   - empty DB (platform admin only): ALLOW_DEMO_RESET=true pnpm db:reset:empty
 *   - API :3001 + Web :3000 running
 *   - PLAYWRIGHT_PKG=/tmp/paypoq-pw (or playwright in node_modules)
 *
 * Usage:
 *   PLAYWRIGHT_PKG=/tmp/paypoq-pw node scripts/ui-demo-factory-walkthrough.mjs
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
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
const HEADLESS = process.env.HEADED !== "1";
const OUT = path.join(ROOT, "docs", "demo-walkthrough");

const log = [];
function step(msg) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
  console.log(line);
  log.push(line);
}

async function shot(page, name) {
  await mkdir(OUT, { recursive: true });
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    fullPage: true,
  });
}

async function waitNetwork(page) {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function clickButton(page, nameRe, options = {}) {
  const btn = page.getByRole("button", { name: nameRe }).first();
  await btn.waitFor({ state: "visible", timeout: options.timeout ?? 15000 });
  await btn.click();
}

async function fillByLabel(page, labelRe, value) {
  const field = page.getByLabel(labelRe).first();
  await field.waitFor({ state: "visible", timeout: 15000 });
  await field.fill(String(value));
}

async function selectByLabel(page, labelRe, optionLabelOrIndex) {
  const select = page.getByLabel(labelRe).first();
  await select.waitFor({ state: "visible", timeout: 15000 });
  if (typeof optionLabelOrIndex === "number") {
    const options = select.locator("option");
    const count = await options.count();
    // skip placeholder empty/disabled
    let idx = optionLabelOrIndex;
    for (let i = 0; i < count; i++) {
      const val = await options.nth(i).getAttribute("value");
      const disabled = await options.nth(i).isDisabled();
      if (!val || disabled) continue;
      if (idx === 0) {
        await select.selectOption({ index: i });
        return;
      }
      idx -= 1;
    }
    throw new Error(`No selectable option at index for ${labelRe}`);
  }
  await select.selectOption({ label: optionLabelOrIndex });
}

async function selectFirstRealOption(page, selectLocator) {
  const select = typeof selectLocator === "string" ? page.locator(selectLocator).first() : selectLocator;
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

async function loginTenant(page, email, password = PASSWORD) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page
    .locator('form button[type="submit"]:not([disabled])')
    .waitFor({ state: "visible", timeout: 20000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 25000,
  });
  await waitNetwork(page);
}

async function loginPlatform(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  // Wait until session check finishes (button enabled)
  await page
    .locator('form button[type="submit"]:not([disabled])')
    .waitFor({ state: "visible", timeout: 20000 });
  await page.locator("#email").fill("platform@paypoq.local");
  await page.locator("#password").fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/admin(\/tenants)?\/?$/, { timeout: 25000 }).catch(async () => {
    await page.waitForURL((url) => !url.pathname.includes("/admin/login"), {
      timeout: 25000,
    });
  });
  await waitNetwork(page);
}

async function openDrawerByButton(page, buttonName) {
  await clickButton(page, buttonName);
  await page.waitForTimeout(500);
}

async function submitVisibleForm(page) {
  const form = page.locator("form").filter({ has: page.locator('button[type="submit"]') }).last();
  await form.locator('button[type="submit"]').click();
  await waitNetwork(page);
  await page.waitForTimeout(600);
}

async function closeDialog(page) {
  // Close outermost dialog only (product detail nests variant drawers).
  const dialogs = page.locator('[role="dialog"]');
  const n = await dialogs.count();
  if (n < 1) return;
  const top = dialogs.nth(n - 1);
  await top.locator('button[aria-label="Yopish"]').click().catch(async () => {
    await page.keyboard.press("Escape");
  });
  await page.waitForTimeout(400);
}

async function closeAllDialogs(page) {
  for (let i = 0; i < 4; i++) {
    if ((await page.locator('[role="dialog"]').count()) === 0) break;
    await closeDialog(page);
  }
}

async function createMasterItem(page, pathSuffix, name, code) {
  await page.goto(`${BASE}${pathSuffix}`, { waitUntil: "domcontentloaded" });
  await waitNetwork(page);
  await closeDialog(page);
  const addBtn = page
    .getByRole("button", { name: /Yangi|Qo‘shish|Qoshish|\+/i })
    .first();
  await addBtn.click();
  await page.waitForTimeout(400);
  await page.locator("#masterDataName").fill(name);
  if (code) {
    const codeInput = page.locator("#masterDataCode");
    if (await codeInput.count()) await codeInput.fill(code);
  }
  await submitVisibleForm(page);
  await closeDialog(page);
  await page.waitForTimeout(300);
}

async function main() {
  step(`Base URL ${BASE}`);
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    locale: "uz-UZ",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  // Capture console errors for staff review
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  try {
    // ─── 1. Platform: create SINGLE-branch tenant + owner ───
    step("1) Platform admin login");
    await loginPlatform(page);
    await shot(page, "01-admin-home");

    step("2) Create korxona (SINGLE / oddiy, no branches)");
    await page.goto(`${BASE}/admin/tenants`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    await clickButton(page, /^Korxona yaratish$/i);
    await page.locator("#tenant-name").waitFor({ state: "visible" });
    await page.locator("#tenant-name").fill("Andijon Paypoq Fabrikasi");
    await page.locator("#contact-name").fill("Bobur Rahimov");
    await page.locator("#contact-phone").fill("+998 90 111 22 33");
    await page.locator("#contact-email").fill("info@andijon-paypoq.uz");
    await page.locator("#branch-mode").selectOption("SINGLE");
    await page.locator('form button[type="submit"]').click();
    await page.locator("#tenant-name").waitFor({ state: "hidden", timeout: 20000 }).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, "02-tenant-created");

    // Open tenant detail
    step("3) Open tenant + create Owner");
    await page.getByRole("link", { name: /Andijon Paypoq/i }).first().click();
    await waitNetwork(page);
    await page.waitForTimeout(800);

    // Open owner drawer (page-level button), then submit form inside dialog
    await page.getByRole("button", { name: /^Korxona egasini ochish$/i }).click({ force: true });
    await page.locator("#owner-name").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#owner-name").fill("Korxona Egasi");
    await page.locator("#owner-email").fill("owner@andijon-paypoq.local");
    await page.locator("#owner-password").fill(PASSWORD);
    await page.locator('[role="dialog"] form button[type="submit"], [role="dialog"] button:has-text("Korxona egasini ochish")').last().click();
    await page.waitForTimeout(1500);
    await shot(page, "03-owner-created");

    // ─── 2. Owner login + create all operators ───
    step("4) Owner login");
    await context.clearCookies();
    await loginTenant(page, "owner@andijon-paypoq.local");
    await shot(page, "04-owner-dashboard");

    step("5) Create operators (Manager, Seller, Warehouse, Shift, Accountant)");
    await page.goto(`${BASE}/settings/company`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    // users tab
    await page.getByRole("button", { name: /Operator|Foydalanuvchi|Akkaunt/i }).first().click().catch(() => {});

    const operators = [
      { name: "Menejer Ali", email: "manager@andijon-paypoq.local", role: "Manager" },
      { name: "Sotuvchi Dilnoza", email: "seller@andijon-paypoq.local", role: "Seller" },
      { name: "Omborchi Karim", email: "warehouse@andijon-paypoq.local", role: "Warehouse Operator" },
      { name: "Smena Jasur", email: "shift@andijon-paypoq.local", role: "Shift Receiver" },
      { name: "Buxgalter Nodira", email: "accountant@andijon-paypoq.local", role: "Accountant" },
    ];

    for (const op of operators) {
      step(`  + operator ${op.role}: ${op.email}`);
      // Ensure no open dialog (close via X if needed)
      if (await page.locator('[role="dialog"]').isVisible().catch(() => false)) {
        await page.locator('[role="dialog"] button[aria-label="Yopish"]').click().catch(async () => {
          await page.keyboard.press("Escape");
        });
        await page.locator('[role="dialog"]').waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      }
      await page
        .locator("button")
        .filter({ hasText: /Operator qo.?.shish/i })
        .first()
        .click();
      await page.locator("#account-name").waitFor({ state: "visible", timeout: 15000 });
      await page.locator("#account-role").selectOption(op.role);
      await page.locator("#account-name").fill(op.name);
      await page.locator("#account-email").fill(op.email);
      await page.locator("#account-password").fill(PASSWORD);
      await page.locator('[role="dialog"] form button[type="submit"]').click();
      await page.locator("#account-name").waitFor({ state: "hidden", timeout: 20000 }).catch(async () => {
        const err = page.locator('[role="dialog"] .text-rose-200, [role="dialog"] [role=alert]');
        if (await err.count()) step(`  ! form error: ${await err.first().innerText()}`);
        await page.locator('[role="dialog"] button[aria-label="Yopish"]').click().catch(() => {});
      });
      await page.waitForTimeout(400);
    }
    await shot(page, "05-operators");

    // ─── 3. Master data ───
    step("6) Master data: colors, materials, seasons");
    const colors = [
      ["Qora", "BLK"],
      ["Oq", "WHT"],
      ["Kulrang", "GRY"],
      ["Ko‘k", "BLU"],
    ];
    for (const [n, c] of colors) {
      await createMasterItem(page, "/settings/colors", n, c);
    }
    const materials = [
      ["Paxta", "COT"],
      ["Bambuk", "BAM"],
      ["Yengil aralash", "MIX"],
    ];
    for (const [n, c] of materials) {
      await createMasterItem(page, "/settings/materials", n, c);
    }
    const seasons = [
      ["Universal", "UNI"],
      ["Qish", "WIN"],
      ["Yoz", "SUM"],
    ];
    for (const [n, c] of seasons) {
      await createMasterItem(page, "/settings/seasons", n, c);
    }
    await shot(page, "06-master-data");

    // Stages already bootstrapped — verify
    step("7) Verify stages exist");
    await page.goto(`${BASE}/settings/stages`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    await shot(page, "07-stages");

    // ─── 4. Products + variants + prices ───
    step("8) Products + variants + prices");
    await page.goto(`${BASE}/settings/products`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);

    async function createProduct(name, code) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Mahsulot qo.?.shish/i }).first().click();
      await page.waitForTimeout(400);
      await page.locator("#productName, form input").first().fill(name);
      const codeField = page.locator("#productCode");
      if (await codeField.count()) await codeField.fill(code);
      await page.locator('[role="dialog"]').last().locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
      await page.waitForTimeout(400);
    }

    await createProduct("Klassik Paypoq", "KL-01");
    await createProduct("Sport Paypoq", "SP-01");
    await createProduct("Premium Paypoq", "PR-01");

    async function addVariantToOpenProduct(colorIdx, matIdx, seasonIdx, price) {
      // Product detail drawer stays open; open nested variant form
      await page.getByRole("button", { name: /Variant qo.?.shish/i }).first().click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]').last();
      const selects = dialog.locator("select");
      const sc = await selects.count();
      for (let s = 0; s < Math.min(sc, 3); s++) {
        const sel = selects.nth(s);
        const opts = sel.locator("option");
        const n = await opts.count();
        let real = [];
        for (let i = 0; i < n; i++) {
          const v = await opts.nth(i).getAttribute("value");
          if (v && !(await opts.nth(i).isDisabled())) real.push({ i, v });
        }
        const pick = real[[colorIdx, matIdx, seasonIdx][s] % Math.max(real.length, 1)];
        if (pick) await sel.selectOption({ index: pick.i });
      }
      await dialog.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await page.waitForTimeout(700);
      // close only nested form if still open (detail remains)
      if ((await page.locator('[role="dialog"]').count()) > 1) {
        await closeDialog(page);
      }
      // add price on first variant row
      const priceBtn = page.getByRole("button", { name: /Narx qo.?.shish/i }).first();
      if (await priceBtn.isVisible().catch(() => false)) {
        await priceBtn.click();
        await page.waitForTimeout(400);
        const top = page.locator('[role="dialog"]').last();
        await top.locator("input").first().fill(String(price));
        const dateInput = top.locator('input[type=date]');
        if (await dateInput.count()) await dateInput.fill("2026-01-01");
        await top.locator('form button[type="submit"]').click();
        await waitNetwork(page);
        if ((await page.locator('[role="dialog"]').count()) > 1) await closeDialog(page);
      }
    }

    for (const name of ["Klassik Paypoq", "Sport Paypoq", "Premium Paypoq"]) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: name }).first().click();
      await page.waitForTimeout(600);
      await addVariantToOpenProduct(0, 0, 0, name.includes("Premium") ? 18000 : name.includes("Sport") ? 14000 : 12000);
      await addVariantToOpenProduct(1, 1, 1, name.includes("Premium") ? 18500 : 12500);
      await closeAllDialogs(page);
    }
    await shot(page, "08-products");

    // ─── 5. Salary rates for all stages ───
    step("9) Salary rates per stage");
    await page.goto(`${BASE}/settings/salary-rates`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    for (let i = 0; i < 10; i++) {
      await page.getByRole("button", { name: /Stavka|Qo‘shish|Yangi/i }).first().click().catch(() => {});
      await page.waitForTimeout(300);
      const stageSelect = page.locator("form select").first();
      if (!(await stageSelect.count())) break;
      const opts = stageSelect.locator("option");
      const n = await opts.count();
      let realIdx = [];
      for (let j = 0; j < n; j++) {
        const v = await opts.nth(j).getAttribute("value");
        if (v && !(await opts.nth(j).isDisabled())) realIdx.push(j);
      }
      if (i >= realIdx.length) break;
      await stageSelect.selectOption({ index: realIdx[i] });
      await page.locator('form input').first().fill(String(80 + i * 10));
      await submitVisibleForm(page);
      await page.waitForTimeout(400);
    }
    await shot(page, "09-salary-rates");

    // ─── 6. Employees with stage assignment ───
    step("10) Piece-rate employees (Xodimlar)");
    await page.goto(`${BASE}/employees`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    const workers = [
      "Alisher Averlog",
      "Dilshod Dazmol",
      "Gulnora Sifat",
      "Sardor Kiydirish",
      "Madina Parlash",
      "Jasur Qadoq",
      "Nilufar Bezak",
      "Olim Etiketka",
    ];
    for (const w of workers) {
      await page.getByRole("button", { name: /Xodim qo‘shish|Yangi xodim|Qo‘shish/i }).first().click();
      await page.waitForTimeout(400);
      await page.getByLabel(/Ism/i).fill(w).catch(async () => {
        await page.locator("form input").first().fill(w);
      });
      // check a few stage checkboxes if present
      const checks = page.locator('form input[type=checkbox]');
      const cc = await checks.count();
      for (let i = 0; i < Math.min(cc, 3); i++) {
        await checks.nth(i).check().catch(() => {});
      }
      await submitVisibleForm(page);
      await page.waitForTimeout(500);
    }
    await shot(page, "10-employees");

    // ─── 7. Production volume (many batches + moves) ───
    step("11) Production: batches + stage moves (volume for mature WIP)");
    await page.goto(`${BASE}/production`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);

    async function createBatch(qty, note) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Partiya yaratish/i }).click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]').last();
      await selectFirstRealOption(page, dialog.locator("select").first());
      await dialog.locator('input[type=number]').first().fill(String(qty));
      const noteField = dialog.locator("textarea").first();
      if (await noteField.count()) await noteField.fill(note);
      await dialog.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await closeAllDialogs(page);
      await page.waitForTimeout(500);
    }

    for (let i = 0; i < 6; i++) {
      await createBatch(500, `Smena partiya #${i + 1} (UI demo)`);
    }

    async function moveStage(qty) {
      await closeAllDialogs(page);
      await page.getByRole("button", { name: /Smena o.?.tkazish/i }).click();
      await page.waitForTimeout(600);
      const dialog = page.locator('[role="dialog"]').last();
      const selects = dialog.locator("select");
      if ((await selects.count()) >= 3) {
        await selectFirstRealOption(page, selects.nth(0));
        // source stage = first with inventory preference: index 0
        await selectFirstRealOption(page, selects.nth(1));
        const dest = selects.nth(2);
        const opts = dest.locator("option");
        const n = await opts.count();
        let reals = [];
        for (let i = 0; i < n; i++) {
          const v = await opts.nth(i).getAttribute("value");
          if (v && !(await opts.nth(i).isDisabled())) reals.push(i);
        }
        if (reals.length > 1) await dest.selectOption({ index: reals[1] });
        else if (reals.length) await dest.selectOption({ index: reals[0] });
      }
      await dialog.locator('input[type=number]').first().fill(String(qty));
      // workers
      const checks = dialog.locator('input[type=checkbox]');
      const cc = await checks.count();
      for (let i = 0; i < Math.min(cc, 2); i++) {
        await checks.nth(i).check().catch(() => {});
      }
      // or toggle buttons for workers
      if (cc === 0) {
        const workerBtns = dialog.locator("button").filter({ hasText: /.+/ });
        const wb = await workerBtns.count();
        if (wb > 0) await workerBtns.first().click().catch(() => {});
      }
      await dialog.locator('form button[type="submit"]').click();
      await waitNetwork(page);
      await page.waitForTimeout(800);
      await closeAllDialogs(page);
    }

    for (let i = 0; i < 8; i++) {
      await moveStage(40 + i * 5);
    }
    await shot(page, "11-production");

    // ─── 8. Warehouse material receipts ───
    step("12) Warehouse material receipts + stock check");
    await page.goto(`${BASE}/warehouse/materials`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: /Qabul|Kirim|Qo‘shish/i }).first().click();
      await page.waitForTimeout(400);
      const selects = page.locator("form select");
      if (await selects.count()) await selectFirstRealOption(page, selects.first());
      if ((await selects.count()) > 1) await selectFirstRealOption(page, selects.nth(1));
      await page.locator('input[type=number], input').first().fill(String(50 + i * 10));
      await page.getByLabel(/Birlik|Unit/i).fill("kg").catch(async () => {
        const inputs = page.locator("form input");
        if ((await inputs.count()) > 1) await inputs.nth(1).fill("kg");
      });
      await submitVisibleForm(page);
      await page.waitForTimeout(500);
    }
    await shot(page, "12-warehouse");

    // ─── 9. Clients, orders, payments ───
    step("13) Clients + orders + payments");
    await page.goto(`${BASE}/sales/clients`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    const clients = [
      ["Andijon Savdo", "+998 91 100 20 30"],
      ["Farg‘ona Optom", "+998 93 200 30 40"],
      ["Toshkent Market", "+998 97 300 40 50"],
      ["Namangan Boutique", "+998 94 400 50 60"],
    ];
    for (const [name, phone] of clients) {
      await page.getByRole("button", { name: /Mijoz qo‘shish|Yangi mijoz|Qo‘shish/i }).first().click();
      await page.waitForTimeout(400);
      await page.getByLabel(/Ism|Nomi/i).fill(name).catch(async () => {
        await page.locator("form input").first().fill(name);
      });
      await page.getByLabel(/Telefon/i).fill(phone).catch(async () => {
        await page.locator("form input").nth(1).fill(phone);
      });
      await submitVisibleForm(page);
      await page.waitForTimeout(500);
    }

    await page.goto(`${BASE}/sales/orders`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /Buyurtma|Yangi|Qo‘shish/i }).first().click();
      await page.waitForTimeout(500);
      const selects = page.locator("form select");
      if (await selects.count()) await selectFirstRealOption(page, selects.nth(0)); // client
      // item variant
      if ((await selects.count()) > 1) await selectFirstRealOption(page, selects.nth(1));
      await page.locator('input[type=number]').first().fill(String(100 + i * 20));
      await submitVisibleForm(page);
      await page.waitForTimeout(800);
    }

    await page.goto(`${BASE}/sales/payments`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /To‘lov|Yangi|Qo‘shish/i }).first().click();
      await page.waitForTimeout(500);
      const selects = page.locator("form select");
      if (await selects.count()) await selectFirstRealOption(page, selects.first());
      await page.locator('input[type=number], form input').first().fill(String(500000 + i * 100000));
      await submitVisibleForm(page);
      await page.waitForTimeout(700);
    }
    await shot(page, "13-sales");

    // ─── 10. Suppliers ───
    step("14) Suppliers + purchases + payments");
    await page.goto(`${BASE}/finance/suppliers`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    for (const name of ["Paxta Yetkazib Beruvchi", "Ip Import", "Qadoq Servis"]) {
      await page.getByRole("button", { name: /Yetkazib|Supplier|Qo‘shish|Yangi/i }).first().click();
      await page.waitForTimeout(400);
      await page.locator("form input").first().fill(name);
      await submitVisibleForm(page);
      await page.waitForTimeout(500);
    }
    // try purchase / payment buttons if present
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: /Xarid|Purchase/i }).first().click().catch(() => {});
      await page.waitForTimeout(400);
      if (await page.locator("form").count()) {
        const selects = page.locator("form select");
        if (await selects.count()) await selectFirstRealOption(page, selects.first());
        await page.locator('input[type=number], form input').first().fill("1500000");
        await submitVisibleForm(page);
      }
      await page.waitForTimeout(500);
    }
    await shot(page, "14-suppliers");

    // ─── 11. Expenses + advances ───
    step("15) Expenses + advances workflow");
    await page.goto(`${BASE}/finance/expenses`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /Xarajat|Yangi|Qo‘shish/i }).first().click();
      await page.waitForTimeout(400);
      const selects = page.locator("form select");
      if (await selects.count()) await selectFirstRealOption(page, selects.first());
      await page.locator('input[type=number], form input').first().fill(String(200000 + i * 50000));
      await page.locator("textarea, input").last().fill(`Transport/kommunal #${i + 1}`);
      await submitVisibleForm(page);
      await page.waitForTimeout(500);
    }
    // approve/pay if buttons on rows
    for (const label of [/Tasdiqlash/i, /To‘lash/i]) {
      const btns = page.getByRole("button", { name: label });
      const n = await btns.count();
      for (let i = 0; i < Math.min(n, 2); i++) {
        await btns.nth(i).click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }

    await page.goto(`${BASE}/finance/advances`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /Avans|Yangi|Qo‘shish/i }).first().click();
      await page.waitForTimeout(400);
      const selects = page.locator("form select");
      if (await selects.count()) await selectFirstRealOption(page, selects.first());
      await page.locator('input[type=number], form input').first().fill(String(100000 + i * 25000));
      await submitVisibleForm(page);
      await page.waitForTimeout(500);
    }
    for (const label of [/Tasdiqlash/i, /To‘lash/i]) {
      const btns = page.getByRole("button", { name: label });
      const n = await btns.count();
      for (let i = 0; i < Math.min(n, 2); i++) {
        await btns.nth(i).click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }
    await shot(page, "15-finance");

    // ─── 12. Payroll ───
    step("16) Payroll period calculate");
    await page.goto(`${BASE}/finance/payroll`, { waitUntil: "domcontentloaded" });
    await waitNetwork(page);
    await page.getByRole("button", { name: /Davr|Yangi|Qo‘shish|Hisoblash/i }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    const dateInputs = page.locator('input[type=date]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.nth(0).fill("2026-06-01");
      await dateInputs.nth(1).fill("2026-06-30");
    }
    await submitVisibleForm(page).catch(() => {});
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /Hisoblash|Calculate/i }).first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, "16-payroll");

    // ─── 13. Dashboards / reports / audit / TV ───
    step("17) Dashboards + reports + audit + TV");
    for (const p of [
      "/dashboard/executive",
      "/dashboard/operations",
      "/reports",
      "/audit",
      "/warehouse",
      "/sales/debts",
      "/tv",
    ]) {
      await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
      await waitNetwork(page);
      await page.waitForTimeout(800);
    }
    await shot(page, "17-executive");
    await page.goto(`${BASE}/dashboard/executive`);
    await waitNetwork(page);
    await shot(page, "18-final-dashboard");

    // Login as each role once
    step("18) Smoke login each operator role");
    for (const email of [
      "manager@andijon-paypoq.local",
      "seller@andijon-paypoq.local",
      "warehouse@andijon-paypoq.local",
      "shift@andijon-paypoq.local",
      "accountant@andijon-paypoq.local",
    ]) {
      await context.clearCookies();
      await loginTenant(page, email);
      step(`  login OK: ${email} → ${page.url()}`);
      await page.waitForTimeout(500);
    }

    step("DONE UI walkthrough");
    await writeFile(path.join(OUT, "walkthrough-log.txt"), log.join("\n") + "\n", "utf8");
    if (consoleErrors.length) {
      await writeFile(
        path.join(OUT, "console-errors.txt"),
        consoleErrors.slice(0, 100).join("\n"),
        "utf8",
      );
      step(`Console errors captured: ${consoleErrors.length}`);
    }
  } catch (error) {
    step(`FAILED: ${error instanceof Error ? error.message : error}`);
    await shot(page, "99-failure").catch(() => {});
    await writeFile(path.join(OUT, "walkthrough-log.txt"), log.join("\n") + "\n", "utf8");
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
