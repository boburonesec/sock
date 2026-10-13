/** Execute the production Zustand store, auth transport, API client and storage.
 * Mock only native OS modules and the HTTP boundary; no duplicate session model.
 */
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "expo-constants" || specifier === "expo-secure-store") return { url: `mock:${specifier}`, shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const file = resolve(root, "src", specifier.slice(2));
      return { url: pathToFileURL(existsSync(`${file}.ts`) ? `${file}.ts` : `${file}.tsx`).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "mock:expo-constants") return { format: "module", source: 'export default { expoConfig: { extra: { apiBaseUrl: "https://api.test" } } };', shortCircuit: true };
    if (url === "mock:expo-secure-store") return { format: "module", source: 'export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = "device"; export async function getItemAsync() { return null; } export async function setItemAsync() {} export async function deleteItemAsync() {}', shortCircuit: true };
    return next(url, context);
  },
});
const { createAuthStore } = await import("../src/stores/auth-store.ts");
const { apiClient, jsonBody, setApiAccessToken, setApiActiveFactoryId, advanceApiSessionGeneration } = await import("../src/lib/api/client.ts");
const { createSessionStorage, SessionStorageError } = await import("../src/lib/auth/session-storage.ts");
const { ApiError } = await import("../src/lib/api/errors.ts");

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
const response = (status, data) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const context = (name = "A") => ({
  user: { id: name, email: `${name}@factory.test`, name, status: "ACTIVE" }, tenantId: `tenant-${name}`,
  branchMode: "MULTI", activeFactoryId: `factory-${name}`, accessibleFactories: [{ id: `factory-${name}`, name }],
  roles: ["Owner"], permissions: ["production.write"],
});
const session = (name = "A", suffix = "1") => ({ ...context(name), accessToken: `access-${name}-${suffix}`, refreshToken: `refresh-${name}-${suffix}`, accessTokenExpiresInSeconds: 900 });

function setup(adapterOverrides = {}, timeout = 5000, existing = new Map()) {
  advanceApiSessionGeneration(); setApiAccessToken(null); setApiActiveFactoryId(null);
  const disk = existing;
  const adapter = {
    async getItemAsync(key) { return disk.get(key) ?? null; },
    async setItemAsync(key, value) { disk.set(key, value); },
    async deleteItemAsync(key) { disk.delete(key); },
    ...adapterOverrides,
  };
  const storage = createSessionStorage(adapter, timeout);
  const store = createAuthStore(storage);
  const requests = [];
  const revoked = [];
  let handler = async (path, options) => {
    if (path === "/auth/native/login") return response(200, { data: session(JSON.parse(options.body).email) });
    if (path === "/auth/native/refresh") return response(200, { data: session("A", "2") });
    if (path === "/auth/me") return response(200, { data: context() });
    return response(200, { data: "ok" });
  };
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, ...options });
    assert.equal(options.credentials, "omit", "native never depends on cookies");
    assert.equal(new URL(url).search, "", "no refresh token in URL");
    if (path === "/auth/native/logout") {
      revoked.push(JSON.parse(options.body).refreshToken);
      return response(200, { data: { status: "ok" } });
    }
    return handler(path, options);
  };
  return { store, storage, disk, adapter, requests, revoked, setHandler(fn) { handler = fn; }, count(path) { return requests.filter((r) => r.path === path).length; } };
}
async function login(f, name = "A") { await f.store.getState().login(name, "secret"); }
async function check(name, fn) {
  await fn();
  console.log(`PASS ${name}`);
  passed++;
}
let passed = 0;

await check("login persists one atomic native envelope and branchMode", async () => {
  const f = setup(); await login(f);
  assert.equal(f.store.getState().branchMode, "MULTI");
  assert.equal((await f.storage.loadStoredSession()).refreshToken, "refresh-A-1");
  assert.equal(f.disk.size, 1);
  assert.equal(f.requests[0].headers.get("Authorization"), null);
});

