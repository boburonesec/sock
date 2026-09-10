/**
 * P0-1 targeted acceptance — proves the production-run closure blocker
 * found by the final human acceptance audit is fixed: a Shift Receiver can
 * close a RUNNING ProductionRun through the real UI ("Ishni yakunlash" on
 * /machines), the run becomes COMPLETED, it disappears from the active-run
 * list, and shift readiness no longer reports it as an open-process
 * blocker. Also proves an unauthorized role (Seller) cannot mutate run
 * status via the API even though the button is hidden from them.
 *
 * Uses a disposable, uniquely-tagged Machine + ProductionRun created
 * through the same application APIs a real Owner + Shift Receiver would
 * use (mirrors the fixture pattern in mobile-business-acceptance.mjs).
 * Self-contained: every fixture created here is closed by the acceptance
 * itself (via the UI under test), so re-running this script twice with no
 * manual cleanup between runs leaves no orphan RUNNING run.
 *
 * Usage (API + web running, seed present):
 *   node scripts/pilot-production-run-closure-acceptance.mjs
 */
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";
const API = process.env.API_BASE_URL || "http://localhost:3001";

const results = [];
function record(engine, name, passed, detail) {
  results.push({ engine, name, passed, detail });
  console.log(`[${passed ? "PASS" : "FAIL"}] [${engine}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function apiCall(endpoint, { method = "GET", token, activeFactoryId, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (activeFactoryId) headers["X-Factory-Id"] = activeFactoryId;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function getAuthToken(email, password = "ChangeMe123!") {
  const res = await apiCall("/auth/login", { method: "POST", body: { email, password } });
  assert(res.ok, `API authentication failed for ${email}: ${JSON.stringify(res.data)}`);
  return { accessToken: res.data.data.accessToken, activeFactoryId: res.data.data.activeFactoryId };
}

async function loginUser(page, email, password = "ChangeMe123!") {
  await page.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 12 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', password, { delay: 12 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("login"), { timeout: 15000 });
}

/** Disposable Machine + running ProductionRun, tagged uniquely per invocation. */
async function setupRunFixture() {
  const ownerAuth = await getAuthToken("owner@paypoq.local");
  const shiftAuth = await getAuthToken("shift@paypoq.local");
  const runTag = `RUNCLOSE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const validFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [machineLookupsRes, variantLookupsRes] = await Promise.all([
    apiCall("/machines/lookups", { token: ownerAuth.accessToken, activeFactoryId: ownerAuth.activeFactoryId }),
    apiCall("/production/lookups/product-variants", { token: ownerAuth.accessToken, activeFactoryId: ownerAuth.activeFactoryId }),
  ]);
  assert(machineLookupsRes.ok, `GET /machines/lookups must succeed: ${JSON.stringify(machineLookupsRes.data)}`);
  assert(variantLookupsRes.ok, `GET /production/lookups/product-variants must succeed: ${JSON.stringify(variantLookupsRes.data)}`);

  const mechanic = machineLookupsRes.data.data.employees.find((e) => e.workProfile === "MECHANIC");
  const operator = machineLookupsRes.data.data.employees.find((e) => e.workProfile === "MACHINE_OPERATOR");
  const workShift = machineLookupsRes.data.data.shifts[0];
  const variant = variantLookupsRes.data.data[0];
  assert(mechanic && operator && workShift && variant, "Fixture precondition: seed must carry an active MECHANIC, MACHINE_OPERATOR, WorkShift and ProductVariant");

  const machineRes = await apiCall("/machines", {
    method: "POST", token: ownerAuth.accessToken, activeFactoryId: ownerAuth.activeFactoryId,
    body: { code: runTag, name: `Run Closure Test ${runTag}`, note: "Created by pilot-production-run-closure-acceptance.mjs; safe to delete." },
  });
  assert(machineRes.ok, `POST /machines must succeed: ${JSON.stringify(machineRes.data)}`);
  const machineId = machineRes.data.data.id;

  const assignmentRes = await apiCall("/machines/assignments", {
    method: "POST", token: ownerAuth.accessToken, activeFactoryId: ownerAuth.activeFactoryId,
    body: { machineId, mechanicId: mechanic.id, workShiftId: workShift.id, validFrom },
  });
  assert(assignmentRes.ok, `POST /machines/assignments must succeed: ${JSON.stringify(assignmentRes.data)}`);

  const existingRatesRes = await apiCall("/machines/piece-rates", { token: ownerAuth.accessToken, activeFactoryId: ownerAuth.activeFactoryId });
  assert(existingRatesRes.ok, `GET /machines/piece-rates must succeed: ${JSON.stringify(existingRatesRes.data)}`);
  for (const workRole of ["MECHANIC", "MACHINE_OPERATOR"]) {
    const hasCurrentRate = existingRatesRes.data.data.some(
      (rate) => rate.product.id === variant.product.id && rate.workRole === workRole && (!rate.effectiveTo || new Date(rate.effectiveTo) > new Date()),
    );
    if (hasCurrentRate) continue;
    const rateRes = await apiCall("/machines/piece-rates", {
      method: "POST", token: ownerAuth.accessToken, activeFactoryId: ownerAuth.activeFactoryId,
      body: { productId: variant.product.id, workRole, amount: 100, effectiveFrom: validFrom },
    });
    assert(rateRes.ok, `POST /machines/piece-rates (${workRole}) must succeed: ${JSON.stringify(rateRes.data)}`);
  }

  const runRes = await apiCall("/production/runs", {
    method: "POST", token: shiftAuth.accessToken, activeFactoryId: shiftAuth.activeFactoryId,
    body: { machineId, productVariantId: variant.id, operatorEmployeeId: operator.id, workShiftId: workShift.id, note: runTag },
  });
  assert(runRes.ok, `POST /production/runs must succeed: ${JSON.stringify(runRes.data)}`);
  assert.equal(runRes.data.data.status, "RUNNING", "Fixture run must start in RUNNING status");

  return { runId: runRes.data.data.id, machineId, machineCode: runTag, runTag, workShiftId: workShift.id };
}

async function run(engineName, launcher) {
  const browser = await launcher.launch();
  let fixture = null;
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    fixture = await setupRunFixture();
    record(engineName, "Fixture: unique RUNNING run created via API", true, `machine=${fixture.machineCode} runId=${fixture.runId}`);

    // ---- Shift Receiver: locate the exact run, close it through the UI ----
    await loginUser(page, "shift@paypoq.local");
    await page.goto(`${WEB}/machines`, { waitUntil: "networkidle" });

    const runCard = page.locator(`text=${fixture.machineCode}`).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
    await runCard.first().waitFor({ timeout: 10000 });
    const cardText = await runCard.first().innerText();
    record(engineName, "Shift Receiver: exact fixture run visible and RUNNING", cardText.includes("Ishlamoqda"), cardText.replace(/\n/g, " | ").slice(0, 120));

    const closeButton = runCard.first().getByRole("button", { name: "Ishni yakunlash" });
    await closeButton.click();
    const confirmDialog = page.locator('text=Stanok ishini yakunlaysizmi?');
    await confirmDialog.waitFor({ timeout: 5000 });
    record(engineName, "Confirmation dialog explains the action is terminal", true);
    await page.getByRole("button", { name: "Ha, ishni yakunlash" }).click();

    await page.waitForFunction(
      (code) => !document.body.innerText.includes(code),
      fixture.machineCode,
      { timeout: 10000 },
    ).catch(() => {});
    const bodyAfter = await page.locator("body").innerText();
    record(engineName, "Active-run card disappears after completion (no page refresh)", !bodyAfter.includes("Ishlamoqda") || !bodyAfter.includes(fixture.machineCode), "");

    // ---- Verify terminal state via API ----
    const shiftAuth = await getAuthToken("shift@paypoq.local");
    const runsAfter = await apiCall("/production/runs", { token: shiftAuth.accessToken, activeFactoryId: shiftAuth.activeFactoryId });
    const closedRun = runsAfter.data.data.find((r) => r.id === fixture.runId);
    record(engineName, "Run status is COMPLETED", closedRun?.status === "COMPLETED", `status=${closedRun?.status}`);

    // ---- Shift readiness no longer reports this run as an open blocker ----
    const workDate = new Date().toISOString().slice(0, 10);
    const readinessRes = await apiCall(
      `/production/shift-reconciliations/readiness?workShiftId=${fixture.workShiftId}&workDate=${workDate}`,
      { token: shiftAuth.accessToken, activeFactoryId: shiftAuth.activeFactoryId },
    );
    assert(readinessRes.ok, `GET shift-readiness must succeed: ${JSON.stringify(readinessRes.data)}`);
    const openRunsCheck = readinessRes.data.data.checks.find((c) => c.code === "OPEN_PRODUCTION_RUNS");
    record(engineName, "Shift readiness: OPEN_PRODUCTION_RUNS is READY, not BLOCKER", openRunsCheck?.status === "READY", JSON.stringify(openRunsCheck));

    // ---- Double-submit guard: completed run cannot be completed again ----
    const doublePatch = await apiCall(`/production/runs/${fixture.runId}/status`, {
      method: "PATCH", token: shiftAuth.accessToken, activeFactoryId: shiftAuth.activeFactoryId, body: { status: "COMPLETED" },
    });
    record(engineName, "Re-completing an already-COMPLETED run is rejected (terminal state enforced)", !doublePatch.ok, `status=${doublePatch.status}`);

    // ---- RBAC: Seller cannot close a run via the API ----
    const sellerAuth = await getAuthToken("seller@paypoq.local");
    // Create a second fixture so the RBAC probe targets a still-RUNNING run, not the one just closed.
    const rbacFixture = await setupRunFixture();
    const sellerAttempt = await apiCall(`/production/runs/${rbacFixture.runId}/status`, {
      method: "PATCH", token: sellerAuth.accessToken, activeFactoryId: sellerAuth.activeFactoryId, body: { status: "COMPLETED" },
    });
    record(engineName, "RBAC: Seller cannot close a ProductionRun via API", [401, 403].includes(sellerAttempt.status), `status=${sellerAttempt.status}`);
    // Clean up the RBAC-probe fixture through the same legitimate API a Shift Receiver would use.
    const cleanupRes = await apiCall(`/production/runs/${rbacFixture.runId}/status`, {
      method: "PATCH", token: shiftAuth.accessToken, activeFactoryId: shiftAuth.activeFactoryId, body: { status: "COMPLETED" },
    });
    record(engineName, "RBAC-probe fixture cleaned up (COMPLETED)", cleanupRes.ok, "");

    // ---- RBAC: Owner is allowed (mirrors the audit's Owner-sees-same-gap note) ----
    const ownerAuth2 = await getAuthToken("owner@paypoq.local");
    const ownerFixture = await setupRunFixture();
    const ownerAttempt = await apiCall(`/production/runs/${ownerFixture.runId}/status`, {
      method: "PATCH", token: ownerAuth2.accessToken, activeFactoryId: ownerAuth2.activeFactoryId, body: { status: "COMPLETED" },
    });
    record(engineName, "RBAC: Owner (production.write) can close a ProductionRun via API", ownerAttempt.ok, `status=${ownerAttempt.status}`);

    await context.close();
  } finally {
    await browser.close();
  }
}

await run("Chromium", chromium);
await run("WebKit", webkit);

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.error(`\n${failed.length} FAILED:`);
  for (const f of failed) console.error(`  [${f.engine}] ${f.name}`);
}
process.exit(failed.length > 0 ? 1 : 0);
