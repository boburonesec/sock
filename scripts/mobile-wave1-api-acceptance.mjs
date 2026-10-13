/**
 * Native Mobile — Wave 1 runtime acceptance against a real API.
 *
 * Exercises every endpoint the Mobile Production / Warehouse / Machines /
 * Mechanic screens call, with the same payloads, as each tenant role:
 *
 *   - permission matrix: every role × every Wave 1 endpoint is 2xx or 403
 *     exactly as `@paypoq/shared` (and therefore the Mobile UI) predicts;
 *   - response shapes the screens read;
 *   - write workflows end to end (run → intake → movement → correction →
 *     measurements → tasks → receipts → stock correction → shift close);
 *   - error handling (validation / conflict bodies carry an operator message);
 *   - duplicate safety (idempotent intake replay, double completion);
 *   - session: login, /auth/me, cookie refresh, logout, role switching.
 *
 * This is an API-level check. It does not prove rendering on a simulator,
 * emulator or physical device.
 *
 * Fixtures: one disposable tenant created through the Platform Admin API and
 * suspended at the end. The shared demo tenant is never touched, and the
 * suite can run twice in a row.
 *
 * Usage (API running, development platform admin seed present):
 *   node --no-warnings --experimental-strip-types scripts/mobile-wave1-api-acceptance.mjs
 */
import assert from "node:assert/strict";
import {
  PILOT_ROLE_AREAS,
  WAVE1_ENDPOINTS,
  canUseEndpoint,
  currentWorkDate,
  readApiErrorMessage,
  resolveAreaAccess,
  selectWarehouseHandoffInventory,
} from "../packages/shared/src/index.ts";

const API = process.env.API_BASE_URL || "http://localhost:3001";
const PASSWORD = "ChangeMe123!";
const TAG = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const results = [];
const exercised = new Set();

function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function step(name, fn) {
  try {
    const detail = await fn();
    record(name, true, typeof detail === "string" ? detail : "");
  } catch (error) {
    record(name, false, error instanceof Error ? error.message.split("\n")[0] : String(error));
  }
}

async function raw(path, { method = "GET", session, body, cookie } = {}) {
  const headers = { Accept: "application/json" };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  if (session?.factoryId) headers["X-Factory-Id"] = session.factoryId;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, ok: response.ok, data, headers: response.headers };
}

/** Calls a Wave 1 endpoint by its shared-contract key (the same map Mobile uses). */
async function call(key, session, { params = {}, query = "", body } = {}) {
  const contract = WAVE1_ENDPOINTS[key];
  assert.ok(contract, `unknown endpoint key ${key}`);
  const path = contract.path.replace(/:(\w+)/g, (_, name) => {
    assert.ok(params[name], `${key}: missing path param ${name}`);
    return encodeURIComponent(params[name]);
  });
  const response = await raw(`${path}${query}`, { method: contract.method, session, body });
  if (response.ok) exercised.add(key);
  return response;
}

async function ok(key, session, options) {
  const response = await call(key, session, options);
  assert.ok(response.ok, `${key} as ${session.role} → ${response.status} ${JSON.stringify(response.data).slice(0, 200)}`);
  return response.data.data;
}

/** A refused request must carry the operator message Mobile shows. */
async function refused(key, session, expectedStatus, options) {
  const response = await call(key, session, options);
  assert.equal(response.status, expectedStatus, `${key} as ${session.role}: expected ${expectedStatus}, got ${response.status} ${JSON.stringify(response.data).slice(0, 160)}`);
  const message = readApiErrorMessage(response.data);
  assert.ok(message, `${key}: ${expectedStatus} body has no operator message`);
  return message;
}

async function login(email, role) {
  const response = await raw("/auth/login", { method: "POST", body: { email, password: PASSWORD } });
  assert.ok(response.ok, `login ${email}: ${JSON.stringify(response.data)}`);
  const data = response.data.data;
  return {
    role,
    email,
    token: data.accessToken,
    factoryId: data.activeFactoryId,
    permissions: data.permissions,
    roles: data.roles,
    cookie: (response.headers.getSetCookie?.() ?? []).map((value) => value.split(";")[0]).join("; "),
  };
}

async function platformLogin() {
  const response = await raw("/platform-auth/login", {
    method: "POST",
    body: { email: "platform@paypoq.local", password: PASSWORD },
  });
  assert.ok(response.ok, `platform login: ${JSON.stringify(response.data)}`);
  return { token: response.data.data.accessToken };
}

async function post(path, session, body) {
  const response = await raw(path, { method: "POST", session, body });
  assert.ok(response.ok, `POST ${path}: ${response.status} ${JSON.stringify(response.data).slice(0, 240)}`);
  return response.data.data;
}