await check("concurrent 401s share a refresh, rotate storage, and replay once", async () => {
  const f = setup(); await login(f); const renewal = deferred(); const started = deferred();
  f.setHandler(async (path, opts) => {
    if (path === "/auth/native/refresh") { started.resolve(); return renewal.promise; }
    return opts.headers.get("Authorization") === "Bearer access-A-1" ? response(401, {}) : response(200, { data: "ok" });
  });
  const calls = Array.from({ length: 5 }, () => apiClient("/production/write", jsonBody("POST", { quantity: 1 })));
  await started.promise;
  renewal.resolve(response(200, { data: session("A", "2") }));
  await Promise.all(calls);
  assert.equal(f.count("/auth/native/refresh"), 1);
  assert.equal(f.count("/production/write"), 10);
  assert.equal((await f.storage.loadStoredSession()).refreshToken, "refresh-A-2");
});

await check("delayed old-token 401 uses renewed bearer without a second rotation", async () => {
  const f = setup(); await login(f); const delayed = deferred(); const started = deferred();
  f.setHandler(async (path, opts) => {
    if (path === "/auth/native/refresh") return response(200, { data: session("A", "2") });
    if (path === "/slow" && opts.headers.get("Authorization") === "Bearer access-A-1") { started.resolve(); return delayed.promise; }
    return opts.headers.get("Authorization") === "Bearer access-A-1" ? response(401, {}) : response(200, {});
  });
  const slow = apiClient("/slow"); await started.promise;
  await apiClient("/fast"); delayed.resolve(response(401, {})); await slow;
  assert.equal(f.count("/auth/native/refresh"), 1);
});

await check("a replayed 401 ends the session without further replay", async () => {
  const f = setup(); await login(f);
  f.setHandler(async (p) => p === "/auth/native/refresh" ? response(200, { data: session("A", "2") }) : response(401, {}));
  await assert.rejects(apiClient("/protected"), (e) => e instanceof ApiError && e.status === 401);
  assert.equal(f.count("/protected"), 2); assert.equal(f.count("/auth/native/refresh"), 1);
  assert.equal(f.store.getState().isAuthenticated, false);
});

for (const failure of [401, 403]) await check(`refresh ${failure} (revoked/inactive/suspended) clears the session`, async () => {
  const f = setup(); await login(f); f.setHandler(async () => response(failure, {}));
  assert.equal(await f.store.getState().refreshSession(), false);
  assert.equal(f.store.getState().isAuthenticated, false);
  assert.equal(await f.storage.loadStoredSession(), null);
});
for (const failure of [0, 503, 429]) await check(`refresh ${failure || "network"} retains credentials and permits recovery`, async () => {
  const f = setup(); await login(f);
  f.setHandler(async () => { if (!failure) throw new TypeError("offline"); return response(failure, {}); });
  await assert.rejects(f.store.getState().refreshSession());
  assert.equal(f.store.getState().isAuthenticated, true); assert.equal(f.store.getState().isLoadingSession, false);
  assert.equal((await f.storage.loadStoredSession()).refreshToken, "refresh-A-1");
  f.setHandler(async () => response(200, { data: session("A", "2") }));
  assert.equal(await f.store.getState().refreshSession(), true);
});
for (const failure of [0, 503, 403]) await check(`ambiguous/denied mutation ${failure} is never automatically retried`, async () => {
  const f = setup(); await login(f);
  f.setHandler(async () => { if (!failure) throw new TypeError("lost response"); return response(failure, {}); });
  await assert.rejects(apiClient("/write", jsonBody("POST", { value: 1 })));
  assert.equal(f.count("/write"), 1); assert.equal(f.count("/auth/native/refresh"), 0);
  assert.equal(f.store.getState().isAuthenticated, true);
});

