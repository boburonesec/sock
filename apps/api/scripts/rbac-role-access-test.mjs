/**
 * Live RBAC smoke: login each demo role, probe key endpoints.
 * Expect: 200 where permission allows, 403 where denied.
 *
 * Usage (API running on :3001, DB seeded):
 *   node apps/api/scripts/rbac-role-access-test.mjs
 */

const API = process.env.API_URL ?? "http://localhost:3001";
const PASSWORD = process.env.DEMO_PASSWORD ?? "ChangeMe123!";

const users = [
  { role: "Owner", email: "owner@paypoq.local" },
  { role: "Manager", email: "manager@paypoq.local" },
  { role: "Seller", email: "seller@paypoq.local" },
  { role: "Warehouse Operator", email: "warehouse@paypoq.local" },
  { role: "Shift Receiver", email: "shift@paypoq.local" },
  { role: "Accountant", email: "accountant@paypoq.local" },
];

/** [method, path, permissionNeeded] */
const probes = [
  ["GET", "/dashboard/executive-summary", "dashboard.view"],
  ["GET", "/production/stage-inventory", "production.view"],
  ["GET", "/warehouse/stock", "warehouse.view"],
  ["GET", "/sales/clients", "sales.view"],
  ["GET", "/finance/summary", "finance.view"],
  ["GET", "/employees", "employees.view"],
  ["GET", "/attendance/overview?month=2026-07", "attendance.view"],
  ["GET", "/settings/roles", "settings.view"],
  ["GET", "/audit/logs", "audit.view"],
  ["GET", "/reports/overview", "reports.view"],
  ["GET", "/machines", "machines.view"],
  ["GET", "/machines/tasks", "maintenance.view"],
  ["GET", "/machines/quality-issues", "quality.view"],
  ["POST", "/warehouse/stock-corrections", "warehouse.write"],
  ["POST", "/sales/clients", "sales.write"],
  ["POST", "/finance/advances", "finance.write"],
  ["POST", "/production/shift-reconciliations/accept", "production.approve"],
  ["PATCH", "/production/warehouse-handoff-stage", "production.approve"],
  ["POST", "/finance/payroll-periods/probe-placeholder-id/approve", "payroll.approve"],
  ["POST", "/finance/expenses/probe-placeholder-id/approve", "expense.approve"],
  ["POST", "/finance/expenses/probe-placeholder-id/pay", "expense.pay"],
];

const rolePermissions = {
  Owner: "*",
  Manager: [
    "dashboard.view",
    "production.view",
    "production.write",
    "production.approve",
    "warehouse.view",
    "warehouse.write",
    "sales.view",
    "sales.write",
    "finance.view",
    "finance.write",
    "payroll.approve",
    "expense.approve",
    "employees.view",
    "employees.write",
    "attendance.view",
    "machines.view",
    "maintenance.view",
    "quality.view",
    "reports.view",
    "settings.view",
    "settings.write",
  ],
  Seller: ["sales.view", "sales.write", "warehouse.view"],
  "Warehouse Operator": ["warehouse.view", "warehouse.write"],
  "Shift Receiver": ["production.view", "production.write", "machines.view"],
  Accountant: [
    "finance.view",
    "finance.write",
    "expense.pay",
    "sales.view",
    "reports.view",
    "warehouse.view",
  ],
};

function expectsOk(role, permission) {
  const granted = rolePermissions[role];
  if (granted === "*") return true;
  return granted.includes(permission);
}

async function login(email) {
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(body)}`);
  }
  return body.data;
}

async function probe(token, factoryId, method, path) {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (factoryId) headers["X-Factory-Id"] = factoryId;

  const init = { method, headers };
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    // Intentionally invalid/minimal body — we only care about 403 vs not-403.
    init.body = JSON.stringify({});
  }

  const response = await fetch(`${API}${path}`, init);
  return response.status;
}

function classify(status, shouldAllow) {
  if (shouldAllow) {
    // Allowed reads: 200/204. Allowed writes may be 400/422 with empty body — not 403.
    if (status === 403) return "FAIL: expected access, got 403";
    return "PASS";
  }
  if (status === 403) return "PASS";
  return `FAIL: expected 403, got ${status}`;
}

async function main() {
  const results = [];
  let failures = 0;

  for (const user of users) {
    const session = await login(user.email);
    const token = session.accessToken;
    const factoryId = session.activeFactoryId ?? session.accessibleFactories?.[0]?.id;
    const actualPerms = session.permissions ?? [];

    console.log(`\n=== ${user.role} (${user.email}) ===`);
    console.log(`permissions: ${actualPerms.join(", ") || "(none)"}`);

    for (const [method, path, permission] of probes) {
      const shouldAllow = expectsOk(user.role, permission);
      const status = await probe(token, factoryId, method, path);
      const verdict = classify(status, shouldAllow);
      const line = `${verdict.padEnd(32)} ${method.padEnd(4)} ${path} (${permission}) → ${status}`;
      console.log(line);
      results.push({ role: user.role, method, path, permission, status, shouldAllow, verdict });
      if (verdict.startsWith("FAIL")) failures += 1;
    }
  }

  console.log(`\n---- Summary: ${results.length - failures}/${results.length} passed, ${failures} failed ----`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
