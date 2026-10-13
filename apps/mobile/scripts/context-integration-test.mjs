import assert from "node:assert/strict";
import { mock } from "node:test";
import React, { useState, useEffect } from "react";
import { create, act } from "react-test-renderer";
import { QueryClient, QueryClientProvider, isCancelledError } from "@tanstack/react-query";
import { deferred, response, router } from "./context-test-runtime.mjs";
import { createAuthStore, useAuthStore } from "../src/stores/auth-store.ts";
import { createSessionStorage } from "../src/lib/auth/session-storage.ts";
import { apiClient, jsonBody, setApiAccessToken, advanceApiSessionGeneration, setApiAuthRefreshHandler, setApiAuthFailureHandler } from "../src/lib/api/client.ts";
import { getRequestContext, setApiSessionContext } from "../src/lib/auth/request-context.ts";
import { ContextChangedError } from "../src/lib/api/errors.ts";
import { queryKeys, scopedQueryKey, invalidationGroups } from "../src/lib/api/query-keys.ts";
import { contextQueryOptions } from "../src/shared/hooks/use-context-query.ts";
import { useGuardedMutation } from "../src/shared/hooks/use-guarded-mutation.ts";
import { ContextResetBoundary, SessionContextBoundary } from "../src/shared/ui/session-context-boundary.tsx";
import { useUiStore } from "../src/stores/ui-store.ts";
import { mobileQueryClient, invalidateOriginQueries } from "../src/providers/query-cache.ts";
import { productionApi, useProductionRunsQuery } from "../src/lib/api/production.ts";
import { machinesApi } from "../src/lib/api/machines.ts";
import { catalogApi } from "../src/lib/api/warehouse.ts";
import { SelectField, Button } from "../src/shared/ui/controls.tsx";
import { AppProviders } from "../src/providers/app-providers.tsx";
import CorrectStockRoute from "../app/(app)/operations/warehouse/correct.tsx";

const factories = [{ id: "factory-A", name: "Factory A" }, { id: "factory-B", name: "Factory B" }];
function authContext(user = "user-A", allowed = factories, branchMode = "MULTI") {
  return {
    user: { id: user, name: user, email: `${user}@test.local`, status: "ACTIVE" }, tenantId: `tenant-${user}`,
    branchMode, activeFactoryId: allowed[0]?.id ?? null, accessibleFactories: allowed,
    roles: ["Owner"], permissions: ["production.view", "production.write", "warehouse.view", "warehouse.write", "machines.view", "machines.write"],
  };
}
const session = (user = "user-A", suffix = "1", allowed = factories, branchMode = "MULTI") => ({ ...authContext(user, allowed, branchMode), accessToken: `access-${user}-${suffix}`, refreshToken: `refresh-${user}-${suffix}`, accessTokenExpiresInSeconds: 900 });

function setup(existing = new Map(), overrides = {}) {
  mobileQueryClient.clear(); advanceApiSessionGeneration(); setApiAccessToken(null); router();
  const disk = existing;
  const adapter = { async getItemAsync(k) { return disk.get(k) ?? null; }, async setItemAsync(k, v) { disk.set(k, v); }, async deleteItemAsync(k) { disk.delete(k); }, ...overrides };
  const storage = createSessionStorage(adapter);
  const store = createAuthStore(storage);
  const requests = [];
  let handler = async (path, opts) => {
    if (path === "/auth/native/login") return response(200, { data: session(JSON.parse(opts.body).email) });
    if (path === "/auth/native/refresh") return response(200, { data: session("user-A", "2") });
    if (path === "/auth/me") return response(200, { data: authContext() });
    return response(200, { data: [opts.headers.get("X-Factory-Id") + "-only"] });
  };
  globalThis.fetch = async (url, opts) => {
    const path = new URL(url).pathname; requests.push({ path, ...opts });
    if (path === "/auth/native/logout") return response(200, { data: { status: "ok" } });
    return handler(path, opts);
  };
  return { disk, adapter, storage, store, requests, setHandler(fn) { handler = fn; }, count(path) { return requests.filter((r) => r.path === path).length; } };
}
const login = (f, user = "user-A") => f.store.getState().login(user, "test");
const switchTo = (f, factory = "factory-B") => f.store.getState().setActiveFactory(factory);
const queryOptions = (origin = getRequestContext()) => contextQueryOptions({ queryKey: queryKeys.production.runs(), queryFn: async (opts) => (await productionApi.getRuns(opts)).data }, origin);
let passed = 0;
async function check(name, fn) { await fn(); passed++; mobileQueryClient.clear(); console.log(`PASS ${name}`); }

