// Client-IP forwarding by the auth BFF proxy (tenant `/api/auth/*` and
// platform `/api/platform-auth/*`). The API keys its auth rate limiter on the
// forwarded IP, so the proxy must hand over exactly one validated address —
// the rightmost X-Forwarded-For entry, appended by the reverse proxy in front
// of the web tier (or by Next.js from the socket) — never the caller's chain.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// `next` has no `exports` map, so Node ESM needs the explicit file for `next/server`.
registerHooks({
  resolve: (specifier, context, nextResolve) =>
    nextResolve(specifier === "next/server" ? "next/server.js" : specifier, context),
});

const { createAuthProxyHandler, resolveForwardedClientIp } = await import("../src/lib/api/auth-proxy.ts");
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
  upstreamCalls.push({ url: String(url), headers: new Headers(init.headers) });
  return new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } });
};

const handlers = {
  auth: createAuthProxyHandler({ upstreamPrefix: "auth", cookiePath: "/api/auth" }),
  "platform-auth": createAuthProxyHandler({ upstreamPrefix: "platform-auth", cookiePath: "/api/platform-auth" }),
};

async function forwardedFor(prefix, headers) {
  upstreamCalls.length = 0;
  const request = new NextRequest(`http://web.local/api/${prefix}/login`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: "{}",
  });
  const response = await handlers[prefix](request, { params: Promise.resolve({ path: ["login"] }) });
  assert.equal(response.status, 200);
  assert.equal(upstreamCalls.length, 1);
  return upstreamCalls[0].headers.get("x-forwarded-for");
}

const headersOf = (init) => new Headers(init);

// --- resolveForwardedClientIp ---------------------------------------------------
await check("rightmost X-Forwarded-For entry is the client IP", async () => {
  assert.equal(resolveForwardedClientIp(headersOf({ "x-forwarded-for": "203.0.113.5" })), "203.0.113.5");
  assert.equal(resolveForwardedClientIp(headersOf({ "x-forwarded-for": "198.51.100.1, 203.0.113.5" })), "203.0.113.5");
  assert.equal(resolveForwardedClientIp(headersOf({ "x-forwarded-for": " 198.51.100.1 ,  203.0.113.5 " })), "203.0.113.5");
});

await check("repeated X-Forwarded-For headers resolve to the last value", async () => {
  const headers = new Headers();
  headers.append("x-forwarded-for", "198.51.100.1");
  headers.append("x-forwarded-for", "203.0.113.5");
  assert.equal(resolveForwardedClientIp(headers), "203.0.113.5");
});

await check("IPv6 and IPv4-mapped addresses are accepted", async () => {
  assert.equal(resolveForwardedClientIp(headersOf({ "x-forwarded-for": "2001:db8::5" })), "2001:db8::5");
  assert.equal(resolveForwardedClientIp(headersOf({ "x-forwarded-for": "::ffff:203.0.113.5" })), "::ffff:203.0.113.5");
});

await check("malformed values are dropped", async () => {
  for (const value of ["not-an-ip", "203.0.113.5, <script>", "203.0.113.5:443", "[2001:db8::5]", "203.0.113.5,", ""]) {
    assert.equal(resolveForwardedClientIp(headersOf({ "x-forwarded-for": value })), null, JSON.stringify(value));
  }
});

await check("X-Real-IP is never used (not every proxy overwrites it)", async () => {
  assert.equal(resolveForwardedClientIp(headersOf({ "x-real-ip": "203.0.113.9" })), null);
  assert.equal(resolveForwardedClientIp(headersOf({ "x-forwarded-for": "203.0.113.5", "x-real-ip": "203.0.113.9" })), "203.0.113.5");
  assert.equal(resolveForwardedClientIp(headersOf({})), null);
});

// --- Handler forwarding (both prefixes) -------------------------------------------
for (const prefix of ["auth", "platform-auth"]) {
  await check(`/api/${prefix} forwards only the proxy-appended address, never the caller's chain`, async () => {
    assert.equal(await forwardedFor(prefix, { "x-forwarded-for": "198.51.100.1, 10.0.0.1, 203.0.113.5" }), "203.0.113.5");
  });

  await check(`/api/${prefix} forwards a single client address unchanged`, async () => {
    assert.equal(await forwardedFor(prefix, { "x-forwarded-for": "203.0.113.5" }), "203.0.113.5");
  });

  await check(`/api/${prefix} drops a malformed forwarding value instead of passing it on`, async () => {
    assert.equal(await forwardedFor(prefix, { "x-forwarded-for": "203.0.113.5, not-an-ip" }), null);
  });

  await check(`/api/${prefix} sends no X-Forwarded-For when no client address is known`, async () => {
    assert.equal(await forwardedFor(prefix, {}), null);
    assert.equal(await forwardedFor(prefix, { "x-real-ip": "203.0.113.9" }), null);
  });
}

console.log(`auth proxy forwarding: ${passed} passed, 0 failed`);
