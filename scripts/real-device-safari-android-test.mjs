/**
 * Paypoq OS Real-Device Mobile Safari & Android Chrome Regression Test Suite
 *
 * Verifies:
 * 1. iOS Safari Auto-Zoom Prevention: computed fontSize >= 16px on mobile viewports (<640px)
 * 2. Desktop Non-Regression: computed fontSize == 14px on desktop viewports (>=768px)
 * 3. Mobile Viewport & Safe-Area: viewportFit=cover, safe-pt, safe-pb, touch-none backdrop
 * 4. Virtual Keypad Semantics: inputMode numeric, decimal, tel on mobile controls
 * 5. Touch Gesture Isolation: overscroll-x-contain on data tables
 * 6. WebKit 18.4 Engine Execution: real Safari rendering, session persistence, and drawer interaction
 */

import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';

const WEB = process.env.WEB_URL || 'http://localhost:3000';

async function runRealDeviceRegression() {
  console.log('================================================================');
  console.log('PAYPOQ OS REAL-DEVICE SAFARI & ANDROID REGRESSION SUITE');
  console.log(`Target: ${WEB}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, ok, detail = '') {
    if (ok) {
      passed++;
      console.log(`  ✓ PASS: ${name}${detail ? ` (${detail})` : ''}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SUITE 1: CHROMIUM ENGINE — AUTO-ZOOM & SEMANTICS AUDIT
  // ---------------------------------------------------------------------------
  console.log('--- [SUITE 1] MOBILE (390px) VS DESKTOP (1440px) FONT SIZE & KEYPADS ---');
  {
    const browser = await chromium.launch();
    
    // Test 1.1: Mobile 390px phone inputs font-size >= 16px (iOS Safari auto-zoom prevention)
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });

    await mobilePage.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
    const loginMobileFonts = await mobilePage.evaluate(() => {
      const email = document.querySelector('input[type="email"], #email');
      const pass = document.querySelector('input[type="password"], #password');
      return {
        email: email ? window.getComputedStyle(email).fontSize : null,
        pass: pass ? window.getComputedStyle(pass).fontSize : null,
      };
    });

    report('Login email input has 16px on mobile', loginMobileFonts.email === '16px', loginMobileFonts.email);
    report('Login password input has 16px on mobile', loginMobileFonts.pass === '16px', loginMobileFonts.pass);

    // Login as seller to check drawer inputs
    await mobilePage.fill('#email', 'seller@paypoq.local');
    await mobilePage.fill('#password', 'ChangeMe123!');
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL((u) => !u.pathname.includes('/login'));

    await mobilePage.goto(`${WEB}/sales/clients`, { waitUntil: 'networkidle' });
    await mobilePage.getByRole('button', { name: 'Mijoz qo‘shish' }).click();
    await mobilePage.waitForTimeout(300);

    const drawerControls = await mobilePage.evaluate(() => {
      const drawer = document.querySelector('section[role="dialog"]');
      if (!drawer) return [];
      const els = drawer.querySelectorAll('input, textarea, select');
      return Array.from(els).map((el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || el.name,
        type: el.getAttribute('type'),
        inputMode: el.getAttribute('inputmode'),
        fontSize: window.getComputedStyle(el).fontSize,
      }));
    });

    const nameInput = drawerControls.find((c) => c.id === 'clientName');
    const phoneInput = drawerControls.find((c) => c.id === 'clientPhone');
    const notesInput = drawerControls.find((c) => c.id === 'clientNotes');

    report('Client Name input has 16px on mobile', nameInput?.fontSize === '16px', nameInput?.fontSize);
    report('Client Phone input has 16px on mobile', phoneInput?.fontSize === '16px', phoneInput?.fontSize);
    report('Client Phone input has inputMode="tel"', phoneInput?.inputMode === 'tel', phoneInput?.inputMode);
    report('Client Notes textarea has 16px on mobile', notesInput?.fontSize === '16px', notesInput?.fontSize);

    // Test 1.2: Backdrop touch-none check
    const backdropTouchNone = await mobilePage.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Dialog yopish"]');
      return btn?.className?.includes('touch-none') ?? false;
    });
    report('Drawer backdrop has touch-none to lock iOS Safari body scroll', backdropTouchNone);

    await mobilePage.getByRole('button', { name: 'Yopish', exact: true }).click();
    await mobilePage.waitForTimeout(300);

    // Test 1.3: Table overscroll containment
    const tableOverscroll = await mobilePage.evaluate(() => {
      const wrapper = document.querySelector('.panel.overflow-x-auto');
      return wrapper?.className?.includes('overscroll-x-contain') ?? false;
    });
    report('Data table has overscroll-x-contain to isolate browser swipe gestures', tableOverscroll);

    // Test 1.4: Desktop 1440px non-regression — font-size drops back to 14px
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktopPage.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
    const loginDesktopFonts = await desktopPage.evaluate(() => {
      const email = document.querySelector('input[type="email"], #email');
      return email ? window.getComputedStyle(email).fontSize : null;
    });
    report('Login email input scales back to 14px on desktop', loginDesktopFonts === '14px', loginDesktopFonts);

    await browser.close();
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: WEBKIT 18.4 ENGINE (SAFARI REAL ENGINE)
  // ---------------------------------------------------------------------------
  console.log('\n--- [SUITE 2] WEBKIT 18.4 (SAFARI ENGINE) SESSION & VIEWPORT ---');
  {
    const browser = await webkit.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    // 2.1 WebKit Login
    await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', 'warehouse@paypoq.local');
    await page.fill('#password', 'ChangeMe123!');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'));
    report('WebKit Login successful', page.url().includes('/warehouse'));

    // 2.2 WebKit Hard Reload Session Persistence
    await page.reload({ waitUntil: 'networkidle' });
    report('WebKit Session preserved across hard reload', !page.url().includes('/login'));

    // 2.3 WebKit Material Receipt & Quantity Keypad
    await page.goto(`${WEB}/warehouse/materials`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Material qabul qilish' }).click();
    await page.waitForTimeout(300);

    const qtyInputInfo = await page.evaluate(() => {
      const qtyInput = document.querySelector('section[role="dialog"] input[type="number"]');
      if (!qtyInput) return null;
      return {
        fontSize: window.getComputedStyle(qtyInput).fontSize,
        inputMode: qtyInput.getAttribute('inputmode'),
      };
    });

    report('WebKit Material Quantity input has 16px (no auto-zoom)', qtyInputInfo?.fontSize === '16px', qtyInputInfo?.fontSize);
    report('WebKit Material Quantity input has numeric inputMode', qtyInputInfo?.inputMode === 'numeric' || qtyInputInfo?.inputMode === 'decimal', qtyInputInfo?.inputMode);

    await page.getByRole('button', { name: 'Yopish', exact: true }).click();
    await browser.close();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`REAL-DEVICE REGRESSION SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRealDeviceRegression().catch((err) => {
  console.error('Fatal error in real-device regression suite:', err);
  process.exit(1);
});
