/**
 * UI: full payment allocation → stock for finished goods → deliver orders.
 * Uses existing Andijon demo factory data.
 *
 * PLAYWRIGHT_PKG=/tmp/paypoq-pw node scripts/ui-demo-payments-delivery.mjs
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
const API = process.env.API_BASE_URL || "http://localhost:3001";
const PASS = "ChangeMe123!";
const OUT = path.join(ROOT, "docs", "demo-walkthrough");
const log = [];
const step = (m) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`;
  console.log(line);
  log.push(line);
};

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
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASS);
  await page.locator('form button[type="submit"]').click({ force: true });
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 25000 });
  await page.waitForTimeout(500);
}

async function closeAll(page) {
  for (let i = 0; i < 5; i++) {
    if ((await page.locator('[role="dialog"]').count()) === 0) break;
    await page
      .locator('[role="dialog"]')
      .last()
      .locator('button[aria-label="Yopish"]')
      .click()
      .catch(() => page.keyboard.press("Escape"));
    await page.waitForTimeout(300);
  }
}

async function apiLogin(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASS }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`API login failed ${email}: ${res.status}`);
  return json.data.accessToken;
}

async function apiGet(token, pathSuffix) {
  const res = await fetch(`${API}${pathSuffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${pathSuffix} → ${res.status}`);
  return json.data;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const sellerToken = await apiLogin("seller@andijon-paypoq.local");
  const orders = await apiGet(sellerToken, "/sales/orders");
  const unpaid = orders.filter(
    (o) => o.paymentStatus !== "PAID" && !["DRAFT", "CANCELLED", "DELIVERED"].includes(o.status),
  );
  step(`Unpaid/open orders: ${unpaid.length}`);
  unpaid.forEach((o) =>
    step(
      `  ${o.orderNumber} ${o.client.name} total=${o.totalAmount} pay=${o.paymentStatus} qty=${o.items?.map((i) => i.quantity).join("+")}`,
    ),
  );

  const need = new Map();
  for (const o of orders) {
    if (["DRAFT", "CANCELLED", "DELIVERED"].includes(o.status)) continue;
    for (const item of o.items || []) {
      const id = item.productVariant.id;
      const label = `${item.productVariant.product.name} · ${item.productVariant.color.name}`;
      need.set(id, {
        qty: (need.get(id)?.qty || 0) + item.quantity,
        label,
      });
    }
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(25000);

  try {
    step("1) Seller: pay each order fully (allocation = full order amount)");
    await login(page, "seller@andijon-paypoq.local");
    await page.goto(`${BASE}/sales/payments`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    for (const order of unpaid) {
      step(`  pay ${order.orderNumber} amount ${order.totalAmount}`);
      await closeAll(page);
      await page.getByRole("button", { name: /To.?.lov qayd qilish/i }).click();
      await page.locator("#paymentClient").waitFor({ state: "visible" });
      await page.locator("#paymentClient").selectOption({ label: order.client.name });
      await page.waitForTimeout(500);
      await page.locator("#paymentAmount").fill(String(order.totalAmount));
      await page.locator("#paymentMethod").selectOption("CASH");

      const orderSelect = page.locator('select[id^="paymentAllocationOrder"]').first();
      const options = orderSelect.locator("option");
      let picked = false;
      for (let i = 0; i < (await options.count()); i++) {
        const text = await options.nth(i).innerText();
        if (text.includes(order.orderNumber)) {
          await orderSelect.selectOption({ index: i });
          picked = true;
          break;
        }
      }
      if (!picked) throw new Error(`Order option missing: ${order.orderNumber}`);

      await page
        .locator('input[id^="paymentAllocationAmount"]')
        .first()
        .fill(String(order.totalAmount));
      await page.locator('[role="dialog"] form button[type="submit"]').click();
      await page.waitForTimeout(1500);

      const stillOpen = await page.locator("#paymentClient").isVisible().catch(() => false);
      if (stillOpen) {
        const alert = page.locator('[role="dialog"] [role="alert"], [role="dialog"] .text-rose-300');
        const msg = (await alert.first().innerText().catch(() => "")) || "drawer stayed open";
        step(`  ! payment error: ${msg}`);
        await page.screenshot({
          path: path.join(OUT, `payment-error-${order.orderNumber}.png`),
          fullPage: true,
        });
        await closeAll(page);
      } else {
        step(`  payment OK ${order.orderNumber}`);
      }
    }

    const afterPay = await apiGet(await apiLogin("seller@andijon-paypoq.local"), "/sales/orders");
    afterPay.forEach((o) => step(`  after pay: ${o.orderNumber} ${o.paymentStatus} ${o.status}`));
    await page.screenshot({ path: path.join(OUT, "payments-done.png"), fullPage: true });

    step("2) Warehouse: stock correction per ordered variant (Finished Products)");
    await login(page, "warehouse@andijon-paypoq.local");
    await page.getByRole("button", { name: "OK" }).click().catch(() => {});
    await page.goto(`${BASE}/warehouse`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "OK" }).click().catch(() => {});

    for (const [variantId, info] of need.entries()) {
      const targetQty = info.qty + 20;
      step(`  correct stock ${info.label} → ${targetQty}`);
      await closeAll(page);
      await page.getByRole("button", { name: /Qoldiqni tuzatish/i }).first().click();
      await page.locator("#stockCorrectionItemType").waitFor({ state: "visible" });
      await page.locator("#stockCorrectionItemType").selectOption("PRODUCT");
      await page.waitForTimeout(400);

      const vs = page.locator("#stockCorrectionProductVariantId");
      const byValue = await vs.locator(`option[value="${variantId}"]`).count();
      if (byValue) {
        await vs.selectOption(variantId);
      } else {
        const productName = info.label.split(" · ")[0];
        const opts = vs.locator("option");
        let matched = false;
        for (let i = 0; i < (await opts.count()); i++) {
          const t = await opts.nth(i).innerText();
          if (t.includes(productName) || (t.includes("Klassik") && t.includes("Ko"))) {
            const v = await opts.nth(i).getAttribute("value");
            if (v) {
              await vs.selectOption(v);
              matched = true;
              break;
            }
          }
        }
        if (!matched) throw new Error(`Variant option missing for ${info.label}`);
      }

      const zs = page.locator("#stockCorrectionWarehouseZoneId");
      const zopts = zs.locator("option");
      let zonePicked = false;
      for (let i = 0; i < (await zopts.count()); i++) {
        const t = await zopts.nth(i).innerText();
        if (/Finished|Tayyor/i.test(t)) {
          await zs.selectOption({ index: i });
          zonePicked = true;
          break;
        }
      }
      if (!zonePicked) throw new Error("Finished Products zone not found in UI");

      await page.locator("#stockCorrectionNewQuantity").fill(String(targetQty));
      await page
        .locator("#stockCorrectionReason")
        .fill("UI demo: yetkazish uchun tayyor mahsulot qoldig‘i (sanoq tuzatish)");
      await page.locator('[role="dialog"] form button[type="submit"]').click();
      await page.waitForTimeout(1500);

      const stillOpen = await page
        .locator("#stockCorrectionNewQuantity")
        .isVisible()
        .catch(() => false);
      if (stillOpen) {
        const err = page.locator('[role="dialog"] [role=alert], [role="dialog"] .text-rose-300');
        const msg = (await err.first().innerText().catch(() => "")) || "drawer stayed open";
        step(`  ! correction error: ${msg}`);
        await page.screenshot({
          path: path.join(OUT, `stock-error-${variantId.slice(0, 8)}.png`),
          fullPage: true,
        });
        await closeAll(page);
      } else {
        step(`  stock OK ${info.label}`);
      }
    }

    const stock = await apiGet(await apiLogin("owner@andijon-paypoq.local"), "/warehouse/stock");
    step(`  stock rows: ${stock.length}`);
    stock.forEach((r) =>
      step(
        `    qty=${r.quantity} ${r.productVariant?.product?.name || ""} / ${r.zone?.name || r.warehouseZone?.name || ""}`,
      ),
    );

    step("3) Seller: deliver paid orders");
    await login(page, "seller@andijon-paypoq.local");
    await page.goto(`${BASE}/sales/orders`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const refreshed = await apiGet(await apiLogin("seller@andijon-paypoq.local"), "/sales/orders");
    for (const order of refreshed) {
      if (order.paymentStatus !== "PAID" || order.status === "DELIVERED") {
        step(`  skip ${order.orderNumber} pay=${order.paymentStatus} status=${order.status}`);
        continue;
      }
      step(`  deliver ${order.orderNumber}`);
      await closeAll(page);
      // dismiss alertdialog if any leftover
      while ((await page.locator('[role="alertdialog"]').count()) > 0) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }

      await page.getByText(order.orderNumber).first().click();
      await page.waitForTimeout(700);
      const drawer = page.locator('[role="dialog"]').last();
      const deliver = drawer.getByRole("button", { name: /^Yetkazildi qilish$/i });
      if ((await deliver.count()) === 0) {
        step(`  ! no deliver button`);
        await page.screenshot({
          path: path.join(OUT, `deliver-missing-${order.orderNumber}.png`),
          fullPage: true,
        });
        await closeAll(page);
        continue;
      }
      if (await deliver.first().isDisabled()) {
        step(`  ! deliver button disabled (not fully paid or closed)`);
        await page.screenshot({
          path: path.join(OUT, `deliver-disabled-${order.orderNumber}.png`),
          fullPage: true,
        });
        await closeAll(page);
        continue;
      }
      await deliver.first().click();
      const alert = page.locator('[role="alertdialog"]');
      await alert.waitFor({ state: "visible", timeout: 8000 });
      // Confirm inside alertdialog only (not the drawer button)
      await alert.getByRole("button", { name: /^Yetkazildi qilish$/i }).click();
      await page.waitForTimeout(1800);

      const status = page.locator('[role="status"]');
      if (await status.first().isVisible().catch(() => false)) {
        const msg = await status.first().innerText();
        if (/xatolik|Yetarli emas|cannot|error/i.test(msg)) {
          step(`  ! deliver error: ${msg}`);
        } else {
          step(`  delivered ${order.orderNumber}: ${msg}`);
        }
      } else {
        // verify via API later; log UI state
        step(`  deliver UI action done ${order.orderNumber}`);
      }
      await closeAll(page);
      // close alertdialog if still open
      if (await page.locator('[role="alertdialog"]').isVisible().catch(() => false)) {
        await page.keyboard.press("Escape");
      }
    }

    const finalOrders = await apiGet(await apiLogin("seller@andijon-paypoq.local"), "/sales/orders");
    finalOrders.forEach((o) =>
      step(`FINAL ${o.orderNumber} status=${o.status} pay=${o.paymentStatus}`),
    );
    const payments = await apiGet(await apiLogin("seller@andijon-paypoq.local"), "/sales/payments");
    step(`Payments count: ${payments.length}`);

    await login(page, "owner@andijon-paypoq.local");
    await page.goto(`${BASE}/dashboard/executive`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "after-delivery-executive.png"), fullPage: true });
    await page.goto(`${BASE}/sales/orders`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "after-delivery-orders.png"), fullPage: true });
    await page.goto(`${BASE}/sales/payments`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(OUT, "after-delivery-payments.png"), fullPage: true });

    step("DONE payments + delivery chain");
    await writeFile(path.join(OUT, "payments-delivery-log.txt"), log.join("\n") + "\n");
  } catch (e) {
    step(`FAILED: ${e instanceof Error ? e.message : e}`);
    await page
      .screenshot({ path: path.join(OUT, "payments-delivery-failure.png"), fullPage: true })
      .catch(() => {});
    await writeFile(path.join(OUT, "payments-delivery-log.txt"), log.join("\n") + "\n");
    throw e;
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
