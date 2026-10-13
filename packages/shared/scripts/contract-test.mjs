/**
 * Static anti-drift gate for @paypoq/shared.
 *
 * The API does not import this package, so this test reads the API sources
 * (permission definitions, controller decorators, Prisma enums) and fails when
 * the shared contract that Web and Native Mobile rely on disagrees with them.
 *
 * Run: pnpm --filter @paypoq/shared test
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORRECTION_DOMAINS,
  EMPLOYEE_WORK_PROFILES,
  INSPECTION_ROUND_STATUSES,
  MACHINE_STATUSES,
  NATIVE_SESSION_ENDPOINTS,
  MACHINE_WORK_ROLES,
  MAINTENANCE_TASK_PRIORITIES,
  MAINTENANCE_TASK_STATUSES,
  MAINTENANCE_TASK_TYPES,
  PERMISSION_KEYS,
  PILOT_ROLE_AREAS,
  PRODUCTION_RUN_STATUSES,
  QUALITY_ISSUE_STATUSES,
  SHIFT_RECONCILIATION_STATUSES,
  STOCK_MOVEMENT_TYPES,
  TENANT_AREAS,
  TENANT_ROLE_NAMES,
  WAVE1_ENDPOINTS,
  canUseEndpoint,
  equalSplitQuantities,
  getInitialStageMovementQuantity,
  isPositiveDecimalString,
  normalizeDecimalInput,
  parsePositiveInteger,
  readApiErrorMessage,
  resolveAreaAccess,
  resolveSessionFactory,
} from "../src/index.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

// ---------------------------------------------------------------------------
// API permission definitions
// ---------------------------------------------------------------------------
const rolePermissionsSource = read("apps/api/src/common/role-permissions.ts");

function quoted(text) {
  return [...text.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

const apiPermissionKeys = quoted(
  rolePermissionsSource.match(/PERMISSION_DEFINITIONS = \[([\s\S]*?)\] as const/)[1],
);

const roleBlock = rolePermissionsSource.match(/ROLE_PERMISSIONS[^=]*= \{([\s\S]*)\};/)[1];
const apiRolePermissions = {};
for (const match of roleBlock.matchAll(
  /(?:'([^']+)'|([A-Za-z]+)):\s*(PERMISSION_DEFINITIONS|\[([\s\S]*?)\])/g,
)) {
  const role = match[1] ?? match[2];
  apiRolePermissions[role] =
    match[3] === "PERMISSION_DEFINITIONS" ? apiPermissionKeys : quoted(match[4]);
}

check("permission keys match the API definition", () => {
  assert.deepEqual([...PERMISSION_KEYS], apiPermissionKeys);
});

check("role names match the API role matrix", () => {
  assert.deepEqual([...TENANT_ROLE_NAMES].sort(), Object.keys(apiRolePermissions).sort());
});

check("tenant areas require known permissions", () => {
  for (const [area, definition] of Object.entries(TENANT_AREAS)) {
    for (const permission of definition.requiredPermissions) {
      assert.ok(apiPermissionKeys.includes(permission), `${area}: unknown ${permission}`);
    }
  }
});

check("every pilot-scoped role can actually open its areas", () => {
  // Documented exception (see access.ts): Manager lists "audit" without audit.view.
  const exceptions = new Set(["Manager:audit"]);
  for (const [role, areas] of Object.entries(PILOT_ROLE_AREAS)) {
    assert.ok(apiRolePermissions[role], `pilot scope references unknown role ${role}`);
    for (const area of areas) {
      if (exceptions.has(`${role}:${area}`)) continue;
      const decision = resolveAreaAccess(area, apiRolePermissions[role], [role]);
      assert.equal(decision.allowed, true, `${role} cannot open pilot area ${area}`);
    }
  }
});

check("area access denies out-of-scope roles and missing permissions", () => {
  // Mechanic holds production.view but works only in the mechanic workspace.
  assert.equal(resolveAreaAccess("production", apiRolePermissions.Mechanic, ["Mechanic"]).allowed, false);
  assert.equal(resolveAreaAccess("mechanic", apiRolePermissions.Mechanic, ["Mechanic"]).allowed, true);
  // Seller holds warehouse.view (stock lookups) but the warehouse area is out of pilot scope.
  assert.equal(resolveAreaAccess("warehouse", apiRolePermissions.Seller, ["Seller"]).allowed, false);
  assert.equal(resolveAreaAccess("warehouse", [], ["Warehouse Operator"]).allowed, false);
  assert.equal(resolveAreaAccess("audit", apiRolePermissions.Manager, ["Manager"]).allowed, false);
  // The unresolved Mechanic Master role has no pilot area.
  for (const area of Object.keys(TENANT_AREAS)) {
    assert.equal(
      resolveAreaAccess(area, apiRolePermissions["Mechanic Master"], ["Mechanic Master"]).allowed,
      false,
    );
  }
});

// ---------------------------------------------------------------------------
// Controller decorators vs WAVE1_ENDPOINTS
// ---------------------------------------------------------------------------
const WAVE1_CONTROLLERS = [
  "apps/api/src/modules/production/production.controller.ts",
  "apps/api/src/modules/production/recovery.controller.ts",
  "apps/api/src/modules/warehouse/warehouse.controller.ts",
  "apps/api/src/modules/machine/machine.controller.ts",
];
const CATALOG_CONTROLLER = "apps/api/src/modules/product/product.controller.ts";

/**
 * Wave 1 controller routes that neither tenant client uses. A new backend
 * route must be added to WAVE1_ENDPOINTS or classified here with a reason.
 */
