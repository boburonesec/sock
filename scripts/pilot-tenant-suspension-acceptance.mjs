/**
 * P1 targeted acceptance — proves tenant suspension actually blocks tenant
 * access, at every layer: a still-valid access token from before
 * suspension is denied on its very next protected request, a fresh login
 * attempt after suspension is denied with clear Uzbek copy (no raw
 * English/DB terminology), Platform Admin itself is unaffected, an
 * unrelated active tenant is unaffected, and reactivation restores login.
 *
 * Uses a disposable Platform-Admin-created tenant + owner, never the
 * shared demo tenant. The tenant is left ACTIVE (reactivated) at the end
 * of a successful run, not suspended, so re-running this script twice
 * needs no manual cleanup between runs.
 *
 * Usage (API + web running):
 *   node scripts/pilot-tenant-suspension-acceptance.mjs
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

async function getAuthToken(email, password = "ChangeMe123!", isPlatform = false) {
  const endpoint = isPlatform ? "/platform-auth/login" : "/auth/login";
  const res = await apiCall(endpoint, { method: "POST", body: { email, password } });
  assert(res.ok, `API authentication failed for ${email}: ${JSON.stringify(res.data)}`);
  return { accessToken: res.data.data.accessToken, activeFactoryId: res.data.data.activeFactoryId };
}

async function loginPage(page, email, password = "ChangeMe123!", { admin = false } = {}) {
  // Re-authenticating the same page (e.g. after suspend/reactivate): an
  // already-authenticated session on the login route redirects straight
  // past the form, so sign out first.
  await page.evaluate(async (isAdmin) => {
    const path = isAdmin ? "/api/platform-auth/logout" : "/api/auth/logout";
    await fetch(path, { method: "POST" }).catch(() => {});
    localStorage.clear();
  }, admin).catch(() => {});
  await page.goto(`${WEB}${admin ? "/admin/login" : "/login"}`, { waitUntil: "networkidle" });
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 12 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', password, { delay: 12 });
  await page.click('button[type="submit"]');
}

async function run(engineName, launcher) {
  const browser = await launcher.launch();
  let tenantId = null;
  try {
    const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const tenantContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const adminPage = await adminContext.newPage();
    const tenantPage = await tenantContext.newPage();

    const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tenantName = `PILOT-Suspend-${tag}`;
    const ownerEmail = `pilot-suspend-owner-${tag}@paypoq.local`;
    const ownerPassword = "PilotTemp123!";

    const platformAuth = await getAuthToken("platform@paypoq.local", "ChangeMe123!", true);

    // ---- Disposable tenant + owner, created via legitimate Platform Admin API ----
    const tenantRes = await apiCall("/platform-admin/tenants", {
      method: "POST", token: platformAuth.accessToken,
      body: { name: tenantName, contactName: "Pilot Suspension Test" },
    });
    assert(tenantRes.ok, `POST /platform-admin/tenants must succeed: ${JSON.stringify(tenantRes.data)}`);
    tenantId = tenantRes.data.data.id;
    record(engineName, "Disposable tenant created", true, tenantId);

    const ownerRes = await apiCall(`/platform-admin/tenants/${tenantId}/owner-users`, {
      method: "POST", token: platformAuth.accessToken,
      body: { name: "Pilot Suspend Owner", email: ownerEmail, password: ownerPassword },
    });
    assert(ownerRes.ok, `POST owner-users must succeed: ${JSON.stringify(ownerRes.data)}`);
    record(engineName, "Tenant owner provisioned", true, ownerEmail);

    // ---- Login works while ACTIVE/PILOT ----
    await loginPage(tenantPage, ownerEmail, ownerPassword);
    await tenantPage.waitForFunction(() => !window.location.href.includes("login"), { timeout: 15000 });
    record(engineName, "Tenant owner login succeeds while tenant is PILOT/ACTIVE", !tenantPage.url().includes("login"), tenantPage.url());

    // Keep this session's access token — it must be rejected on its next request after suspension.
    const preSuspendToken = await tenantPage.evaluate(async () => {
      const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      const json = await res.json();
      return json.data?.accessToken ?? null;
    });
    assert(preSuspendToken, "Could not capture a pre-suspension access token");

    // ---- Platform Admin suspends the tenant via the real UI ----
    await loginPage(adminPage, "platform@paypoq.local", "ChangeMe123!", { admin: true });
    await adminPage.waitForFunction(() => !window.location.href.includes("login"), { timeout: 15000 });
    await adminPage.goto(`${WEB}/admin/tenants/${tenantId}`, { waitUntil: "networkidle" });
    await adminPage.getByRole("button", { name: "To‘xtatish" }).click();
    await adminPage.locator("text=Korxonani to‘xtatish").first().waitFor({ timeout: 5000 });
    await adminPage.getByRole("button", { name: "Tasdiqlash" }).click();
    await adminPage.waitForFunction(() => document.body.innerText.includes("To‘xtatilgan"), { timeout: 10000 });
    record(engineName, "Platform Admin suspends the tenant through the UI", true);

    // ---- A previously-issued, still-unexpired access token is denied on its next protected request ----
    const staleTokenAttempt = await apiCall("/employees", { token: preSuspendToken });
    record(engineName, "Pre-suspension access token denied on next protected request (no bypass until expiry)", [401, 403].includes(staleTokenAttempt.status), `status=${staleTokenAttempt.status}`);

    // ---- Same browser session (cookies) also loses access on the next navigation ----
    await tenantPage.goto(`${WEB}/employees`, { waitUntil: "networkidle" });
    await tenantPage.waitForTimeout(500);
    const sessionUrl = tenantPage.url();
    record(engineName, "Existing browser session redirected to login after suspension (no endless failing calls)", sessionUrl.includes("/login"), sessionUrl);

    // ---- A brand-new login attempt is denied with clear, non-technical Uzbek copy ----
    await loginPage(tenantPage, ownerEmail, ownerPassword);
    await tenantPage.waitForTimeout(1200);
    const loginErrorText = await tenantPage.locator("main").innerText();
    const hasCleanCopy = loginErrorText.includes("Korxona faol emas");
    const hasRawLeak = /TENANT_SUSPENDED|Tenant is not active|qiymat noto/i.test(loginErrorText);
    record(engineName, "New login attempt denied with clear Uzbek copy, no raw status/DB terminology leaked", hasCleanCopy && !hasRawLeak, loginErrorText.replace(/\n/g, " | "));

    // ---- Platform Admin itself remains fully functional ----
    const tenantListRes = await apiCall("/platform-admin/tenants", { token: platformAuth.accessToken });
    record(engineName, "Platform Admin remains able to list/manage tenants while one is suspended", tenantListRes.ok, `status=${tenantListRes.status}`);

    // ---- An unrelated, already-active tenant is unaffected ----
    const unrelatedAuth = await getAuthToken("owner@paypoq.local");
    const unrelatedRes = await apiCall("/employees", { token: unrelatedAuth.accessToken, activeFactoryId: unrelatedAuth.activeFactoryId });
    record(engineName, "Unrelated active tenant (Demo Paypoq Factory) is unaffected", unrelatedRes.ok, `status=${unrelatedRes.status}`);

    // ---- Reactivate: login works again ----
    await adminPage.goto(`${WEB}/admin/tenants/${tenantId}`, { waitUntil: "networkidle" });
    await adminPage.getByRole("button", { name: "Faollashtirish" }).click();
    await adminPage.locator("text=Korxonani faollashtirish").first().waitFor({ timeout: 5000 });
    await adminPage.getByRole("button", { name: "Tasdiqlash" }).click();
    await adminPage.waitForFunction(() => document.body.innerText.includes("Faol"), { timeout: 10000 });

    await loginPage(tenantPage, ownerEmail, ownerPassword);
    await tenantPage.waitForFunction(() => !window.location.href.includes("login"), { timeout: 15000 });
    record(engineName, "Login works again after reactivation", !tenantPage.url().includes("login"), tenantPage.url());

    await adminContext.close();
    await tenantContext.close();
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
