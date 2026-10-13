/** PR 02 only: disposable real API/RBAC fixtures + production native JS logic.
 * Native host/storage is mocked by the child test; no native device acceptance.
 */
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const requireApi = createRequire(join(root, "apps/api/package.json"));
const local = existsSync(join(root, "apps/api/.env")) ? requireApi("dotenv").parse(readFileSync(join(root, "apps/api/.env"))) : {};
const baseUrl = process.env.DATABASE_URL ?? local.DATABASE_URL;
assert.ok(baseUrl, "DATABASE_URL is required");
const tag = `${Date.now()}_${randomBytes(4).toString("hex")}`;
const db = `paypoq_context_${tag}`, container = process.env.PG_CONTAINER ?? "sockai-postgres-1";
const dbUrl = new URL(baseUrl); dbUrl.pathname = `/${db}`;
const apiPort = process.env.CONTEXT_TEST_API_PORT ?? "3998", API = `http://127.0.0.1:${apiPort}`;
const password = `T${randomBytes(24).toString("hex")}!`, secret = randomBytes(40).toString("hex");
const email = (role) => `context-${role}-${tag}@test.local`;
const env = { ...local, ...process.env, DATABASE_URL: dbUrl.href, NODE_ENV: "test", PORT: apiPort,
  API_BIND_HOST: "127.0.0.1", CORS_ORIGIN: "http://127.0.0.1:3100", JWT_ACCESS_SECRET: secret, PLATFORM_JWT_ACCESS_SECRET: secret,
  BUILD_SHA: "pr02-context-working-tree" };