// ---------------------------------------------------------------------------
// Fixture: disposable tenant with the Day-0 setup Wave 1 needs
// ---------------------------------------------------------------------------
async function createFixture() {
  const platform = await platformLogin();
  const tenant = await post("/platform-admin/tenants", platform, {
    name: `MOBILE-W1-${TAG}`,
    contactName: "Mobile Wave 1 API acceptance",
  });
  const email = (name) => `mw1-${name}-${TAG}@paypoq.local`;
  await post(`/platform-admin/tenants/${tenant.id}/owner-users`, platform, {
    name: "MW1 Owner",
    email: email("owner"),
    password: PASSWORD,
  });
  const owner = await login(email("owner"), "Owner");

  for (const [key, roleName] of [
    ["manager", "Manager"],
    ["shift", "Shift Receiver"],
    ["warehouse", "Warehouse Operator"],
    ["seller", "Seller"],
    ["accountant", "Accountant"],
  ]) {
    await post("/organization/users", owner, { name: `MW1 ${roleName}`, email: email(key), password: PASSWORD, roleName });
  }

  // Work shifts are not persisted until saved (AGENTS §14).
  for (const [code, name] of [["DAY", "Kunduzgi"], ["NIGHT", "Tungi"]]) {
    const response = await raw(`/settings/work-shifts/${code}`, {
      method: "PUT",
      session: owner,
      body: { code, name, startTime: code === "DAY" ? "08:00" : "20:00", endTime: code === "DAY" ? "20:00" : "08:00", premiumPerPiece: "0" },
    });
    assert.ok(response.ok, `save ${code} shift: ${JSON.stringify(response.data)}`);
  }

  const color = await post("/product/colors", owner, { name: `Qora ${TAG}` });
  const material = await post("/product/materials", owner, { name: `Paxta ${TAG}` });
  const season = await post("/product/seasons", owner, { name: `Qish ${TAG}` });
  const product = await post("/product/products", owner, { name: `Classic ${TAG}` });
  const variant = await post(`/product/products/${product.id}/variants`, owner, {
    colorId: color.id,
    materialId: material.id,
    seasonId: season.id,
  });

  const summary = (await raw("/production/operations-summary", { session: owner })).data.data;
  const stages = [...summary.stageTotals].sort((a, b) => a.sortOrder - b.sortOrder);
  assert.ok(stages.length >= 2, "tenant must be provisioned with production stages");
  const shifts = (await raw("/production/lookups/work-shifts", { session: owner })).data.data;
  const dayShift = shifts.find((shift) => shift.code === "DAY");
  assert.ok(dayShift, "DAY shift must exist after saving");

  const worker = await post("/employees", owner, {
    name: `MW1 Ishchi ${TAG}`,
    workProfile: "STAGE_WORKER",
    compensationType: "PIECE_RATE",
    workShiftId: dayShift.id,
    stageIds: [stages[0].stageId],
  });
  const operator = await post("/employees", owner, {
    name: `MW1 Operator ${TAG}`,
    workProfile: "MACHINE_OPERATOR",
    compensationType: "PIECE_RATE",
    workShiftId: dayShift.id,
  });
  const mechanicEmployee = await post("/employees", owner, {
    name: `MW1 Mexanik ${TAG}`,
    workProfile: "MECHANIC",
    compensationType: "PIECE_RATE",
    workShiftId: dayShift.id,
    account: { email: email("mechanic"), password: PASSWORD, roleName: "Mechanic" },
  });
  await post("/settings/salary-rates", owner, { stageId: stages[0].stageId, amount: "100" });

  const sessions = {
    owner,
    manager: await login(email("manager"), "Manager"),
    shift: await login(email("shift"), "Shift Receiver"),
    warehouse: await login(email("warehouse"), "Warehouse Operator"),
    mechanic: await login(email("mechanic"), "Mechanic"),
    seller: await login(email("seller"), "Seller"),
    accountant: await login(email("accountant"), "Accountant"),
  };

  return {
    tenantId: tenant.id,
    sessions,
    variant,
    product,
    material,
    stages,
    dayShift,
    worker,
    operator,
    mechanicEmployee,
  };
}