await check("authorized persisted selection restores after fresh me verification, with no preference header on me", async () => {
  const f = setup(); await login(f); await switchTo(f);
  const stored = await f.storage.loadStoredSession(); assert.deepEqual(stored.factoryPreference, { tenantId: "tenant-user-A", userId: "user-A", factoryId: "factory-B" });
  const restored = setup(f.disk); await restored.store.getState().initializeSession();
  assert.equal(restored.store.getState().activeFactoryId, "factory-B");
  assert.equal(restored.requests.find((r) => r.path === "/auth/me").headers.get("X-Factory-Id"), null);
  await productionApi.getRuns(); assert.equal(restored.requests.at(-1).headers.get("X-Factory-Id"), "factory-B");
});
await check("expired restart retains authorized preference through PR 01 refresh rotation", async () => {
  const f = setup(); await login(f); await switchTo(f);
  const saved = await f.storage.loadStoredSession(); saved.accessTokenExpiresAt = 0; await f.storage.saveStoredSession(saved);
  const restored = setup(f.disk); await restored.store.getState().initializeSession();
  assert.equal(restored.store.getState().activeFactoryId, "factory-B");
  assert.equal((await restored.storage.loadStoredSession()).refreshToken, "refresh-user-A-2");
});
await check("removed factory access discards preference and persists API default", async () => {
  const f = setup(); await login(f); await switchTo(f); const restored = setup(f.disk);
  restored.setHandler(async () => response(200, { data: authContext("user-A", [factories[0]]) })); await restored.store.getState().initializeSession();
  assert.equal(restored.store.getState().activeFactoryId, "factory-A");
  assert.equal((await restored.storage.loadStoredSession()).factoryPreference.factoryId, "factory-A");
});
await check("preferences never restore under another tenant/user, even with overlapping factory IDs", async () => {
  const f = setup(); await login(f); await switchTo(f); const saved = await f.storage.loadStoredSession();
  saved.accessToken = "access-user-B-1"; saved.refreshToken = "refresh-user-B-1"; await f.storage.saveStoredSession(saved);
  const restored = setup(f.disk); restored.setHandler(async () => response(200, { data: authContext("user-B") })); await restored.store.getState().initializeSession();
  assert.equal(restored.store.getState().activeFactoryId, "factory-A"); assert.equal(restored.store.getState().currentUser.id, "user-B");
});
await check("SINGLE follows the API's sole authorized factory, not a stored MULTI preference", async () => {
  const f = setup(); await login(f); await switchTo(f); const restored = setup(f.disk);
  restored.setHandler(async () => response(200, { data: authContext("user-A", [factories[0]], "SINGLE") })); await restored.store.getState().initializeSession();
  assert.equal(restored.store.getState().branchMode, "SINGLE"); assert.equal(restored.store.getState().activeFactoryId, "factory-A");
});
await check("unauthorized factory selection is refused without altering the origin", async () => {
  const f = setup(); await login(f); const before = getRequestContext();
  assert.equal(await switchTo(f, "not-authorized"), false); assert.equal(getRequestContext(), before);
  assert.equal(f.store.getState().activeFactoryId, "factory-A");
});
await check("selection patches the rotated envelope instead of rewriting a consumed refresh token", async () => {
  const f = setup(); await login(f); const held = deferred(); const started = deferred(); const set = f.adapter.setItemAsync;
  f.adapter.setItemAsync = async (k, v) => { if (JSON.parse(v).refreshToken === "refresh-user-A-2") { started.resolve(); await held.promise; } await set(k, v); };
  const refreshed = f.store.getState().refreshSession(); await started.promise;
  const switched = switchTo(f); held.resolve(); await Promise.all([refreshed, switched]);
  const saved = await f.storage.loadStoredSession(); assert.equal(saved.refreshToken, "refresh-user-A-2"); assert.equal(saved.factoryPreference.factoryId, "factory-B");
});
await check("preference-only persistence failure preserves secure credentials and is visible", async () => {
  const f = setup(); await login(f); f.adapter.setItemAsync = async () => { throw Error("OS rejected"); };
  assert.equal(await switchTo(f), false); assert.equal(f.store.getState().isAuthenticated, true);
  assert.equal(f.store.getState().activeFactoryId, "factory-B"); assert.ok(f.store.getState().factoryPreferenceError); assert.match(useUiStore.getState().contextNotices.at(-1).message, /saqlanmadi/);
  assert.equal((await f.storage.loadStoredSession()).refreshToken, "refresh-user-A-1");
});
await check("logout/account switch clears feedback and query data and uses a new session identity", async () => {
  const f = setup(); await login(f); await switchTo(f); const origin = getRequestContext();
  const oldKey = scopedQueryKey(queryKeys.production.runs(), origin, "factory"); mobileQueryClient.setQueryData(oldKey, ["private A"]);
  useUiStore.getState().showFlash("A only"); await f.store.getState().logout(); await login(f, "user-B");
  assert.notEqual(getRequestContext().sessionGeneration, origin.sessionGeneration); assert.equal(getRequestContext().userId, "user-B");
  assert.equal(f.store.getState().activeFactoryId, "factory-A"); assert.equal(mobileQueryClient.getQueryData(oldKey), undefined);
  assert.equal(useUiStore.getState().flash, null); assert.equal(useUiStore.getState().contextNotices.length, 0);
});
await check("factory/user/session/authorization cache identities differ without losing domain prefixes", async () => {
  const f = setup(); await login(f); const origin = getRequestContext(); const a = queryOptions().queryKey;
  await switchTo(f); const b = queryOptions().queryKey; assert.equal(a[0], "production"); assert.notDeepEqual(a, b);
  assert.equal(scopedQueryKey(queryKeys.catalog.materials(), origin, "tenant").at(-1).factoryId, undefined);
  await login(f, "user-B"); assert.notDeepEqual(queryOptions().queryKey, a);
  const before = queryOptions().queryKey; setApiSessionContext({ ...authContext("user-B"), permissions: ["production.view"] });
  assert.notDeepEqual(queryOptions().queryKey, before);
});
await check("real QueryClient reads two distinguishable factories into separate keys", async () => {
  const f = setup(); await login(f); const client = new QueryClient();
  try {
    const a = queryOptions(); assert.deepEqual(await client.fetchQuery(a), ["factory-A-only"]);
    await switchTo(f); const b = queryOptions(); assert.deepEqual(await client.fetchQuery(b), ["factory-B-only"]);
    assert.deepEqual(client.getQueryData(a.queryKey), ["factory-A-only"]); assert.deepEqual(client.getQueryData(b.queryKey), ["factory-B-only"]);
  } finally { client.clear(); }
});
await check("switch during a pending read cancels its signal and never caches the late result under B", async () => {
  const f = setup(); await login(f); const pending = deferred(); const started = deferred();
  f.setHandler(async (_, opts) => { if (opts.headers.get("X-Factory-Id") === "factory-A") { started.resolve(opts.signal); return pending.promise; } return response(200, { data: ["B-only"] }); });
  const a = queryOptions(); const old = mobileQueryClient.fetchQuery(a); const rejected = assert.rejects(old, (e) => isCancelledError(e) || e instanceof ContextChangedError);
  const signal = await started.promise; await switchTo(f); assert.equal(signal.aborted, true);
  const b = queryOptions(); assert.deepEqual(await mobileQueryClient.fetchQuery(b), ["B-only"]);
  pending.resolve(response(200, { data: ["A-only"] })); await rejected;
  assert.deepEqual(mobileQueryClient.getQueryData(b.queryKey), ["B-only"]);
});
await check("a captured query cannot be dispatched after its origin becomes invalid", async () => {
  const f = setup(); await login(f); const options = queryOptions(); await switchTo(f);
  await assert.rejects(options.queryFn({ signal: new AbortController().signal }), ContextChangedError);
  assert.equal(f.count("/production/runs"), 0);
});
await check("tenant-wide catalogue results survive a factory switch and omit the factory header", async () => {
  const f = setup(); await login(f); const held = deferred(); const started = deferred();
  f.setHandler(async (_, opts) => { started.resolve(opts); return held.promise; });
  const opts = contextQueryOptions({ queryKey: queryKeys.catalog.materials(), contextScope: "tenant", queryFn: async (o) => (await catalogApi.getMaterials(o)).data });
  const result = opts.queryFn({ signal: new AbortController().signal }); const request = await started.promise;
  await switchTo(f); assert.equal(request.headers.get("X-Factory-Id"), null); assert.equal(request.signal.aborted, false);
  held.resolve(response(200, { data: ["tenant material"] })); assert.deepEqual(await result, ["tenant material"]);
});
await check("A -> 401 -> refresh -> B rejects write replay before any B execution", async () => {
  const f = setup(); await login(f); const held = deferred(); const started = deferred();
  f.setHandler(async (path) => { if (path === "/auth/native/refresh") { started.resolve(); return held.promise; } return response(401, {}); });
  const rejected = assert.rejects(apiClient("/write", jsonBody("POST", { quantity: 3 })), ContextChangedError);
  await started.promise; await switchTo(f); held.resolve(response(200, { data: session("user-A", "2") })); await rejected;
  const writes = f.requests.filter((r) => r.path === "/write"); assert.equal(writes.length, 1); assert.equal(writes[0].headers.get("X-Factory-Id"), "factory-A");
  assert.equal(f.store.getState().activeFactoryId, "factory-B");
});
await check("A -> B -> A still invalidates an old draft's origin", async () => {
  const f = setup(); await login(f); const origin = getRequestContext(); await switchTo(f); await switchTo(f, "factory-A");
  await assert.rejects(apiClient("/write", { ...jsonBody("POST", {}), originContext: origin }), ContextChangedError); assert.equal(f.count("/write"), 0);
});
await check("delayed success/error preserve origin outcome and never become current-factory data", async () => {
  for (const status of [200, 409, 503]) {
    const f = setup(); await login(f); const held = deferred(); const started = deferred();
    f.setHandler(async (_, opts) => { started.resolve(opts.signal); return held.promise; });
    const expected = status === 200 ? "succeeded" : status === 409 ? "failed" : "unknown";
    const rejected = assert.rejects(apiClient("/write", jsonBody("POST", {})), (e) => e instanceof ContextChangedError && e.origin.factoryId === "factory-A" && e.outcome === expected);
    const signal = await started.promise; await switchTo(f); assert.equal(signal.aborted, false, "do not imply a dispatched write was canceled");
    held.resolve(response(status, {})); await rejected;
  }
});
await check("caller cancellation is composed with context cancellation for concurrent reads", async () => {
  const f = setup(); await login(f); const started = deferred(); let signal;
  f.setHandler(async (p, opts) => {
    if (p === "/cancel") return new Promise((_, reject) => { signal = opts.signal; started.resolve(); opts.signal.addEventListener("abort", () => reject(Error("abort"))); });
    return response(200, { data: "other read" });
  });
  const controller = new AbortController(); const rejected = assert.rejects(apiClient("/cancel", { signal: controller.signal }), (e) => e.status === 0);
  await started.promise; controller.abort(); assert.equal(signal.aborted, true); await rejected;
  assert.deepEqual(await apiClient("/other"), { data: "other read" });
});
await check("the real 20-second request deadline aborts without overriding the caller signal", async () => {
  const f = setup(); await login(f); const started = deferred();
  f.setHandler(async (_, opts) => new Promise((_, reject) => { started.resolve(); opts.signal.addEventListener("abort", () => reject(Error("timeout"))); }));
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const caller = new AbortController(); const rejected = assert.rejects(apiClient("/deadline", { signal: caller.signal }), (e) => e.status === 0);
    await started.promise; mock.timers.tick(20000); await rejected; assert.equal(caller.signal.aborted, false);
  } finally { mock.timers.reset(); }
});
await check("mutation invalidation targets origin A and tenant-wide dependents, never B or another user", async () => {
  const f = setup(); await login(f); const client = new QueryClient(); const a = getRequestContext();
  try {
    const ka = scopedQueryKey(queryKeys.production.runs(), a, "factory"); client.setQueryData(ka, ["A"]);
    await switchTo(f); const kb = scopedQueryKey(queryKeys.production.runs(), getRequestContext(), "factory"); client.setQueryData(kb, ["B"]);
    const kt = scopedQueryKey(queryKeys.production.lookupVariants(), a, "tenant"); client.setQueryData(kt, ["tenant"]);
    const ku = scopedQueryKey(queryKeys.production.runs(), { ...a, userId: "other" }, "factory"); client.setQueryData(ku, ["other"]);
    await invalidateOriginQueries(client, invalidationGroups.production, a);
    assert.equal(client.getQueryState(ka).isInvalidated, true); assert.equal(client.getQueryState(kt).isInvalidated, true);
    assert.equal(client.getQueryState(kb).isInvalidated, false); assert.equal(client.getQueryState(ku).isInvalidated, false);
  } finally { client.clear(); }
});