const evidence = mkdtempSync(join(tmpdir(), "paypoq-context-api-"));
let api, platformToken, dbCreated = false, logs = "";
const tenants = [];
const sql = (text) => execFileSync("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", text], { encoding: "utf8" });
function run(file, args, extra = {}) {
  const result = spawnSync(file, args, { cwd: root, env, encoding: "utf8", ...extra });
  writeFileSync(join(evidence, `setup-${file.replaceAll("/", "_")}.log`), result.stdout + result.stderr);
  assert.equal(result.status, 0, `${file} setup exit=${result.status}, inspect ${evidence}`); return result;
}
async function raw(path, { token, factoryId, body, method = "POST" } = {}) {
  const res = await fetch(`${API}${path}`, { method, signal: AbortSignal.timeout(10000),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(factoryId ? { "X-Factory-Id": factoryId } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function success(path, options, status = 201) {
  const result = await raw(path, options); assert.equal(result.status, status, `${path}: unexpected status`); return result.body.data;
}
async function nativeLogin(address) { return success("/auth/native/login", { body: { email: address, password } }, 200); }
async function tenant(mode, name) {
  const t = await success("/platform-admin/tenants", { token: platformToken, body: { name: `PR02-${tag}-${name}`, branchMode: mode } }); tenants.push(t.id);
  await success(`/platform-admin/tenants/${t.id}/owner-users`, { token: platformToken, body: { email: email(`owner-${name}`), name: "PR02 Owner", password } });
  const owner = await nativeLogin(email(`owner-${name}`)); return { tenantId: t.id, owner };
}
try {
  sql(`CREATE DATABASE "${db}"`); dbCreated = true;
  run("pnpm", ["--filter", "@paypoq/api", "prisma:migrate:deploy"]);
  run(process.execPath, ["apps/api/scripts/bootstrap-platform-admin.mjs"], { env: { ...env, PLATFORM_BOOTSTRAP_EMAIL: email("platform"), PLATFORM_BOOTSTRAP_PASSWORD: password } });
  api = spawn(process.execPath, ["apps/api/dist/src/main.js"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  api.stdout.on("data", (data) => { logs += data; }); api.stderr.on("data", (data) => { logs += data; });
  let ready = false; const deadline = Date.now() + 25000;
  while (Date.now() < deadline && api.exitCode === null) {
    try { if ((await fetch(`${API}/health/readiness`, { signal: AbortSignal.timeout(1500) })).ok) { ready = true; break; } } catch { /* startup */ }
    await delay(200);
  }
  assert.equal(ready, true, "isolated API did not become ready");
  platformToken = (await success("/platform-auth/login", { body: { email: email("platform"), password } }, 200)).accessToken;
  const multi = await tenant("MULTI", "multi"), single = await tenant("SINGLE", "single");
  const a = multi.owner.activeFactoryId;
  const b = (await success(`/platform-admin/tenants/${multi.tenantId}/factories`, { token: platformToken, body: { name: "PR02 Factory B" } })).id;
  const ownerToken = multi.owner.accessToken;
  await success(`/organization/users/${multi.owner.user.id}/factory-access`, { token: ownerToken, body: { factoryIds: [a, b] }, method: "PATCH" }, 200);
  const material = await success("/product/materials", { token: ownerToken, body: { name: `PR02 Shared-${tag}` } });
  const users = [];
  for (const suffix of ["warehouse", "warehouse-other", "seller"]) {
    const user = await success("/organization/users", { token: ownerToken, body: { name: `PR02 ${suffix}`, email: email(suffix), password, factoryId: a, roleName: suffix === "seller" ? "Seller" : "Warehouse Operator" } });
    await success(`/organization/users/${user.id}/factory-access`, { token: ownerToken, body: { factoryIds: [a, b] }, method: "PATCH" }, 200);
    users.push(user);
  }
  const warehouse = await nativeLogin(email("warehouse"));
  const zones = {};
  for (const id of [a, b]) {
    const list = await success("/warehouse/zones", { token: warehouse.accessToken, factoryId: id, method: "GET" }, 200);
    assert.ok(list.length); zones[id] = list[0].id; // own new factory, not a shared fixture list
    await success("/warehouse/material-receipts", { token: warehouse.accessToken, factoryId: id, body: { materialId: material.id, quantity: id === a ? "5" : "20", unit: "kg", warehouseZoneId: zones[id] } });
  }
  const fixture = { a, b, zones, materialId: material.id, tenantId: multi.tenantId, userId: users[0].id,
    foreignFactory: single.owner.activeFactoryId, singleEmail: email("owner-single"), otherEmail: email("warehouse-other"), sellerEmail: email("seller"), ownerEmail: email("owner-multi") };
  const child = spawn(process.execPath, ["--import", "./apps/mobile/scripts/context-test-runtime.mjs", "--no-warnings", "--experimental-strip-types", "apps/mobile/scripts/context-live-test.mjs"], {
    cwd: root, env: { ...env, CONTEXT_API_URL: API, EXPO_PUBLIC_API_BASE_URL: API,
      CONTEXT_EMAIL: email("warehouse"), CONTEXT_PASSWORD: password, CONTEXT_FIXTURE: JSON.stringify(fixture) }, stdio: ["ignore", "pipe", "pipe"],
  });
  let childLogs = ""; child.stdout.on("data", (chunk) => { childLogs += chunk; process.stdout.write(chunk); }); child.stderr.on("data", (chunk) => { childLogs += chunk; process.stderr.write(chunk); });
  const [code] = await once(child, "exit"); writeFileSync(join(evidence, "context-live.log"), childLogs);
  assert.equal(code, 0, "real context/API checks failed"); console.log(`PR02 real API evidence: ${evidence}`);
} catch (error) { console.error(error); console.error(`Failure evidence: ${evidence}`); process.exitCode = 1; }
finally {
  for (const id of tenants) {
    const cleaned = await raw(`/platform-admin/tenants/${id}/suspend`, { token: platformToken, body: {} }).catch(() => null);
    if (cleaned?.status !== 201) { console.error("Disposable tenant suspension failed"); process.exitCode = 1; }
    else console.log("cleanup: disposable tenant suspended");
  }
  if (api && api.exitCode === null) {
    const exited = once(api, "exit"); api.kill("SIGTERM"); const timer = setTimeout(() => api.kill("SIGKILL"), 5000); await exited; clearTimeout(timer);
  }
  writeFileSync(join(evidence, "api.log"), logs);
  if (dbCreated) { sql(`DROP DATABASE "${db}" WITH (FORCE)`); console.log("cleanup: disposable database dropped"); }
}
