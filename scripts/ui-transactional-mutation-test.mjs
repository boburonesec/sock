import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const WEB = process.env.WEB_BASE_URL || "http://localhost:3000";
const API = process.env.API_BASE_URL || "http://localhost:3001";
const results = [];
let deterministicOrderNumber = "";

function pass(name, detail = "") {
  results.push({ name, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function login(page) {
  const initialRefresh = page.waitForResponse((response) => response.url().includes("/auth/refresh"));
  await page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
  await initialRefresh;
  await page.locator("#email").fill("owner@paypoq.local");
  await page.locator("#password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Kirish" }).click();
  await page.waitForURL(/\/dashboard\//);
}

async function prepareDeterministicFixtures() {
  const loginResponse = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "owner@paypoq.local", password: "ChangeMe123!" }),
  });
  assert.equal(loginResponse.status, 200, "acceptance owner fixture is unavailable");
  const session = (await loginResponse.json()).data;
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${session.accessToken}`,
    "content-type": "application/json",
    "x-factory-id": session.activeFactoryId,
  };
  const [clientsResponse, variantsResponse] = await Promise.all([
    fetch(`${API}/sales/clients`, { headers }),
    fetch(`${API}/production/lookups/product-variants`, { headers }),
  ]);
  const client = (await clientsResponse.json()).data[0];
  const variant = (await variantsResponse.json()).data[0];
  assert.ok(client && variant, "sales fixture requires a client and product variant");
  const orderResponse = await fetch(`${API}/sales/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clientId: client.id,
      note: `iter4-draft-${Date.now()}`,
      items: [{ productVariantId: variant.id, quantity: 1, unitPrice: "1000" }],
    }),
  });
  assert.equal(orderResponse.status, 201, "could not create deterministic draft order");
  deterministicOrderNumber = (await orderResponse.json()).data.orderNumber;

  const month = `2099-${String((Date.now() % 12) + 1).padStart(2, "0")}`;
  let periodResponse = await fetch(`${API}/finance/payroll-periods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ month }),
  });
  if (periodResponse.status === 409) {
    const periods = await fetch(`${API}/finance/payroll-periods`, { headers });
    const existing = (await periods.json()).data.find((period) => period.month.startsWith(month));
    assert.ok(existing, "existing deterministic payroll period was not returned");
    periodResponse = { ok: true, json: async () => ({ data: existing }) };
  }
  assert.equal(periodResponse.ok, true, "could not create deterministic payroll period");
  const period = (await periodResponse.json()).data;
  if (period.status === "DRAFT") {
    const calculate = await fetch(`${API}/finance/payroll-periods/${period.id}/calculate`, {
      method: "POST",
      headers,
    });
    assert.equal(calculate.ok, true, "could not calculate deterministic payroll period");
  }
}

function controlledMutation(page, urlPattern, failureMessage, method = "POST") {
  let count = 0;
  let requestBody = null;
  let release;
  let enteredResolve;
  const entered = new Promise((resolve) => { enteredResolve = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  const handler = async (route) => {
    if (route.request().method() !== method) return route.continue();
    count += 1;
    requestBody = route.request().postData();
    enteredResolve();
    await gate;
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ statusCode: 409, message: failureMessage, error: "Conflict" }),
    });
  };
  return {
    install: () => page.route(urlPattern, handler),
    entered,
    release: () => release(),
    count: () => count,
    requestBody: () => requestBody,
    remove: () => page.unroute(urlPattern, handler),
  };
}

async function rapidDoubleClick(button) {
  await button.evaluate((element) => {
    element.click();
    element.click();
  });
}

async function selectFirst(select) {
  const value = await select.locator("option:not([value=''])").first().getAttribute("value");
  assert.ok(value, "select has no usable option");
  await select.selectOption(value);
  return value;
}

async function waitForInputValue(locator) {
  await locator.evaluate((input) => new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000;
    const check = () => {
      if (input.value) return resolve();
      if (Date.now() >= deadline) return reject(new Error("input value was not initialized"));
      requestAnimationFrame(check);
    };
    check();
  }));
}

async function openMovement(page) {
  const inventoryResponse = page.waitForResponse((response) =>
    response.url().includes("/production/stage-inventory") && response.request().method() === "GET" && response.ok(),
  );
  await page.goto(`${WEB}/production`, { waitUntil: "domcontentloaded" });
  const inventory = (await (await inventoryResponse).json()).data;
  const averlogInventory = inventory.find((item) => item.stage.name === "Averlog" && Number(item.quantity) > 0);
  assert.ok(averlogInventory, "positive Averlog inventory fixture missing");
  await page.getByRole("button", { name: "Smena o‘tkazish (+ ishchilar)" }).click();
  const dialog = page.getByRole("dialog", { name: "Smena o‘tkazish" });
  await dialog.waitFor();
  await dialog.locator("#moveProductVariantId").selectOption(averlogInventory.productVariant.id);
  await dialog.locator("#sourceStageId").selectOption({ label: "Averlog" });
  await dialog.locator("#destinationStageId").selectOption({ label: "Dazmol" });
  await dialog.locator("#moveQuantity").waitFor({ state: "visible" });
  await waitForInputValue(dialog.locator("#moveQuantity"));
  await dialog.locator('input[type="checkbox"]').first().check();
  await dialog.locator('input[aria-label$=" miqdori"]').waitFor();
  await dialog.locator("#moveNote").fill(`iter4-move-${Date.now()}`);
  return dialog;
}

async function testMovement(page) {
  const dialog = await openMovement(page);
  const note = await dialog.locator("#moveNote").inputValue();
  const submit = dialog.locator('button[type="submit"]');
  await submit.waitFor({ state: "visible" });
  assert.equal(await submit.isEnabled(), true, "movement form is not valid");
  const controlled = controlledMutation(page, "**/production/stage-movements", "Qoldiq boshqa operator tomonidan o‘zgartirildi.");
  await controlled.install();
  await rapidDoubleClick(submit);
  await controlled.entered;
  assert.equal(await submit.isDisabled(), true);
  pass("stage movement pending lock");
  assert.equal(controlled.count(), 1);
  pass("stage movement double submit", "requests=1");
  controlled.release();
  await dialog.getByRole("alert").filter({ hasText: "Qoldiq" }).waitFor();
  assert.equal(await dialog.isVisible(), true);
  assert.equal(await dialog.locator("#moveNote").inputValue(), note);
  assert.equal(await page.getByText("Smena o‘tkazildi", { exact: false }).count(), 0);
  pass("stage movement failure feedback/state preserved");
  await controlled.remove();

  let refreshes = 0;
  const countRefresh = (request) => {
    if (request.method() === "GET" && request.url().includes("/production/stage-inventory")) refreshes += 1;
  };
  page.on("request", countRefresh);
  const successResponse = page.waitForResponse((r) => r.url().includes("/production/stage-movements") && r.request().method() === "POST" && r.ok());
  await submit.click();
  await successResponse;
  await page.getByText("Smena o‘tkazildi", { exact: false }).waitFor();
  await dialog.waitFor({ state: "hidden" });
  assert.ok(refreshes >= 1);
  page.off("request", countRefresh);
  pass("stage movement success/close/refresh", `refreshes=${refreshes}`);
}

async function openActivity(page) {
  await page.goto(`${WEB}/production`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Qo‘shimcha faollik kiritish" }).click();
  const dialog = page.getByRole("dialog", { name: "Qo‘shimcha faollik" });
  await dialog.waitFor();
  await selectFirst(dialog.locator("#activityStageId"));
  await selectFirst(dialog.locator("#activityEmployeeId"));
  await selectFirst(dialog.locator("#activityProductVariantId"));
  await dialog.locator("#activityQuantity").fill("2");
  await dialog.locator("#activityNote").fill(`iter4-activity-${Date.now()}`);
  return dialog;
}

async function testActivity(page) {
  const dialog = await openActivity(page);
  const submit = dialog.locator('button[type="submit"]');
  const note = await dialog.locator("#activityNote").inputValue();
  const controlled = controlledMutation(page, "**/production/worker-activities", "Faollikni saqlashda ziddiyat yuz berdi.");
  await controlled.install();
  await rapidDoubleClick(submit);
  await controlled.entered;
  assert.equal(await submit.isDisabled(), true);
  assert.equal(controlled.count(), 1);
  pass("worker activity pending/double submit", "requests=1");
  controlled.release();
  await dialog.getByRole("alert").waitFor();
  assert.equal(await dialog.locator("#activityNote").inputValue(), note);
  assert.equal(await dialog.isVisible(), true);
  pass("worker activity failure feedback/state preserved");
  await controlled.remove();
  let refreshes = 0;
  const listener = (request) => {
    if (
      request.method() === "GET" &&
      request.url().includes("/production/operations-summary")
    ) refreshes += 1;
  };
  page.on("request", listener);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/production/worker-activities") && r.request().method() === "POST" && r.ok()),
    submit.click(),
  ]);
  await page.getByText("Ishchi faolligi qayd qilindi.").waitFor();
  await dialog.waitFor({ state: "hidden" });
  assert.ok(refreshes >= 1);
  page.off("request", listener);
  pass("worker activity success/close/refresh", `refreshes=${refreshes}`);
}

async function testOrderCancellation(page) {
  await page.goto(`${WEB}/sales/orders`, { waitUntil: "domcontentloaded" });
  const table = page.getByRole("table", { name: "Buyurtmalar ro‘yxati" });
  await table.waitFor();
  const cancellableRow = table.locator("tbody tr").filter({ hasText: deterministicOrderNumber }).first();
  assert.equal(await cancellableRow.count(), 1, "deterministic cancellable order is not visible");
  await cancellableRow.locator("button").click();
  const details = page.getByRole("dialog").first();
  await details.waitFor();
  const cancel = details.getByRole("button", { name: "Bekor qilish", exact: true });
  assert.equal(await cancel.isEnabled(), true, "no cancellable order fixture");
  await cancel.click();
  const confirm = page.getByRole("alertdialog", { name: "Buyurtmani bekor qilish" });
  const confirmButton = confirm.locator("button").last();
  const controlled = controlledMutation(page, "**/sales/orders/*/cancel", "Buyurtma holati o‘zgargan, qayta yuklang.");
  await controlled.install();
  await rapidDoubleClick(confirmButton);
  await controlled.entered;
  assert.equal(await confirmButton.isDisabled(), true);
  assert.equal(controlled.count(), 1);
  pass("order cancellation pending/double submit", "requests=1");
  controlled.release();
  await confirm.getByRole("alert").waitFor();
  assert.equal(await confirm.isVisible(), true);
  pass("order cancellation failure keeps confirmation open");
  await controlled.remove();
  await confirmButton.waitFor({ state: "visible" });
  await confirmButton.evaluate((button) => new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000;
    const check = () => {
      if (!button.disabled) return resolve();
      if (Date.now() >= deadline) return reject(new Error("cancel confirm stayed disabled"));
      requestAnimationFrame(check);
    };
    check();
  }));
  let refreshes = 0;
  const listener = (request) => { if (request.method() === "GET" && /\/sales\/orders$/.test(new URL(request.url()).pathname)) refreshes += 1; };
  page.on("request", listener);
  await Promise.all([
    page.waitForResponse((r) => /\/sales\/orders\/[^/]+\/cancel$/.test(new URL(r.url()).pathname) && r.ok()),
    confirmButton.click(),
  ]);
  await confirm.waitFor({ state: "hidden" });
  await page.getByText("Buyurtma bekor qilindi.").waitFor();
  assert.ok(refreshes >= 1);
  page.off("request", listener);
  pass("order cancellation success/close/refresh", `refreshes=${refreshes}`);
}

async function testPayment(page) {
  await page.goto(`${WEB}/sales/payments`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "To‘lov qayd qilish", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "To‘lov qayd qilish" });
  await dialog.waitFor();
  await selectFirst(dialog.locator("#paymentClient"));
  const orderSelect = dialog.locator("select[id^='paymentAllocationOrder-']");
  await orderSelect.evaluate((select) => new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000;
    const check = () => {
      if ([...select.options].some((option) => option.value)) return resolve();
      if (Date.now() >= deadline) return reject(new Error("client has no allocatable order"));
      requestAnimationFrame(check);
    };
    check();
  }));
  await selectFirst(orderSelect);
  await dialog.locator("#paymentAmount").fill("1");
  await dialog.locator("input[id^='paymentAllocationAmount-']").fill("1");
  await dialog.locator("#paymentNote").fill(`iter4-payment-${Date.now()}`);
  const note = await dialog.locator("#paymentNote").inputValue();
  const submit = dialog.locator('button[type="submit"]');
  const controlled = controlledMutation(page, "**/sales/payments", "To‘lov ma’lumotlari yangilangan, qayta urinib ko‘ring.");
  await controlled.install();
  await rapidDoubleClick(submit);
  await controlled.entered;
  assert.equal(await submit.isDisabled(), true);
  assert.equal(controlled.count(), 1);
  pass("client payment pending/double submit", "requests=1");
  controlled.release();
  await dialog.getByRole("alert").waitFor();
  assert.equal(await dialog.locator("#paymentNote").inputValue(), note);
  assert.equal(await dialog.isVisible(), true);
  pass("client payment failure feedback/state preserved");
  await controlled.remove();
  let refreshes = 0;
  const listener = (request) => { if (request.method() === "GET" && /\/sales\/payments$/.test(new URL(request.url()).pathname)) refreshes += 1; };
  page.on("request", listener);
  await Promise.all([
    page.waitForResponse((r) => /\/sales\/payments$/.test(new URL(r.url()).pathname) && r.request().method() === "POST" && r.ok()),
    submit.click(),
  ]);
  await dialog.waitFor({ state: "hidden" });
  await page.getByText("To‘lov qayd qilindi", { exact: false }).waitFor();
  assert.ok(refreshes >= 1);
  page.off("request", listener);
  pass("client payment success/close/refresh", `refreshes=${refreshes}`);
}

async function testPayrollClose(page) {
  await page.goto(`${WEB}/finance/payroll`, { waitUntil: "domcontentloaded" });
  const table = page.getByRole("table", { name: "Ish haqi davrlari" });
  await table.waitFor();
  const closableRow = table.locator("tbody tr").filter({ hasText: /Hisoblangan|To‘langan/ }).first();
  assert.equal(await closableRow.count(), 1, "acceptance fixture has no closable payroll period");
  await closableRow.locator("button").click();
  const close = page.getByRole("button", { name: "Davrni yopish" });
  await close.evaluate((button) => new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000;
    const check = () => {
      if (!button.disabled) return resolve();
      if (Date.now() >= deadline) return reject(new Error("closable payroll selection did not activate"));
      requestAnimationFrame(check);
    };
    check();
  }));
  await close.click();
  const confirm = page.getByRole("alertdialog", { name: "Ish haqi davrini yopish" });
  const submit = confirm.locator("button").last();
  const controlled = controlledMutation(page, "**/finance/payroll-periods/*/close", "Ish haqi davri boshqa amal bilan o‘zgargan.");
  await controlled.install();
  await rapidDoubleClick(submit);
  await controlled.entered;
  assert.equal(await submit.isDisabled(), true);
  assert.equal(controlled.count(), 1);
  pass("payroll close pending/double submit", "requests=1");
  controlled.release();
  await confirm.getByRole("alert").waitFor();
  assert.equal(await confirm.isVisible(), true);
  pass("payroll close failure keeps confirmation open");
  await controlled.remove();
  let refreshes = 0;
  const listener = (request) => { if (request.method() === "GET" && /\/finance\/payroll-periods$/.test(new URL(request.url()).pathname)) refreshes += 1; };
  page.on("request", listener);
  await Promise.all([
    page.waitForResponse((r) => /\/finance\/payroll-periods\/[^/]+\/close$/.test(new URL(r.url()).pathname) && r.ok()),
    submit.click(),
  ]);
  await confirm.waitFor({ state: "hidden" });
  await page.getByText("Ish haqi davri yopildi.").waitFor();
  assert.ok(refreshes >= 1);
  page.off("request", listener);
  pass("payroll close success/close/refresh", `refreshes=${refreshes}`);
}

async function testMachineAndAtomicSlots(page) {
  await page.goto(`${WEB}/machines`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Yangi stanok qo‘shish" }).click();
  const machineForm = page.getByRole("heading", { name: "Stanok qo‘shish" }).locator("..");
  const code = `UI-${Date.now()}`;
  await machineForm.getByLabel("Stanok kodi").fill(code);
  await machineForm.getByLabel("Stanok nomi").fill("UI transactional machine");
  const submit = machineForm.getByRole("button", { name: "Saqlash" });
  const failure = controlledMutation(page, "**/machines", "Stanok kodi allaqachon mavjud.");
  await failure.install(); await rapidDoubleClick(submit); await failure.entered;
  assert.equal(await submit.isDisabled(), true); assert.equal(failure.count(), 1);
  failure.release(); await page.getByRole("alert").filter({ hasText: "Stanok kodi" }).waitFor();
  assert.equal(await machineForm.getByLabel("Stanok kodi").inputValue(), code);
  assert.equal(await machineForm.getByLabel("Stanok nomi").inputValue(), "UI transactional machine");
  pass("machine create failure/pending/double submit", "requests=1");
  await failure.remove();
  await Promise.all([page.waitForResponse((response) => new URL(response.url()).pathname === "/machines" && response.request().method() === "POST" && response.ok()), submit.click()]);
  await page.getByRole("status").filter({ hasText: "Stanok muvaffaqiyatli" }).waitFor();
  assert.equal(await machineForm.getByLabel("Stanok kodi").inputValue(), "");
  assert.equal(await machineForm.getByLabel("Stanok nomi").inputValue(), "");
  await page.getByRole("button", { name: "Mexanik biriktirish" }).click();
  assert.ok(await page.locator("option", { hasText: `${code} · UI transactional machine` }).count() >= 1);
  pass("machine create success feedback/refresh");

  await page.getByRole("button", { name: "Tekshiruv vaqtlarini sozlash" }).click();
  const slotForm = page.getByRole("heading", { name: "Smenadagi tekshiruv vaqtlari" }).locator("..");
  await selectFirst(slotForm.locator("select"));
  await slotForm.getByLabel("1-tekshiruv vaqti").fill("10"); await slotForm.getByLabel("2-tekshiruv vaqti").fill("130"); await slotForm.getByLabel("3-tekshiruv vaqti").fill("250");
  const slotSubmit = slotForm.getByRole("button", { name: "Tekshiruv vaqtlarini saqlash" });
  const slotFailure = controlledMutation(page, "**/machines/inspection-slots", "Slot konfiguratsiyasi saqlanmadi.");
  await slotFailure.install(); await rapidDoubleClick(slotSubmit); await slotFailure.entered;
  assert.equal(await slotSubmit.isDisabled(), true); assert.equal(slotFailure.count(), 1);
  const body = JSON.parse(slotFailure.requestBody() || "{}");
  assert.equal(body.slots.length, 3);
  slotFailure.release(); await page.getByRole("alert").filter({ hasText: "Slot konfiguratsiyasi" }).waitFor();
  assert.deepEqual(await Promise.all([1, 2, 3].map((number) => slotForm.getByLabel(`${number}-tekshiruv vaqti`).inputValue())), ["10", "130", "250"]);
  pass("atomic slots failure/state preserved", "requests=1, partial=0");
  await slotFailure.remove();
  await Promise.all([page.waitForResponse((response) => response.url().includes("/machines/inspection-slots") && response.ok()), slotSubmit.click()]);
  await page.getByRole("status").filter({ hasText: "uchta tekshiruv vaqti saqlandi" }).waitFor();
  assert.deepEqual(await Promise.all([1, 2, 3].map((number) => slotForm.getByLabel(`${number}-tekshiruv vaqti`).inputValue())), ["10", "130", "250"]);
  pass("atomic slots success/authoritative refresh", "requests=1");
}

async function testMechanicMutation(page) {
  const task = { id: "ui-mechanic-task", type: "REPAIR", priority: "HIGH", status: "OPEN", description: "Deterministic browser task", resolution: null, dueAt: null, machine: { id: "m", code: "UI-M", name: "UI machine", status: "ACTIVE", note: null, assignments: [] }, assignee: { id: "e", name: "Mechanic" } };
  let taskState = task;
  const round = { id: "ui-inspection-round", status: "PENDING", scheduledAt: new Date().toISOString(), machine: task.machine, productionRun: { id: "ui-run", status: "RUNNING", productVariant: { product: { name: "UI Product" } } }, specification: { metrics: [{ id: "metric-length", name: "Uzunlik", code: "LENGTH", unit: "cm", target: "20", min: "19", max: "21" }] }, measurements: [] };
  await page.route("**/machines/tasks", async (route) => route.request().method() === "GET" ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [taskState] }) }) : route.continue());
  await page.route("**/machines/inspection-rounds/mine", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [round] }) }));
  await page.route("**/machines/quality-issues", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }));
  await page.goto(`${WEB}/mechanic`, { waitUntil: "domcontentloaded" });
  const measurement = page.getByRole("spinbutton", { name: /Uzunlik/ });
  await measurement.waitFor({ state: "visible" });
  assert.equal(await measurement.count(), 1);
  await measurement.fill("20.5");
  const measurementSubmit = page.getByRole("button", { name: "O‘lchovni saqlash" });
  const measurementFailure = controlledMutation(page, "**/machines/inspection-rounds/ui-inspection-round/measurements", "O‘lchov saqlanmadi.");
  await measurementFailure.install(); await rapidDoubleClick(measurementSubmit); await measurementFailure.entered;
  const pendingMeasurement = page.getByRole("button", { name: "Saqlanmoqda..." });
  assert.equal(await pendingMeasurement.isDisabled(), true); assert.equal(measurementFailure.count(), 1);
  measurementFailure.release(); await page.getByRole("alert").filter({ hasText: "O‘lchov saqlanmadi" }).waitFor();
  assert.equal(await measurement.inputValue(), "20.5");
  pass("mechanic measurement failure/pending/draft preserved", "requests=1");
  await measurementFailure.remove();
  await page.route("**/machines/inspection-rounds/ui-inspection-round/measurements", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { roundId: round.id, status: "PASSED", failed: [] } }) }));
  await measurementSubmit.click();
  await page.getByRole("status").filter({ hasText: "O‘lchov saqlandi" }).waitFor();
  pass("mechanic measurement success feedback");

  const openTask = page.getByRole("button", { name: "Vazifani ochish" });
  assert.equal(await openTask.count(), 1); await openTask.click();
  const start = page.getByRole("button", { name: "Ishni boshlash" });
  const failure = controlledMutation(page, "**/machines/tasks/ui-mechanic-task", "Task boshqa mexanik tomonidan o‘zgartirilgan.", "PATCH");
  await failure.install(); await rapidDoubleClick(start); await failure.entered;
  assert.equal(await page.getByRole("button", { name: "Boshlanmoqda..." }).isDisabled(), true); assert.equal(failure.count(), 1);
  failure.release(); await page.getByRole("alert").filter({ hasText: "boshqa mexanik" }).waitFor();
  pass("mechanic task failure/pending/double submit", "requests=1");
  await failure.remove();
  let patchCount = 0;
  await page.route("**/machines/tasks/ui-mechanic-task", async (route) => { if (route.request().method() !== "PATCH") return route.continue(); patchCount += 1; taskState = { ...taskState, status: "IN_PROGRESS" }; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: taskState }) }); });
  await start.click(); await page.getByRole("status").filter({ hasText: "Vazifa boshlandi" }).waitFor();
  assert.equal(patchCount, 1); pass("mechanic task success feedback/refresh", "requests=1");
  await page.getByLabel("Bajarilgan ish natijasi").fill("Mexanik tekshiruvi bajarildi");
  await page.getByRole("button", { name: "Yakunlashni tekshirish" }).click();
  const completionDialog = page.getByRole("alertdialog", { name: "Vazifani yakunlaysizmi?" });
  assert.equal(await completionDialog.count(), 1);
  pass("mechanic task completion requires confirmation");
}

async function testNotificationRead(page) {
  const item = { id: "ui-notification", title: "Deterministic notification", body: "Read mutation contract", readAt: null, createdAt: new Date().toISOString() };
  await page.route("**/notifications", async (route) => route.request().method() === "GET" && route.request().url().startsWith(API) ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [item] }) }) : route.continue());
  await page.goto(`${WEB}/notifications`, { waitUntil: "domcontentloaded" });
  const button = page.getByRole("button", { name: "O‘qilgan deb belgilash" });
  const failure = controlledMutation(page, "**/notifications/ui-notification/read", "Bildirishnoma holati o‘zgargan.", "PATCH");
  await failure.install(); await rapidDoubleClick(button); await failure.entered;
  assert.equal(await button.isDisabled(), true); assert.equal(failure.count(), 1);
  failure.release(); await page.getByRole("alert").filter({ hasText: "holati o‘zgargan" }).waitFor();
  pass("notification read failure/pending/double submit", "requests=1");
  await failure.remove();
  let patchCount = 0;
  await page.route("**/notifications/ui-notification/read", async (route) => { if (route.request().method() !== "PATCH") return route.continue(); patchCount += 1; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { id: item.id, readAt: new Date().toISOString() } }) }); });
  await button.click(); await page.getByRole("status").filter({ hasText: "o‘qildi" }).waitFor();
  assert.equal(patchCount, 1); pass("notification read success feedback/refresh", "requests=1");
}

async function main() {
  await prepareDeterministicFixtures();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  try {
    await login(page);
    if (process.env.UI_TEST_SCOPE === "mechanic") {
      await testMechanicMutation(page);
      console.log(`transactional browser mutations: ${results.length} passed, 0 failed`);
      return;
    }
    await testMovement(page);
    await testActivity(page);
    await testOrderCancellation(page);
    await testPayment(page);
    await testPayrollClose(page);
    await testMachineAndAtomicSlots(page);
    await testMechanicMutation(page);
    await testNotificationRead(page);
  } finally {
    await browser.close();
  }
  console.log(`transactional browser mutations: ${results.length} passed, 0 failed`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
