import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const apiRoot = path.resolve(repoRoot, "apps/api");

const apiPort = Number(process.env.AUTH_TEST_API_PORT || 3029);
const apiBase = `http://localhost:${apiPort}`;
const webBase = process.env.AUTH_TEST_WEB_BASE || "http://localhost:3000";

let apiServerProcess = null;
const serverLogs = [];
const results = [];

function pass(name, detail = "") {
  results.push({ name, status: "PASS", detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, status: "FAIL", detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitForHealth(url, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return true;
    } catch {
      // waiting for server boot
    }
    await delay(300);
  }
  throw new Error(`Server did not become healthy at ${url}/health within ${timeoutMs}ms.\nServer logs:\n${serverLogs.join("")}`);
}

async function startApiServer({ sameSite = "none", nodeEnv = "test" } = {}) {
  await stopApiServer();
  serverLogs.length = 0;

  const distMain = path.join(apiRoot, "dist/src/main.js");
  if (!existsSync(distMain)) {
    throw new Error(`API build not found at ${distMain}. Run pnpm api:build first.`);
  }

  apiServerProcess = spawn(process.execPath, [distMain], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: nodeEnv,
      PORT: String(apiPort),
      AUTH_COOKIE_SAMESITE: sameSite,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  apiServerProcess.stdout.on("data", (chunk) => {
    serverLogs.push(chunk.toString());
  });
  apiServerProcess.stderr.on("data", (chunk) => {
    serverLogs.push(chunk.toString());
  });

  await waitForHealth(apiBase);
}

async function stopApiServer() {
  if (!apiServerProcess) return;
  apiServerProcess.kill("SIGTERM");
  await delay(400);
  if (!apiServerProcess.killed) {
    apiServerProcess.kill("SIGKILL");
  }
  apiServerProcess = null;
}

// 1. API Direct Tests
async function testApiDirectFlows() {
  console.log("\n=== Test Suite 1: API Direct Auth & Cookie Security ===");

  // 1.1 Login sets Secure, HttpOnly, SameSite=None, Partitioned cookie when configured
  await startApiServer({ sameSite: "none", nodeEnv: "test" });

  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@paypoq.local",
      password: "ChangeMe123!",
    }),
  });

  assert.equal(loginRes.status, 200, "Login should succeed");
  const loginBody = await loginRes.json();
  const accessToken = loginBody.data.accessToken;
  assert.ok(accessToken, "Login should return accessToken");

  const rawSetCookie = loginRes.headers.get("set-cookie") || "";
  assert.match(rawSetCookie, /HttpOnly/i, "Cookie must be HttpOnly");
  assert.match(rawSetCookie, /Secure/i, "Cookie must be Secure when SameSite=None");
  assert.match(rawSetCookie, /SameSite=None/i, "Cookie must be SameSite=None for cross-site Render support");
  assert.match(rawSetCookie, /Partitioned/i, "Cookie must be Partitioned (CHIPS)");
  assert.match(rawSetCookie, /Path=\/auth/i, "Cookie must have Path=/auth");
  pass("1.1 Login sets HttpOnly Secure SameSite=None Partitioned cookie", rawSetCookie.split(";")[0]);

  // Extract cookie value
  const cookieMatch = rawSetCookie.match(/paypoq_refresh_token=([^;]+)/);
  assert.ok(cookieMatch, "paypoq_refresh_token cookie must be present");
  const initialRefreshToken = cookieMatch[1];

  // 1.2 Valid refresh token -> new access token & token rotation
  const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `paypoq_refresh_token=${initialRefreshToken}`,
    },
  });
  assert.equal(refreshRes.status, 200, "Refresh with valid cookie should succeed");
  const refreshBody = await refreshRes.json();
  assert.ok(refreshBody.data.accessToken, "Refresh should return new accessToken");
  const rawRotatedCookie = refreshRes.headers.get("set-cookie") || "";
  const rotatedMatch = rawRotatedCookie.match(/paypoq_refresh_token=([^;]+)/);
  assert.ok(rotatedMatch, "Rotated refresh cookie must be returned");
  const nextRefreshToken = rotatedMatch[1];
  assert.notEqual(nextRefreshToken, initialRefreshToken, "Refresh token must be rotated");
  pass("1.2 Valid refresh returns new access token and rotated refresh token");

  // 1.3 Reusing old rotated refresh token returns 401 (atomic single-use rotation)
  const reuseRes = await fetch(`${apiBase}/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `paypoq_refresh_token=${initialRefreshToken}`,
    },
  });
  assert.equal(reuseRes.status, 401, "Reusing old refresh token must return 401");
  pass("1.3 Old refresh token is revoked on rotation (401 on reuse)");

  // 1.4 Invalid / empty refresh cookie returns 401
  const invalidRes = await fetch(`${apiBase}/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: "paypoq_refresh_token=invalid_garbage_token_12345",
    },
  });
  assert.equal(invalidRes.status, 401, "Invalid refresh token must return 401");
  pass("1.4 Invalid refresh token returns 401");

  // 1.5 Logout invalidates the active refresh token and clears cookie
  const logoutRes = await fetch(`${apiBase}/auth/logout`, {
    method: "POST",
    headers: {
      Cookie: `paypoq_refresh_token=${nextRefreshToken}`,
    },
  });
  assert.equal(logoutRes.status, 200, "Logout must succeed");
  const logoutSetCookie = logoutRes.headers.get("set-cookie") || "";
  assert.match(logoutSetCookie, /paypoq_refresh_token=;/i, "Logout must clear cookie");
  assert.match(logoutSetCookie, /Max-Age=0|Expires=/i, "Logout must expire cookie");

  const refreshAfterLogout = await fetch(`${apiBase}/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `paypoq_refresh_token=${nextRefreshToken}`,
    },
  });
  assert.equal(refreshAfterLogout.status, 401, "Revoked token after logout must return 401");
  pass("1.5 Logout clears cookie and revokes session on server");

  // 1.6 SameSite=Lax in local dev / default
  await startApiServer({ sameSite: "lax", nodeEnv: "development" });
  const devLoginRes = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@paypoq.local",
      password: "ChangeMe123!",
    }),
  });
  assert.equal(devLoginRes.status, 200);
  const devSetCookie = devLoginRes.headers.get("set-cookie") || "";
  assert.match(devSetCookie, /SameSite=Lax/i, "Dev cookie should be SameSite=Lax");
  pass("1.6 Development mode defaults to SameSite=Lax for http://localhost compatibility");
}

// 2. Concurrency and Deduplication Simulation
async function testConcurrencyAndRetry() {
  console.log("\n=== Test Suite 2: Concurrent 401 Deduplication & Atomic Rotation ===");

  await startApiServer({ sameSite: "none", nodeEnv: "test" });

  // Login fresh
  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@paypoq.local",
      password: "ChangeMe123!",
    }),
  });
  const rawSetCookie = loginRes.headers.get("set-cookie") || "";
  const cookieMatch = rawSetCookie.match(/paypoq_refresh_token=([^;]+)/);
  const cookieVal = cookieMatch[1];

  // Simulate 5 parallel refresh calls to the server with the SAME token
  // Exactly 1 must succeed and the other 4 must receive 401 due to atomic transaction updateMany count === 0
  const parallelCalls = await Promise.all([
    fetch(`${apiBase}/auth/refresh`, { method: "POST", headers: { Cookie: `paypoq_refresh_token=${cookieVal}` } }),
    fetch(`${apiBase}/auth/refresh`, { method: "POST", headers: { Cookie: `paypoq_refresh_token=${cookieVal}` } }),
    fetch(`${apiBase}/auth/refresh`, { method: "POST", headers: { Cookie: `paypoq_refresh_token=${cookieVal}` } }),
    fetch(`${apiBase}/auth/refresh`, { method: "POST", headers: { Cookie: `paypoq_refresh_token=${cookieVal}` } }),
    fetch(`${apiBase}/auth/refresh`, { method: "POST", headers: { Cookie: `paypoq_refresh_token=${cookieVal}` } }),
  ]);

  const statuses = parallelCalls.map((r) => r.status);
  const count200 = statuses.filter((s) => s === 200).length;
  const count401 = statuses.filter((s) => s === 401).length;

  assert.equal(count200, 1, `Exactly 1 concurrent refresh must succeed (got ${count200})`);
  assert.equal(count401, 4, `Other concurrent refreshes must be rejected as duplicate reuse (got ${count401})`);
  pass("2.1 Backend atomic rotation allows exactly one consumer on concurrent reuse", `200: ${count200}, 401: ${count401}`);
}

// 3. Browser Live Verification against local web server
async function testBrowserLiveQA() {
  console.log(`\n=== Test Suite 3: Browser Session QA against ${webBase} ===`);

  let webAvailable = false;
  try {
    const r = await fetch(webBase);
    if (r.ok || r.status === 200) webAvailable = true;
  } catch {
    console.log(`Web server not reachable at ${webBase}. Skipping browser integration.`);
    return;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 3.1 Login Page Renders
    await page.goto(`${webBase}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#email", { timeout: 15000 });
    pass("3.1 Login page renders correctly");

    // 3.2 ReturnUrl Preservation
    await page.goto(`${webBase}/production`, { waitUntil: "domcontentloaded" });
    await delay(1200);
    assert.ok(page.url().includes("/login"), "Unauthenticated user redirected to login");
    assert.ok(page.url().includes("returnUrl=%2Fproduction"), `ReturnUrl parameter preserved: ${page.url()}`);
    pass("3.2 ReturnUrl parameter correctly preserved upon unauthenticated redirect");

    // 3.3 Log in from /login?returnUrl=%2Fproduction -> lands on /production!
    await page.fill("#email", "owner@paypoq.local");
    await page.fill("#password", "ChangeMe123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes("/production"), { timeout: 15000 });
    pass("3.3 Login with returnUrl correctly routes back to the intended page (/production)");

    // 3.4 Hard Refresh on Protected Page preserves session
    await page.reload({ waitUntil: "domcontentloaded" });
    await delay(1200);
    assert.ok(page.url().includes("/production"), `Reload on /production must keep session: ${page.url()}`);
    pass("3.4 Hard reload (F5) on protected page preserves session");

    // 3.5 Back / Forward navigation
    await page.goto(`${webBase}/sales/orders`, { waitUntil: "domcontentloaded" });
    await delay(1000);
    assert.ok(page.url().includes("/sales/orders"), "Navigated to /sales/orders");

    await page.goBack({ waitUntil: "domcontentloaded" });
    await delay(1000);
    assert.ok(page.url().includes("/production"), `Back button returned to /production: ${page.url()}`);

    await page.goForward({ waitUntil: "domcontentloaded" });
    await delay(1000);
    assert.ok(page.url().includes("/sales/orders"), `Forward button returned to /sales/orders: ${page.url()}`);
    pass("3.5 Browser Back and Forward navigation preserves session");

    // 3.6 Direct open in new tab
    const tab2 = await context.newPage();
    await tab2.goto(`${webBase}/warehouse`, { waitUntil: "domcontentloaded" });
    await delay(1000);
    assert.ok(tab2.url().includes("/warehouse"), `New tab opened directly to /warehouse: ${tab2.url()}`);
    pass("3.6 New browser tab restores session from cookie without landing on login");
    await tab2.close();

    await context.close();
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("Starting Paypoq OS Auth & Session Lifecycle Regression Suite...");
  let exitCode = 0;
  try {
    await testApiDirectFlows();
    await testConcurrencyAndRetry();
    await testBrowserLiveQA();
  } catch (err) {
    console.error("Test execution error:", err);
    exitCode = 1;
  } finally {
    await stopApiServer();
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log("\n=== AUTH REGRESSION SUMMARY ===");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  if (failed > 0 || exitCode !== 0) {
    process.exit(1);
  }
}

main();