async function mountForm(f) {
  let controls; const pending = deferred(); const started = deferred();
  f.setHandler(async () => { started.resolve(); return pending.promise; });
  function Form() {
    const [quantity, setQuantity] = useState(""), [confirm, setConfirm] = useState(false);
    const mutation = useGuardedMutation({ mutationFn: async (v, opts) => (await apiClient("/write", jsonBody("POST", v, opts))).data, invalidate: invalidationGroups.production });
    controls = { quantity, setQuantity, confirm, setConfirm, ...mutation };
    return React.createElement("form", { quantity, confirm });
  }
  function App() { const [revision, setRevision] = useState(getRequestContext().revision); useEffect(() => {
    const { subscribeRequestContext } = globalThis.__realContextModule;
    return subscribeRequestContext(() => setRevision(getRequestContext().revision));
  }, []); return React.createElement(QueryClientProvider, { client: mobileQueryClient }, React.createElement(ContextResetBoundary, { contextKey: revision }, React.createElement(Form))); }
  let tree; await act(async () => { tree = create(React.createElement(App)); });
  return { get controls() { return controls; }, pending, started, tree };
}
globalThis.__realContextModule = await import("../src/lib/auth/request-context.ts");
await check("mounted unsaved form and confirmation reset; its old submit closure cannot dispatch", async () => {
  const f = setup(); await login(f); const form = await mountForm(f);
  try {
    await act(async () => { form.controls.setQuantity("17"); form.controls.setConfirm(true); }); const oldSubmit = form.controls.submit;
    assert.equal(form.controls.quantity, "17"); await act(async () => { await switchTo(f); });
    assert.equal(form.controls.quantity, ""); assert.equal(form.controls.confirm, false);
    await act(async () => { await assert.rejects(oldSubmit({ quantity: 17 }), ContextChangedError); }); assert.equal(f.count("/write"), 0);
  } finally { await act(async () => form.tree.unmount()); }
});
await check("real guarded mutation suppresses late success callbacks and reports Factory A", async () => {
  const f = setup(); await login(f); const form = await mountForm(f); let callback = false;
  try {
    let pending; await act(async () => { pending = form.controls.submit({ quantity: 4 }); }); const rejected = assert.rejects(pending.then(() => { callback = true; }), ContextChangedError);
    await form.started.promise; await act(async () => { await switchTo(f); });
    await act(async () => { form.pending.resolve(response(200, { data: { id: "A-write" } })); await rejected; });
    assert.equal(callback, false); assert.match(useUiStore.getState().contextNotices.at(-1).message, /Factory A/);
    assert.equal(form.controls.isPending, false);
  } finally { await act(async () => form.tree.unmount()); }
});
await check("late result from a logged-out account never produces new-account feedback", async () => {
  const f = setup(); await login(f); const form = await mountForm(f);
  try {
    let pending; await act(async () => { pending = form.controls.submit({}); }); const rejected = assert.rejects(pending, ContextChangedError); await form.started.promise;
    f.setHandler(async () => response(200, { data: session("user-B") })); await act(async () => { await login(f, "user-B"); });
    await act(async () => { form.pending.resolve(response(200, { data: { id: "A-write" } })); await rejected; });
    assert.equal(useUiStore.getState().contextNotices.length, 0);
  } finally { await act(async () => form.tree.unmount()); }
});
await check("mounted guarded mutation prevents double submit and ambiguous response retry", async () => {
  const f = setup(); await login(f); const form = await mountForm(f);
  try {
    let first, second; await act(async () => { first = form.controls.submit({ quantity: 1 }); second = form.controls.submit({ quantity: 1 }); });
    assert.equal(await second, undefined); const rejected = assert.rejects(first, (e) => e.status === 0); await form.started.promise;
    await act(async () => { form.pending.reject(new TypeError("lost response")); await rejected; }); assert.equal(f.count("/write"), 1);
  } finally { await act(async () => form.tree.unmount()); }
});
await check("multi-step specification creation stops before activation after a factory switch", async () => {
  const f = setup(); await login(f); const held = deferred(); const started = deferred(); const origin = getRequestContext();
  f.setHandler(async () => { started.resolve(); return held.promise; });
  const process = (async () => { const created = await machinesApi.createSpecification("product", [], { originContext: origin }); await machinesApi.activateSpecification(created.data.id, { originContext: origin }); })();
  const rejected = assert.rejects(process, ContextChangedError); await started.promise; await switchTo(f);
  held.resolve(response(200, { data: { id: "A-inactive-spec" } })); await rejected;
  assert.equal(f.count("/machines/specifications/A-inactive-spec/activate"), 0);
});