await check("logout during refresh fences activation and revokes a late successor", async () => {
  const f = setup(); await login(f); const pending = deferred(); const started = deferred();
  f.setHandler(async () => { started.resolve(); return pending.promise; });
  const refresh = f.store.getState().refreshSession(); await started.promise;
  await f.store.getState().logout(); assert.equal(f.store.getState().isAuthenticated, false);
  pending.resolve(response(200, { data: session("A", "2") })); assert.equal(await refresh, false);
  assert.equal(await f.storage.loadStoredSession(), null);
  assert.ok(f.revoked.includes("refresh-A-2"));
});

await check("a late login response cannot restore a logged-out session", async () => {
  const f = setup(); const pending = deferred(); const started = deferred();
  f.setHandler(async () => { started.resolve(); return pending.promise; });
  const attempt = f.store.getState().login("A", "secret"); await started.promise;
  await f.store.getState().logout(); pending.resolve(response(200, { data: session() })); await attempt;
  assert.equal(f.store.getState().isAuthenticated, false); assert.equal(await f.storage.loadStoredSession(), null);
  assert.ok(f.revoked.includes("refresh-A-1"));
});

await check("newer account wins over a late old login", async () => {
  const f = setup(); const pending = deferred(); const started = deferred();
  f.setHandler(async (_, o) => {
    if (JSON.parse(o.body).email === "A") { started.resolve(); return pending.promise; }
    return response(200, { data: session("B") });
  });
  const old = f.store.getState().login("A", "secret"); await started.promise;
  await login(f, "B"); pending.resolve(response(200, { data: session() })); await old;
  assert.equal(f.store.getState().currentUser.id, "B");
  assert.equal((await f.storage.loadStoredSession()).refreshToken, "refresh-B-1");
});

await check("old mutation is not replayed under a new account", async () => {
  const f = setup(); await login(f); const pending = deferred(); const started = deferred();
  f.setHandler(async (p) => {
    if (p === "/auth/native/refresh") { started.resolve(); return pending.promise; }
    if (p === "/auth/native/login") return response(200, { data: session("B") });
    return response(401, {});
  });
  const old = apiClient("/write", jsonBody("POST", { value: 1 }));
  // Attach immediately so a deliberately rejected race has no unhandled rejection.
  const rejected = assert.rejects(old, (e) => e.status === 409);
  await started.promise; await login(f, "B"); pending.resolve(response(200, { data: session("A", "2") })); await rejected;
  assert.equal(f.count("/write"), 1); assert.equal(f.store.getState().currentUser.id, "B");
});

await check("old successful response is discarded after account switching", async () => {
  const f = setup(); await login(f); const pending = deferred(); const started = deferred();
  f.setHandler(async (p) => {
    if (p === "/old") { started.resolve(); return pending.promise; }
    return response(200, { data: session("B") });
  });
  const rejected = assert.rejects(apiClient("/old"), (e) => e.status === 409);
  await started.promise; await login(f, "B"); pending.resolve(response(200, {})); await rejected;
});

await check("offline logout persists locally; restart performs no automatic refresh", async () => {
  const f = setup(); await login(f); f.setHandler(async () => { throw new TypeError("offline"); });
  // Include logout in the network outage (the local record still must clear).
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await f.store.getState().logout();
  const restarted = setup({}, 5000, f.disk); await restarted.store.getState().initializeSession();
  assert.equal(restarted.count("/auth/native/refresh"), 0); assert.equal(restarted.store.getState().isAuthenticated, false);
});

await check("expired access token survives process restart through persisted refresh rotation", async () => {
  const f = setup(); await login(f);
  const stored = await f.storage.loadStoredSession(); stored.accessTokenExpiresAt = 0;
  await f.storage.saveStoredSession(stored);
  const restarted = setup({}, 5000, f.disk); await restarted.store.getState().initializeSession();
  assert.equal(restarted.store.getState().isAuthenticated, true); assert.equal(restarted.count("/auth/native/refresh"), 1);
  assert.equal((await restarted.storage.loadStoredSession()).refreshToken, "refresh-A-2");
});

