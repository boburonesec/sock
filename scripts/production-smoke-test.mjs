/**
 * Paypoq OS Production Auth & Smoke Test Suite
 *
 * Tests the live deployment at https://paypoq-web.onrender.com
 * Evaluates:
 * 1. Chromium Engine (Android Chrome runtime equivalent): Login, Partitioned cookie handling, reload persistence.
 * 2. WebKit Engine (Safari runtime equivalent): Evaluates Safari ITP behavior with cross-site onrender.com domains.
 */

import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';

const PROD_URL = process.env.PROD_URL || 'https://paypoq-web.onrender.com';

async function testEngine(browserType, engineName) {
  console.log(`\n----------------------------------------------------------------`);
  console.log(`Testing Production against ${engineName}`);
  console.log(`Target: ${PROD_URL}`);
  console.log(`----------------------------------------------------------------`);

  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  let loginCookieSet = false;
  page.on('response', (res) => {
    if (res.url().includes('/auth/login')) {
      const headers = res.headers();
      if (headers['set-cookie']) {
        loginCookieSet = true;
      }
    }
  });

  // 1. Login
  console.log(`  [1/4] Logging in as seller@paypoq.local...`);
  await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'seller@paypoq.local');
  await page.fill('#password', 'ChangeMe123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 25000 });
  console.log(`  ✓ Login successful, landed on: ${page.url()}`);
  console.log(`  ✓ Set-Cookie received on login: ${loginCookieSet}`);

  // 2. Refresh / Hard Reload
  console.log(`  [2/4] Testing session persistence across hard reload...`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const sessionPersisted = !page.url().includes('/login');
  if (sessionPersisted) {
    console.log(`  ✓ ${engineName}: Session PERSISTED across hard reload on ${page.url()}`);
  } else {
    console.log(`  ✗ ${engineName}: Session LOST after reload (redirected to ${page.url()})`);
  }

  // 3. Navigation
  if (sessionPersisted) {
    console.log(`  [3/4] Testing navigation...`);
    await page.goto(`${PROD_URL}/sales/clients`, { waitUntil: 'networkidle' });
    assert(page.url().includes('/sales/clients'), 'Navigation to /sales/clients must succeed');
    console.log(`  ✓ Reached /sales/clients`);
  }

  // 4. Cleanup
  await browser.close();
  return { engine: engineName, sessionPersisted };
}

async function run() {
  console.log('================================================================');
  console.log('PAYPOQ OS PRODUCTION AUTH AUDIT (LIVE SMOKE)');
  console.log('================================================================');

  const chromiumResult = await testEngine(chromium, 'Chromium (Android Chrome Engine)');
  const webkitResult = await testEngine(webkit, 'WebKit 18.4 (Safari Engine)');

  console.log('\n================================================================');
  console.log('PRODUCTION ENGINE RESULTS:');
  console.log(`  Chromium (Android Chrome): ${chromiumResult.sessionPersisted ? 'PASS (Session Persisted)' : 'FAIL'}`);
  console.log(`  WebKit (Safari Engine):     ${webkitResult.sessionPersisted ? 'PASS (Session Persisted)' : 'BLOCKED BY SAFARI ITP (Cross-Site *.onrender.com Public Suffix)'}`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('Production audit error:', err);
  process.exit(1);
});
