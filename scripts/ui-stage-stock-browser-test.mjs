import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";

async function login(page) {
  const refresh = page.waitForResponse((response) => response.url().includes("/auth/refresh"));
  await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
  await refresh;
  await page.locator("#email").fill("owner@paypoq.local");
  await page.locator("#password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Kirish" }).click();
  await page.waitForURL(/\/dashboard\//, { waitUntil: "domcontentloaded" });
}

async function withAvailableQuantity(page, quantity, callback) {
  let selectedInventory;
  const handler = async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const payload = await response.json();
    const inventory = payload.data ?? payload;
    selectedInventory = inventory.find((item) => item.stage.name === "Averlog");
    assert.ok(selectedInventory, "Averlog fixture missing");
    selectedInventory.quantity = quantity;
    await route.fulfill({ response, json: payload });
  };
  await page.route("**/production/stage-inventory", handler);
  try {
    await page.goto(`${WEB}/production`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Keyingi bosqichga o‘tkazish" }).click();
    const dialog = page.getByRole("dialog", { name: "Keyingi bosqichga o‘tkazish" });
    await dialog.waitFor();
    await dialog.locator("#moveProductVariantId option:not([disabled])").first().waitFor({ state: "attached" });
    await dialog.locator("#moveProductVariantId").selectOption(selectedInventory.productVariant.id);
    if (selectedInventory.quantity > 0) {
      await dialog.locator("#sourceStageId option:not([disabled])").first().waitFor({ state: "attached" });
      await dialog.locator("#sourceStageId").selectOption(selectedInventory.stage.id);
    }
    await callback(dialog);
  } finally {
    await page.unroute("**/production/stage-inventory", handler);
  }
}

async function waitForValue(input, expected) {
  await input.evaluate((element, value) => new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000;
    const check = () => {
      if (element.value === value) return resolve();
      if (Date.now() >= deadline) {
        return reject(new Error(`expected quantity ${value}, received ${element.value}`));
      }
      requestAnimationFrame(check);
    };
    check();
  }), String(expected));
}

async function makeFormSubmittable(dialog) {
  await dialog.locator('input[type="checkbox"]').first().check();
  await dialog.locator('input[aria-label$=" miqdori"]').waitFor();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  try {
    await login(page);
    for (const state of [
      { available: 0, initial: "", enabled: false },
      { available: 149, initial: "149", enabled: true },
      { available: 500, initial: "500", enabled: true },
      { available: 700, initial: "500", enabled: true },
    ]) {
      await withAvailableQuantity(page, state.available, async (dialog) => {
        const quantity = dialog.locator("#moveQuantity");
        await waitForValue(quantity, state.initial);
        if (state.available > 0) {
          assert.equal(await quantity.getAttribute("max"), String(state.available));
        }
        const submit = dialog.locator('button[type="submit"]');
        if (state.available > 0) await makeFormSubmittable(dialog);
        assert.equal(await submit.isEnabled(), state.enabled);
        if (state.available > 0) {
          await quantity.fill(String(state.available + 1));
          assert.equal(await submit.isDisabled(), true, "over-stock submit must be disabled");
        }
        console.log(
          `PASS  stock=${state.available} initial=${state.initial || "empty"} max=${state.available} submit=${state.enabled ? "enabled" : "disabled"}`,
        );
      });
    }

    await withAvailableQuantity(page, 700, async (dialog) => {
      await makeFormSubmittable(dialog);
      const submit = dialog.locator('button[type="submit"]');
      let requests = 0;
      const handler = async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        requests += 1;
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 409,
            message: "Qoldiq boshqa operator tomonidan o‘zgartirildi. Sahifani yangilang.",
            error: "Conflict",
          }),
        });
      };
      await page.route("**/production/stage-movements", handler);
      try {
        await submit.click();
        await dialog.getByRole("alert").filter({ hasText: "Qoldiq" }).waitFor();
        assert.equal(requests, 1);
        assert.equal(await dialog.isVisible(), true);
        assert.equal(await page.getByText("Smena o‘tkazildi", { exact: false }).count(), 0);
      } finally {
        await page.unroute("**/production/stage-movements", handler);
      }
      console.log("PASS  concurrent stock conflict requests=1 drawer=open false-success=0");
    });
  } finally {
    await browser.close();
  }
  console.log("stage stock browser states: 5 passed, 0 failed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
