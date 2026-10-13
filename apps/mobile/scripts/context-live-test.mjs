/** Actual app store/client/query/mutation logic against the isolated real API. */
import assert from "node:assert/strict";
import React from "react";
import { create, act } from "react-test-renderer";
import { QueryClientProvider } from "@tanstack/react-query";
import { deferred, router } from "./context-test-runtime.mjs";
import { createAuthStore } from "../src/stores/auth-store.ts";
import { createSessionStorage } from "../src/lib/auth/session-storage.ts";
import { advanceApiSessionGeneration, setApiAccessToken } from "../src/lib/api/client.ts";
import { ContextChangedError } from "../src/lib/api/errors.ts";
import { getRequestContext } from "../src/lib/auth/request-context.ts";
import { contextQueryOptions } from "../src/shared/hooks/use-context-query.ts";
import { queryKeys } from "../src/lib/api/query-keys.ts";
import { warehouseApi, catalogApi, useCreateMaterialReceipt } from "../src/lib/api/warehouse.ts";
import { mobileQueryClient } from "../src/providers/query-cache.ts";
import { useUiStore } from "../src/stores/ui-store.ts";
const fixture = JSON.parse(process.env.CONTEXT_FIXTURE), API = process.env.CONTEXT_API_URL;
const email = process.env.CONTEXT_EMAIL, password = process.env.CONTEXT_PASSWORD;
const network = globalThis.fetch;
const disk = new Map();
const adapter = { async getItemAsync(k) { return disk.get(k) ?? null; }, async setItemAsync(k, v) { disk.set(k, v); }, async deleteItemAsync(k) { disk.delete(k); } };
let storage = createSessionStorage(adapter), store = createAuthStore(storage), passed = 0;
router();
const stockOptions = () => contextQueryOptions({ queryKey: queryKeys.warehouse.materialStock(), queryFn: async (o) => (await warehouseApi.getMaterialStock(o)).data });
const quantity = (rows) => { const matches = rows.filter((row) => row.material.id === fixture.materialId); assert.equal(matches.length, 1); return matches[0].quantity; };
async function raw(path, token, factoryId, method = "GET", body) {
  const res = await network(`${API}${path}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(factoryId ? { "X-Factory-Id": factoryId } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function readStock(id) { const res = await raw("/warehouse/material-stock", store.getState().accessToken, id); assert.equal(res.status, 200); return quantity(res.body.data); }
async function check(name, fn) { await fn(); console.log(`PASS ${name}`); passed++; }
const write = { materialId: fixture.materialId, quantity: "2", unit: "kg", warehouseZoneId: fixture.zones[fixture.a] };

try {
  await store.getState().login(email, password);
  await check("actual native Warehouse role reads factory A=5 and B=20 through separate QueryClient identities", async () => {
    assert.ok(store.getState().roles.includes("Warehouse Operator"));
    const a = stockOptions(); assert.equal(quantity(await mobileQueryClient.fetchQuery(a)), "5");
    assert.equal(await store.getState().setActiveFactory(fixture.b), true);
    const b = stockOptions(); assert.equal(quantity(await mobileQueryClient.fetchQuery(b)), "20");
    assert.equal(quantity(mobileQueryClient.getQueryData(a.queryKey)), "5"); assert.equal(quantity(mobileQueryClient.getQueryData(b.queryKey)), "20");
  });
  await check("actual /auth/me revalidates a persisted B selection after simulated JS restart", async () => {
    const before = getRequestContext().sessionGeneration; advanceApiSessionGeneration(); setApiAccessToken(null);
    storage = createSessionStorage(adapter); store = createAuthStore(storage); await store.getState().initializeSession();
    assert.ok(store.getState().isAuthenticated); assert.equal(store.getState().activeFactoryId, fixture.b); assert.notEqual(getRequestContext().sessionGeneration, before);
    assert.equal(quantity((await warehouseApi.getMaterialStock()).data), "20");
  });
  await check("actual tenant-wide catalogue is identical while factory-scoped stock differs", async () => {
    const options = () => contextQueryOptions({ queryKey: queryKeys.catalog.materials(), contextScope: "tenant", queryFn: async (o) => (await catalogApi.getMaterials(o)).data });
    const b = options(); const materialB = await mobileQueryClient.fetchQuery(b); await store.getState().setActiveFactory(fixture.a); const a = options();
    assert.deepEqual(a.queryKey, b.queryKey); assert.deepEqual(await mobileQueryClient.fetchQuery(a), materialB);
    assert.ok(materialB.some((row) => row.id === fixture.materialId));
  });
  await check("a real delayed A read cannot become the current B dataset", async () => {
    const held = deferred(), received = deferred();
    globalThis.fetch = async (url, opts) => { const response = await network(url, opts); if (new URL(url).pathname === "/warehouse/material-stock" && opts.headers.get("X-Factory-Id") === fixture.a) { received.resolve(); await held.promise; } return response; };
    try {
      const old = warehouseApi.getMaterialStock(); const rejected = assert.rejects(old, ContextChangedError); await received.promise;
      await store.getState().setActiveFactory(fixture.b); assert.equal(quantity(await mobileQueryClient.fetchQuery(stockOptions())), "20");
      held.resolve(); await rejected; assert.equal(store.getState().activeFactoryId, fixture.b);
    } finally { held.resolve(); globalThis.fetch = network; }
  });
  await check("real committed A receipt changes A to 7, leaves B at 20, and cannot trigger B success UI", async () => {
    await store.getState().setActiveFactory(fixture.a); const origin = getRequestContext();
    const held = deferred(), committed = deferred(); let controls, tree, successCallback = false;
    function Form() { controls = useCreateMaterialReceipt(); return React.createElement("receipt-form"); }
    globalThis.fetch = async (url, opts) => { const response = await network(url, opts); if (new URL(url).pathname === "/warehouse/material-receipts") { assert.equal(response.status, 201); committed.resolve(); await held.promise; } return response; };
    try {
      await act(async () => { tree = create(React.createElement(QueryClientProvider, { client: mobileQueryClient }, React.createElement(Form))); });
      let pending; await act(async () => { pending = controls.submit(write).then(() => { successCallback = true; }); }); const rejected = assert.rejects(pending, (e) => e instanceof ContextChangedError && e.outcome === "succeeded" && e.origin.factoryId === origin.factoryId);
      await committed.promise; await act(async () => { await store.getState().setActiveFactory(fixture.b); });
      const b = stockOptions(); await act(async () => { await mobileQueryClient.fetchQuery(b); });
      await act(async () => { held.resolve(); await rejected; });
      assert.equal(successCallback, false); assert.equal(await readStock(fixture.a), "7"); assert.equal(await readStock(fixture.b), "20");
      assert.equal(quantity(mobileQueryClient.getQueryData(b.queryKey)), "20"); assert.equal(mobileQueryClient.getQueryState(b.queryKey).isInvalidated, false);
      assert.ok(useUiStore.getState().contextNotices.some((n) => n.kind === "outcome" && n.message.includes(origin.factoryName)));
    } finally { held.resolve(); globalThis.fetch = network; if (tree) await act(async () => tree.unmount()); }
  });
  await check("real 401 -> native rotation -> B switch rejects mutation replay; neither stock changes", async () => {
    await store.getState().setActiveFactory(fixture.a); setApiAccessToken("invalid-access-for-401-fixture");
    const held = deferred(), rotated = deferred(); let writes = 0;
    globalThis.fetch = async (url, opts) => { const path = new URL(url).pathname; if (path === "/warehouse/material-receipts") { writes++; assert.equal(opts.headers.get("X-Factory-Id"), fixture.a); }
      const response = await network(url, opts); if (path === "/auth/native/refresh") { assert.equal(response.status, 200); rotated.resolve(); await held.promise; } return response; };
    try {
      const rejected = assert.rejects(warehouseApi.createMaterialReceipt({ materialId: fixture.materialId, quantity: "100", unit: "kg" }), ContextChangedError);
      await rotated.promise; await store.getState().setActiveFactory(fixture.b); held.resolve(); await rejected;
      assert.equal(writes, 1); assert.equal(await readStock(fixture.a), "7"); assert.equal(await readStock(fixture.b), "20");
      assert.equal((await storage.loadStoredSession()).factoryPreference.factoryId, fixture.b);
    } finally { held.resolve(); globalThis.fetch = network; }
  });
  await check("backend rejects a foreign tenant's factory regardless of native preference/header", async () => {
    assert.equal(await store.getState().setActiveFactory(fixture.foreignFactory), false);
    assert.equal((await raw("/warehouse/material-stock", store.getState().accessToken, fixture.foreignFactory)).status, 403);
  });
  await check("factory access removed via supported API forces authorized fallback and rejects old B", async () => {
    const owner = await network(`${API}/auth/native/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fixture.ownerEmail, password }) });
    assert.equal(owner.status, 200); const ownerToken = (await owner.json()).data.accessToken;
    const updated = await raw(`/organization/users/${fixture.userId}/factory-access`, ownerToken, undefined, "PATCH", { factoryIds: [fixture.a] }); assert.equal(updated.status, 200);
    await store.getState().loadMe(); assert.equal(store.getState().activeFactoryId, fixture.a); assert.equal(await store.getState().setActiveFactory(fixture.b), false);
    assert.equal((await storage.loadStoredSession()).factoryPreference.factoryId, fixture.a);
    assert.equal((await raw("/warehouse/material-stock", store.getState().accessToken, fixture.b)).status, 403);
  });
  await check("new account login uses a distinct user/session key and clears old-user cached data", async () => {
    const old = stockOptions(); await mobileQueryClient.fetchQuery(old); const before = getRequestContext(); await store.getState().logout();
    await store.getState().login(fixture.otherEmail, password); assert.equal(store.getState().activeFactoryId, fixture.a);
    assert.notEqual(getRequestContext().userId, before.userId); assert.notEqual(getRequestContext().sessionGeneration, before.sessionGeneration);
    assert.equal(mobileQueryClient.getQueryData(old.queryKey), undefined); assert.equal(await readStock(fixture.a), "7");
  });
  await check("real Seller RBAC blocks warehouse writes with no stock effect", async () => {
    await store.getState().login(fixture.sellerEmail, password);
    await assert.rejects(warehouseApi.createMaterialReceipt(write), (e) => e.status === 403);
    // Seller has warehouse.view for lookups but cannot write.
    assert.equal(await readStock(fixture.a), "7"); assert.equal(await readStock(fixture.b), "20");
  });
  await check("real SINGLE session has exactly its authorized default and rejects the MULTI factory", async () => {
    await store.getState().login(fixture.singleEmail, password); assert.equal(store.getState().branchMode, "SINGLE");
    assert.equal(store.getState().accessibleFactories.length, 1); assert.equal(store.getState().activeFactoryId, fixture.foreignFactory);
    assert.equal(await store.getState().setActiveFactory(fixture.b), false);
  });
  console.log(`PR02 real API/context: ${passed} checks passed; native host/storage mocked, no device claim.`);
} finally { globalThis.fetch = network; await store.getState().logout(); mobileQueryClient.clear(); }