await check("cold-launch 5xx does not erase refresh credentials and retry restores", async () => {
  const f = setup(); await login(f); const restarted = setup({}, 5000, f.disk);
  restarted.setHandler(async () => response(503, {})); await restarted.store.getState().initializeSession();
  assert.equal(restarted.store.getState().hasLoadedSession, true); assert.equal(restarted.store.getState().isLoadingSession, false);
  assert.ok(restarted.store.getState().sessionError); assert.ok(await restarted.storage.loadStoredSession());
  restarted.setHandler(async () => response(200, { data: context() })); await restarted.store.getState().initializeSession();
  assert.equal(restarted.store.getState().isAuthenticated, true);
});

for (const mode of ["reject", "hang", "malformed"]) await check(`SecureStore read ${mode} finishes initialization with recovery`, async () => {
  const f = setup({ getItemAsync: async () => { if (mode === "reject") throw Error(); if (mode === "hang") return new Promise(() => {}); return '{"version":2}'; } }, 10);
  await f.store.getState().initializeSession();
  assert.equal(f.store.getState().isLoadingSession, false); assert.equal(f.store.getState().hasLoadedSession, true);
  assert.equal(f.store.getState().isAuthenticated, false); assert.ok(f.store.getState().sessionError);
});

await check("login persistence failure never activates and revokes issued credential", async () => {
  const f = setup({ setItemAsync: async (_, value) => { if (JSON.parse(value).refreshToken) throw Error(); } });
  await assert.rejects(login(f), SessionStorageError); assert.equal(f.store.getState().isAuthenticated, false);
  assert.equal(await f.storage.loadStoredSession(), null); assert.ok(f.revoked.includes("refresh-A-1"));
});

await check("rotation persistence failure clears the old credential and revokes successor", async () => {
  const f = setup(); await login(f);
  f.adapter.setItemAsync = async (_, value) => { if (JSON.parse(value).refreshToken) throw Error(); };
  await f.store.getState().refreshSession();
  assert.equal(f.store.getState().isAuthenticated, false); assert.equal(await f.storage.loadStoredSession(), null);
  assert.ok(f.revoked.includes("refresh-A-2")); assert.ok(f.store.getState().sessionError);
});

await check("delete failure leaves a durable signed-out tombstone", async () => {
  const f = setup(); await login(f); f.adapter.deleteItemAsync = async () => { throw Error(); };
  await f.store.getState().logout();
  const restarted = setup({}, 5000, f.disk); await restarted.store.getState().initializeSession();
  assert.equal(restarted.store.getState().isAuthenticated, false); assert.equal(restarted.count("/auth/native/refresh"), 0);
});

await check("tombstone write failure falls back to deletion", async () => {
  const f = setup(); await login(f); f.adapter.setItemAsync = async () => { throw Error(); };
  await f.store.getState().logout(); assert.equal(await f.storage.loadStoredSession(), null);
});

await check("total OS clearing failure is explicit, bounded, and locally signed out", async () => {
  const f = setup(); await login(f);
  f.adapter.setItemAsync = async () => { throw Error(); }; f.adapter.deleteItemAsync = async () => { throw Error(); };
  await f.store.getState().logout(); assert.equal(f.store.getState().isAuthenticated, false);
  assert.ok(f.store.getState().sessionError); assert.ok(await f.storage.loadStoredSession(), "all writes failed, so disk erasure cannot be claimed");
});

await check("timed-out SecureStore save cannot overwrite a queued logout on late completion", async () => {
  const f = setup({}, 15); const write = deferred(); const started = deferred();
  const set = f.adapter.setItemAsync;
  f.adapter.setItemAsync = async (key, value) => {
    if (JSON.parse(value).refreshToken) { started.resolve(); await write.promise; }
    await set(key, value);
  };
  const attempt = assert.rejects(login(f), SessionStorageError); await started.promise;
  await f.store.getState().logout(); await attempt;
  write.resolve();
  assert.equal(await f.storage.loadStoredSession(), null); assert.equal(f.store.getState().isAuthenticated, false);
});