await check("actual stock-correction draft, open confirmation and route params disappear on factory change", async () => {
  const f = setup();
  globalThis.__nativeSecureAdapter = f.adapter;
  f.store = useAuthStore;
  setApiAuthRefreshHandler(() => useAuthStore.getState().refreshSession());
  setApiAuthFailureHandler(() => useAuthStore.getState().clearSession());
  f.setHandler(async () => response(200, { data: { ...session(), roles: ["Warehouse Operator"] } }));
  await login(f);
  const navigation = router("/operations/warehouse/correct");
  f.setHandler(async (path, opts) => {
    const factory = opts.headers.get("X-Factory-Id");
    if (path === "/product/products") return response(200, { data: [{ id: "product", name: "Socks", variants: [{ id: "variant", product: { name: "Socks" }, color: { name: "Black" }, material: { name: "Cotton" }, season: { name: "Summer" } }] }] });
    if (path === "/product/materials") return response(200, { data: [{ id: "material", name: "Shared material", code: null }] });
    if (path === "/warehouse/zones") return response(200, { data: [{ id: `zone-${factory}`, name: "Zone", warehouse: { id: `wh-${factory}`, name: "Warehouse" }, factory: { id: factory, name: factory } }] });
    return response(200, { data: [] });
  });
  let tree; await act(async () => { tree = create(React.createElement(QueryClientProvider, { client: mobileQueryClient }, React.createElement(SessionContextBoundary, null, React.createElement(CorrectStockRoute)))); });
  try {
    await act(async () => {
      await Promise.all(mobileQueryClient.getQueryCache().findAll({ type: "active" }).map((query) => mobileQueryClient.fetchQuery(query.options)));
    });
    const inputs = tree.root.findAllByType("TextInput");
    assert.ok(inputs.length >= 2);
    await act(async () => { inputs.at(-1).props.onChangeText("unsaved Factory A reason"); });
    assert.ok(tree.root.findAllByType("TextInput").some((input) => input.props.value === "unsaved Factory A reason"));
    await act(async () => {
      const choices = tree.root.findAllByType(SelectField);
      choices.find((field) => field.props.options.some((o) => o.value === "variant")).props.onChange("variant");
      choices.find((field) => field.props.options.some((o) => o.value === "zone-factory-A")).props.onChange("zone-factory-A");
      tree.root.findAllByType("TextInput").find((input) => input.props.keyboardType === "number-pad").props.onChangeText("3");
    });
    await act(async () => { tree.root.findAllByType(Button).find((button) => button.props.label === "Tekshirish va tuzatish").props.onPress(); });
    assert.equal(tree.root.findAllByType("Modal").length, 1);
    await act(async () => { await switchTo(f); });
    assert.equal(navigation.pathname, "/home"); assert.deepEqual(navigation.params, {});
    assert.equal(tree.root.findAllByType("Modal").length, 0);
    assert.equal(f.count("/warehouse/stock-corrections"), 0);
    // The reset component has fresh defaults; native router stops displaying this route.
    assert.equal(tree.root.findAllByType("TextInput").some((input) => input.props.value === "unsaved Factory A reason"), false);
  } finally { await act(async () => tree.unmount()); await f.store.getState().clearSession(); globalThis.__nativeSecureAdapter = undefined; }
});
await check("success followed by a factory switch during refetch cannot release a current-view callback", async () => {
  const f = setup(); await login(f); const held = deferred(), refetchStarted = deferred(); let wrote = false, controls, tree, callback = false;
  f.setHandler(async (path, opts) => {
    if (path === "/write") { wrote = true; return response(200, { data: { id: "confirmed-A" } }); }
    if (wrote && opts.headers.get("X-Factory-Id") === "factory-A") { refetchStarted.resolve(); return held.promise; }
    return response(200, { data: [opts.headers.get("X-Factory-Id")] });
  });
  function Form() {
    useProductionRunsQuery();
    controls = useGuardedMutation({ mutationFn: async (v, opts) => (await apiClient("/write", jsonBody("POST", v, opts))).data, invalidate: invalidationGroups.production });
    return React.createElement("form");
  }
  await act(async () => { tree = create(React.createElement(QueryClientProvider, { client: mobileQueryClient }, React.createElement(Form))); });
  try {
    await act(async () => { await Promise.all(mobileQueryClient.getQueryCache().getAll().map((q) => mobileQueryClient.fetchQuery(q.options))); });
    let pending; await act(async () => { pending = controls.submit({}).then(() => { callback = true; }); });
    const rejected = assert.rejects(pending, (e) => e instanceof ContextChangedError && e.outcome === "succeeded");
    await refetchStarted.promise;
    await act(async () => { await switchTo(f); await rejected; });
    held.resolve(response(200, { data: ["A-new"] }));
    assert.equal(callback, false); assert.equal(f.count("/write"), 1);
    assert.ok(useUiStore.getState().contextNotices.some((n) => n.kind === "outcome" && n.message.includes("Factory A")));
  } finally { held.resolve(response(200, { data: [] })); await act(async () => tree.unmount()); }
});

