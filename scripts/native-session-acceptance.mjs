/** PR 01: real native AuthService/RefreshSession and unchanged Web BFF.
 * Requires API + standalone Web builds, Playwright Chromium/WebKit, Docker PG.
 * Owns a disposable database and tenant; never seeds/mutates the demo tenant.
 * Run twice to prove fixture cleanup. Credentials/tokens are never printed.
 */
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes, createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { once } from "node:events";
import { chromium, webkit } from "playwright";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const apiRequire = createRequire(join(root, "apps/api/package.json"));
const { parse } = apiRequire("dotenv");
const localEnv = existsSync(join(root, "apps/api/.env")) ? parse(readFileSync(join(root, "apps/api/.env"))) : {};
const sourceUrl = process.env.DATABASE_URL ?? localEnv.DATABASE_URL;
assert.ok(sourceUrl, "DATABASE_URL required for local PostgreSQL credentials");
const tag = `${Date.now()}_${randomBytes(4).toString("hex")}`;
const dbName = `paypoq_native_${tag}`;
const dbUrl = new URL(sourceUrl); dbUrl.pathname = `/${dbName}`;
const pgContainer = process.env.PG_CONTAINER ?? "sockai-postgres-1";
const apiPort = process.env.NATIVE_TEST_API_PORT ?? "3997";
const webPort = process.env.NATIVE_TEST_WEB_PORT ?? "3100";
const API = `http://127.0.0.1:${apiPort}`;
const WEB = `http://127.0.0.1:${webPort}`;
const platformEmail = `platform-${tag}@test.local`;
const email = `native-${tag}@test.local`;
const password = `T${randomBytes(24).toString("hex")}!`;
const secret = randomBytes(40).toString("hex");
const evidence = mkdtempSync(join(tmpdir(), "paypoq-native-acceptance-"));
const env = {
  ...localEnv, ...process.env, DATABASE_URL: dbUrl.href,
  NODE_ENV: "test", PORT: apiPort, API_BIND_HOST: "127.0.0.1",
  CORS_ORIGIN: WEB, JWT_ACCESS_SECRET: secret, PLATFORM_JWT_ACCESS_SECRET: secret,
  AUTH_COOKIE_SAMESITE: "lax", BUILD_SHA: "pr01-disposable-acceptance",
};
const children = [];
let prisma, tenantId, platformToken, createdDb = false, passed = 0;