await check("refresh keeps a factory selected while renewal is pending", async () => {
  const f = setup();
  const multi = { ...session(), accessibleFactories: [...context().accessibleFactories, { id: "factory-second", name: "Second" }] };
  f.setHandler(async () => response(200, { data: multi })); await login(f);
  const pending = deferred(); const started = deferred();
  f.setHandler(async () => { started.resolve(); return pending.promise; });
  const refresh = f.store.getState().refreshSession(); await started.promise;
  f.store.getState().setActiveFactory("factory-second");
  pending.resolve(response(200, { data: { ...multi, ...session("A", "2"), accessibleFactories: multi.accessibleFactories } }));
  await refresh; assert.equal(f.store.getState().activeFactoryId, "factory-second");
});

await check("expired cold-launch refresh network failure retains credentials for explicit retry", async () => {
  const f = setup(); await login(f); const stored = await f.storage.loadStoredSession(); stored.accessTokenExpiresAt = 0;
  await f.storage.saveStoredSession(stored); const restarted = setup({}, 5000, f.disk);
  restarted.setHandler(async () => { throw new TypeError("offline"); }); await restarted.store.getState().initializeSession();
  assert.equal(restarted.store.getState().isAuthenticated, false); assert.equal(restarted.store.getState().hasLoadedSession, true);
  assert.equal((await restarted.storage.loadStoredSession()).refreshToken, "refresh-A-1");
  restarted.setHandler(async () => response(200, { data: session("A", "2") })); await restarted.store.getState().initializeSession();
  assert.equal(restarted.store.getState().isAuthenticated, true);
});

await check("failed account switch cannot restore the previous account on restart", async () => {
  const f = setup(); await login(f); f.setHandler(async () => response(401, {}));
  await assert.rejects(login(f, "B")); assert.equal(f.store.getState().sessionError, null, "login form owns credential errors"); const restarted = setup({}, 5000, f.disk);
  await restarted.store.getState().initializeSession(); assert.equal(restarted.store.getState().isAuthenticated, false);
  assert.equal(restarted.requests.length, 0);
});

await check("SecureStore delete hang is bounded and its prior tombstone blocks restart", async () => {
  const f = setup({}, 10); await login(f); f.adapter.deleteItemAsync = async () => new Promise(() => {});
  await f.store.getState().logout(); assert.equal(f.store.getState().isAuthenticated, false); assert.ok(f.store.getState().sessionError);
  const restarted = setup({}, 5000, f.disk); await restarted.store.getState().initializeSession();
  assert.equal(restarted.store.getState().isAuthenticated, false); assert.equal(restarted.requests.length, 0);
});

await check("legacy access-only storage never restores through a cookie refresh", async () => {
  const f = setup({}, 5000, new Map([["paypoq.mobile.accessToken", "legacy"], ["paypoq.mobile.accessTokenExpiresAt", String(Date.now() + 900000)]]));
  await f.store.getState().initializeSession(); assert.equal(f.store.getState().isAuthenticated, false); assert.equal(f.requests.length, 0);
});

await check("caller cancellation aborts the request without mutation retry", async () => {
  const f = setup(); await login(f); const started = deferred();
  f.setHandler(async (_, options) => new Promise((_, reject) => {
    started.resolve(); options.signal.addEventListener("abort", () => reject(Error("aborted")));
  }));
  const controller = new AbortController();
  const rejected = assert.rejects(apiClient("/write", { ...jsonBody("POST", {}), signal: controller.signal }), (e) => e.status === 0);
  await started.promise; controller.abort(); await rejected;
  assert.equal(f.count("/write"), 1);
});

await check("account/logout controls do not depend on optional employee-profile data", async () => {
  const profile = readFileSync(resolve(root, "app/(app)/more/profile.tsx"), "utf8");
  assert.ok(profile.indexOf("<LogoutButton disabled={false}") < profile.indexOf("{meQuery.data ? ("));
  assert.equal((profile.match(/<LogoutButton /g) ?? []).length, 1);
});
console.log(`Native session integration: ${passed} checks passed (mock OS/HTTP, no device claim).`);