const NOT_IN_CLIENT_SCOPE = {
  "GET /production/defects": "not rendered by Web (defects are write-only on the board)",
  "POST /production/batches": "legacy manual batch intake; no Web entry point (quick actions use machine intake)",
  "PATCH /machines/:id": "no Web UI edits a machine",
  "GET /machines/assignments/active": "not rendered by Web (assignments come with GET /machines)",
  "GET /machines/piece-rates": "not rendered by Web",
  "POST /machines/quality-issues/:id/resolve": "no Web UI; issues close through recheck",
  "GET /warehouse/low-stock-thresholds": "Settings wave (thresholds page)",
  "PUT /warehouse/low-stock-thresholds": "Settings wave (thresholds page)",
};

function parseController(path) {
  const source = read(path);
  assert.ok(
    !/@Require(Any)?Permissions\([^)]*\)\s*(\/\/[^\n]*\s*)*@(Get|Post|Patch|Put|Delete)\(/.test(source),
    `${path}: permission decorator placed before the HTTP decorator is not supported by this test`,
  );

  const controllerMatch = source.match(/@Controller\('([^']*)'\)/);
  const prefix = controllerMatch[1];
  const classHeader = source.slice(controllerMatch.index, source.indexOf("export class", controllerMatch.index));
  const classAll = classHeader.match(/@RequirePermissions\(([^)]*)\)/);
  const classAny = classHeader.match(/@RequireAnyPermissions\(([^)]*)\)/);

  const body = source.slice(source.indexOf("export class", controllerMatch.index));
  const httpDecorators = [...body.matchAll(/@(Get|Post|Patch|Put|Delete)\((?:'([^']*)')?\)/g)];
  const routes = {};

  httpDecorators.forEach((decorator, index) => {
    const end = index + 1 < httpDecorators.length ? httpDecorators[index + 1].index : body.length;
    const segment = body.slice(decorator.index, end);
    // Decorators sit between the HTTP decorator and the handler parameters.
    const head = segment.slice(0, segment.search(/@CurrentContext|@Body|@Param|@Query|\{/));
    const methodAll = head.match(/@RequirePermissions\(([^)]*)\)/);
    const methodAny = head.match(/@RequireAnyPermissions\(([^)]*)\)/);
    const routePath = `/${[prefix, decorator[2]].filter(Boolean).join("/")}`;

    // PermissionGuard uses getAllAndOverride: the handler decorator replaces the class one.
    routes[`${decorator[1].toUpperCase()} ${routePath}`] = {
      all: quoted((methodAll ?? classAll)?.[1] ?? ""),
      any: quoted((methodAny ?? classAny)?.[1] ?? ""),
    };
  });

  return routes;
}

const apiRoutes = Object.assign({}, ...WAVE1_CONTROLLERS.map(parseController));
const catalogRoutes = parseController(CATALOG_CONTROLLER);
const productionServiceSource = read("apps/api/src/modules/production/production.service.ts");

check("factory preferences are identity-bound and revalidated against API access", () => {
  const context = { tenantId: "tenant", user: { id: "user" }, branchMode: "MULTI", activeFactoryId: "A", accessibleFactories: [{ id: "A" }, { id: "B" }] };
  const preference = { tenantId: "tenant", userId: "user", factoryId: "B" };
  assert.equal(resolveSessionFactory(context, preference), "B");
  assert.equal(resolveSessionFactory(context, { ...preference, tenantId: "other" }), "A");
  assert.equal(resolveSessionFactory(context, { ...preference, userId: "other" }), "A");
  assert.equal(resolveSessionFactory({ ...context, accessibleFactories: [{ id: "A" }] }, preference), "A");
  assert.equal(resolveSessionFactory({ ...context, branchMode: "SINGLE", accessibleFactories: [{ id: "A" }] }, preference), "A");
  assert.equal(resolveSessionFactory({ ...context, activeFactoryId: null, accessibleFactories: [] }, preference), null);
});