async function suspendTenant(tenantId) {
  const platform = await platformLogin();
  const response = await raw(`/platform-admin/tenants/${tenantId}/suspend`, { method: "POST", session: platform });
  console.log(`cleanup: tenant ${tenantId} suspend → ${response.status}`);
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------
const OPERATIONS_AREAS = ["production", "machines", "mechanic", "warehouse"];

/** Expected Operations tab content per role: the pilot scope both clients share. */
function expectedAreas(role) {
  return OPERATIONS_AREAS.filter((area) => (PILOT_ROLE_AREAS[role] ?? []).includes(area));
}

async function sessionScenario(fx) {
  await step("Session: /auth/me returns the role context Mobile navigation uses", async () => {
    for (const session of Object.values(fx.sessions)) {
      const me = await raw("/auth/me", { session });
      assert.ok(me.ok, `/auth/me as ${session.role}`);
      assert.deepEqual(me.data.data.roles, [session.role]);
      assert.deepEqual([...me.data.data.permissions].sort(), [...session.permissions].sort());
      assert.equal(me.data.data.activeFactoryId, session.factoryId);
      const visible = OPERATIONS_AREAS.filter(
        (area) => resolveAreaAccess(area, session.permissions, session.roles).allowed,
      );
      assert.deepEqual(visible, expectedAreas(session.role), `${session.role} operations areas`);
    }
    return "7 roles; operations areas match the shared pilot scope";
  });

  await step("Session: refresh cookie restores a session; logout ends it", async () => {
    const shift = fx.sessions.shift;
    assert.ok(shift.cookie, "login must set the refresh cookie");
    const refreshed = await raw("/auth/refresh", { method: "POST", cookie: shift.cookie });
    assert.ok(refreshed.ok, `refresh: ${JSON.stringify(refreshed.data).slice(0, 160)}`);
    assert.ok(refreshed.data.data.accessToken, "refresh returns a new access token");
    assert.deepEqual(refreshed.data.data.roles, ["Shift Receiver"]);
    // A different user signing in on the same device gets that user's context.
    const switched = await login(fx.sessions.warehouse.email, "Warehouse Operator");
    assert.deepEqual(switched.roles, ["Warehouse Operator"]);
    assert.equal(canUseEndpoint("productionOperationsSummary", switched.permissions, switched.roles), false);
    const loggedOut = await raw("/auth/logout", { method: "POST", session: switched, cookie: switched.cookie });
    assert.ok(loggedOut.ok, "logout");
    const afterLogout = await raw("/auth/refresh", { method: "POST", cookie: switched.cookie });
    assert.equal(afterLogout.status, 401, "refresh after logout must be refused");
    return "refresh → new token; role switch; refresh after logout → 401";
  });

  await step("Session: requests without a token are refused with an operator message", async () => {
    const response = await raw("/production/operations-summary");
    assert.equal(response.status, 401);
    assert.ok(readApiErrorMessage(response.data), "401 body has a message");
  });
}

async function permissionMatrixScenario(fx) {
  // Read endpoints: every role must get exactly what the shared contract predicts.
  const readKeys = Object.entries(WAVE1_ENDPOINTS)
    .filter(([, contract]) => contract.method === "GET")
    .map(([key]) => key);

  await step("Permission matrix: every Wave 1 read × every role matches the shared contract", async () => {
    let checks = 0;
    for (const session of Object.values(fx.sessions)) {
      for (const key of readKeys) {
        const query =
          key === "productionShiftReadiness"
            ? `?workShiftId=${fx.dayShift.id}&workDate=${currentWorkDate()}`
            : "";
        const response = await call(key, session, { query });
        const allowed = canUseEndpoint(key, session.permissions, []);
        assert.equal(
          response.status,
          allowed ? 200 : 403,
          `${key} as ${session.role}: contract says ${allowed ? "allowed" : "denied"}, API answered ${response.status}`,
        );
        if (!allowed) assert.ok(readApiErrorMessage(response.data), `${key}: 403 without message`);
        checks += 1;
      }
    }
    return `${checks} role × endpoint checks`;
  });

  // Guard-enforced writes: a role without the permission is stopped before any validation.
  const guardWrites = Object.entries(WAVE1_ENDPOINTS).filter(
    ([, contract]) => contract.method !== "GET" && contract.enforcedBy !== "service",
  );

  await step("Permission matrix: writes are refused (403) for every role without the permission", async () => {
    let checks = 0;
    for (const session of Object.values(fx.sessions)) {
      for (const [key, contract] of guardWrites) {
        if (canUseEndpoint(key, session.permissions, [])) continue;
        const params = Object.fromEntries(
          [...contract.path.matchAll(/:(\w+)/g)].map((match) => [match[1], "does-not-exist"]),
        );
        const response = await call(key, session, { params, body: {} });
        assert.equal(response.status, 403, `${key} as ${session.role}: expected 403, got ${response.status}`);
        checks += 1;
      }
    }
    return `${checks} denied writes`;
  });
}

async function machineAndProductionScenario(fx) {
  const { owner, manager, shift, mechanic, warehouse } = fx.sessions;
  const state = {};

  await step("Machines: owner creates a machine, assigns the mechanic, sets piece rates", async () => {
    state.machine = await ok("machinesCreate", owner, { body: { code: `ST-${TAG}`, name: `Stanok ${TAG}` } });
    const validFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await ok("machinesAssign", owner, {
      body: { machineId: state.machine.id, mechanicId: fx.mechanicEmployee.id, workShiftId: fx.dayShift.id, validFrom },
    });
    for (const workRole of ["MECHANIC", "MACHINE_OPERATOR"]) {
      await ok("machinesCreatePieceRate", owner, {
        body: { productId: fx.product.id, workRole, amount: 50, effectiveFrom: validFrom },
      });
    }
    const machines = await ok("machinesList", shift);
    const listed = machines.find((item) => item.id === state.machine.id);
    assert.equal(listed.status, "ACTIVE");
    assert.equal(listed.assignments[0].mechanic.id, fx.mechanicEmployee.id);
    assert.equal(listed.assignments[0].workShift.id, fx.dayShift.id);
    const lookups = await ok("machinesLookups", shift);
    assert.ok(lookups.employees.some((e) => e.id === fx.operator.id && e.workProfile === "MACHINE_OPERATOR"));
    assert.ok(lookups.shifts.some((s) => s.id === fx.dayShift.id && Array.isArray(s.inspectionSlots)));
    assert.ok(lookups.products.some((p) => p.id === fx.product.id));
    // Duplicate machine code is a conflict with an operator message, not a 500.
    const duplicate = await refused("machinesCreate", owner, 409, { body: { code: `ST-${TAG}`, name: "dup" } });
    return `machine ${state.machine.code}; duplicate code → 409 "${duplicate.slice(0, 40)}…"`;
  });

  await step("Quality setup: owner creates + activates a measurement spec and inspection slots", async () => {
    const spec = await ok("machinesCreateSpecification", owner, {
      params: { productId: fx.product.id },
      body: { metrics: [{ code: "TOTAL_LENGTH", name: "Umumiy uzunlik", unit: "cm", min: 20, target: 22, max: 24, displayOrder: 1 }] },
    });
    await ok("machinesActivateSpecification", owner, { params: { id: spec.id } });
    const slots = await ok("machinesConfigureInspectionSlots", owner, {
      body: { workShiftId: fx.dayShift.id, slots: [1, 2, 3].map((slotNumber) => ({ slotNumber, minuteOffset: (slotNumber - 1) * 120 })) },
    });
    assert.deepEqual(slots.map((slot) => slot.minuteOffset), [0, 120, 240]);
    // The UI hides these from Mechanic; an inverted range is rejected by the API for everyone.
    await refused("machinesCreateSpecification", owner, 400, {
      params: { productId: fx.product.id },
      body: { metrics: [{ code: "BAD", name: "Bad", unit: "cm", min: 5, target: 4, max: 6, displayOrder: 1 }] },
    });
    return "spec active; 3 slots saved; min > target → 400";
  });

  await step("Run: Shift Receiver starts a machine run", async () => {
    const variants = await ok("productionLookupVariants", shift);
    const variant = variants.find((item) => item.id === fx.variant.id);
    assert.ok(variant?.label, "lookup variant carries a label");
    state.run = await ok("productionCreateRun", shift, {
      body: { machineId: state.machine.id, productVariantId: fx.variant.id, operatorEmployeeId: fx.operator.id, workShiftId: fx.dayShift.id },
    });
    assert.equal(state.run.status, "RUNNING");
    const runs = await ok("productionRuns", shift);
    const listed = runs.find((run) => run.id === state.run.id);
    assert.equal(listed.machine.code, state.machine.code);
    assert.ok(listed.productVariant.product.name && listed.productVariant.color.name);
    assert.ok(listed.operator.name && listed.mechanic.name && listed.workShift.name);
    // A second run on the same machine is refused.
    const conflict = await refused("productionCreateRun", shift, 409, {
      body: { machineId: state.machine.id, productVariantId: fx.variant.id, operatorEmployeeId: fx.operator.id, workShiftId: fx.dayShift.id },
    });
    return `run RUNNING; second run on same machine → 409 "${conflict.slice(0, 40)}…"`;
  });

  await step("Intake: output is recorded once even when the same request is replayed", async () => {
    const idempotencyKey = `m-${TAG}-intake-1`;
    const body = { quantity: 30, idempotencyKey };
    const first = await ok("productionCreateRunIntake", shift, { params: { id: state.run.id }, body });
    const replay = await ok("productionCreateRunIntake", shift, { params: { id: state.run.id }, body });
    assert.equal(replay.id, first.id, "replay returns the first intake");
    const inventory = await ok("productionStageInventory", shift);
    const firstStage = inventory.find((item) => item.stage.id === fx.stages[0].stageId && item.productVariant.id === fx.variant.id);
    assert.equal(firstStage.quantity, 30, "inventory increased once, not twice");
    await refused("productionCreateRunIntake", shift, 400, {
      params: { id: state.run.id },
      body: { quantity: 0, idempotencyKey: `m-${TAG}-intake-bad` },
    });
    return "30 dona; replay with same key → same intake, inventory 30; quantity 0 → 400";
  });

  await step("Stage movement: worker shares, inventory before/after, validation and conflict errors", async () => {
    const employees = await ok("productionLookupEmployees", shift);
    const worker = employees.find((employee) => employee.id === fx.worker.id);
    assert.ok(worker.stages.some((stage) => stage.id === fx.stages[0].stageId), "worker is assigned to the source stage");
    const base = {
      sourceStageId: fx.stages[0].stageId,
      destinationStageId: fx.stages[1].stageId,
      productVariantId: fx.variant.id,
      employeeIds: [fx.worker.id],
    };
    await refused("productionCreateStageMovement", shift, 400, { body: { ...base, quantity: 0, workerShares: [{ employeeId: fx.worker.id, quantity: 0 }] } });
    await refused("productionCreateStageMovement", shift, 400, { body: { ...base, quantity: 10, employeeIds: [] } });
    const tooMuch = await call("productionCreateStageMovement", shift, { body: { ...base, quantity: 999, workerShares: [{ employeeId: fx.worker.id, quantity: 999 }] } });
    assert.ok([400, 409].includes(tooMuch.status), `over-available move must be refused, got ${tooMuch.status}`);
    assert.ok(readApiErrorMessage(tooMuch.data));

    const moved = await ok("productionCreateStageMovement", shift, {
      body: { ...base, quantity: 10, workerShares: [{ employeeId: fx.worker.id, quantity: 10 }], note: `mw1 ${TAG}` },
    });
    state.movement = moved.stageMovement;
    assert.equal(moved.sourceStageInventoryBefore.quantity, 30);
    assert.equal(moved.sourceStageInventory.quantity, 20);
    assert.equal(moved.destinationStageInventory.quantity, 10);
    assert.equal(moved.stageMovement.sourceStage.name, fx.stages[0].stageName);
    const movements = await ok("productionRecentMovements", shift);
    assert.ok(movements.some((item) => item.id === state.movement.id && item.recordedBy.name));
    const activities = await ok("productionWorkerActivities", shift);
    const logged = activities.find((item) => item.employee.id === fx.worker.id && item.stage.id === fx.stages[0].stageId);
    assert.equal(logged.quantity, 10, "worker activity logged for the moved quantity");
    return "10 dona moved: source 30 → 20, destination 0 → 10; worker activity 10";
  });

  await step("Extra worker activity and defect are recorded", async () => {
    const activity = await ok("productionCreateWorkerActivity", shift, {
      body: { employeeId: fx.worker.id, stageId: fx.stages[0].stageId, productVariantId: fx.variant.id, quantity: 2 },
    });
    assert.equal(activity.quantity, 2);
    state.activity = activity;
    const defect = await ok("productionCreateDefect", shift, {
      body: { employeeId: null, stageId: fx.stages[0].stageId, productVariantId: fx.variant.id, quantity: 1, reason: `ip uzilishi ${TAG}` },
    });
    assert.equal(defect.quantity, 1);
    await refused("productionCreateDefect", shift, 400, { body: { quantity: 1, reason: "x" } });
    const summary = await ok("productionOperationsSummary", shift);
    assert.equal(typeof summary.kpis.todayProduction, "string");
    assert.ok(summary.stageTotals.every((stage) => typeof stage.quantity === "string" && stage.stageId));
    return "activity 2 dona; defect 1 dona; reason shorter than 3 → 400";
  });

  await step("Correction request: Shift Receiver reports, cannot resolve; Manager resolves", async () => {
    const created = await ok("recoveryCreateProductionCorrection", shift, {
      body: { domain: "PRODUCTION_MOVEMENT", sourceRecordId: state.movement.id, reason: `Miqdor xato ${TAG}` },
    });
    assert.equal(created.status, "OPEN");
    assert.ok(created.source.title.includes("→"));
    // Service-enforced permissions (no guard decorator).
    await refused("recoveryResolveProductionCorrection", shift, 403, { params: { id: created.id }, body: { resolutionNote: "ruxsatsiz urinish" } });
    await refused("recoveryCreateProductionCorrection", warehouse, 403, {
      body: { domain: "PRODUCTION_MOVEMENT", sourceRecordId: state.movement.id, reason: "ruxsatsiz" },
    });
    await refused("recoveryCorrectionRequests", warehouse, 403);
    const queue = await ok("recoveryCorrectionRequests", manager);
    assert.ok(queue.some((item) => item.id === created.id && item.requester?.name));
    await refused("recoveryResolveProductionCorrection", manager, 400, { params: { id: created.id }, body: { resolutionNote: "x" } });
    const resolved = await ok("recoveryResolveProductionCorrection", manager, { params: { id: created.id }, body: { resolutionNote: `Tekshirildi ${TAG}` } });
    assert.equal(resolved.status, "RESOLVED");
    await refused("recoveryResolveProductionCorrection", manager, 409, { params: { id: created.id }, body: { resolutionNote: "ikkinchi marta" } });
    return "OPEN → RESOLVED; unauthorized resolve → 403; double resolve → 409";
  });

  await step("Mechanic: measurements out of range open an issue; a good recheck closes it", async () => {
    const rounds = await ok("machinesMyInspectionRounds", mechanic);
    const mine = rounds.filter((round) => round.productionRun.id === state.run.id);
    assert.equal(mine.length, 3, "three scheduled rounds for the run today");
    const round = mine[0];
    const metric = round.specification.metrics[0];
    assert.equal(typeof metric.min, "string");
    assert.ok(round.machine.code && round.productionRun.productVariant.product.name);
    await refused("machinesSubmitMeasurements", mechanic, 400, { params: { id: round.id }, body: { measurements: [] } });
    const result = await ok("machinesSubmitMeasurements", mechanic, {
      params: { id: round.id },
      body: { measurements: [{ metricId: metric.id, value: 30 }] },
    });
    assert.equal(result.status, "ATTENTION");
    const issues = await ok("machinesQualityIssues", mechanic);
    const issue = issues.find((item) => item.productionRun.id === state.run.id);
    assert.ok(issue, "quality issue created for the out-of-range measurement");
    assert.ok(issue.inspectionRound.specification.metrics.length === 1 && issue.recheckDueAt);
    // Mechanic has no production.write: the hold action is hidden and refused.
    await refused("machinesHoldIssueRun", mechanic, 403, { params: { id: issue.id }, body: {} });
    const recheck = await ok("machinesRecheckIssue", mechanic, {
      params: { id: issue.id },
      body: { measurements: [{ metricId: metric.id, value: 22 }] },
    });
    assert.deepEqual(recheck.failed, []);
    const after = await ok("machinesQualityIssues", mechanic);
    assert.ok(!after.some((item) => item.id === issue.id), "resolved issue leaves the list");
    const passed = await ok("machinesSubmitMeasurements", mechanic, {
      params: { id: mine[1].id },
      body: { measurements: [{ metricId: metric.id, value: 22.5 }] },
    });
    assert.equal(passed.status, "PASSED");
    return "30 cm → ATTENTION + issue; recheck 22 cm → resolved; 22.5 cm → PASSED; hold as Mechanic → 403";
  });

  await step("Hold: an escalated issue lets an authorized user put the run on HOLD and resume it", async () => {
    const rounds = await ok("machinesMyInspectionRounds", mechanic);
    const round = rounds.find((item) => item.productionRun.id === state.run.id && item.status === "PENDING");
    const metric = round.specification.metrics[0];
    await ok("machinesSubmitMeasurements", mechanic, { params: { id: round.id }, body: { measurements: [{ metricId: metric.id, value: 10 }] } });
    const issue = (await ok("machinesQualityIssues", owner)).find((item) => item.productionRun.id === state.run.id);
    assert.ok(issue, "owner sees the open issue");
    const held = await ok("machinesHoldIssueRun", owner, { params: { id: issue.id }, body: {} });
    assert.equal(held.status, "HOLD");
    // Output cannot be received while on HOLD.
    await refused("productionCreateRunIntake", shift, 409, { params: { id: state.run.id }, body: { quantity: 5, idempotencyKey: `m-${TAG}-hold` } });
    const resumed = await ok("productionChangeRunStatus", shift, { params: { id: state.run.id }, body: { status: "RUNNING" } });
    assert.equal(resumed.status, "RUNNING");
    await ok("machinesRecheckIssue", mechanic, { params: { id: issue.id }, body: { measurements: [{ metricId: metric.id, value: 22 }] } });
    return "HOLD → intake refused (409) → RUNNING";
  });

  await step("Maintenance task: owner assigns; Mechanic starts and completes with a resolution", async () => {
    const task = await ok("machinesCreateTask", owner, {
      body: { machineId: state.machine.id, assigneeMechanicId: fx.mechanicEmployee.id, type: "REPAIR", priority: "HIGH", description: `Igna almashtirish ${TAG}` },
    });
    assert.equal(task.status, "OPEN");
    // The API (not only the UI) stops a Mechanic from assigning tasks.
    assert.equal(canUseEndpoint("machinesCreateTask", mechanic.permissions, mechanic.roles), false);
    await refused("machinesCreateTask", mechanic, 403, {
      body: { machineId: state.machine.id, assigneeMechanicId: fx.mechanicEmployee.id, type: "REPAIR", priority: "LOW", description: "o'ziga vazifa" },
    });
    const mine = await ok("machinesTasks", mechanic);
    const listed = mine.find((item) => item.id === task.id);
    assert.ok(listed.machine.code && listed.assignee.name);
    const started = await ok("machinesUpdateTask", mechanic, { params: { id: task.id }, body: { status: "IN_PROGRESS" } });
    assert.equal(started.status, "IN_PROGRESS");
    await refused("machinesUpdateTask", mechanic, 400, { params: { id: task.id }, body: { status: "COMPLETED" } });
    const completed = await ok("machinesUpdateTask", mechanic, { params: { id: task.id }, body: { status: "COMPLETED", resolution: `Almashtirildi ${TAG}` } });
    assert.equal(completed.status, "COMPLETED");
    return "OPEN → IN_PROGRESS → COMPLETED; completing without a resolution → 400; Mechanic assigning → 403";
  });

  await step("Run completion is final", async () => {
    const completed = await ok("productionChangeRunStatus", shift, { params: { id: state.run.id }, body: { status: "COMPLETED" } });
    assert.equal(completed.status, "COMPLETED");
    // A duplicate completion (double tap / retry) is a conflict, not a second transition.
    await refused("productionChangeRunStatus", shift, 409, { params: { id: state.run.id }, body: { status: "COMPLETED" } });
    await refused("productionCreateRunIntake", shift, 409, { params: { id: state.run.id }, body: { quantity: 5, idempotencyKey: `m-${TAG}-late` } });
    return "COMPLETED; repeat → 409; intake after completion → 409";
  });

  return state;
}

async function warehouseScenario(fx) {
  const { manager, shift, warehouse, seller } = fx.sessions;
  const state = {};

  await step("Warehouse reads: summary, zones, stock, catalog lookups", async () => {
    const summary = await ok("warehouseStockSummary", warehouse);
    assert.equal(typeof summary.kpis.finishedProductQuantity, "string");
    assert.ok(summary.zoneSummaries.length >= 1 && summary.zoneSummaries[0].zoneId);
    const zones = await ok("warehouseZones", warehouse);
    assert.ok(zones.every((zone) => zone.id && zone.warehouse.name));
    state.zones = zones;
    state.materialZone = zones.find((zone) => /raw|xom/i.test(zone.name)) ?? zones[0];
    const materials = await ok("productMaterials", warehouse);
    assert.ok(materials.some((item) => item.id === fx.material.id));
    const products = await ok("productProducts", warehouse);
    assert.ok(products.find((item) => item.id === fx.product.id).variants.some((v) => v.id === fx.variant.id));
    return `${zones.length} zones`;
  });

  await step("Material receipt: decimal quantity, unit, zone; then visible in stock and movements", async () => {
    await refused("warehouseCreateMaterialReceipt", warehouse, 400, {
      body: { materialId: fx.material.id, quantity: "abc", unit: "kg", warehouseZoneId: state.materialZone.id },
    });
    const receipt = await ok("warehouseCreateMaterialReceipt", warehouse, {
      body: { materialId: fx.material.id, quantity: "25.5", unit: "kg", warehouseZoneId: state.materialZone.id, note: `mw1 ${TAG}` },
    });
    assert.equal(Number(receipt.materialStock.quantity), 25.5);
    assert.equal(receipt.materialStock.unit, "kg");
    assert.equal(receipt.stockMovement.movementType, "RECEIPT");
    state.materialStock = receipt.materialStock;
    const stock = await ok("warehouseMaterialStock", seller);
    assert.ok(stock.some((item) => item.id === state.materialStock.id), "Seller can read stock (warehouse.view)");
    // Seller reads stock but must not write it.
    await refused("warehouseCreateMaterialReceipt", seller, 403, {
      body: { materialId: fx.material.id, quantity: "1", unit: "kg", warehouseZoneId: state.materialZone.id },
    });
    return "25.5 kg received; Seller read ok, write → 403";
  });

  await step("Stock correction: records before/after and requires a reason", async () => {
    const base = { itemType: "MATERIAL", materialId: fx.material.id, productVariantId: null, warehouseZoneId: state.materialZone.id };
    await refused("warehouseCreateStockCorrection", warehouse, 400, { body: { ...base, newQuantity: "20", reason: "" } });
    const correction = await ok("warehouseCreateStockCorrection", warehouse, {
      body: { ...base, newQuantity: "20", reason: `Fizik sanoq ${TAG}` },
    });
    assert.equal(Number(correction.stock.quantity), 20);
    assert.equal(correction.stockMovement.movementType, "CORRECTION");
    assert.equal(Number(correction.stockMovement.beforeQuantity), 25.5);
    assert.equal(Number(correction.stockMovement.afterQuantity), 20);
    const movements = await ok("warehouseMovements", warehouse);
    const listed = movements.find((item) => item.id === correction.stockMovement.id);
    assert.ok(listed && listed.recordedBy.name && listed.zone.id === state.materialZone.id);
    assert.ok(listed.reason.includes(TAG), "free-text reason is kept");
    return "25.5 → 20 kg, movement CORRECTION with before/after";
  });

  await step("Handoff stage + finished-product receipt move goods from production into stock", async () => {
    const before = await ok("productionWarehouseHandoffStage", manager);
    assert.equal(before, null, "fresh tenant has no handoff stage");
    // Without a handoff stage the API refuses the receipt with an explanation.
    await refused("warehouseCreateFinishedProductReceipt", warehouse, 409, { body: { productVariantId: fx.variant.id, quantity: 1 } });
    await refused("productionConfigureWarehouseHandoffStage", shift, 403, { body: { productionStageId: fx.stages[1].stageId } });
    const configured = await ok("productionConfigureWarehouseHandoffStage", manager, { body: { productionStageId: fx.stages[1].stageId } });
    assert.equal(configured.id, fx.stages[1].stageId);
    const handoff = await ok("productionWarehouseHandoffStage", shift);
    const inventory = await ok("productionStageInventory", shift);
    // The picker both clients show: exactly the configured stage's products.
    const receivable = selectWarehouseHandoffInventory(inventory, handoff);
    assert.equal(receivable.length, 1);
    assert.equal(receivable[0].quantity, 10);
    assert.equal(receivable[0].stage.id, fx.stages[1].stageId);
    await refused("warehouseCreateFinishedProductReceipt", shift, 403, { body: { productVariantId: fx.variant.id, quantity: 4 } });
    const receipt = await ok("warehouseCreateFinishedProductReceipt", warehouse, { body: { productVariantId: fx.variant.id, quantity: 4, warehouseZoneId: null } });
    assert.equal(receipt.productionStageInventory.quantity, 6);
    assert.equal(receipt.stock.quantity, 4);
    const over = await call("warehouseCreateFinishedProductReceipt", warehouse, { body: { productVariantId: fx.variant.id, quantity: 999 } });
    assert.ok([400, 409].includes(over.status) && readApiErrorMessage(over.data), "over-receipt refused with a message");
    const stock = await ok("warehouseStock", warehouse);
    assert.ok(stock.some((item) => item.productVariant.id === fx.variant.id && item.quantity === 4 && item.zone.id));
    return "handoff stage set by Manager (Shift Receiver → 403); 4 of 10 received, stage 10 → 6, stock 4";
  });
}

async function shiftCloseScenario(fx) {
  const { manager, shift, warehouse } = fx.sessions;
  const payload = { workShiftId: fx.dayShift.id, workDate: currentWorkDate() };
  const query = `?workShiftId=${payload.workShiftId}&workDate=${payload.workDate}`;

  await step("Shift close: blockers stop submission until production is handed to the warehouse", async () => {
    const context = await ok("productionShiftContext", shift);
    assert.ok("currentWorkShift" in context && "message" in context);
    const readiness = await ok("productionShiftReadiness", shift, { query });
    const blocker = readiness.blockers.find((item) => item.code === "WAREHOUSE_RECEIPT_COMPLETE");
    assert.ok(blocker && blocker.detail && blocker.action, "undelivered finished goods block the shift");
    await refused("productionSubmitShift", shift, 409, { body: payload });
    await ok("warehouseCreateFinishedProductReceipt", warehouse, { body: { productVariantId: fx.variant.id, quantity: 6 } });
    const after = await ok("productionShiftReadiness", shift, { query });
    assert.deepEqual(after.blockers, [], `blockers left: ${after.blockers.map((item) => item.code).join(",")}`);
    assert.ok(after.warnings.some((item) => item.code === "DEFECT_REVIEW"), "today's defect is a warning");
    return "blocked by 6 undelivered dona → received → no blockers, 1 warning";
  });

  await step("Shift close: submit → return → submit → accept; accepted shift cannot be reopened", async () => {
    const submitted = await ok("productionSubmitShift", shift, { body: payload });
    assert.equal(submitted.status, "READY_FOR_HANDOVER");
    // Shift Receiver has production.write but not production.approve.
    await refused("productionAcceptShift", shift, 403, { body: { ...payload, reason: "ruxsatsiz" } });
    await refused("productionReturnShift", manager, 400, { body: { ...payload, reason: "x" } });
    const returned = await ok("productionReturnShift", manager, { body: { ...payload, reason: `Qayta tekshirish ${TAG}` } });
    assert.equal(returned.status, "OPEN");
    await ok("productionSubmitShift", shift, { body: payload });
    const accepted = await ok("productionAcceptShift", manager, { body: { ...payload, reason: `Nuqson ko'rib chiqildi ${TAG}` } });
    assert.equal(accepted.status, "ACCEPTED");
    const records = await ok("productionShiftReconciliations", shift);
    const record = records.find((item) => item.workShiftId === payload.workShiftId && item.workDate.slice(0, 10) === payload.workDate);
    assert.equal(record.status, "ACCEPTED");
    assert.equal(record.workShift.id, fx.dayShift.id);
    await refused("productionSubmitShift", shift, 409, { body: payload });
    await refused("productionReturnShift", manager, 409, { body: { ...payload, reason: "qayta ochish" } });
    return "READY → OPEN (returned) → READY → ACCEPTED; accept as Shift Receiver → 403; resubmit → 409";
  });

  await step("Shift lookups", async () => {
    const shifts = await ok("productionLookupWorkShifts", shift);
    assert.ok(shifts.some((item) => item.id === fx.dayShift.id && item.code === "DAY"));
  });
}

// ---------------------------------------------------------------------------
let fixture;
try {
  fixture = await createFixture();
  console.log(`fixture: tenant ${fixture.tenantId} (MOBILE-W1-${TAG})\n`);

  await sessionScenario(fixture);
  await permissionMatrixScenario(fixture);
  await machineAndProductionScenario(fixture);
  await warehouseScenario(fixture);
  await shiftCloseScenario(fixture);

  await step("Coverage: every Wave 1 endpoint was exercised successfully at least once", async () => {
    const missing = Object.keys(WAVE1_ENDPOINTS).filter((key) => !exercised.has(key));
    assert.deepEqual(missing, [], `not exercised: ${missing.join(", ")}`);
    return `${exercised.size} endpoints`;
  });
} catch (error) {
  record("Fixture / fatal", false, error instanceof Error ? error.message : String(error));
} finally {
  if (fixture) await suspendTenant(fixture.tenantId).catch((error) => console.error("cleanup failed", error));
}

const failed = results.filter((result) => !result.passed);
console.log(`\nMOBILE WAVE 1 API ACCEPTANCE: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
