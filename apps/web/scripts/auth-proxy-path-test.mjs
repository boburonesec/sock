// Auth BFF proxy path validation (tenant `/api/auth/*` and platform
// `/api/platform-auth/*`, which share createAuthProxyHandler).
//
// Next.js 15 normalizes `.`/`..` (and %2e forms) before routing, so these
// segments do not reach the handler in the current production runtime. The
// handler is still the last line of defence: `fetch` re-normalizes the
// concatenated upstream URL, so an accepted `..` segment would escape the fixed
// upstream prefix. These checks call the handler directly with a stubbed fetch.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// `next` has no `exports` map, so Node ESM needs the explicit file for `next/server`.
registerHooks({
  resolve: (specifier, context, nextResolve) =>
    nextResolve(specifier === "next/server" ? "next/server.js" : specifier, context),
});

const { createAuthProxyHandler, isSafeProxyPathSegment } = await import("../src/lib/api/auth-proxy.ts");
const { NextRequest } = await import("next/server");

process.env.API_INTERNAL_URL = "http://api.internal:3001";

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

const upstreamCalls = [];
globalThis.fetch = async (url, init) => {
  upstreamCalls.push({ url: String(url), method: init.method, body: init.body });
  return new Response('{"ok":true}', {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie":
        "paypoq_refresh_token=abc; Path=/auth; Domain=api.example.com; SameSite=None; Secure; Partitioned; HttpOnly",
    },
  });
};

const handlers = {
  auth: createAuthProxyHandler({ upstreamPrefix: "auth", cookiePath: "/api/auth" }),
  "platform-auth": createAuthProxyHandler({ upstreamPrefix: "platform-auth", cookiePath: "/api/platform-auth" }),
};

async function proxy(prefix, path, { method = "POST", search = "", body = '{"a":1}', headers = {} } = {}) {
  upstreamCalls.length = 0;
  const request = new NextRequest(`http://web.local/api/${prefix}/x${search}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: method === "GET" ? undefined : body,
  });
  const response = await handlers[prefix](request, { params: Promise.resolve({ path }) });
  return { response, calls: [...upstreamCalls] };
}

// --- Segment validator -------------------------------------------------------
await check("legitimate segments are accepted", async () => {
  for (const segment of ["login", "refresh", "logout", "me", "password", "users", "cmabc123xyz", "a_b-c", "v1.2", "..."]) {
    assert.equal(isSafeProxyPathSegment(segment), true, segment);
  }
});

await check("dot segments are rejected", async () => {
  for (const segment of [".", ".."]) {
    assert.equal(isSafeProxyPathSegment(segment), false, segment);
  }
});

await check("empty, encoded, slash, backslash and whitespace segments are rejected", async () => {
  for (const segment of ["", "%2e", "%2e%2e", ".%2e", "%2E%2E", "a/b", "../x", "..\\x", "a b", "a?b", "a#b"]) {
    assert.equal(isSafeProxyPathSegment(segment), false, JSON.stringify(segment));
  }
});

// --- Legitimate routes still proxy -------------------------------------------
const legitimate = [
  ["auth", ["login"], "POST"],
  ["auth", ["refresh"], "POST"],
  ["auth", ["logout"], "POST"],
  ["auth", ["me"], "GET"],
  ["auth", ["users", "cmabc123xyz", "password"], "POST"],
  ["platform-auth", ["login"], "POST"],
  ["platform-auth", ["refresh"], "POST"],
  ["platform-auth", ["logout"], "POST"],
  ["platform-auth", ["me"], "GET"],
  ["platform-auth", ["me", "password"], "POST"],
];

for (const [prefix, path, method] of legitimate) {
  await check(`${method} /api/${prefix}/${path.join("/")} proxies to the fixed upstream prefix`, async () => {
    const { response, calls } = await proxy(prefix, path, { method });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `http://api.internal:3001/${prefix}/${path.join("/")}`);
    assert.equal(calls[0].method, method);
    assert.equal(calls[0].body, method === "GET" ? undefined : '{"a":1}');
  });
}

await check("query string is forwarded unchanged", async () => {
  const { calls } = await proxy("auth", ["refresh"], { search: "?returnUrl=%2Fproduction&x=1" });
  assert.equal(calls[0].url, "http://api.internal:3001/auth/refresh?returnUrl=%2Fproduction&x=1");
});

await check("empty path proxies to the bare prefix", async () => {
  const { calls } = await proxy("auth", []);
  assert.equal(calls[0].url, "http://api.internal:3001/auth");
});

// --- Unsafe paths never reach the upstream ------------------------------------
const unsafe = [
  ["."],
  [".."],
  [".", "refresh"],
  ["..", "refresh"],
  ["..", "platform-auth", "refresh"],
  ["..", "..", "internal", "notification-deliveries", "claim"],
  ["refresh", ".."],
  ["%2e%2e", "refresh"],
  ["..%2fplatform-auth"],
];

for (const prefix of ["auth", "platform-auth"]) {
  for (const path of unsafe) {
    await check(`/api/${prefix} rejects ${JSON.stringify(path)} with 400 and no upstream call`, async () => {
      const { response, calls } = await proxy(prefix, path);
      assert.equal(response.status, 400);
      assert.equal(calls.length, 0, `upstream was called: ${calls[0]?.url}`);
      const body = await response.json();
      // Generic message only: the rejected path is not echoed back.
      assert.deepEqual(Object.keys(body), ["message"]);
      assert.doesNotMatch(body.message, /\.\.|platform-auth|internal/);
    });
  }
}

// --- Cookie rewrite is unchanged ------------------------------------------------
await check("upstream refresh cookie is rewritten to a first-party cookie (http)", async () => {
  const { response } = await proxy("auth", ["refresh"]);
  const cookie = response.headers.getSetCookie()[0];
  assert.match(cookie, /Path=\/api\/auth/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /HttpOnly/);
  assert.doesNotMatch(cookie, /Domain=|Partitioned|Secure/);
});

await check("platform cookie keeps its own path and is Secure behind https", async () => {
  const { response } = await proxy("platform-auth", ["refresh"], { headers: { "x-forwarded-proto": "https" } });
  const cookie = response.headers.getSetCookie()[0];
  assert.match(cookie, /Path=\/api\/platform-auth/);
  assert.match(cookie, /; Secure/);
});

console.log(`auth proxy path: ${passed} passed, 0 failed`);