check("native session transports match the API routes and shared context", () => {
  const authPath = "apps/api/src/modules/identity/auth/auth.controller.ts";
  const authRoutes = parseController(authPath);
  for (const endpoint of Object.values(NATIVE_SESSION_ENDPOINTS)) {
    assert.ok(authRoutes[`${endpoint.method} ${endpoint.path}`]);
  }
  const nativeRoutes = new Set(Object.values(NATIVE_SESSION_ENDPOINTS).map((e) => `${e.method} ${e.path}`));
  const existingAuthRoutes = new Set([
    "POST /auth/login", "POST /auth/refresh", "POST /auth/logout", // Web cookie transport
    "GET /auth/me", // common bearer identity context
    "POST /auth/users/:userId/password", // existing password administration, outside PR 01
  ]);
  for (const route of Object.keys(authRoutes)) {
    assert.ok(nativeRoutes.has(route) || existingAuthRoutes.has(route), `${route}: classify new auth transport`);
  }
  const authTypes = read("apps/api/src/modules/identity/auth/auth.types.ts");
  const shared = read("packages/shared/src/contracts/auth.ts");
  assert.match(authTypes, /branchMode: 'SINGLE' \| 'MULTI'/);
  assert.match(shared, /branchMode: "SINGLE" \| "MULTI"/);
  // Auth routes live outside the operational permission registry: login and
  // refresh validate credentials in AuthService; native logout is possession-based.
});

check("Wave 1 endpoint permissions match the API controllers", () => {
  for (const [key, contract] of Object.entries(WAVE1_ENDPOINTS)) {
    const routeKey = `${contract.method} ${contract.path}`;
    const route = apiRoutes[routeKey] ?? catalogRoutes[routeKey];
    assert.ok(route, `${key}: ${routeKey} does not exist in the API controllers`);

    if (contract.enforcedBy === "service") {
      assert.deepEqual(route, { all: [], any: [] }, `${key}: expected no guard decorator`);
      for (const permission of [...(contract.all ?? []), ...(contract.any ?? [])]) {
        assert.ok(
          productionServiceSource.includes(`'${permission}'`),
          `${key}: service no longer checks ${permission}`,
        );
      }
      continue;
    }

    assert.deepEqual(route.all, [...(contract.all ?? [])], `${key}: required permissions drifted`);
    assert.deepEqual(route.any, [...(contract.any ?? [])], `${key}: any-of permissions drifted`);
  }
});

check("every Wave 1 controller route is covered or explicitly out of client scope", () => {
  const covered = new Set(Object.values(WAVE1_ENDPOINTS).map((c) => `${c.method} ${c.path}`));
  for (const routeKey of Object.keys(apiRoutes)) {
    assert.ok(
      covered.has(routeKey) || NOT_IN_CLIENT_SCOPE[routeKey],
      `${routeKey} is a new API route: add it to WAVE1_ENDPOINTS (both clients) or classify it in NOT_IN_CLIENT_SCOPE`,
    );
  }
  for (const routeKey of Object.keys(NOT_IN_CLIENT_SCOPE)) {
    assert.ok(apiRoutes[routeKey], `${routeKey} is listed as out of scope but no longer exists`);
    assert.ok(!covered.has(routeKey), `${routeKey} is both covered and out of scope`);
  }
});

check("endpoint capability check honours permissions and Web UI role rules", () => {
  const mechanic = apiRolePermissions.Mechanic;
  const manager = apiRolePermissions.Manager;
  const shift = apiRolePermissions["Shift Receiver"];
  const warehouse = apiRolePermissions["Warehouse Operator"];

  assert.equal(canUseEndpoint("productionCreateStageMovement", shift, ["Shift Receiver"]), true);
  assert.equal(canUseEndpoint("productionAcceptShift", shift, ["Shift Receiver"]), false);
  assert.equal(canUseEndpoint("productionAcceptShift", manager, ["Manager"]), true);
  assert.equal(canUseEndpoint("warehouseCreateFinishedProductReceipt", shift, ["Shift Receiver"]), false);
  assert.equal(canUseEndpoint("warehouseCreateStockCorrection", warehouse, ["Warehouse Operator"]), true);
  // Mechanic holds maintenance.write to work tasks, but only managers assign them.
  assert.equal(canUseEndpoint("machinesUpdateTask", mechanic, ["Mechanic"]), true);
  assert.equal(canUseEndpoint("machinesCreateTask", mechanic, ["Mechanic"]), false);
  assert.equal(canUseEndpoint("machinesConfigureInspectionSlots", mechanic, ["Mechanic"]), false);
  // Manager has no machines.write / maintenance.write / quality.write in the default matrix.
  assert.equal(canUseEndpoint("machinesCreate", manager, ["Manager"]), false);
  assert.equal(canUseEndpoint("machinesCreateTask", manager, ["Manager"]), false);
  assert.equal(canUseEndpoint("machinesHoldIssueRun", mechanic, ["Mechanic"]), false);
  assert.equal(canUseEndpoint("recoveryCorrectionRequests", apiRolePermissions.Accountant, ["Accountant"]), true);
  assert.equal(canUseEndpoint("recoveryCorrectionRequests", warehouse, ["Warehouse Operator"]), false);
});

