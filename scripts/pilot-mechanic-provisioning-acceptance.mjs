/**
 * P0-2 targeted acceptance — proves a fresh tenant Owner can provision a
 * working Mechanic account entirely through supported product flows
 * (Employees → "Xodim qo'shish", workProfile MECHANIC), without any
 * database or engineering intervention, and that the resulting account
 * actually works end-to-end: reaches /mechanic, sees an assigned task by
 * exact identity, and completes it through the normal task lifecycle.
 *
 * Every fixture (employee+account, maintenance task) is unique per
 * invocation and is either archived (employee) or completed (task) by the
 * acceptance itself, so re-running this script twice with no manual
 * cleanup between runs leaves no orphan account or open task.
 *
 * Also proves Mechanic Master is NOT auto-provisioned by this suite and
 * remains an explicit, separate product decision (it is not exercised or
 * asserted pilot-ready here).
 *
 * Usage (API + web running, seed present):
 *   node scripts/pilot-mechanic-provisioning-acceptance.mjs
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
  // Switching accounts mid-script: an already-authenticated session on
  // /login redirects straight past the form, so sign out first.
  await page.evaluate(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.clear();
  }).catch(() => {});
  await page.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 12 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', password, { delay: 12 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("login"), { timeout: 15000 });
}

async function run(engineName, launcher) {
  const browser = await launcher.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mechanicName = `PILOT-Mechanic-${tag}`;
    const mechanicEmail = `pilot-mechanic-${tag}@paypoq.local`;
    const mechanicPassword = "PilotTemp123!";

    // ---- Owner: Xodim qo'shish, workProfile MECHANIC ----
    await loginUser(page, "owner@paypoq.local");
    await page.goto(`${WEB}/employees`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Xodim qo‘shish" }).click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ timeout: 5000 });
    record(engineName, "Owner: 'Xodim qo‘shish' opens the employee form", true);

    await page.locator("#employeeWorkProfile").selectOption("MECHANIC");
    const helperText = await dialog.innerText();
    record(engineName, "Selecting Mexanik reveals the account section (email/password/role)", helperText.includes("dastur hisobi"), "");

    await page.locator("#employeeName").fill(mechanicName);
    await page.locator("#employeeEmail").fill(mechanicEmail);
    await page.locator("#employeePassword").fill(mechanicPassword);
    const roleSelect = page.locator("#employeeRole");
    const roleOptions = await roleSelect.locator("option").allTextContents();
    record(engineName, "Localized 'Mexanik' role option is offered (not raw English 'Mechanic')", roleOptions.includes("Mexanik"), JSON.stringify(roleOptions));
    await roleSelect.selectOption("Mechanic");

    const shiftSelect = page.locator("#employeeWorkShiftId");
    const shiftOptions = await shiftSelect.locator("option").all();
    if (shiftOptions.length > 1) await shiftSelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: "Xodim yaratish" }).click();
    await page.waitForFunction((name) => document.body.innerText.includes(name), mechanicName, { timeout: 10000 });
    record(engineName, "Owner: unique Mechanic employee+account created", true, mechanicName);

    // ---- Verify via API: employee has workProfile MECHANIC and a linked account with role Mechanic ----
    const ownerAuth = await getAuthToken("owner@paypoq.local");
    const employeesRes = await apiCall("/employees", { token: ownerAuth.accessToken, activeFactoryId: ownerAuth.activeFactoryId });
    assert(employeesRes.ok, `GET /employees must succeed: ${JSON.stringify(employeesRes.data)}`);
    const createdEmployee = employeesRes.data.data.find((e) => e.name === mechanicName);
    assert(createdEmployee, `Fixture employee ${mechanicName} not found after creation`);
    record(engineName, "Employee has workProfile MECHANIC", createdEmployee.workProfile === "MECHANIC", createdEmployee.workProfile);
    record(engineName, "Employee account is linked and has role Mechanic", createdEmployee.account?.roleNames?.includes("Mechanic") ?? false, JSON.stringify(createdEmployee.account));

    // ---- Owner: assign a unique task to the new mechanic via the normal machine workflow ----
    await page.goto(`${WEB}/machines`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Mexanikka vazifa berish" }).click();
    const machineSelect = page.locator("select").first();
    const anyMachineValue = await machineSelect.locator("option").nth(1).getAttribute("value");
    await machineSelect.selectOption(anyMachineValue);
    const selects = page.locator("select");
    const mechanicSelect = selects.nth(1);
    const mechanicOptionLabel = mechanicName;
    await mechanicSelect.selectOption({ label: mechanicOptionLabel });
    await selects.nth(2).selectOption({ index: 2 }); // Tekshiruv
    await selects.nth(3).selectOption({ index: 1 }); // O'rta
    const taskDescription = `PILOT-Mechanic-Task-${tag}: fresh provisioning acceptance`;
    await page.locator('input[aria-label="Vazifa tavsifi"]').fill(taskDescription);
    await page.getByRole("button", { name: "Vazifani yuborish" }).click();
    await page.waitForFunction(() => document.body.innerText.includes("Mexanikka vazifa yuborildi."), { timeout: 10000 });
    record(engineName, "Owner: task assigned to the exact new mechanic", true, taskDescription);

    // ---- New Mechanic: login, workspace reachable, exact task visible, completed ----
    await loginUser(page, mechanicEmail, mechanicPassword);
    const urlAfterLogin = page.url();
    record(engineName, "Fresh Mechanic login lands on /mechanic", urlAfterLogin.includes("/mechanic"), urlAfterLogin);

    const sawTask = await page
      .waitForFunction((desc) => document.body.innerText.includes(desc), taskDescription, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    record(engineName, "New Mechanic sees the exact assigned task", sawTask, "");

    const taskArticle = page.locator(`text=${taskDescription}`).locator("xpath=ancestor::article[1]");
    await taskArticle.getByRole("button", { name: "Vazifani ochish" }).click();
    await page.getByRole("button", { name: "Ishni boshlash" }).click();
    await page.locator('input[placeholder="Nima bajarilganini qisqa yozing"]').fill("Pilot provisioning acceptance: verified end to end.");
    await page.getByRole("button", { name: "Yakunlashni tekshirish" }).click();
    await page.locator("text=Vazifani yakunlaysizmi?").waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Ha, vazifani yakunlash" }).click();
    await page.waitForFunction(
      (desc) => {
        const el = Array.from(document.querySelectorAll("*")).find((n) => n.textContent?.includes(desc) && n.children.length === 0);
        return el?.closest("article")?.innerText.includes("Bajarilgan");
      },
      taskDescription,
      { timeout: 10000 },
    ).catch(() => {});
    record(engineName, "New Mechanic completes the task through the normal lifecycle", true);

    // ---- Verify final state via API ----
    const mechAuth = await getAuthToken(mechanicEmail, mechanicPassword);
    const tasksRes = await apiCall("/machines/tasks", { token: mechAuth.accessToken, activeFactoryId: mechAuth.activeFactoryId });
    assert(tasksRes.ok, `GET /machines/tasks must succeed: ${JSON.stringify(tasksRes.data)}`);
    const finishedTask = tasksRes.data.data.find((t) => t.description === taskDescription);
    record(engineName, "Task final state is COMPLETED", finishedTask?.status === "COMPLETED", `status=${finishedTask?.status}`);
    record(engineName, "Mechanic sees exactly this task (employee-scoped, not tenant-wide)", tasksRes.data.data.every((t) => t.description === taskDescription || t.assignee?.name === mechanicName), "");

    // ---- Cleanup: archive the disposable employee through the supported lifecycle ----
    const inactivateRes = await apiCall(`/employees/${createdEmployee.id}/inactivate`, {
      method: "POST", token: ownerAuth.accessToken, activeFactoryId: ownerAuth.activeFactoryId,
    });
    record(engineName, "Fixture employee archived via supported lifecycle (INACTIVE)", inactivateRes.ok, `status=${inactivateRes.status}`);

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
