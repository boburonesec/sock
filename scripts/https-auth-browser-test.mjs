import assert from "node:assert/strict";
import https from "node:https";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const port = Number(process.env.HTTPS_REHEARSAL_PORT || 34443);
const webHost = process.env.HTTPS_WEB_HOST || "web.paypoq.test";
const apiHost = process.env.HTTPS_API_HOST || "api.paypoq.test";
const WEB = `https://${webHost}:${port}`;
const API = `https://${apiHost}:${port}`;
const cookieName = process.env.AUTH_COOKIE_NAME || "paypoq_refresh_token";

function rawApi(path, { method = "POST", cookie, origin } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      host: "127.0.0.1",
      port,
      servername: apiHost,
      rejectUnauthorized: false,
      path,
      method,
      headers: {
        Host: `${apiHost}:${port}`,
        ...(cookie ? { Cookie: `${cookieName}=${encodeURIComponent(cookie)}` } : {}),
        ...(origin ? { Origin: origin } : {}),
        ...(method === "OPTIONS"
          ? {
              "Access-Control-Request-Method": "POST",
              "Access-Control-Request-Headers": "content-type",
            }
          : {}),
      },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    request.on("error", reject);
    request.end();
  });
}

async function currentRefreshCookie(context) {
  return (await context.cookies(`${API}/auth/refresh`)).find(
    (cookie) => cookie.name === cookieName,
  );
}

async function main() {
  const consoleText = [];
  const browser = await chromium.launch({
    headless: true,
    args: [`--host-resolver-rules=MAP ${webHost} 127.0.0.1, MAP ${apiHost} 127.0.0.1`],
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on("console", (message) => consoleText.push(message.text()));
  page.setDefaultTimeout(20_000);
  try {
    await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill("owner@paypoq.local");
    await page.locator("#password").fill("ChangeMe123!");
    const loginResponse = page.waitForResponse((response) =>
      response.url() === `${API}/auth/login` && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Kirish" }).click();
    const login = await loginResponse;
    assert.equal(login.status(), 200);
    await page.waitForURL(/\/dashboard\//);
    const rawSetCookie = (await login.headersArray())
      .filter((header) => header.name.toLowerCase() === "set-cookie")
      .map((header) => header.value)
      .join("; ");
    assert.match(rawSetCookie, /HttpOnly/i);
    assert.match(rawSetCookie, /Secure/i);
    assert.match(rawSetCookie, /SameSite=Strict/i);
    assert.match(rawSetCookie, /Path=\/auth/i);
    assert.doesNotMatch(rawSetCookie, /Domain=/i);

    const initialCookie = await currentRefreshCookie(context);
    assert.ok(initialCookie);
    assert.equal(initialCookie.httpOnly, true);
    assert.equal(initialCookie.secure, true);
    assert.equal(initialCookie.sameSite, "Strict");
    assert.equal(initialCookie.path, "/auth");
    assert.equal(initialCookie.domain, apiHost);
    const inaccessible = await page.evaluate((name) => document.cookie.includes(`${name}=`), cookieName);
    assert.equal(inaccessible, false);
    console.log("PASS  login cookie Secure HttpOnly SameSite=Strict Path=/auth Domain=host-only");

    const visible = await page.getByText("Boshqaruv paneli", { exact: false }).count();
    assert.ok(visible, "authenticated dashboard did not render");
    console.log("PASS  authenticated cross-origin API/dashboard");

    const rotated = await page.evaluate(async (api) => {
      const response = await fetch(`${api}/auth/refresh`, { method: "POST", credentials: "include" });
      return { status: response.status, body: await response.json() };
    }, API);
    assert.equal(rotated.status, 200);
    assert.ok(rotated.body.data.accessToken);
    const rotatedCookie = await currentRefreshCookie(context);
    assert.ok(rotatedCookie);
    assert.notEqual(rotatedCookie.value, initialCookie.value);
    const oldRefresh = await rawApi("/auth/refresh", { cookie: initialCookie.value, origin: WEB });
    assert.equal(oldRefresh.status, 401);
    console.log("PASS  refresh rotation old-token=401 current-token=200");

    const reloadRefresh = page.waitForResponse((response) =>
      response.url() === `${API}/auth/refresh` && response.request().method() === "POST",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    assert.equal((await reloadRefresh).status(), 200);
    await page.waitForURL(/\/dashboard\//);
    console.log("PASS  page reload preserves session");

    const activeCookie = await currentRefreshCookie(context);
    assert.ok(activeCookie);
    const logout = await page.evaluate(async (api) => {
      const response = await fetch(`${api}/auth/logout`, { method: "POST", credentials: "include" });
      return response.status;
    }, API);
    assert.equal(logout, 200);
    assert.equal(await currentRefreshCookie(context), undefined);
    const refreshAfterLogout = await rawApi("/auth/refresh", { cookie: activeCookie.value, origin: WEB });
    assert.equal(refreshAfterLogout.status, 401);
    console.log("PASS  logout clears cookie and invalidates refresh token");

    const evilOrigin = "https://evil.paypoq.test";
    const preflight = await rawApi("/auth/login", { method: "OPTIONS", origin: evilOrigin });
    assert.notEqual(preflight.headers["access-control-allow-origin"], evilOrigin);
    console.log(`PASS  untrusted origin rejected status=${preflight.status}`);

    const browserReadable = await page.evaluate(() => ({
      html: document.documentElement.innerHTML,
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
      cookie: document.cookie,
    }));
    for (const secret of [initialCookie.value, rotatedCookie.value, activeCookie.value]) {
      assert.equal(JSON.stringify(browserReadable).includes(secret), false);
      assert.equal(consoleText.some((line) => line.includes(secret)), false);
    }
    console.log("PASS  refresh cookie absent from JS storage, DOM and console");
  } finally {
    await browser.close();
  }
  console.log("HTTPS authentication rehearsal: 7 passed, 0 failed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