function run(command, args, extra = {}) {
  const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8", ...extra });
  assert.equal(result.status, 0, `${command} failed (exit ${result.status}); inspect the preserved setup log`);
  return result;
}
function psql(sql) {
  return execFileSync("docker", ["exec", pgContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });
}
async function start(label, file, processEnv) {
  let logs = "";
  const child = spawn(process.execPath, [file], { cwd: root, env: processEnv, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", (d) => { logs += d; }); child.stderr.on("data", (d) => { logs += d; });
  child.on("exit", () => writeFileSync(join(evidence, `${label}.log`), logs));
  const url = label === "api" ? `${API}/health/readiness` : `${WEB}/login`;
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline && child.exitCode === null) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) return; } catch { /* startup */ }
    await delay(200);
  }
  writeFileSync(join(evidence, `${label}.log`), logs);
  throw Error(`${label} did not start; log: ${join(evidence, `${label}.log`)}`);
}
async function raw(path, body, options = {}) {
  const res = await fetch(`${API}${path}`, {
    method: options.method ?? "POST", signal: AbortSignal.timeout(10000),
    headers: { "Content-Type": "application/json", ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.cookie ? { Cookie: options.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, body: await res.json() };
}
async function ok(path, body, options) {
  const result = await raw(path, body, options); assert.equal(result.status, 200, `${path} → ${result.status}`); return result;
}
async function nativeLogin() { return ok("/auth/native/login", { email, password }); }
const hash = (value) => createHash("sha256").update(value).digest("hex");
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }

async function nativeChecks() {
  await check("native login returns JSON credential/context, no cookie, no-store", async () => {
    const r = await nativeLogin(); assert.ok(r.body.data.refreshToken); assert.equal(r.body.data.branchMode, "MULTI");
    assert.equal(r.headers.get("set-cookie"), null); assert.equal(r.headers.get("cache-control"), "no-store");
    const db = await prisma.refreshSession.findUnique({ where: { tokenHash: hash(r.body.data.refreshToken) } });
    assert.ok(db); assert.ok(db.tokenHash !== r.body.data.refreshToken, "only a credential hash is stored");
    const me = await ok("/auth/me", undefined, { method: "GET", token: r.body.data.accessToken });
    assert.equal(me.body.data.user.email, email);
  });
  await check("native rotation is atomic: one of five consumes succeeds; old token rejected", async () => {
    const r = await nativeLogin(); const old = r.body.data.refreshToken;
    const results = await Promise.all(Array.from({ length: 5 }, () => raw("/auth/native/refresh", { refreshToken: old })));
    assert.equal(results.filter((r) => r.status === 200).length, 1); assert.equal(results.filter((r) => r.status === 401).length, 4);
    const successor = results.find((r) => r.status === 200); assert.ok(successor.body.data.refreshToken !== old, "credential rotates");
    assert.equal(successor.headers.get("set-cookie"), null); assert.equal(successor.headers.get("cache-control"), "no-store");
    assert.equal((await raw("/auth/native/refresh", { refreshToken: old })).status, 401);
    await ok("/auth/native/logout", { refreshToken: successor.body.data.refreshToken });
  });
  await check("native logout revokes and is idempotent; revoked refresh returns 401", async () => {
    const token = (await nativeLogin()).body.data.refreshToken;
    await ok("/auth/native/logout", { refreshToken: token }); await ok("/auth/native/logout", { refreshToken: token });
    assert.equal((await raw("/auth/native/refresh", { refreshToken: token })).status, 401);
  });
  await check("native body validation rejects missing, empty, oversized credentials; cookies alone grant no trust", async () => {
    for (const body of [{}, { refreshToken: "" }, { refreshToken: "x".repeat(513) }, { refreshToken: 123 }]) {
      assert.equal((await raw("/auth/native/refresh", body)).status, 400);
    }
    const token = (await nativeLogin()).body.data.refreshToken;
    assert.equal((await raw("/auth/native/refresh", {}, { cookie: `paypoq_refresh_token=${token}` })).status, 400);
    assert.equal((await raw("/auth/native/refresh", { refreshToken: "invalid" })).status, 401);
  });
  await check("expired native refresh credential is rejected by existing AuthService", async () => {
    const token = (await nativeLogin()).body.data.refreshToken;
    await prisma.refreshSession.update({ where: { tokenHash: hash(token) }, data: { expiresAt: new Date(0) } });
    assert.equal((await raw("/auth/native/refresh", { refreshToken: token })).status, 401);
  });
  await check("inactive user cannot log in or refresh", async () => {
    const r = await nativeLogin(); const userId = r.body.data.user.id;
    await prisma.user.update({ where: { id: userId }, data: { status: "INACTIVE" } });
    try {
      assert.equal((await raw("/auth/native/login", { email, password })).status, 401);
      assert.equal((await raw("/auth/native/refresh", { refreshToken: r.body.data.refreshToken })).status, 401);
    } finally { await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } }); }
  });
  await check("native and Web login share the existing rate limiter", async () => {
    const unknown = `unknown-${tag}@test.local`;
    for (let i = 0; i < 10; i++) assert.equal((await raw(i % 2 ? "/auth/login" : "/auth/native/login", { email: unknown, password: "wrong" })).status, 401);
    assert.equal((await raw("/auth/native/login", { email: unknown, password: "wrong" })).status, 429);
    assert.equal((await raw("/auth/login", { email: unknown, password: "wrong" })).status, 429);
  });
  await check("Web API keeps its HttpOnly cookie contract and never returns refreshToken JSON", async () => {
    const r = await ok("/auth/login", { email, password }); assert.equal(r.body.data.refreshToken, undefined);
    const cookie = r.headers.get("set-cookie"); assert.ok(/HttpOnly/.test(cookie)); assert.ok(/Path=\/auth/.test(cookie)); assert.ok(/SameSite=Lax/.test(cookie));
    const refreshed = await ok("/auth/refresh", undefined, { cookie: cookie.split(";")[0] });
    assert.equal(refreshed.body.data.refreshToken, undefined); assert.ok(refreshed.headers.get("set-cookie"));
    await ok("/auth/logout", undefined, { cookie: refreshed.headers.get("set-cookie").split(";")[0] });
  });
}

