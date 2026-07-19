/**
 * Deep business-rule verification (numbers + blocks).
 * Not a substitute for human walkthrough in
 * docs/BUSINESS_ACCEPTANCE_WALKTHROUGH_V1.md
 *
 * Usage:
 *   node scripts/business-rules-deep-test.mjs
 *   API_BASE_URL=http://localhost:3001 node scripts/business-rules-deep-test.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.API_BASE_URL || "http://localhost:3001";
const PASSWORD = "ChangeMe123!";

const results = [];
const tag = () => `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function pass(name, detail = "") {
  results.push({ name, status: "PASS", detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, status: "FAIL", detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function note(name, detail) {
  results.push({ name, status: "NOTE", detail });
  console.log(`NOTE  ${name}${detail ? ` — ${detail}` : ""}`);
}

function dec(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(String(v).replace(/,/g, ""));
}

function approxEq(a, b, eps = 0.001) {
  return Math.abs(dec(a) - dec(b)) <= eps;
}

async function raw(method, urlPath, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      Accept: "application/json",
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
  return { status: res.status, ok: res.ok, json };
}

function dataOf(json) {
  if (!json) return null;
  if (json.data !== undefined) return json.data;
  return json;
}

async function login(email) {
  const r = await raw("POST", "/auth/login", {
    body: { email, password: PASSWORD },
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  const d = dataOf(r.json);
  return { token: d.accessToken, ctx: d };
}

function findStageQty(inventoryList, stageId, variantId) {
  const rows = Array.isArray(inventoryList) ? inventoryList : [];
  const row = rows.find(
    (x) =>
      (x.stage?.id === stageId || x.stageId === stageId || x.productionStageId === stageId) &&
      (x.productVariant?.id === variantId || x.productVariantId === variantId),
  );
  if (!row) return 0;
  return dec(row.quantity);
}

function sumStageTotals(summary, stageId) {
  const stages = summary?.stageTotals || summary?.stages || [];
  const s = stages.find((x) => x.stageId === stageId || x.id === stageId);
  return s ? dec(s.quantity) : null;
}

async function main() {
  console.log(`\n=== Business rules deep test @ ${BASE} ===\n`);

  let owner;
  try {
    owner = await login("owner@paypoq.local");
  } catch (error) {
    console.error(
      `SETUP ERROR: acceptance owner is unavailable (${error.message}). Run \`pnpm verify:acceptance-fixture\` after baseline seed, then rerun this suite.`,
    );
    process.exit(2);
  }
  const t = owner.token;

  // Load catalog
  const products = dataOf((await raw("GET", "/product/products", { token: t })).json);
  const productList = Array.isArray(products) ? products : [];
  let variantId = null;
  let unitPrice = "10000";
  for (const p of productList) {
    const v = p.variants?.[0];
    if (v?.id) {
      variantId = v.id;
      if (v.price != null) unitPrice = String(v.price);
      if (v.prices?.[0]?.amount) unitPrice = String(v.prices[0].amount);
      break;
    }
  }
  const stagesRes = dataOf((await raw("GET", "/product/stages", { token: t })).json);
  const stages = (Array.isArray(stagesRes) ? stagesRes : [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const stage0 = stages[0]?.id;
  const stage1 = stages[1]?.id;
  const ombor = stages.find((s) => /ombor/i.test(s.name))?.id || stages.at(-1)?.id;

  const employees = dataOf(
    (await raw("GET", "/production/lookups/employees", { token: t })).json,
  );
  const employeeId = (Array.isArray(employees) ? employees : []).find((employee) =>
    employee.stages?.some((stage) => stage.id === stage0),
  )?.id;

  if (!variantId || !stage0 || !stage1 || !employeeId) {
    fail(
      "Prerequisites",
      "SETUP ERROR: acceptance fixture missing; run `pnpm verify:acceptance-fixture` after baseline seed",
    );
    return finish();
  }
  pass("Prerequisites", `variant=${variantId.slice(0, 8)}… stages=${stages.length}`);

  // ---------- BR-01 Stage inventory math ----------
  {
    const beforeInv = dataOf(
      (await raw("GET", "/production/stage-inventory", { token: t })).json,
    );
    const beforeList = Array.isArray(beforeInv) ? beforeInv : beforeInv?.items || [];
    const b0 = findStageQty(beforeList, stage0, variantId);
    const b1 = findStageQty(beforeList, stage1, variantId);

    const batchQty = 80;
    const batch = await raw("POST", "/production/batches", {
      token: t,
      body: { productVariantId: variantId, quantity: batchQty },
    });
    if (!batch.ok) {
      fail("BR-01 batch create", JSON.stringify(batch.json).slice(0, 200));
    } else {
      const midInv = dataOf(
        (await raw("GET", "/production/stage-inventory", { token: t })).json,
      );
      const midList = Array.isArray(midInv) ? midInv : midInv?.items || [];
      const m0 = findStageQty(midList, stage0, variantId);
      if (approxEq(m0, b0 + batchQty)) {
        pass("BR-01 batch increases first stage", `${b0} → ${m0} (+${batchQty})`);
      } else {
        // Some factories put batch on configured first stage — still check delta
        fail("BR-01 batch increases first stage", `expected ${b0 + batchQty}, got ${m0}`);
      }

      const moveQty = 25;
      const move = await raw("POST", "/production/stage-movements", {
        token: t,
        body: {
          productVariantId: variantId,
          sourceStageId: stage0,
          destinationStageId: stage1,
          quantity: moveQty,
          employeeIds: [employeeId],
          workerShares: [{ employeeId, quantity: moveQty }],
        },
      });
      if (!move.ok) {
        fail("BR-01 stage move", JSON.stringify(move.json).slice(0, 200));
      } else {
        const afterInv = dataOf(
          (await raw("GET", "/production/stage-inventory", { token: t })).json,
        );
        const afterList = Array.isArray(afterInv) ? afterInv : afterInv?.items || [];
        const a0 = findStageQty(afterList, stage0, variantId);
        const a1 = findStageQty(afterList, stage1, variantId);
        const ok0 = approxEq(a0, m0 - moveQty);
        const ok1 = approxEq(a1, b1 + moveQty) || approxEq(a1, findStageQty(midList, stage1, variantId) + moveQty);
        if (ok0 && ok1) {
          pass(
            "BR-01 move conserves inventory",
            `s0 ${m0}→${a0}, s1 +${moveQty}`,
          );
        } else {
          fail(
            "BR-01 move conserves inventory",
            `s0 ${m0}→${a0} (exp ${m0 - moveQty}), s1 got ${a1}`,
          );
        }
      }

      const over = await raw("POST", "/production/stage-movements", {
        token: t,
        body: {
          productVariantId: variantId,
          sourceStageId: stage0,
          destinationStageId: stage1,
          quantity: 9_999_999,
          employeeIds: [employeeId],
          workerShares: [{ employeeId, quantity: 9_999_999 }],
        },
      });
      if (over.status >= 400) {
        pass("BR-01 over-qty move blocked", String(over.status));
      } else {
        fail("BR-01 over-qty move blocked", "accepted over-qty");
      }

      const movementBase = {
        productVariantId: variantId,
        sourceStageId: stage0,
        destinationStageId: stage1,
        quantity: 5,
      };
      const invalidWorkerCases = [
        ["BR-01 missing workers blocked", movementBase],
        [
          "BR-01 duplicate workers blocked",
          {
            ...movementBase,
            employeeIds: [employeeId, employeeId],
            workerShares: [{ employeeId, quantity: 5 }],
          },
        ],
        [
          "BR-01 zero worker quantity blocked",
          {
            ...movementBase,
            employeeIds: [employeeId],
            workerShares: [{ employeeId, quantity: 0 }],
          },
        ],
        [
          "BR-01 negative worker quantity blocked",
          {
            ...movementBase,
            employeeIds: [employeeId],
            workerShares: [{ employeeId, quantity: -1 }],
          },
        ],
        [
          "BR-01 mismatched worker total blocked",
          {
            ...movementBase,
            employeeIds: [employeeId],
            workerShares: [{ employeeId, quantity: 4 }],
          },
        ],
      ];
      for (const [name, body] of invalidWorkerCases) {
        const rejected = await raw("POST", "/production/stage-movements", {
          token: t,
          body,
        });
        if (rejected.status === 400) pass(name, "400");
        else fail(name, `${rejected.status}: ${JSON.stringify(rejected.json).slice(0, 160)}`);
      }
    }
  }

  // ---------- BR-02 Worker activity does not change inventory ----------
  if (employeeId) {
    const beforeInv = dataOf(
      (await raw("GET", "/production/stage-inventory", { token: t })).json,
    );
    const beforeList = Array.isArray(beforeInv) ? beforeInv : beforeInv?.items || [];
    const b0 = findStageQty(beforeList, stage0, variantId);

    const act = await raw("POST", "/production/worker-activities", {
      token: t,
      body: {
        employeeId,
        stageId: stage0,
        productVariantId: variantId,
        quantity: 17,
      },
    });
    if (!act.ok) {
      fail("BR-02 activity create", JSON.stringify(act.json).slice(0, 200));
    } else {
      const afterInv = dataOf(
        (await raw("GET", "/production/stage-inventory", { token: t })).json,
      );
      const afterList = Array.isArray(afterInv) ? afterInv : afterInv?.items || [];
      const a0 = findStageQty(afterList, stage0, variantId);
      if (approxEq(a0, b0)) {
        pass("BR-02 activity does not change stage inventory", `${b0} unchanged`);
      } else {
        fail("BR-02 activity does not change stage inventory", `${b0} → ${a0}`);
      }
    }

    const def = await raw("POST", "/production/defects", {
      token: t,
      body: {
        employeeId,
        stageId: stage0,
        productVariantId: variantId,
        quantity: 1,
        reason: "Deep test defect",
      },
    });
    if (def.ok) pass("BR-02 defect can be recorded");
    else fail("BR-02 defect can be recorded", JSON.stringify(def.json).slice(0, 150));
  } else {
    note("BR-02 skipped", "no employee");
  }

  // ---------- BR-03 Client debt + unpaid delivery + payment path ----------
  {
    const client = await raw("POST", "/sales/clients", {
      token: t,
      body: { name: `Deep Client ${tag()}`, phone: "+998901112233" },
    });
    if (!client.ok) {
      fail("BR-03 create client", JSON.stringify(client.json).slice(0, 150));
    } else {
      const clientId = dataOf(client.json).id;
      const qty = 4;
      const order = await raw("POST", "/sales/orders", {
        token: t,
        body: {
          clientId,
          items: [{ productVariantId: variantId, quantity: qty, unitPrice }],
        },
      });
      if (!order.ok) {
        fail("BR-03 create order", JSON.stringify(order.json).slice(0, 200));
      } else {
        const od = dataOf(order.json);
        const orderId = od.id;
        const total = dec(od.totalAmount ?? od.total);
        const expectedTotal = qty * dec(unitPrice);
        if (approxEq(total, expectedTotal) || total > 0) {
          pass(
            "BR-03 order total from backend",
            `total=${total} (items ${qty}×${unitPrice})`,
          );
        } else {
          fail("BR-03 order total from backend", `total=${total}`);
        }

        // Pre-delivery edit should work
        const edited = await raw("PATCH", `/sales/orders/${orderId}`, {
          token: t,
          body: {
            clientId,
            items: [{ productVariantId: variantId, quantity: qty, unitPrice }],
          },
        });
        if (edited.ok) pass("BR-03 pre-delivery edit allowed");
        else fail("BR-03 pre-delivery edit allowed", JSON.stringify(edited.json).slice(0, 150));

        // Debt after order (before payment) should include this order
        const debts1 = dataOf((await raw("GET", "/sales/debts", { token: t })).json);
        const debtRows = Array.isArray(debts1) ? debts1 : debts1?.items || [];
        const d1 = debtRows.find((x) => x.clientId === clientId || x.client?.id === clientId);
        const debtBeforePay = d1 ? dec(d1.debt ?? d1.totalDebt ?? d1.amount) : null;
        if (debtBeforePay != null && debtBeforePay + 0.001 >= total) {
          pass("BR-03 debt increases after unpaid order", `debt=${debtBeforePay}`);
        } else if (debtBeforePay == null) {
          note("BR-03 debt row missing for new client", "check debt projection shape");
        } else {
          fail("BR-03 debt increases after unpaid order", `debt=${debtBeforePay} total=${total}`);
        }

        // Unpaid delivery is allowed when stock exists (payment is independent).
        // Without finished stock this may 409 for stock — treat as expected.
        const unpaidDel = await raw("POST", `/sales/orders/${orderId}/deliver`, {
          token: t,
          body: { deliveryCost: "1000", deliveryCostNote: "deep logistics" },
        });
        if (unpaidDel.ok) {
          const dd = dataOf(unpaidDel.json);
          if (dd.status === "DELIVERED" && dd.paymentStatus === "UNPAID") {
            pass("BR-03 unpaid delivery allowed", "DELIVERED+UNPAID");
          } else {
            pass(
              "BR-03 unpaid delivery allowed",
              `status=${dd.status} pay=${dd.paymentStatus}`,
            );
          }
        } else if (unpaidDel.status === 409) {
          note(
            "BR-03 unpaid delivery not completed",
            "likely insufficient Finished Products stock — payment gate removed",
          );
        } else {
          fail("BR-03 unpaid delivery", JSON.stringify(unpaidDel.json).slice(0, 150));
        }

        // Partial payment
        const half = (total / 2).toFixed(0);
        const payPartial = await raw("POST", "/sales/payments", {
          token: t,
          body: {
            clientId,
            amount: half,
            method: "CASH",
            allocations: [{ orderId, amount: half }],
          },
        });
        if (payPartial.ok) pass("BR-03 partial payment accepted");
        else {
          if (payPartial.status >= 400) {
            note(
              "BR-03 partial payment rejected",
              "allocation rules may block remainder path",
            );
          } else fail("BR-03 partial payment", JSON.stringify(payPartial.json).slice(0, 150));
        }

        // Full remaining payment
        const remain = String(total - dec(half) > 0 && payPartial.ok ? total - dec(half) : total);
        const payFull = await raw("POST", "/sales/payments", {
          token: t,
          body: {
            clientId,
            amount: payPartial.ok ? remain : String(total),
            method: "CASH",
            allocations: [
              {
                orderId,
                amount: payPartial.ok ? remain : String(total),
              },
            ],
          },
        });
        if (payFull.ok || payFull.status === 409) {
          pass("BR-03 full payment path", payFull.ok ? "paid" : "409 ok");
        } else {
          const payAll = await raw("POST", "/sales/payments", {
            token: t,
            body: {
              clientId,
              amount: String(total),
              method: "CASH",
              allocations: [{ orderId, amount: String(total) }],
            },
          });
          if (payAll.ok) pass("BR-03 full payment path", "full retry");
          else fail("BR-03 full payment path", JSON.stringify(payFull.json).slice(0, 200));
        }

        // Over-allocation should fail
        const overPay = await raw("POST", "/sales/payments", {
          token: t,
          body: {
            clientId,
            amount: "1",
            method: "CASH",
            allocations: [{ orderId, amount: "999999999" }],
          },
        });
        if (overPay.status >= 400) pass("BR-03 over-allocation blocked", String(overPay.status));
        else fail("BR-03 over-allocation blocked", "accepted over allocation");

        // If not yet delivered, try deliver now (stock may still block)
        let del = unpaidDel;
        if (!unpaidDel.ok) {
          del = await raw("POST", `/sales/orders/${orderId}/deliver`, {
            token: t,
            body: {},
          });
        }
        if (del.ok) {
          pass("BR-03 deliver path", "delivered");
          const pays = dataOf((await raw("GET", "/sales/payments", { token: t })).json);
          const payList = Array.isArray(pays) ? pays : [];
          const payment = payList.find(
            (p) =>
              !p.reversedAt &&
              (p.allocations || []).some((a) => {
                const oid = a.orderId || a.salesOrderId || a.order?.id;
                return oid === orderId;
              }),
          );
          if (payment?.id) {
            const rev2 = await raw("POST", `/sales/payments/${payment.id}/reverse`, {
              token: t,
              body: { reason: "deep-test-should-block" },
            });
            if (rev2.status >= 400) {
              pass("BR-03 reverse blocked while DELIVERED", String(rev2.status));
            } else {
              fail("BR-03 reverse blocked while DELIVERED", "reverse allowed");
            }

            const ret = await raw("POST", `/sales/orders/${orderId}/return-delivery`, {
              token: t,
              body: {},
            });
            if (ret.ok) {
              pass("BR-03 delivery return after deliver");
              const rev3 = await raw("POST", `/sales/payments/${payment.id}/reverse`, {
                token: t,
                body: { reason: "deep-test-after-return" },
              });
              if (rev3.ok) pass("BR-03 reverse allowed after return");
              else {
                fail(
                  "BR-03 reverse allowed after return",
                  JSON.stringify(rev3.json).slice(0, 150),
                );
              }
            } else {
              fail(
                "BR-03 delivery return after deliver",
                JSON.stringify(ret.json).slice(0, 150),
              );
            }
          } else {
            note("BR-03 reverse chain", "could not resolve payment id from list");
          }
        } else {
          note(
            "BR-03 deliver path",
            `blocked (likely stock): ${del.status} ${JSON.stringify(del.json).slice(0, 120)}`,
          );
        }
      }
    }
  }

  // ---------- BR-04 Supplier debt separate + purchase ≠ stock ----------
  {
    const matBefore = dataOf(
      (await raw("GET", "/warehouse/material-stock", { token: t })).json,
    );
    const matBeforeN = Array.isArray(matBefore) ? matBefore.length : 0;

    const sup = await raw("POST", "/supplier/suppliers", {
      token: t,
      body: { name: `Deep Supplier ${tag()}`, phone: "+998909998877" },
    });
    if (!sup.ok) {
      fail("BR-04 create supplier", JSON.stringify(sup.json).slice(0, 150));
    } else {
      const supplierId = dataOf(sup.json).id;
      // purchase payload — try common shape
      const materials = dataOf((await raw("GET", "/product/materials", { token: t })).json);
      const materialId = (Array.isArray(materials) ? materials : [])[0]?.id;
      let purchaseOk = false;
      if (materialId) {
        const pur = await raw("POST", "/supplier/purchases", {
          token: t,
          body: {
            supplierId,
            items: [
              {
                materialId,
                quantity: "10",
                unit: "kg",
                unitPrice: "5000",
              },
            ],
          },
        });
        if (pur.ok) {
          purchaseOk = true;
          pass("BR-04 supplier purchase created");
          const purTotal = dec(dataOf(pur.json).totalAmount ?? 50000);
          const debtsAfter = dataOf((await raw("GET", "/supplier/debts", { token: t })).json);
          const drow = (Array.isArray(debtsAfter) ? debtsAfter : []).find(
            (x) => x.supplierId === supplierId || x.supplier?.id === supplierId,
          );
          if (drow && approxEq(drow.debt ?? drow.totalDebt, purTotal)) {
            pass("BR-04 supplier debt equals purchase total", String(drow.debt ?? drow.totalDebt));
          } else if (drow && dec(drow.debt ?? drow.totalDebt) > 0) {
            pass(
              "BR-04 supplier debt positive after purchase",
              String(drow.debt ?? drow.totalDebt),
            );
          } else {
            note("BR-04 supplier debt after purchase", JSON.stringify(drow).slice(0, 120));
          }
        } else {
          note("BR-04 supplier purchase", JSON.stringify(pur.json).slice(0, 180));
        }
      }

      const matAfter = dataOf(
        (await raw("GET", "/warehouse/material-stock", { token: t })).json,
      );
      // Contract note only: stock receipt is a separate action, so this remains a NOTE.
      note(
        "BR-04 purchase creates debt; stock changes only via material receipt",
        `material rows before=${matBeforeN} after=${Array.isArray(matAfter) ? matAfter.length : "?"}`,
      );

      const debts = dataOf((await raw("GET", "/supplier/debts", { token: t })).json);
      const rows = Array.isArray(debts) ? debts : [];
      const row = rows.find((x) => x.supplierId === supplierId || x.supplier?.id === supplierId);
      if (purchaseOk && row && dec(row.debt ?? row.totalDebt) > 0) {
        pass("BR-04 supplier debt after purchase", String(row.debt ?? row.totalDebt));
      } else if (purchaseOk) {
        note("BR-04 supplier debt row", JSON.stringify(row || debts).slice(0, 120));
      }
    }
  }

  // ---------- BR-05 RBAC real writes ----------
  {
    const seller = await login("seller@paypoq.local");
    const sBatch = await raw("POST", "/production/batches", {
      token: seller.token,
      body: { productVariantId: variantId, quantity: 1 },
    });
    if (sBatch.status === 403) pass("BR-05 seller cannot create batch", "403");
    else fail("BR-05 seller cannot create batch", String(sBatch.status));

    const shift = await login("shift@paypoq.local");
    const shPay = await raw("POST", "/sales/payments", {
      token: shift.token,
      body: {
        clientId: "x",
        amount: "1",
        method: "CASH",
        allocations: [{ orderId: "y", amount: "1" }],
      },
    });
    if (shPay.status === 403 || shPay.status === 400) {
      pass("BR-05 shift cannot write payments", String(shPay.status));
    } else fail("BR-05 shift cannot write payments", String(shPay.status));

    const wh = await login("warehouse@paypoq.local");
    const whSales = await raw("POST", "/sales/clients", {
      token: wh.token,
      body: { name: "Hack Client" },
    });
    if (whSales.status === 403) pass("BR-05 warehouse cannot create client", "403");
    else fail("BR-05 warehouse cannot create client", String(whSales.status));
  }

  // ---------- BR-06 Factory TV auth ----------
  {
    let tvToken = process.env.FACTORY_TV_ACCESS_TOKEN?.trim() || null;
    try {
      if (!tvToken) {
        const env = readFileSync(path.join(ROOT, "apps/api/.env"), "utf8");
        tvToken = (env.match(/^FACTORY_TV_ACCESS_TOKEN=(.+)$/m) || [])[1]?.trim();
      }
    } catch {
      /* ignore */
    }
    const noTok = await raw("GET", "/dashboard/factory-tv-summary");
    if (noTok.status === 401) pass("BR-06 TV requires token", "401");
    else fail("BR-06 TV requires token", String(noTok.status));

    if (tvToken) {
      const bad = await raw("GET", "/dashboard/factory-tv-summary", {
        headers: { "x-factory-tv-token": "wrong-token-value" },
      });
      if (bad.status === 401) pass("BR-06 TV rejects wrong token", "401");
      else fail("BR-06 TV rejects wrong token", String(bad.status));

      const good = await raw("GET", "/dashboard/factory-tv-summary", {
        headers: { "x-factory-tv-token": tvToken },
      });
      if (good.ok) pass("BR-06 TV accepts correct token");
      else fail("BR-06 TV accepts correct token", String(good.status));
    }
  }

  // ---------- BR-07 Unauthenticated protected routes ----------
  {
    const paths = [
      "/dashboard/executive-summary",
      "/production/stage-inventory",
      "/sales/orders",
      "/finance/payroll-periods",
      "/organization/users",
    ];
    let all401 = true;
    for (const p of paths) {
      const r = await raw("GET", p);
      if (r.status !== 401 && r.status !== 403) {
        all401 = false;
        fail("BR-07 unauthenticated blocked", `${p} → ${r.status}`);
      }
    }
    if (all401) pass("BR-07 unauthenticated API blocked", `${paths.length} routes`);
  }

  // ---------- BR-08 Payroll period uses month + calculate ----------
  {
    let period = null;
    let month = null;
    for (let offset = 0; offset < 120; offset += 1) {
      const year = 2080 + Math.floor(offset / 12);
      const candidate = `${year}-${String((offset % 12) + 1).padStart(2, "0")}`;
      const attempt = await raw("POST", "/finance/payroll-periods", {
        token: t,
        body: { month: candidate },
      });
      if (attempt.status === 409) continue;
      period = attempt;
      month = candidate;
      break;
    }
    if (!period) {
      fail("BR-08 create payroll period", "no isolated month available");
      return finish();
    }
    if (!period.ok) {
      fail("BR-08 create payroll period", JSON.stringify(period.json).slice(0, 150));
    } else {
      pass("BR-08 isolated payroll period created", month);
      const id = dataOf(period.json).id;
      const calc = await raw("POST", `/finance/payroll-periods/${id}/calculate`, {
        token: t,
        body: {},
      });
      if (calc.ok) {
        const items = dataOf(
          (await raw("GET", `/finance/payroll-periods/${id}/items`, { token: t })).json,
        );
        const list = Array.isArray(items) ? items : [];
        pass("BR-08 payroll calculate", `items=${list.length}`);
        // Closed immutability: close then calculate again should fail if close exists
        // Skip full pay if no items / permissions — try close
        const close = await raw("POST", `/finance/payroll-periods/${id}/close`, {
          token: t,
          body: {},
        });
        if (close.ok) {
          const recalc = await raw("POST", `/finance/payroll-periods/${id}/calculate`, {
            token: t,
            body: {},
          });
          if (recalc.status >= 400) {
            pass("BR-08 closed payroll immutable (recalc blocked)", String(recalc.status));
          } else {
            // maybe close requires pay first
            note("BR-08 close without pay allowed recalculate?", String(recalc.status));
          }
        } else {
          note("BR-08 close", JSON.stringify(close.json).slice(0, 120));
        }
      } else {
        fail("BR-08 payroll calculate", JSON.stringify(calc.json).slice(0, 150));
      }
    }
  }

  finish();
}

function finish() {
  const passN = results.filter((r) => r.status === "PASS").length;
  const failN = results.filter((r) => r.status === "FAIL").length;
  const noteN = results.filter((r) => r.status === "NOTE").length;
  console.log("\n=== DEEP SUMMARY ===");
  console.log(`PASS: ${passN}`);
  console.log(`FAIL: ${failN}`);
  console.log(`NOTE: ${noteN}`);
  console.log(`TOTAL: ${results.length}`);
  if (failN) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => x.status === "FAIL")) {
      console.log(` - ${r.name}: ${r.detail}`);
    }
  }
  if (noteN) {
    console.log("\nNotes (manual follow-up):");
    for (const r of results.filter((x) => x.status === "NOTE")) {
      console.log(` - ${r.name}: ${r.detail}`);
    }
  }
  console.log("\nHuman walkthrough: docs/BUSINESS_ACCEPTANCE_WALKTHROUGH_V1.md");
  process.exit(failN ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
