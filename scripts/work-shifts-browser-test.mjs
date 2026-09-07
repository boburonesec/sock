import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";

async function run() {
  console.log("--- [PLAYWRIGHT] E2E WORK SHIFTS ISOLATION TEST ---");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let unhandledRejectionFound = false;
  page.on('pageerror', err => {
    unhandledRejectionFound = true;
    console.error("UNEXPECTED PAGE ERROR:", err);
  });

  try {
    console.log("Navigating to login...");
    await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
    
    await page.waitForSelector("#email");

    await page.locator("#email").fill("owner@paypoq.local");
    await page.locator("#password").fill("ChangeMe123!");
    await page.getByRole("button", { name: "Kirish" }).click();
    
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 10000 });

    console.log("Navigating to settings/shifts...");
    await page.goto(`${WEB}/settings/shifts`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Ish smenalari", { timeout: 10000 });
    
    const dayForm = page.locator("form").nth(0);
    const nightForm = page.locator("form").nth(1);
    
    const ts = Date.now().toString().slice(-4);

    console.log("Scenario A: Edit NIGHT without saving, save DAY, check isolation...");
    await dayForm.locator("#DAY-name").fill("Kunduzgi " + ts);
    await nightForm.locator("#NIGHT-name").fill("Kechki unsaved " + ts);

    let dayPutUrl = "";
    let dayPutPayload = null;
    let nightPutRequestCount = 0;
    
    page.on("request", req => {
      if (req.method() === "PUT" && req.url().includes("NIGHT")) nightPutRequestCount++;
      if (req.method() === "PUT" && req.url().includes("DAY")) {
        dayPutUrl = req.url();
        dayPutPayload = JSON.parse(req.postData() || "{}");
      }
    });

    // Intercept DAY save to introduce a delay and observe saving state
    await page.route("**/settings/work-shifts/DAY", async (route) => {
      if (route.request().method() === "PUT") {
        await new Promise(r => setTimeout(r, 1000));
        await route.continue();
      } else {
        route.continue();
      }
    });

    const saveDayPromise1 = page.waitForResponse(resp => resp.url().includes("DAY") && resp.request().method() === "PUT");
    await dayForm.locator('button[type="submit"]').click();
    
    // While DAY is saving, check that NIGHT is NOT disabled
    await page.waitForTimeout(200);
    const nightNameInput = nightForm.locator("#NIGHT-name");
    assert.equal(await nightNameInput.isDisabled(), false, "NIGHT form must NOT be disabled while DAY is saving");
    const dayNameInput = dayForm.locator("#DAY-name");
    assert.equal(await dayNameInput.isDisabled(), true, "DAY form MUST be disabled while DAY is saving");

    await saveDayPromise1;
    
    // Verify success feedback
    await page.waitForSelector("text=Smena sozlamasi saqlandi.");
    assert.ok(await dayForm.locator("text=Smena sozlamasi saqlandi.").isVisible(), "Success message must be on DAY");
    

    assert.ok(dayPutUrl.endsWith("/DAY"), "DAY request uses correct endpoint");
    assert.equal(dayPutPayload.code, "DAY", "DAY payload has correct code");
    assert.equal(dayPutPayload.name, "Kunduzgi " + ts, "DAY payload has expected name");
    assert.equal(nightPutRequestCount, 0, "NIGHT should NOT trigger request when DAY saves");

    await page.waitForTimeout(500); 
    const nightNameVal = await nightNameInput.inputValue();
    assert.equal(nightNameVal, "Kechki unsaved " + ts, "NIGHT unsaved changes should be preserved after DAY refetch");
    console.log("Scenario A passed.");

    console.log("Scenario B: Edit DAY without saving, save NIGHT, check isolation...");
    await page.unroute("**/settings/work-shifts/DAY"); // clear day route
    
    await dayForm.locator("#DAY-name").fill("Kunduzgi unsaved " + ts);
    await nightForm.locator("#NIGHT-name").fill("Kechki " + ts);

    let nightPutUrl = "";
    let nightPutPayload = null;
    let dayPutRequestCount = 0;
    
    page.on("request", req => {
      if (req.method() === "PUT" && req.url().includes("DAY")) dayPutRequestCount++;
      if (req.method() === "PUT" && req.url().includes("NIGHT")) {
        nightPutUrl = req.url();
        nightPutPayload = JSON.parse(req.postData() || "{}");
      }
    });

    await page.route("**/settings/work-shifts/NIGHT", async (route) => {
      if (route.request().method() === "PUT") {
        await new Promise(r => setTimeout(r, 1000));
        await route.continue();
      } else {
        route.continue();
      }
    });

    const saveNightPromise = page.waitForResponse(resp => resp.url().includes("NIGHT") && resp.request().method() === "PUT");
    await nightForm.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(200);
    assert.equal(await dayForm.locator("#DAY-name").isDisabled(), false, "DAY form must NOT be disabled while NIGHT is saving");
    assert.equal(await nightForm.locator("#NIGHT-name").isDisabled(), true, "NIGHT form MUST be disabled while NIGHT is saving");

    await saveNightPromise;
    
    // Verify success feedback
    await page.waitForSelector("text=Smena sozlamasi saqlandi.");
    assert.ok(await nightForm.locator("text=Smena sozlamasi saqlandi.").isVisible(), "Success message must be on NIGHT");
    

    assert.ok(nightPutUrl.endsWith("/NIGHT"), "NIGHT request uses correct endpoint");
    assert.equal(nightPutPayload.code, "NIGHT", "NIGHT payload has correct code");
    assert.equal(nightPutPayload.name, "Kechki " + ts, "NIGHT payload has expected name");
    assert.equal(dayPutRequestCount, 0, "DAY should NOT trigger request when NIGHT saves");
    
    await page.waitForTimeout(500);
    const dayNameVal = await dayForm.locator("#DAY-name").inputValue();
    assert.equal(dayNameVal, "Kunduzgi unsaved " + ts, "DAY unsaved changes should be preserved after NIGHT refetch");
    console.log("Scenario B passed.");
    
    // Verify persistence (reload the page and check DB actually only saved the submitted shifts)
    console.log("Verifying persistence...");
    await page.goto(`${WEB}/settings/shifts`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Ish smenalari", { timeout: 10000 });
    const reloadedDayName = await page.locator("form").nth(0).locator("#DAY-name").inputValue();
    const reloadedNightName = await page.locator("form").nth(1).locator("#NIGHT-name").inputValue();
    assert.equal(reloadedDayName, "Kunduzgi " + ts, "DAY persistence matches server state (discarding unsaved edit)");
    assert.equal(reloadedNightName, "Kechki " + ts, "NIGHT persistence matches server state (discarding unsaved edit)");
    console.log("Persistence verified.");

    console.log("Scenario C: Double submit prevention...");
    const dayForm2 = page.locator("form").nth(0);
    await dayForm2.locator("#DAY-name").fill("Double submit " + ts);
    
    let submitCount = 0;
    const reqListener = req => {
      if (req.method() === "PUT" && req.url().includes("DAY")) submitCount++;
    };
    page.on("request", reqListener);

    await page.route("**/settings/work-shifts/DAY", async (route) => {
      if (route.request().method() === "PUT") {
        await new Promise(r => setTimeout(r, 1000));
        await route.continue();
      } else {
        route.continue();
      }
    });

    const saveBtn = dayForm2.locator('button[type="submit"]');
    const doubleSubmitPromise = page.waitForResponse(resp => resp.url().includes("DAY") && resp.request().method() === "PUT");
    
    await saveBtn.click();
    assert.equal(await saveBtn.isDisabled(), true, "Button should be disabled immediately after click");
    
    // Attempt second click normally (will fail if button is disabled)
    // The previous test used { force: true }. The instruction says: "Avoid relying only on { force: true } to prove normal-user double-submit behavior."
    // Playwright natively won't click a disabled button. We can try dispatchEvent or just check disabled state.
    try {
      await saveBtn.click({ timeout: 500 });
    } catch (e) {
      // Expected to fail because button is disabled
    }
    
    // Fallback: force a click to ensure the mutation logic itself isn't re-triggerable even if bypassed
    await saveBtn.click({ force: true });
    
    await doubleSubmitPromise;
    assert.equal(submitCount, 1, "Should only submit once despite multiple interactions");
    page.removeListener("request", reqListener);
    await page.unroute("**/settings/work-shifts/DAY");
    await page.waitForSelector("text=Smena sozlamasi saqlandi.", { timeout: 10000 });
    console.log("Scenario C passed.");

    console.log("Scenario D: Controlled API failure...");
    // We are mocking a failure scenario for a 400 Bad Request
    let mockTriggered = false;
    await page.route("**/settings/work-shifts/DAY", async (route) => {
      if (route.request().method() === "PUT") {
        mockTriggered = true;
        await route.fulfill({ status: 400, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Allow-Headers": "*" }, body: JSON.stringify({ message: "Mock error message" }) });
      } else {
        route.continue();
      }
    });

    await dayForm2.locator("#DAY-name").fill("Error " + ts);
    await dayForm2.locator('button[type="submit"]').click({ force: true });
    
    
    await page.waitForTimeout(500);
    assert.ok(mockTriggered, "Mock was hit successfully");
    
    // Wait for the UI to update and show the alert
    await page.waitForTimeout(500);
    const dayAlert = dayForm2.locator('p[role="alert"]');
    await dayAlert.waitFor({ state: "visible", timeout: 5000 });
    const nightForm2 = page.locator("form").nth(1);
    assert.equal(await nightForm2.locator('p[role="alert"]').count(), 0, "Opposite form must NOT display error");
    
    // Check that NIGHT state is untouched
    assert.equal(await nightForm2.locator("#NIGHT-name").inputValue(), "Kechki " + ts, "Opposite form state remains untouched");
    
    assert.equal(unhandledRejectionFound, false, "Browser console must not have unhandled promise rejection");
    console.log("Scenario D passed.");

    console.log("ALL BEHAVIORAL TESTS PASSED.");
    process.exit(0);

  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