// ---------------------------------------------------------------------------
// Prisma enums vs shared status lists
// ---------------------------------------------------------------------------
const schema = read("apps/api/prisma/schema.prisma");
function prismaEnum(name) {
  const block = schema.match(new RegExp(`enum ${name} \\{([\\s\\S]*?)\\}`));
  assert.ok(block, `Prisma enum ${name} not found`);
  return block[1].split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("//"));
}

check("status enums match the Prisma schema", () => {
  const pairs = {
    ProductionRunStatus: PRODUCTION_RUN_STATUSES,
    ShiftReconciliationStatus: SHIFT_RECONCILIATION_STATUSES,
    MachineStatus: MACHINE_STATUSES,
    MachineWorkRole: MACHINE_WORK_ROLES,
    MaintenanceTaskType: MAINTENANCE_TASK_TYPES,
    MaintenanceTaskPriority: MAINTENANCE_TASK_PRIORITIES,
    MaintenanceTaskStatus: MAINTENANCE_TASK_STATUSES,
    InspectionRoundStatus: INSPECTION_ROUND_STATUSES,
    QualityIssueStatus: QUALITY_ISSUE_STATUSES,
    StockMovementType: STOCK_MOVEMENT_TYPES,
    CorrectionRequestDomain: CORRECTION_DOMAINS,
    EmployeeWorkProfile: EMPLOYEE_WORK_PROFILES,
  };
  for (const [name, values] of Object.entries(pairs)) {
    assert.deepEqual([...values], prismaEnum(name), `${name} drifted from the Prisma schema`);
  }
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
check("stage movement quantity helpers", () => {
  assert.equal(getInitialStageMovementQuantity(500, 0), 0);
  assert.equal(getInitialStageMovementQuantity(500, 240), 240);
  assert.equal(getInitialStageMovementQuantity(500, 830), 500);
  assert.deepEqual(equalSplitQuantities(10, ["a", "b", "c"]), { a: 4, b: 3, c: 3 });
  assert.deepEqual(equalSplitQuantities(0, ["a"]), {});
  assert.deepEqual(equalSplitQuantities(5, []), {});
  const split = equalSplitQuantities(501, ["a", "b"]);
  assert.equal(split.a + split.b, 501);
});

check("numeric input helpers never produce floats for decimals", () => {
  assert.equal(parsePositiveInteger(" 120 "), 120);
  assert.equal(parsePositiveInteger("0"), null);
  assert.equal(parsePositiveInteger("12.5"), null);
  assert.equal(parsePositiveInteger("-3"), null);
  assert.equal(parsePositiveInteger("abc"), null);
  assert.equal(normalizeDecimalInput("25,5"), "25.5");
  assert.equal(normalizeDecimalInput(" 0.125 "), "0.125");
  assert.equal(normalizeDecimalInput("1e3"), null);
  assert.equal(normalizeDecimalInput("-1"), null);
  assert.equal(isPositiveDecimalString("0.000"), false);
  assert.equal(isPositiveDecimalString("0.001"), true);
});

check("API error body message extraction", () => {
  assert.equal(readApiErrorMessage({ statusCode: 409, message: " Qoldiq yetarli emas. ", error: "Conflict" }), "Qoldiq yetarli emas.");
  assert.equal(readApiErrorMessage({ message: ["Miqdor noto‘g‘ri.", "x"] }), "Miqdor noto‘g‘ri.");
  assert.equal(readApiErrorMessage({ message: "" }), null);
  assert.equal(readApiErrorMessage("plain text"), null);
  assert.equal(readApiErrorMessage(null), null);
});

console.log(`\n@paypoq/shared contract: ${passed} checks passed.`);
