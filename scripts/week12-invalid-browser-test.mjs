import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WEB = process.env.WEB_BASE_URL || 'http://localhost:3000';

async function login(page, email) {
  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('ChangeMe123!');
  await page.getByRole('button', { name: 'Kirish' }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  let productionPosts = 0;
  let materialPosts = 0;
  let paymentPosts = 0;
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/production/stage-movements') productionPosts += 1;
    if (pathname === '/warehouse/material-receipts') materialPosts += 1;
    if (pathname === '/sales/payments') paymentPosts += 1;
  });

  try {
    await login(page, 'owner@paypoq.local');

    await page.goto(`${WEB}/production`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Tezkor amallar').waitFor();
    await page.getByRole('button', { name: 'Keyingi bosqichga o‘tkazish' }).click();
    const movement = page.getByRole('dialog', { name: 'Keyingi bosqichga o‘tkazish' });
    await movement.locator('#moveProductVariantId').selectOption({ index: 1 });
    await movement.locator('#sourceStageId').selectOption({ label: 'Dazmol' });
    const available = Number(await movement.locator('#moveQuantity').getAttribute('max'));
    await movement.locator('input[type="checkbox"]').first().check();
    for (const quantity of ['0', '-1', String(available + 1)]) {
      await movement.locator('#moveQuantity').fill(quantity);
      const submit = movement.locator('button[type="submit"]');
      if (await submit.isEnabled()) await submit.click();
      await page.waitForTimeout(50);
      assert.equal(productionPosts, 0, `production mutation attempted for ${quantity}`);
    }
    const sourceId = await movement.locator('#sourceStageId').inputValue();
    await movement.locator('#destinationStageId').evaluate((select, value) => {
      const option = document.createElement('option'); option.value = value; option.textContent = 'Invalid same stage'; select.append(option);
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, sourceId);
    await movement.locator('#moveQuantity').fill('1');
    const invalidDestinationSubmit = movement.locator('button[type="submit"]');
    if (await invalidDestinationSubmit.isEnabled()) await invalidDestinationSubmit.click();
    await page.waitForTimeout(50);
    assert.equal(productionPosts, 0, 'production mutation attempted for invalid destination');
    console.log('PASS production zero, negative, excess, and invalid destination: 0 POST requests');

    await page.goto(`${WEB}/warehouse/materials`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Material qabul qilish' }).click();
    const receipt = page.getByRole('dialog', { name: 'Material qabul qilish' });
    await receipt.locator('#materialReceiptMaterialId').selectOption({ index: 1 });
    await receipt.locator('#materialReceiptZoneId').selectOption({ index: 1 });
    await receipt.locator('#materialReceiptUnit').fill('kg');
    for (const quantity of ['0', '-1']) {
      await receipt.locator('#materialReceiptQuantity').fill(quantity);
      await receipt.getByRole('button', { name: 'Materialni qabul qilish' }).click();
      await page.waitForTimeout(50);
      assert.equal(materialPosts, 0, `material mutation attempted for ${quantity}`);
    }
    console.log('PASS material receipt zero and negative: 0 POST requests');

    await page.goto(`${WEB}/sales/payments`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'To‘lov qayd qilish' }).click();
    const payment = page.getByRole('dialog', { name: 'To‘lov qayd qilish' });
    const client = payment.locator('#paymentClient');
    const clientOptions = await client.locator('option').all();
    let selected = false;
    for (let index = 1; index < clientOptions.length; index += 1) {
      await client.selectOption({ index });
      const order = payment.locator('select[id^="paymentAllocationOrder-"]');
      if ((await order.locator('option').count()) > 1) { selected = true; break; }
    }
    assert.equal(selected, true, 'client with payable order missing');
    const order = payment.locator('select[id^="paymentAllocationOrder-"]');
    const allocation = payment.locator('input[id^="paymentAllocationAmount-"]');
    await order.selectOption({ index: 1 });
    for (const amount of ['0', '-1']) {
      await payment.locator('#paymentAmount').fill(amount);
      await allocation.fill(amount);
      await payment.getByRole('button', { name: 'To‘lov qayd qilish' }).click();
      await page.waitForTimeout(50);
      assert.equal(paymentPosts, 0, `client payment mutation attempted for ${amount}`);
    }
    await payment.locator('#paymentAmount').fill('10');
    await allocation.fill('9');
    assert.equal(await payment.getByRole('button', { name: 'To‘lov qayd qilish' }).isDisabled(), true);
    await payment.getByText('Taqsimlanmagan: 1 so‘m.').waitFor();
    assert.equal(paymentPosts, 0, 'incomplete client allocation attempted mutation');
    console.log('PASS client payment zero, negative, and incomplete allocation: 0 POST requests');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