async function browserChecks(engine, label) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext(); const page = await context.newPage(); page.setDefaultTimeout(20000);
  try {
    await check(`${label}: real UI login through built Web BFF returns HttpOnly first-party cookie`, async () => {
      await page.goto(`${WEB}/login?returnUrl=%2Fprofile`, { waitUntil: "domcontentloaded" });
      await page.locator("#email").fill(email); await page.locator("#password").fill(password);
      const loginResponse = page.waitForResponse((r) => r.url() === `${WEB}/api/auth/login` && r.request().method() === "POST");
      void loginResponse.catch(() => undefined);
      await page.getByRole("button", { name: "Kirish", exact: true }).click();
      const r = await loginResponse; assert.equal(r.status(), 200); assert.equal((await r.json()).data.refreshToken, undefined);
      await page.waitForURL((url) => url.pathname === "/profile");
      await page.getByRole("button", { name: "Akkaunt oynasini ochish" }).waitFor();
      const cookies = await context.cookies(`${WEB}/api/auth/refresh`); const cookie = cookies.find((c) => c.name === "paypoq_refresh_token");
      assert.ok(cookie); assert.equal(cookie.httpOnly, true); assert.equal(cookie.path, "/api/auth"); assert.equal(cookie.sameSite, "Lax");
      assert.equal(await page.evaluate(() => document.cookie.includes("paypoq_refresh_token=")), false);
    });
    await check(`${label}: reload restores and rotates the first-party session`, async () => {
      const initial = (await context.cookies(`${WEB}/api/auth/refresh`)).find((c) => c.name === "paypoq_refresh_token").value;
      const renewed = page.waitForResponse((r) => r.url() === `${WEB}/api/auth/refresh` && r.status() === 200);
      void renewed.catch(() => undefined);
      await page.reload({ waitUntil: "domcontentloaded" }); await renewed;
      await page.getByRole("button", { name: "Akkaunt oynasini ochish" }).waitFor();
      const next = (await context.cookies(`${WEB}/api/auth/refresh`)).find((c) => c.name === "paypoq_refresh_token").value;
      assert.ok(next !== initial, "credential rotates on browser restoration"); assert.equal(new URL(page.url()).pathname, "/profile");
    });
    await check(`${label}: real UI logout clears cookie and protected reload redirects`, async () => {
      const before = (await context.cookies(`${WEB}/api/auth/refresh`)).find((c) => c.name === "paypoq_refresh_token").value;
      await page.getByRole("button", { name: "Akkaunt oynasini ochish" }).click();
      const loggedOut = page.waitForResponse((r) => r.url() === `${WEB}/api/auth/logout` && r.status() === 200);
      void loggedOut.catch(() => undefined);
      await page.getByRole("dialog", { name: "Akkaunt", exact: true }).getByRole("button", { name: "Chiqish", exact: true }).click(); await loggedOut;
      await page.waitForURL((url) => url.pathname === "/login");
      assert.equal((await context.cookies(`${WEB}/api/auth/refresh`)).some((c) => c.name === "paypoq_refresh_token"), false);
      assert.equal((await raw("/auth/refresh", undefined, { cookie: `paypoq_refresh_token=${before}` })).status, 401);
      await page.goto(`${WEB}/profile`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname === "/login");
    });
  } catch (error) {
    await page.screenshot({ path: join(evidence, `${label}-failure.png`), fullPage: true });
    throw error;
  } finally { await context.close(); await browser.close(); }
}

try {
  psql(`CREATE DATABASE "${dbName}"`); createdDb = true;
  const migrated = run("pnpm", ["--filter", "@paypoq/api", "prisma:migrate:deploy"]);
  writeFileSync(join(evidence, "migrate.log"), migrated.stdout + migrated.stderr);
  run(process.execPath, ["apps/api/scripts/bootstrap-platform-admin.mjs"], { env: { ...env, PLATFORM_BOOTSTRAP_EMAIL: platformEmail, PLATFORM_BOOTSTRAP_PASSWORD: password } });
  process.env.DATABASE_URL = dbUrl.href;
  prisma = apiRequire("./dist/src/prisma/client.js").createPrismaClient();
  await start("api", "apps/api/dist/src/main.js", env);
  platformToken = (await ok("/platform-auth/login", { email: platformEmail, password })).body.data.accessToken;
  const created = await raw("/platform-admin/tenants", { name: `PR01-${tag}`, branchMode: "MULTI" }, { token: platformToken });
  assert.equal(created.status, 201); tenantId = created.body.data.id;
  const owner = await raw(`/platform-admin/tenants/${tenantId}/owner-users`, { name: "PR01 Owner", email, password }, { token: platformToken });
  assert.equal(owner.status, 201);
  await nativeChecks();
  await start("web", "apps/web/.next/standalone/apps/web/server.js", {
    ...process.env, NODE_ENV: "production", PORT: webPort, HOSTNAME: "127.0.0.1", API_INTERNAL_URL: API, BUILD_SHA: "pr01-disposable-acceptance",
  });
  await browserChecks(chromium, "Chromium"); await browserChecks(webkit, "WebKit");
  await check("suspended tenant cannot native login or renew", async () => {
    const token = (await nativeLogin()).body.data.refreshToken;
    assert.equal((await raw(`/platform-admin/tenants/${tenantId}/suspend`, {}, { token: platformToken })).status, 201);
    assert.equal((await raw("/auth/native/login", { email, password })).status, 403);
    assert.equal((await raw("/auth/native/refresh", { refreshToken: token })).status, 403);
  });
  console.log(`Native/API + production-built Web auth: ${passed} checks passed. Evidence: ${evidence}`);
} catch (error) {
  console.error(error); process.exitCode = 1;
  console.error(`Failure evidence: ${evidence}`);
} finally {
  if (tenantId && platformToken) {
    const cleanup = await raw(`/platform-admin/tenants/${tenantId}/suspend`, {}, { token: platformToken }).catch(() => null);
    if (cleanup?.status !== 201) { console.error("Tenant suspension failed"); process.exitCode = 1; }
    else console.log("cleanup: disposable tenant suspended");
  }
  await prisma?.$disconnect();
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    const exited = once(child, "exit"); child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000); await exited; clearTimeout(timer);
  }
  if (createdDb) { psql(`DROP DATABASE "${dbName}" WITH (FORCE)`); console.log("cleanup: disposable database dropped"); }
}
