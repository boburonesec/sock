/**
 * Day-0 onboarding closure acceptance — proves, on a genuinely fresh tenant
 * (created per run through the Platform Admin API, never the shared demo
 * tenant), that:
 *
 * 1. Work Shifts: with zero persisted WorkShift rows the settings page does
 *    not claim "Saqlangan"; saving through the UI creates exactly one row per
 *    code; reload proves persistence; editing updates (never duplicates).
 * 2. Warehouse handoff stage: the prerequisite is visible in Settings before
 *    any shift-close failure; Shift Receiver sees the blocker with accurate
 *    guidance but no configuration control (and the API refuses them);
 *    Manager gets a direct "Sozlash" action; Owner reaches the authoritative
 *    control from Settings, configures it, readiness updates without reload,
 *    and the shift can then be submitted and accepted.
 * 3. Payroll: Calculate is performed by a normal click on the real visible
 *    button (no request from test code, no force, no JS click); exact
 *    breakdown appears; Manager approves; Accountant pays and closes.
 * 4. Supplier: purchase → partial payment → exact remaining debt via UI.
 *
 * Test code only uses the API for fixture setup and for read-only
 * verification after each UI mutation (plus one deliberately unauthorized
 * write that must be refused). Every run creates its own tenants and
 * suspends them at the end through the supported Platform Admin lifecycle,
 * so the script can run repeatedly with no manual cleanup.
 *
 * Usage (API + web running, platform admin seed present):
 *   node scripts/day0-onboarding-closure-acceptance.mjs
 */
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";
const API = process.env.API_BASE_URL || "http://localhost:3001";
const PASSWORD = "PilotTemp123!";

const results = [];
function record(run, name, passed, detail) {
  results.push({ run, name, passed, detail });
  console.log(`[${passed ? "PASS" : "FAIL"}] [${run}] ${name}${detail ? ` — ${detail}` : ""}`);
}
function check(run, name, condition, detail) {
  record(run, name, Boolean(condition), detail);
  assert(condition, `${run}: ${name}${detail ? ` — ${detail}` : ""}`);
}