await check("actual AppState resume revalidates removed access and resets the mounted draft", async () => {
  const f = setup(); globalThis.__nativeSecureAdapter = f.adapter; f.store = useAuthStore;
  setApiAuthRefreshHandler(() => f.store.getState().refreshSession()); setApiAuthFailureHandler(() => f.store.getState().clearSession());
  const me = { ...authContext(), roles: ["Warehouse Operator"] };
  f.setHandler(async (path) => response(200, { data: path === "/auth/native/login" ? { ...session(), roles: me.roles } : me }));
  await login(f); await switchTo(f); router(); let controls, tree;
  function Form() { const [value, setValue] = useState(""); controls = { value, setValue }; return React.createElement("form", { value }); }
  await act(async () => { tree = create(React.createElement(AppProviders, null, React.createElement(SessionContextBoundary, null, React.createElement(Form)))); });
  try {
    await act(async () => { await f.store.getState().initializeSession(); controls.setValue("B draft"); });
    await act(async () => { globalThis.__appStateListener("background"); }); assert.equal(controls.value, "B draft");
    const normalResume = deferred(); const originalRevision = getRequestContext().revision;
    const unsubscribeNormal = f.store.subscribe((state) => { if (state.activeFactoryId === "factory-B") normalResume.resolve(); });
    try { await act(async () => { globalThis.__appStateListener("active"); await normalResume.promise; }); }
    finally { unsubscribeNormal(); }
    assert.equal(controls.value, "B draft"); assert.equal(getRequestContext().revision, originalRevision);
    await act(async () => { globalThis.__appStateListener("background"); });
    f.setHandler(async () => response(200, { data: { ...me, accessibleFactories: [factories[0]] } }));
    const changed = deferred(); const unsubscribe = f.store.subscribe((state) => { if (state.activeFactoryId === "factory-A") changed.resolve(); });
    try { await act(async () => { globalThis.__appStateListener("active"); await changed.promise; }); }
    finally { unsubscribe(); }
    assert.equal(f.store.getState().activeFactoryId, "factory-A"); assert.equal(controls.value, "");
    assert.equal((await f.storage.loadStoredSession()).factoryPreference.factoryId, "factory-A");
  } finally { await act(async () => tree.unmount()); await f.store.getState().clearSession(); globalThis.__nativeSecureAdapter = undefined; }
});

console.log(`Native context integration: ${passed} checks passed (real React/store/client/Query/mutation; mocked native host/HTTP).`);
