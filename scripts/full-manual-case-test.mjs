/**
 * Full operator case test against a running API.
 * Usage: node scripts/full-manual-case-test.mjs
 * Optional: API_BASE_URL=http://localhost:3001
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.API_BASE_URL || "http://localhost:3001";
const PASSWORD = "ChangeMe123!";

const results = [];

function ok(name, detail = "") {
  results.push({ name, status: "PASS", detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, status: "FAIL", detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function skip(name, detail = "") {
  results.push({ name, status: "SKIP", detail });
  console.log(`SKIP  ${name}${detail ? ` — ${detail}` : ""}`);
}

function loadTvToken() {
  const configuredToken = process.env.FACTORY_TV_ACCESS_TOKEN?.trim();
  if (configuredToken) return configuredToken;

  try {
    const env = readFileSync(path.join(ROOT, "apps/api/.env"), "utf8");
    return (env.match(/^FACTORY_TV_ACCESS_TOKEN=(.+)$/m) || [])[1]?.trim();
  } catch {
    return null;
  }
}

async function req(method, urlPath, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json, status: res.status };
}

async function login(email) {
  const { res, json, status } = await req("POST", "/auth/login", {
    body: { email, password: PASSWORD },
  });
  if (!res.ok) {
    throw new Error(`login ${email} failed ${status}: ${JSON.stringify(json)}`);
  }
  const token = json?.data?.accessToken || json?.accessToken;
  if (!token) throw new Error(`no access token for ${email}`);
  return { token, data: json.data || json };
}

async function platformLogin() {
  const { res, json, status } = await req("POST", "/platform-auth/login", {
    body: { email: "platform@paypoq.local", password: PASSWORD },
  });
  if (!res.ok) throw new Error(`platform login ${status}`);
  return json?.data?.accessToken || json?.accessToken;
}

async function main() {
  console.log(`\n=== Paypoq OS full case test @ ${BASE} ===\n`);

  // --- Health ---
  {
    const h = await req("GET", "/health");
    if (h.status === 200 && h.json?.status === "ok") ok("API health");
    else fail("API health", JSON.stringify(h.json));

    const r = await req("GET", "/health/readiness");
    if (r.status === 200) ok("API readiness");
    else fail("API readiness", String(r.status));
  }

  // --- Auth ---
  let owner;
  try {
    owner = await login("owner@paypoq.local");
    ok("Owner login", owner.data?.user?.email || "");
  } catch (e) {
    console.error(
      `SETUP ERROR: acceptance owner is unavailable (${e.message}). Run \`pnpm verify:acceptance-fixture\` after baseline seed, then rerun this suite.`,
    );
    process.exit(2);
  }

  {
    const [productsResponse, stagesResponse, employeesResponse] = await Promise.all([
      req("GET", "/product/products", { token: owner.token }),
      req("GET", "/product/stages", { token: owner.token }),
      req("GET", "/production/lookups/employees", { token: owner.token }),
    ]);
    const products = productsResponse.json?.data ?? [];
    const stages = stagesResponse.json?.data ?? [];
    const employees = employeesResponse.json?.data ?? [];
    const hasVariant = products.some((product) => product.variants?.length > 0);
    const hasAssignedWorker = employees.some(
      (employee) => employee.stageIds?.length > 0 || employee.stages?.length > 0,
    );
    if (!hasVariant || stages.length < 2 || !hasAssignedWorker) {
      console.error(
        "SETUP ERROR: business acceptance fixture is missing. Run `pnpm verify:acceptance-fixture` after baseline seed, then rerun this suite.",
      );
      process.exit(2);
    }
  }

  {
    const me = await req("GET", "/auth/me", { token: owner.token });
    if (me.status === 200 && (me.json?.data?.email || me.json?.email || me.json?.data?.user)) {
      ok("Owner /auth/me");
    } else fail("Owner /auth/me", JSON.stringify(me.json).slice(0, 200));
  }

  const roles = [
    "manager@paypoq.local",
    "seller@paypoq.local",
    "warehouse@paypoq.local",
    "shift@paypoq.local",
    "accountant@paypoq.local",
  ];
  for (const email of roles) {
    try {
      await login(email);
      ok(`Login ${email}`);
    } catch (e) {
      fail(`Login ${email}`, e.message);
    }
  }

  {
    const bad = await req("POST", "/auth/login", {
      body: { email: "owner@paypoq.local", password: "WrongPassword!" },
    });
    if (bad.status === 401 || bad.status === 400) ok("Bad password rejected", String(bad.status));
    else fail("Bad password rejected", String(bad.status));
  }

  // --- RBAC sample: seller cannot write production ---
  try {
    const seller = await login("seller@paypoq.local");
    const denied = await req("POST", "/production/batches", {
      token: seller.token,
      body: { productVariantId: "x", quantity: 1 },
    });
    if (denied.status === 403 || denied.status === 400 || denied.status === 401) {
      ok("RBAC seller blocked from production write", String(denied.status));
    } else {
      fail("RBAC seller blocked from production write", String(denied.status));
    }
  } catch (e) {
    fail("RBAC seller blocked from production write", e.message);
  }

  // --- Dashboard / TV ---
  {
    const ex = await req("GET", "/dashboard/executive-summary", { token: owner.token });
    if (ex.status === 200 && (ex.json?.data || ex.json?.kpis)) ok("Executive summary");
    else fail("Executive summary", String(ex.status));

    const ops = await req("GET", "/production/operations-summary", { token: owner.token });
    if (ops.status === 200) ok("Production operations summary");
    else fail("Production operations summary", String(ops.status));

    const tvToken = loadTvToken();
    if (!tvToken) fail("Factory TV token", "missing from .env");
    else {
      const tv = await req("GET", "/dashboard/factory-tv-summary", {
        headers: { "x-factory-tv-token": tvToken },
      });
      if (tv.status === 200 && (tv.json?.data || tv.json?.factoryName)) ok("Factory TV summary");
      else fail("Factory TV summary", JSON.stringify(tv.json).slice(0, 200));

      const tvBad = await req("GET", "/dashboard/factory-tv-summary");
      if (tvBad.status === 401) ok("Factory TV without token rejected");
      else fail("Factory TV without token rejected", String(tvBad.status));
    }
  }

  // --- Master data reads ---
  const reads = [
    ["/product/products", "Products list"],
    ["/product/colors", "Colors list"],
    ["/product/materials", "Materials list"],
    ["/product/seasons", "Seasons list"],
    ["/product/stages", "Stages list"],
    ["/employees", "Employees list"],
    ["/settings/salary-rates", "Salary rates"],
    ["/settings/overview", "Settings overview"],
  ];
  for (const [p, name] of reads) {
    const r = await req("GET", p, { token: owner.token });
    if (r.status === 200) ok(name);
    else fail(name, String(r.status));
  }

  // --- Production write chain ---
  let productVariantId = null;
  let stageIds = [];
  let employeeId = null;
  try {
    const products = await req("GET", "/product/products", { token: owner.token });
    const list = products.json?.data || products.json || [];
    const arr = Array.isArray(list) ? list : list.data || [];
    for (const p of arr) {
      const v = p.variants?.[0];
      if (v?.id) {
        productVariantId = v.id;
        break;
      }
    }
    const stages = await req("GET", "/product/stages", { token: owner.token });
    const st = stages.json?.data || stages.json || [];
    stageIds = (Array.isArray(st) ? st : [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((s) => s.id);
    const emps = await req("GET", "/production/lookups/employees", {
      token: owner.token,
    });
    const el = emps.json?.data || emps.json || [];
    employeeId = (Array.isArray(el) ? el : []).find((employee) =>
      employee.stages?.some((stage) => stage.id === stageIds[0]),
    )?.id;

    if (!productVariantId || stageIds.length < 2 || !employeeId) {
      fail(
        "Production prerequisites",
        `variant=${productVariantId} stages=${stageIds.length} assignedWorker=${employeeId}`,
      );
    } else {
      ok("Production prerequisites", `variant + ${stageIds.length} stages + assigned worker`);
    }
  } catch (e) {
    fail("Production prerequisites", e.message);
  }

  if (productVariantId && stageIds.length >= 2 && employeeId) {
    const batch = await req("POST", "/production/batches", {
      token: owner.token,
      body: { productVariantId, quantity: 50 },
    });
    if (batch.status === 201 || batch.status === 200) ok("Create production batch qty=50");
    else fail("Create production batch", JSON.stringify(batch.json).slice(0, 250));

    const move = await req("POST", "/production/stage-movements", {
      token: owner.token,
      body: {
        productVariantId,
        sourceStageId: stageIds[0],
        destinationStageId: stageIds[1],
        quantity: 20,
        employeeIds: [employeeId],
        workerShares: [{ employeeId, quantity: 20 }],
      },
    });
    if (move.status === 201 || move.status === 200) ok("Stage movement 20 units");
    else fail("Stage movement", JSON.stringify(move.json).slice(0, 250));

    // negative inventory should fail
    const neg = await req("POST", "/production/stage-movements", {
      token: owner.token,
      body: {
        productVariantId,
        sourceStageId: stageIds[0],
        destinationStageId: stageIds[1],
        quantity: 999999,
        employeeIds: [employeeId],
        workerShares: [{ employeeId, quantity: 999999 }],
      },
    });
    if (neg.status >= 400) ok("Negative stage inventory blocked", String(neg.status));
    else fail("Negative stage inventory blocked", String(neg.status));

    const movementBase = {
      productVariantId,
      sourceStageId: stageIds[0],
      destinationStageId: stageIds[1],
      quantity: 5,
    };
    const invalidWorkerCases = [
      ["Stage movement missing workers rejected", movementBase],
      [
        "Stage movement duplicate workers rejected",
        {
          ...movementBase,
          employeeIds: [employeeId, employeeId],
          workerShares: [{ employeeId, quantity: 5 }],
        },
      ],
      [
        "Stage movement zero worker quantity rejected",
        {
          ...movementBase,
          employeeIds: [employeeId],
          workerShares: [{ employeeId, quantity: 0 }],
        },
      ],
      [
        "Stage movement negative worker quantity rejected",
        {
          ...movementBase,
          employeeIds: [employeeId],
          workerShares: [{ employeeId, quantity: -1 }],
        },
      ],
      [
        "Stage movement mismatched worker total rejected",
        {
          ...movementBase,
          employeeIds: [employeeId],
          workerShares: [{ employeeId, quantity: 4 }],
        },
      ],
    ];
    for (const [name, body] of invalidWorkerCases) {
      const rejected = await req("POST", "/production/stage-movements", {
        token: owner.token,
        body,
      });
      if (rejected.status === 400) ok(name, "400");
      else fail(name, `${rejected.status}: ${JSON.stringify(rejected.json).slice(0, 180)}`);
    }

    if (employeeId) {
      const act = await req("POST", "/production/worker-activities", {
        token: owner.token,
        body: {
          employeeId,
          stageId: stageIds[0],
          productVariantId,
          quantity: 15,
        },
      });
      if (act.status === 201 || act.status === 200) ok("Worker activity recorded");
      else fail("Worker activity", JSON.stringify(act.json).slice(0, 250));

      const def = await req("POST", "/production/defects", {
        token: owner.token,
        body: {
          employeeId,
          stageId: stageIds[0],
          productVariantId,
          quantity: 1,
          reason: "Test brak",
        },
      });
      if (def.status === 201 || def.status === 200) ok("Defect recorded");
      else fail("Defect", JSON.stringify(def.json).slice(0, 250));
    } else {
      skip("Worker activity", "no employee");
      skip("Defect", "no employee");
    }

    const inv = await req("GET", "/production/stage-inventory", { token: owner.token });
    if (inv.status === 200) ok("Stage inventory read");
    else fail("Stage inventory read", String(inv.status));
  }

  // --- Warehouse ---
  {
    const stock = await req("GET", "/warehouse/stock", { token: owner.token });
    if (stock.status === 200) ok("Warehouse stock");
    else fail("Warehouse stock", String(stock.status));

    const mat = await req("GET", "/warehouse/material-stock", { token: owner.token });
    if (mat.status === 200) ok("Material stock");
    else fail("Material stock", String(mat.status));

    const zones = await req("GET", "/warehouse/zones", { token: owner.token });
    if (zones.status === 200) ok("Warehouse zones");
    else fail("Warehouse zones", String(zones.status));

    const mov = await req("GET", "/warehouse/movements", { token: owner.token });
    if (mov.status === 200) ok("Warehouse movements");
    else fail("Warehouse movements", String(mov.status));

    const summary = await req("GET", "/warehouse/stock-summary", { token: owner.token });
    if (summary.status === 200) ok("Warehouse stock summary");
    else fail("Warehouse stock summary", String(summary.status));
  }

  // --- Sales ---
  let clientId = null;
  let orderId = null;
  {
    const clients = await req("GET", "/sales/clients", { token: owner.token });
    if (clients.status === 200) {
      ok("Clients list");
      const list = clients.json?.data || clients.json || [];
      clientId = (Array.isArray(list) ? list : [])[0]?.id;
    } else fail("Clients list", String(clients.status));

    const orders = await req("GET", "/sales/orders", { token: owner.token });
    if (orders.status === 200) {
      ok("Orders list");
      const list = orders.json?.data || orders.json || [];
      orderId = (Array.isArray(list) ? list : []).find((o) => o.status !== "DELIVERED")?.id
        || (Array.isArray(list) ? list : [])[0]?.id;
    } else fail("Orders list", String(orders.status));

    const payments = await req("GET", "/sales/payments", { token: owner.token });
    if (payments.status === 200) ok("Payments list");
    else fail("Payments list", String(payments.status));

    const debts = await req("GET", "/sales/debts", { token: owner.token });
    if (debts.status === 200) ok("Client debts");
    else fail("Client debts", String(debts.status));

    const salesSum = await req("GET", "/sales/summary", { token: owner.token });
    if (salesSum.status === 200) ok("Sales summary");
    else fail("Sales summary", String(salesSum.status));

    // create client + order if we have variant
    if (productVariantId) {
      const c = await req("POST", "/sales/clients", {
        token: owner.token,
        body: {
          name: `Test Client ${Date.now()}`,
          phone: "+998900000099",
        },
      });
      if (c.status === 201 || c.status === 200) {
        ok("Create client");
        clientId = c.json?.data?.id || c.json?.id || clientId;
      } else fail("Create client", JSON.stringify(c.json).slice(0, 200));

      if (clientId) {
        const o = await req("POST", "/sales/orders", {
          token: owner.token,
          body: {
            clientId,
            items: [{ productVariantId, quantity: 5, unitPrice: "10000" }],
          },
        });
        if (o.status === 201 || o.status === 200) {
          ok("Create order");
          orderId = o.json?.data?.id || o.json?.id || orderId;
          const order = o.json?.data || o.json;
          const total = order?.totalAmount || order?.total || "50000";

          // Delivery does not require payment — only finished stock.
          const delUnpaid = await req("POST", `/sales/orders/${orderId}/deliver`, {
            token: owner.token,
            body: {
              deliveryCost: "2500",
              deliveryCostNote: "manual case logistics",
            },
          });
          if (delUnpaid.status === 201 || delUnpaid.status === 200) {
            ok("Deliver order without requiring payment");
          } else {
            const msg = JSON.stringify(delUnpaid.json).slice(0, 280);
            if (
              delUnpaid.status >= 400 &&
              /stock|inventory|ombor|qoldiq|available|Finished/i.test(msg)
            ) {
              ok(
                "Deliver blocked by stock only (payment not required)",
                String(delUnpaid.status),
              );
            } else fail("Deliver order", msg);
          }

          // Client payment is independent debt collection
          const pay = await req("POST", "/sales/payments", {
            token: owner.token,
            body: {
              clientId,
              amount: String(total),
              method: "CASH",
              allocations: [{ orderId, amount: String(total) }],
            },
          });
          if (pay.status === 201 || pay.status === 200) ok("Create full payment for order");
          else fail("Create full payment for order", JSON.stringify(pay.json).slice(0, 300));
        } else fail("Create order", JSON.stringify(o.json).slice(0, 300));
      }
    }
  }

  // --- Payroll period create/calculate ---
  {
    // month format YYYY-MM; use far future to avoid seed conflict
    const month = `2099-${String((Date.now() % 12) + 1).padStart(2, "0")}`;
    const period = await req("POST", "/finance/payroll-periods", {
      token: owner.token,
      body: { month },
    });
    if (period.status === 201 || period.status === 200) {
      ok("Create payroll period");
      const periodId = period.json?.data?.id || period.json?.id;
      if (periodId) {
        const calc = await req("POST", `/finance/payroll-periods/${periodId}/calculate`, {
          token: owner.token,
          body: {},
        });
        if (calc.status === 201 || calc.status === 200) ok("Calculate payroll period");
        else fail("Calculate payroll period", JSON.stringify(calc.json).slice(0, 250));

        const items = await req("GET", `/finance/payroll-periods/${periodId}/items`, {
          token: owner.token,
        });
        if (items.status === 200) ok("Payroll period items");
        else fail("Payroll period items", String(items.status));
      }
    } else {
      if (period.status === 409) ok("Create payroll period (already exists)", "409");
      else fail("Create payroll period", JSON.stringify(period.json).slice(0, 250));
    }
  }

  // --- Supplier / finance ---
  {
    const sup = await req("GET", "/supplier/suppliers", { token: owner.token });
    if (sup.status === 200) ok("Suppliers list");
    else fail("Suppliers list", String(sup.status));

    const purch = await req("GET", "/supplier/purchases", { token: owner.token });
    if (purch.status === 200) ok("Supplier purchases");
    else fail("Supplier purchases", String(purch.status));

    const spay = await req("GET", "/supplier/payments", { token: owner.token });
    if (spay.status === 200) ok("Supplier payments");
    else fail("Supplier payments", String(spay.status));

    const sdebt = await req("GET", "/supplier/debts", { token: owner.token });
    if (sdebt.status === 200) ok("Supplier debts");
    else fail("Supplier debts", String(sdebt.status));

    const fin = await req("GET", "/finance/summary", { token: owner.token });
    if (fin.status === 200) ok("Finance summary");
    else fail("Finance summary", String(fin.status));

    const adv = await req("GET", "/finance/advances", { token: owner.token });
    if (adv.status === 200) ok("Advances list");
    else fail("Advances list", String(adv.status));

    const exp = await req("GET", "/finance/expenses", { token: owner.token });
    if (exp.status === 200) ok("Expenses list");
    else fail("Expenses list", String(exp.status));

    const pay = await req("GET", "/finance/payroll-periods", { token: owner.token });
    if (pay.status === 200) ok("Payroll periods");
    else fail("Payroll periods", String(pay.status));
  }

  // --- Reports / org ---
  {
    const rep = await req("GET", "/reports/overview", { token: owner.token });
    if (rep.status === 200) ok("Reports overview");
    else fail("Reports overview", String(rep.status));

    const fac = await req("GET", "/organization/factories", { token: owner.token });
    if (fac.status === 200) ok("Organization factories");
    else fail("Organization factories", String(fac.status));

    const users = await req("GET", "/organization/users", { token: owner.token });
    if (users.status === 200) ok("Organization users");
    else fail("Organization users", String(users.status));
  }

  // --- Platform admin ---
  try {
    const ptoken = await platformLogin();
    if (ptoken) ok("Platform admin login");
    else fail("Platform admin login", "no token");

    const tenants = await req("GET", "/platform-admin/tenants", { token: ptoken });
    if (tenants.status === 200) ok("Platform tenants list");
    else fail("Platform tenants list", String(tenants.status));
  } catch (e) {
    fail("Platform admin", e.message);
  }

  // --- Telegram health (no real bot token needed) ---
  {
    const th = await req("GET", "/telegram/health", { token: owner.token });
    if (th.status === 200 || th.status === 403 || th.status === 401) {
      // may require permission
      if (th.status === 200) ok("Telegram health");
      else ok("Telegram health endpoint reachable", String(th.status));
    } else fail("Telegram health", String(th.status));
  }

  printSummary();
}

function printSummary() {
  const pass = results.filter((r) => r.status === "PASS").length;
  const failN = results.filter((r) => r.status === "FAIL").length;
  const skipN = results.filter((r) => r.status === "SKIP").length;
  console.log("\n=== SUMMARY ===");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${failN}`);
  console.log(`SKIP: ${skipN}`);
  console.log(`TOTAL: ${results.length}`);
  if (failN) {
    console.log("\nFailed cases:");
    for (const r of results.filter((x) => x.status === "FAIL")) {
      console.log(` - ${r.name}: ${r.detail}`);
    }
  }
  process.exit(failN ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