async function apiCall(endpoint, { method = "GET", token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function login(email, password, platform = false) {
  const res = await apiCall(platform ? "/platform-auth/login" : "/auth/login", { method: "POST", body: { email, password } });
  assert(res.ok, `login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data.data.accessToken;
}

const digits = (text) => String(text).replace(/\D/g, "");
const num = (value) => Number(value);

/** Disposable tenant + owner + staff operators, all through legitimate APIs. */
async function createTenantFixture(label) {
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const platformToken = await login("platform@paypoq.local", "ChangeMe123!", true);
  const tenantRes = await apiCall("/platform-admin/tenants", {
    method: "POST", token: platformToken,
    body: { name: `DAY0-${label}-${tag}`, contactName: "Day-0 closure acceptance" },
  });
  assert(tenantRes.ok, `create tenant: ${JSON.stringify(tenantRes.data)}`);
  const tenantId = tenantRes.data.data.id;
  const emails = {
    owner: `day0-owner-${tag}@paypoq.local`,
    manager: `day0-manager-${tag}@paypoq.local`,
    accountant: `day0-accountant-${tag}@paypoq.local`,
    shift: `day0-shift-${tag}@paypoq.local`,
    seller: `day0-seller-${tag}@paypoq.local`,
  };
  const ownerRes = await apiCall(`/platform-admin/tenants/${tenantId}/owner-users`, {
    method: "POST", token: platformToken,
    body: { name: "Day0 Owner", email: emails.owner, password: PASSWORD },
  });
  assert(ownerRes.ok, `create owner: ${JSON.stringify(ownerRes.data)}`);
  const ownerToken = await login(emails.owner, PASSWORD);
  const users = {};
  for (const [key, roleName, name] of [["manager", "Manager", "Day0 Manager"], ["accountant", "Accountant", "Day0 Accountant"], ["shift", "Shift Receiver", "Day0 Shift"]]) {
    const res = await apiCall("/organization/users", { method: "POST", token: ownerToken, body: { name, email: emails[key], password: PASSWORD, roleName } });
    assert(res.ok, `create ${roleName}: ${JSON.stringify(res.data)}`);
    users[key] = res.data.data;
  }
  return { tag, tenantId, platformToken, ownerToken, emails, users };
}

async function suspendTenant(fixture) {
  if (!fixture) return;
  const platformToken = await login("platform@paypoq.local", "ChangeMe123!", true);
  const res = await apiCall(`/platform-admin/tenants/${fixture.tenantId}/suspend`, { method: "POST", token: platformToken });
  console.log(`cleanup: tenant ${fixture.tenantId} suspend → ${res.status}`);
}

async function openAs(browser, viewport, email) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (err) => console.error(`PAGE ERROR (${email}):`, err.message));
  await page.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 8 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', PASSWORD, { delay: 8 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), null, { timeout: 20_000 });
  return { context, page };
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
}

/** Primary action is visible, inside the viewport and not covered by any overlay/footer. */
async function isReachable(locator) {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom > window.innerHeight || r.top < 0) return false;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return Boolean(hit) && (hit === el || el.contains(hit));
  });
}

const mutation = (page, pathPart, method = "POST") =>
  page.waitForResponse((r) => r.url().includes(pathPart) && r.request().method() === method, { timeout: 20_000 });

const SUPPLIER_STAGE_TIMEOUT_MS = 30_000;
const SERVER_POLL_INTERVAL_MS = 250;

const firstLine = (error) => String(error?.message ?? error).split("\n")[0];

/** Visible error/validation text, so a failed stage reports what the operator would have seen. */
async function visibleAlerts(page) {
  const texts = (await page.locator('[role="alert"]:visible').allInnerTexts().catch(() => [])).map((text) => text.trim()).filter(Boolean);
  return texts.length > 0 ? `visible alerts: ${JSON.stringify(texts)}` : "no visible alerts";
}

/**
 * Confirms a supplier mutation with a normal click on the real confirmation
 * button and proves each stage on its own, so a failure names the stage instead
 * of a generic response-event timeout:
 *   1. the click made the browser send the POST;
 *   2. the UI reported success (shown only after the API accepted the mutation).
 * The caller then proves the durable server state with `pollServerState`.
 */
async function confirmSupplierMutation(page, { label, path, dialogName, confirmName, successText }) {
  const confirm = page.getByRole("alertdialog", { name: dialogName }).getByRole("button", { name: confirmName, exact: true });
  // Settled into a value, so a failing click cannot leave this as an unhandled rejection.
  const requested = page
    .waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname.endsWith(path), { timeout: SUPPLIER_STAGE_TIMEOUT_MS })
    .then((request) => ({ request }), (error) => ({ error }));

  try {
    await confirm.click({ timeout: SUPPLIER_STAGE_TIMEOUT_MS });
  } catch (error) {
    throw new Error(`${label}: the confirmation button "${confirmName}" could not be clicked — ${firstLine(error)} | ${await visibleAlerts(page)}`);
  }

  const { request, error: requestError } = await requested;
  if (!request) {
    throw new Error(`${label}: the confirmation click never emitted POST ${path} — ${firstLine(requestError)} | ${await visibleAlerts(page)}`);
  }

  try {
    await page.getByText(successText, { exact: true }).waitFor({ timeout: SUPPLIER_STAGE_TIMEOUT_MS });
  } catch (error) {
    throw new Error(`${label}: POST ${path} was emitted but the UI never reported success — ${firstLine(error)} | request failure: ${request.failure()?.errorText ?? "none"} | ${await visibleAlerts(page)}`);
  }
}

/**
 * Read-only verification: re-reads server state until `isExpected` holds or the
 * deadline passes. Never writes. Returns the last observed state either way, so
 * the caller's exact assertion reports what the server actually held.
 */
async function pollServerState(read, isExpected, timeoutMs = SUPPLIER_STAGE_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const state = await read();
    if (isExpected(state) || Date.now() >= deadline) return state;
    await new Promise((resolve) => setTimeout(resolve, SERVER_POLL_INTERVAL_MS));
  }
}

// ---------------------------------------------------------------- Work shifts
async function workShiftScenario(run, browser, viewport, fx) {
  const shiftsBefore = await apiCall("/settings/work-shifts", { token: fx.ownerToken });
  check(run, "Fresh tenant has zero persisted WorkShift rows", shiftsBefore.ok && shiftsBefore.data.data.length === 0, `rows=${shiftsBefore.data.data?.length}`);

  const { context, page } = await openAs(browser, viewport, fx.emails.owner);
  try {
    await page.goto(`${WEB}/settings/shifts`, { waitUntil: "networkidle" });
    const dayForm = page.locator("form").filter({ has: page.locator("#DAY-name") });
    const nightForm = page.locator("form").filter({ has: page.locator("#NIGHT-name") });
    const dayButton = dayForm.locator('button[type="submit"]');
    const nightButton = nightForm.locator('button[type="submit"]');
    await dayButton.waitFor();

    for (const [code, button, form] of [["DAY", dayButton, dayForm], ["NIGHT", nightButton, nightForm]]) {
      const label = (await button.innerText()).trim();
      check(run, `${code}: unsaved defaults do not claim "Saqlangan"`, label === "Smenani saqlash" && label !== "Saqlangan", `button="${label}"`);
      check(run, `${code}: save action is enabled before first save`, await button.isEnabled());
      check(run, `${code}: form explains the shift is not saved yet`, await form.getByText("Hali saqlanmagan.", { exact: false }).isVisible());
    }

    if (viewport.width <= 400) {
      const overflow = await noHorizontalOverflow(page);
      check(run, "Mobile /settings/shifts has no page-level horizontal overflow", overflow.sw === overflow.cw, JSON.stringify(overflow));
      check(run, "Mobile NIGHT save action is reachable (not hidden, no footer overlap)", await isReachable(nightButton));
    }

    const daySave = mutation(page, "/settings/work-shifts/DAY", "PUT");
    await dayButton.click();
    check(run, "DAY default saved through UI (PUT succeeded)", (await daySave).ok());
    await dayButton.filter({ hasText: "Saqlangan" }).waitFor();

    let rows = (await apiCall("/settings/work-shifts", { token: fx.ownerToken })).data.data;
    const day = rows.find((row) => row.code === "DAY");
    check(run, "Exactly one WorkShift persisted after DAY save with exact default values",
      rows.length === 1 && day && day.name === "Kunduzgi smena" && day.startTime === "08:00" && day.endTime === "20:00" && num(day.premiumPerPiece) === 0,
      JSON.stringify(rows.map(({ code, name, startTime, endTime, premiumPerPiece }) => ({ code, name, startTime, endTime, premiumPerPiece }))));

    await page.reload({ waitUntil: "networkidle" });
    await dayButton.filter({ hasText: "Saqlangan" }).waitFor();
    check(run, "After reload DAY shows persisted saved state (disabled)", (await dayButton.innerText()).trim() === "Saqlangan" && await dayButton.isDisabled());
    check(run, "After reload NIGHT (still unpersisted) remains submittable", (await nightButton.innerText()).trim() === "Smenani saqlash" && await nightButton.isEnabled());

    const nightSave = mutation(page, "/settings/work-shifts/NIGHT", "PUT");
    await nightButton.click();
    check(run, "NIGHT default saved through UI (PUT succeeded)", (await nightSave).ok());
    await nightButton.filter({ hasText: "Saqlangan" }).waitFor();
    rows = (await apiCall("/settings/work-shifts", { token: fx.ownerToken })).data.data;
    const night = rows.find((row) => row.code === "NIGHT");
    check(run, "NIGHT persisted with exact default values (premium 10)", rows.length === 2 && night && night.startTime === "20:00" && night.endTime === "08:00" && num(night.premiumPerPiece) === 10, `rows=${rows.length}`);

    const editedName = `Kunduzgi smena ${fx.tag.slice(-5)}`;
    await dayForm.locator("#DAY-name").fill(editedName);
    await dayButton.filter({ hasText: "O'zgarishlarni saqlash" }).waitFor();
    check(run, "Editing a persisted shift enables save", await dayButton.isEnabled());
    const dayUpdate = mutation(page, "/settings/work-shifts/DAY", "PUT");
    await dayButton.click();
    check(run, "DAY edit saved through UI", (await dayUpdate).ok());
    await dayButton.filter({ hasText: "Saqlangan" }).waitFor();

    rows = (await apiCall("/settings/work-shifts", { token: fx.ownerToken })).data.data;
    const dayAfter = rows.find((row) => row.code === "DAY");
    check(run, "Update changed exact server value without duplicating the shift", rows.length === 2 && dayAfter.id === day.id && dayAfter.name === editedName, `rows=${rows.length} name=${dayAfter?.name}`);

    await page.reload({ waitUntil: "networkidle" });
    await dayButton.filter({ hasText: "Saqlangan" }).waitFor();
    check(run, "After reload edited DAY is in saved state with the server value", (await dayForm.locator("#DAY-name").inputValue()) === editedName && await dayButton.isDisabled());
    return { dayShift: dayAfter };
  } finally {
    await context.close();
  }
}

// ------------------------------------------------------------ Handoff stage
async function selectPanelShift(page, shiftName) {
  const shiftSelect = page.locator("select").filter({ has: page.locator("option", { hasText: "Smenani tanlang" }) });
  await shiftSelect.selectOption({ label: shiftName });
}

async function handoffScenario(run, browser, viewport, fx, dayShift) {
  const workDate = new Date().toISOString().slice(0, 10);
  const readinessPath = `/production/shift-reconciliations/readiness?workShiftId=${dayShift.id}&workDate=${workDate}`;
  const blockerText = "Omborga topshirish bosqichi sozlanmagan.";

  // Owner: prerequisite is visible in Settings before any shift-close attempt.
  const owner = await openAs(browser, viewport, fx.emails.owner);
  try {
    await owner.page.goto(`${WEB}/settings`, { waitUntil: "networkidle" });
    const card = owner.page.locator("article").filter({ has: owner.page.getByRole("heading", { name: "Omborga topshirish bosqichi", exact: true }) });
    await card.waitFor();
    const cardText = await card.innerText();
    const link = card.getByRole("link", { name: "Sozlash" });
    check(run, "Settings shows handoff-stage prerequisite as needing attention before first shift close",
      cardText.includes("E’tibor kerak") && cardText.includes("Birinchi ishlab chiqarish smenasini yopishdan oldin"), cardText.replace(/\n/g, " | "));
    check(run, "Settings handoff card links to the authoritative control", (await link.getAttribute("href")) === "/production#warehouse-handoff-stage");
    // "Ish smenalari" is also a category card; the health card carries this description.
    const shiftsCard = owner.page.locator("article").filter({ has: owner.page.getByRole("heading", { name: "Ish smenalari", exact: true }), hasText: "ikkalasi ham kerak" });
    check(run, "Settings shows Work Shifts as configured once both shifts are persisted", (await shiftsCard.innerText()).includes("Tayyor"));
  } finally {
    await owner.context.close();
  }

  // Shift Receiver: blocker + accurate guidance, no mutation UI, API refuses.
  const shift = await openAs(browser, viewport, fx.emails.shift);
  try {
    await shift.page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
    await selectPanelShift(shift.page, dayShift.name);
    await shift.page.getByText(blockerText, { exact: true }).waitFor();
    check(run, "Shift Receiver readiness shows the handoff-stage blocker", true);
    check(run, "Shift Receiver guidance says Manager/Owner must configure it and where",
      await shift.page.getByText("Keyingi qadam: Manager yoki Owner «Ishlab chiqarish» sahifasidagi «Smena yakuni» bo‘limida omborga topshirish bosqichini tanlashi kerak.", { exact: true }).isVisible());
    check(run, "Shift Receiver gets no Sozlash action and no handoff configuration control",
      (await shift.page.getByRole("button", { name: "Sozlash", exact: true }).count()) === 0 && (await shift.page.locator("#warehouse-handoff-stage").count()) === 0);
    check(run, "Shift Receiver cannot submit shift while blocked", await shift.page.getByRole("button", { name: "Topshirishga tayyor", exact: true }).isDisabled());
  } finally {
    await shift.context.close();
  }

  const shiftToken = await login(fx.emails.shift, PASSWORD);
  const summary = await apiCall("/production/operations-summary", { token: fx.ownerToken });
  const omborTotal = summary.data?.data?.stageTotals?.find((item) => item.stageName === "Ombor");
  const ombor = omborTotal ? { id: omborTotal.stageId, name: omborTotal.stageName } : null;
  assert(ombor, "Fresh tenant bootstrap must include the Ombor stage");
  const denied = await apiCall("/production/warehouse-handoff-stage", { method: "PATCH", token: shiftToken, body: { productionStageId: ombor.id } });
  const stillNull = await apiCall("/production/warehouse-handoff-stage", { token: fx.ownerToken });
  check(run, "Server refuses handoff configuration by Shift Receiver (and nothing changes)", denied.status === 403 && stillNull.data.data === null, `status=${denied.status}`);

  // Manager: blocker offers a direct action to the authoritative control.
  const manager = await openAs(browser, viewport, fx.emails.manager);
  try {
    await manager.page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
    await selectPanelShift(manager.page, dayShift.name);
    await manager.page.getByText(blockerText, { exact: true }).waitFor();
    const sozlash = manager.page.getByRole("button", { name: "Sozlash", exact: true });
    check(run, "Manager sees the blocker with a Sozlash action", (await sozlash.count()) === 1);
    if (viewport.width <= 400) {
      const overflow = await noHorizontalOverflow(manager.page);
      check(run, "Mobile /production readiness path has no page-level horizontal overflow", overflow.sw === overflow.cw, JSON.stringify(overflow));
      check(run, "Mobile Sozlash action is reachable", await isReachable(sozlash));
    }
    await sozlash.click();
    await manager.page.waitForFunction(() => document.activeElement?.id === "warehouse-handoff-stage");
    check(run, "Manager Sozlash focuses the existing handoff-stage control", true);
  } finally {
    await manager.context.close();
  }

  // Owner: Settings → Sozlash → configure → readiness updates without reload.
  const owner2 = await openAs(browser, viewport, fx.emails.owner);
  try {
    const page = owner2.page;
    await page.goto(`${WEB}/settings`, { waitUntil: "networkidle" });
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: "Omborga topshirish bosqichi", exact: true }) });
    await card.getByRole("link", { name: "Sozlash" }).click();
    await page.waitForURL((url) => url.pathname === "/production" && url.hash === "#warehouse-handoff-stage");
    await page.waitForFunction(() => document.activeElement?.id === "warehouse-handoff-stage");
    check(run, "Owner reaches and lands focused on the handoff control from Settings", true);

    await selectPanelShift(page, dayShift.name);
    await page.getByText(blockerText, { exact: true }).waitFor();
    const handoffSelect = page.locator("#warehouse-handoff-stage");
    await handoffSelect.selectOption({ label: "Ombor" });
    const saveButton = handoffSelect.locator("xpath=..").getByRole("button", { name: "Saqlash", exact: true });
    if (viewport.width <= 400) check(run, "Mobile handoff Saqlash action is reachable", await isReachable(saveButton));
    const configured = mutation(page, "/production/warehouse-handoff-stage", "PATCH");
    await saveButton.click();
    check(run, "Owner configured handoff stage through the existing UI control", (await configured).ok());
    await page.getByText(blockerText, { exact: true }).waitFor({ state: "detached" });
    check(run, "Readiness updates without reload — no stale handoff blocker", await page.getByText("Bosqich sozlangan.", { exact: true }).isVisible());

    const handoff = await apiCall("/production/warehouse-handoff-stage", { token: fx.ownerToken });
    check(run, "Server handoff stage is exactly Ombor", handoff.data.data?.id === ombor.id && handoff.data.data?.name === "Ombor", JSON.stringify(handoff.data.data));
    const readiness = await apiCall(readinessPath, { token: fx.ownerToken });
    check(run, "Server readiness has zero blockers for the fresh shift", readiness.ok && readiness.data.data.blockers.length === 0, JSON.stringify(readiness.data.data?.blockers));

    await page.goto(`${WEB}/settings`, { waitUntil: "networkidle" });
    const cardAfter = page.locator("article").filter({ has: page.getByRole("heading", { name: "Omborga topshirish bosqichi", exact: true }) });
    await cardAfter.getByText("Tanlangan bosqich: Ombor.").waitFor();
    check(run, "Settings prerequisite now reports Tayyor without a Sozlash link", (await cardAfter.innerText()).includes("Tayyor") && (await cardAfter.getByRole("link", { name: "Sozlash" }).count()) === 0);
  } finally {
    await owner2.context.close();
  }

  // Shift can now close: Shift Receiver submits, Owner accepts.
  const shift2 = await openAs(browser, viewport, fx.emails.shift);
  try {
    await shift2.page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
    await selectPanelShift(shift2.page, dayShift.name);
    const submit = shift2.page.getByRole("button", { name: "Topshirishga tayyor", exact: true });
    await shift2.page.getByText("Bosqich sozlangan.", { exact: true }).waitFor();
    const submitted = mutation(shift2.page, "/production/shift-reconciliations/submit");
    await submit.click();
    check(run, "Shift Receiver submits the shift once readiness is clear", (await submitted).ok());
  } finally {
    await shift2.context.close();
  }
  const owner3 = await openAs(browser, viewport, fx.emails.owner);
  try {
    await owner3.page.goto(`${WEB}/production`, { waitUntil: "networkidle" });
    await selectPanelShift(owner3.page, dayShift.name);
    const accept = owner3.page.getByRole("button", { name: "Qabul qilish", exact: true });
    await owner3.page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Qabul qilish" && !b.disabled));
    await owner3.page.getByPlaceholder("Ogohlantirishni qabul qilish yoki qaytarish sababi").fill("Day-0 smena yopildi");
    const accepted = mutation(owner3.page, "/production/shift-reconciliations/accept");
    await accept.click();
    check(run, "Owner accepts the shift", (await accepted).ok());
  } finally {
    await owner3.context.close();
  }
  const recs = await apiCall("/production/shift-reconciliations", { token: fx.ownerToken });
  const rec = (recs.data.data ?? []).find((item) => item.workShiftId === dayShift.id && item.workDate.slice(0, 10) === workDate);
  check(run, "Server shift reconciliation is ACCEPTED (shift closed)", rec?.status === "ACCEPTED", `status=${rec?.status}`);
}

// ------------------------------------------------------------------ Payroll
async function payrollScenario(run, browser, viewport, fx) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthValue = monthStart.toISOString().slice(0, 7);
  const employeeName = `Day0 Oylikchi ${fx.tag.slice(-5)}`;
  const SALARY = 3_000_000;
  const ADVANCE = 500_000;
  const FINAL = SALARY - ADVANCE;

  // Fixture: salaried employee + approved & paid advance (separation of duties kept).
  const empRes = await apiCall("/employees", {
    method: "POST", token: fx.ownerToken,
    body: { name: employeeName, workProfile: "STAFF", compensationType: "SALARIED", monthlySalaryAmount: SALARY, salaryEffectiveFrom: monthStart.toISOString(), account: { email: fx.emails.seller, password: PASSWORD, roleName: "Seller" } },
  });
  assert(empRes.ok, `create salaried employee: ${JSON.stringify(empRes.data)}`);
  const employeeId = empRes.data.data.id;
  const advRes = await apiCall("/finance/advances", { method: "POST", token: fx.ownerToken, body: { employeeId, amount: String(ADVANCE), reason: "Day-0 avans" } });
  assert(advRes.ok, `create advance: ${JSON.stringify(advRes.data)}`);
  const managerToken = await login(fx.emails.manager, PASSWORD);
  const accountantToken = await login(fx.emails.accountant, PASSWORD);
  assert((await apiCall(`/finance/advances/${advRes.data.data.id}/approve`, { method: "POST", token: managerToken })).ok, "manager approves advance");
  assert((await apiCall(`/finance/advances/${advRes.data.data.id}/pay`, { method: "POST", token: accountantToken })).ok, "accountant pays advance");
  record(run, "Payroll fixture: salaried employee 3 000 000 + paid advance 500 000", true, employeeId);

  // Owner: create period and Calculate through real UI clicks.
  const owner = await openAs(browser, viewport, fx.emails.owner);
  let periodId;
  try {
    const page = owner.page;
    await page.goto(`${WEB}/finance/payroll`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Yangi davr", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Ish haqi davri yaratish" });
    await drawer.locator("#payrollMonth").fill(monthValue);
    const created = mutation(page, "/finance/payroll-periods");
    await drawer.getByRole("button", { name: "Davr yaratish", exact: true }).click();
    const createdRes = await created;
    periodId = (await createdRes.json()).data.id;
    check(run, "Payroll period created through UI", createdRes.ok(), monthValue);

    const calculateButton = page.getByRole("button", { name: "Ish haqini hisoblash", exact: true });
    await calculateButton.waitFor();
    check(run, "Calculate button is a real visible, enabled, unobstructed button", (await calculateButton.isEnabled()) && await isReachable(calculateButton));
    if (viewport.width <= 400) {
      const overflow = await noHorizontalOverflow(page);
      check(run, "Mobile /finance/payroll has no page-level horizontal overflow", overflow.sw === overflow.cw, JSON.stringify(overflow));
    }
    await calculateButton.click();
    const dialog = page.getByRole("alertdialog", { name: "Ish haqini hisoblash" });
    const confirm = dialog.getByRole("button", { name: "Hisoblash", exact: true });
    await confirm.waitFor();
    check(run, "Calculate confirmation button is reachable", await isReachable(confirm));
    const calculated = mutation(page, `/finance/payroll-periods/${periodId}/calculate`);
    await confirm.click();
    const calcRes = await calculated;
    check(run, "Normal click on Hisoblash sends the calculate mutation", calcRes.ok(), `status=${calcRes.status()}`);
    await page.getByText("Ish haqi tizim tomonidan hisoblandi.").waitFor();

    const details = page.locator('[aria-label="Xodimlar ish haqi tafsilotlari"]:visible');
    await details.getByText(employeeName).waitFor();
    const detailText = await details.innerText();
    const amounts = detailText.split(/\n|\t/).map(digits).filter(Boolean);
    check(run, "UI breakdown shows exact worked 3 000 000, advance 500 000, final 2 500 000",
      amounts.includes(String(SALARY)) && amounts.some((a) => a.endsWith(String(ADVANCE))) && amounts.includes(String(FINAL)), detailText.replace(/\n/g, " | "));

    const period = (await apiCall("/finance/payroll-periods", { token: fx.ownerToken })).data.data.find((p) => p.id === periodId);
    const items = (await apiCall(`/finance/payroll-periods/${periodId}/items`, { token: fx.ownerToken })).data.data;
    check(run, "Server period after UI calculate: CALCULATED rev 1, worked 3 000 000 − advance 500 000 = final 2 500 000",
      period.status === "CALCULATED" && period.calculationRevision === 1 && num(period.totalWorkedAmount) === SALARY && num(period.totalAdvanceAmount) === ADVANCE && num(period.totalFinalAmount) === FINAL && num(period.totalRemainingAmount) === FINAL,
      JSON.stringify({ s: period.status, r: period.calculationRevision, w: period.totalWorkedAmount, a: period.totalAdvanceAmount, f: period.totalFinalAmount }));
    check(run, "Server has exactly one payroll item with the exact breakdown",
      items.length === 1 && items[0].employee.id === employeeId && num(items[0].workedAmount) === SALARY && num(items[0].advanceAmount) === ADVANCE && num(items[0].finalAmount) === FINAL, `items=${items.length}`);
  } finally {
    await owner.context.close();
  }

  // Manager approval via UI.
  const manager = await openAs(browser, viewport, fx.emails.manager);
  try {
    const page = manager.page;
    await page.goto(`${WEB}/finance/payroll`, { waitUntil: "networkidle" });
    const approve = page.getByRole("button", { name: "Manager tasdiqlaydi", exact: true });
    await approve.waitFor();
    check(run, "Manager has no payroll payment action (no expense.pay)", (await page.getByRole("button", { name: "Xodimga to‘lov", exact: true }).count()) === 0);
    const approved = mutation(page, `/finance/payroll-periods/${periodId}/approve`);
    await approve.click();
    check(run, "Manager approves payroll through UI", (await approved).ok());
    await page.getByText("Ish haqi 1-reviziya bo‘yicha Manager tasdiqladi.", { exact: true }).waitFor();
  } finally {
    await manager.context.close();
  }
  let period = (await apiCall("/finance/payroll-periods", { token: fx.ownerToken })).data.data.find((p) => p.id === periodId);
  check(run, "Server approval: approvedRevision = calculationRevision = 1 by Manager", period.approvedRevision === 1 && period.approvedByUserId === fx.users.manager.id, JSON.stringify({ ar: period.approvedRevision, by: period.approvedByUserId }));

  // Accountant payment + close via UI.
  const accountant = await openAs(browser, viewport, fx.emails.accountant);
  try {
    const page = accountant.page;
    await page.goto(`${WEB}/finance/payroll`, { waitUntil: "networkidle" });
    const payButton = page.getByRole("button", { name: "Xodimga to‘lov", exact: true });
    await payButton.waitFor();
    check(run, "Accountant has no approval action", (await page.getByRole("button", { name: "Manager tasdiqlaydi", exact: true }).count()) === 0);
    await payButton.click();
    const drawer = page.getByRole("dialog", { name: "Ish haqi to‘lovi" });
    const itemSelect = drawer.locator("#payrollItem");
    const optionValue = await itemSelect.locator("option", { hasText: employeeName }).getAttribute("value");
    await itemSelect.selectOption(optionValue);
    await page.waitForFunction((expected) => document.querySelector("#payrollPaymentAmount")?.value.replace(/\D/g, "").startsWith(expected), String(FINAL));
    await drawer.getByRole("button", { name: "To‘lovni tekshirish", exact: true }).click();
    const confirmPay = page.getByRole("alertdialog", { name: "Ish haqi to‘lovini tasdiqlash" }).getByRole("button", { name: "To‘lovni tasdiqlash", exact: true });
    const paid = mutation(page, `/finance/payroll-periods/${periodId}/pay`);
    await confirmPay.click();
    check(run, "Accountant pays full remaining 2 500 000 through UI", (await paid).ok());
    await page.getByText("Ish haqi to‘lovi yozildi.").waitFor();

    period = (await apiCall("/finance/payroll-periods", { token: fx.ownerToken })).data.data.find((p) => p.id === periodId);
    check(run, "Server after payment: PAID, paid 2 500 000, remaining 0", period.status === "PAID" && num(period.totalPaidAmount) === FINAL && num(period.totalRemainingAmount) === 0, JSON.stringify({ s: period.status, p: period.totalPaidAmount, r: period.totalRemainingAmount }));

    const closeButton = page.getByRole("button", { name: "Davrni yopish", exact: true });
    await closeButton.click();
    const closed = mutation(page, `/finance/payroll-periods/${periodId}/close`);
    await page.getByRole("alertdialog", { name: "Ish haqi davrini yopish" }).getByRole("button", { name: "Yopish", exact: true }).click();
    check(run, "Accountant closes the fully paid period through UI", (await closed).ok());
    await page.getByText("Ish haqi davri yopildi.").waitFor();
  } finally {
    await accountant.context.close();
  }
  period = (await apiCall("/finance/payroll-periods", { token: fx.ownerToken })).data.data.find((p) => p.id === periodId);
  const items = (await apiCall(`/finance/payroll-periods/${periodId}/items`, { token: fx.ownerToken })).data.data;
  check(run, "Terminal payroll state: period CLOSED, item PAID, remaining 0", period.status === "CLOSED" && items[0].status === "PAID" && num(items[0].remainingAmount) === 0, `period=${period.status} item=${items[0].status}`);
}

// ----------------------------------------------------------------- Supplier
async function supplierScenario(run, browser, viewport, fx) {
  const materialName = `Day0 paxta ip ${fx.tag.slice(-5)}`;
  const supplierName = `Day0 Ta’minotchi ${fx.tag.slice(-5)}`;
  const QTY = 20;
  const UNIT_PRICE = 45_000;
  const TOTAL = QTY * UNIT_PRICE; // 900 000
  const PAYMENT = 350_000;
  const REMAINING = TOTAL - PAYMENT; // 550 000

  const material = await apiCall("/product/materials", { method: "POST", token: fx.ownerToken, body: { name: materialName } });
  assert(material.ok, `create material: ${JSON.stringify(material.data)}`);
  const accountantToken = await login(fx.emails.accountant, PASSWORD);

  const accountant = await openAs(browser, viewport, fx.emails.accountant);
  let supplierId;
  // Read-only snapshot of this supplier's purchases and debt as the server holds them.
  const readSupplierState = async () => {
    const [purchasesRes, debtsRes] = await Promise.all([
      apiCall("/supplier/purchases", { token: accountantToken }),
      apiCall("/supplier/debts", { token: accountantToken }),
    ]);
    const debt = (debtsRes.data?.data ?? []).find((d) => d.supplier.id === supplierId);
    return {
      purchases: (purchasesRes.data?.data ?? []).filter((p) => p.supplier.id === supplierId).map((p) => ({
        purchaseNumber: p.purchaseNumber, totalAmount: p.totalAmount, paymentStatus: p.paymentStatus,
        items: p.items.map((item) => ({ quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice })),
      })),
      debt: debt ? { totalPurchases: debt.totalPurchases, totalPaid: debt.totalPaid, debt: debt.debt } : null,
    };
  };
  try {
    const page = accountant.page;
    await page.goto(`${WEB}/finance/suppliers`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Yangi yetkazib beruvchi", exact: true }).click();
    const formDrawer = page.getByRole("dialog", { name: "Yetkazib beruvchi qo‘shish" });
    await formDrawer.locator("#supplierName").fill(supplierName);
    const createdSupplier = mutation(page, "/supplier/suppliers");
    await formDrawer.getByRole("button", { name: "Yetkazib beruvchi yaratish", exact: true }).click();
    const supplierRes = await createdSupplier;
    supplierId = (await supplierRes.json()).data.id;
    check(run, "Accountant creates supplier through UI", supplierRes.ok());

    const workspace = page.getByRole("region", { name: `${supplierName} ish maydoni` });
    await workspace.waitFor();
    await workspace.getByRole("button", { name: "Yangi xarid", exact: true }).click();
    const purchaseDrawer = page.getByRole("dialog", { name: "Xarid qayd qilish" });
    await purchaseDrawer.locator('select[id^="purchaseMaterial-"]').selectOption({ label: materialName });
    await purchaseDrawer.locator('input[id^="purchaseQuantity-"]').fill(String(QTY));
    await purchaseDrawer.locator('input[id^="purchaseUnit-"]').fill("kg");
    await purchaseDrawer.locator('input[id^="purchaseUnitPrice-"]').fill(String(UNIT_PRICE));
    await purchaseDrawer.getByRole("button", { name: "Xaridni tekshirish", exact: true }).click();
    await confirmSupplierMutation(page, {
      label: "Supplier purchase", path: "/supplier/purchases",
      dialogName: "Xaridni tasdiqlash", confirmName: "Xaridni tasdiqlash",
      successText: "Yetkazib beruvchi xaridi qayd qilindi.",
    });
    check(run, "Accountant records purchase 20 kg × 45 000 through UI", true, "confirmation click sent POST /supplier/purchases; UI reported success");

    const purchaseRecorded = ({ purchases, debt }) =>
      purchases.length === 1 && purchases[0].items.length === 1 && num(purchases[0].items[0].quantity) === QTY
      && num(purchases[0].totalAmount) === TOTAL && purchases[0].paymentStatus === "UNPAID"
      && debt !== null && num(debt.totalPurchases) === TOTAL && num(debt.totalPaid) === 0 && num(debt.debt) === TOTAL;
    const afterPurchase = await pollServerState(readSupplierState, purchaseRecorded);
    check(run, "Server after purchase: quantity 20, total 900 000, UNPAID, debt 900 000", purchaseRecorded(afterPurchase),
      `UI reported success; last observed server state ${JSON.stringify(afterPurchase)}`);
    const purchaseNumber = afterPurchase.purchases[0].purchaseNumber;

    await workspace.getByRole("button", { name: "To‘lov kiritish", exact: true }).click();
    const paymentDrawer = page.getByRole("dialog", { name: "Yetkazib beruvchi to‘lovi" });
    await paymentDrawer.locator("#supplierPaymentAmount").fill(String(PAYMENT));
    const allocationPurchase = paymentDrawer.locator('select[id^="supplierPaymentPurchase-"]');
    const purchaseOption = await allocationPurchase.locator("option", { hasText: purchaseNumber }).getAttribute("value");
    await allocationPurchase.selectOption(purchaseOption);
    await paymentDrawer.locator('input[id^="supplierPaymentAllocation-"]').fill(String(PAYMENT));
    if (viewport.width <= 400) check(run, "Mobile supplier payment submit is reachable", await isReachable(paymentDrawer.getByRole("button", { name: "To‘lovni tekshirish", exact: true })));
    await paymentDrawer.getByRole("button", { name: "To‘lovni tekshirish", exact: true }).click();
    await confirmSupplierMutation(page, {
      label: "Supplier payment", path: "/supplier/payments",
      dialogName: "Yetkazib beruvchi to‘lovini tasdiqlash", confirmName: "To‘lovni tasdiqlash",
      successText: "Yetkazib beruvchi to‘lovi qayd qilindi va xaridlarga taqsimlandi.",
    });
    check(run, "Accountant records 350 000 payment allocated to the purchase through UI", true, "confirmation click sent POST /supplier/payments; UI reported success");

    const paymentRecorded = ({ purchases, debt }) =>
      purchases.length === 1 && num(purchases[0].totalAmount) === TOTAL && purchases[0].paymentStatus === "PARTIALLY_PAID"
      && debt !== null && num(debt.totalPurchases) === TOTAL && num(debt.totalPaid) === PAYMENT && num(debt.debt) === REMAINING;
    const afterPayment = await pollServerState(readSupplierState, paymentRecorded);
    check(run, "Server after payment: paid 350 000, remaining debt 550 000, PARTIALLY_PAID", paymentRecorded(afterPayment),
      `UI reported success; last observed server state ${JSON.stringify(afterPayment)}`);

    const debtCard = workspace.locator("article").filter({ has: page.getByRole("heading", { name: "Hozirgi qarz", exact: true }) });
    await page.waitForFunction(({ name, expected }) => {
      const region = [...document.querySelectorAll("section[aria-label]")].find((el) => el.getAttribute("aria-label") === `${name} ish maydoni`);
      const card = region && [...region.querySelectorAll("article")].find((el) => el.querySelector("h2")?.textContent === "Hozirgi qarz");
      return card?.textContent.replace(/\D/g, "") === expected;
    }, { name: supplierName, expected: String(REMAINING) });
    check(run, "UI shows exact remaining supplier debt 550 000", digits(await debtCard.innerText()) === String(REMAINING));
  } finally {
    await accountant.context.close();
  }

  // RBAC: Manager + Owner see supplier actions; Seller refused server-side.
  for (const key of ["manager", "owner"]) {
    const session = await openAs(browser, viewport, fx.emails[key]);
    try {
      await session.page.goto(`${WEB}/finance/suppliers`, { waitUntil: "networkidle" });
      const workspace = session.page.getByRole("region", { name: `${supplierName} ish maydoni` });
      await workspace.waitFor();
      check(run, `${key === "owner" ? "Owner" : "Manager"} sees purchase and payment actions (finance.write)`,
        (await workspace.getByRole("button", { name: "Yangi xarid", exact: true }).isVisible()) && (await workspace.getByRole("button", { name: "To‘lov kiritish", exact: true }).isVisible()));
    } finally {
      await session.context.close();
    }
  }
  const sellerToken = await login(fx.emails.seller, PASSWORD);
  const sellerAttempt = await apiCall("/supplier/payments", { method: "POST", token: sellerToken, body: { supplierId, amount: "1", method: "CASH", allocations: [] } });
  const sellerRead = await apiCall("/supplier/debts", { token: sellerToken });
  check(run, "Seller is refused supplier finance read and write server-side", sellerAttempt.status === 403 && sellerRead.status === 403, `write=${sellerAttempt.status} read=${sellerRead.status}`);
  const finalDebt = (await apiCall("/supplier/debts", { token: accountantToken })).data.data.find((d) => d.supplier.id === supplierId);
  check(run, "Refused Seller attempt did not change supplier debt", num(finalDebt.debt) === REMAINING);
}

// --------------------------------------------------------------------- Runs
async function runProfile(name, launcher, viewport) {
  const browser = await launcher.launch();
  let fixture = null;
  try {
    fixture = await createTenantFixture(name.replace(/\W+/g, ""));
    record(name, "Disposable fresh tenant + Owner/Manager/Accountant/Shift Receiver provisioned", true, fixture.tenantId);
    const { dayShift } = await workShiftScenario(name, browser, viewport, fixture);
    await handoffScenario(name, browser, viewport, fixture, dayShift);
    await payrollScenario(name, browser, viewport, fixture);
    await supplierScenario(name, browser, viewport, fixture);
  } catch (error) {
    if (!(error instanceof assert.AssertionError) || !results.some((r) => !r.passed)) {
      record(name, "Scenario completed without unexpected error", false, error.message.split("\n")[0]);
    }
  } finally {
    await browser.close();
    await suspendTenant(fixture);
  }
}

await runProfile("Chromium desktop", chromium, { width: 1366, height: 900 });
await runProfile("Chromium 390", chromium, { width: 390, height: 844 });
await runProfile("WebKit 390", webkit, { width: 390, height: 844 });

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.error(`\n${failed.length} FAILED:`);
  for (const f of failed) console.error(`  [${f.run}] ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
}
process.exit(failed.length > 0 ? 1 : 0);
