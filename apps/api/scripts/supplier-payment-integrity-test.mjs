import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const API = process.env.API_BASE_URL || 'http://localhost:3001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:55432/paypoq_os?schema=public';

async function login() {
  const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@paypoq.local', password: 'ChangeMe123!' }) });
  assert.equal(response.status, 200, 'acceptance owner login failed');
  const session = (await response.json()).data;
  return { headers: { accept: 'application/json', authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json', 'x-factory-id': session.activeFactoryId }, session };
}

async function api(path, headers, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) }, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function paymentHeaders(headers, key) { return { ...headers, 'idempotency-key': key }; }
function uuid() { return randomUUID(); }

async function runInParallel(tasks) {
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  const running = tasks.map((task) => (async () => { await barrier; return task(); })());
  release();
  return Promise.all(running);
}

async function runIntegritySuite() {
  const { headers, session } = await login();
  const db = new pg.Client({ connectionString: DATABASE_URL }); await db.connect();
  const createdSupplierIds = [];
  const createdPurchaseIds = [];
  const startedAt = new Date();
  const createSupplier = async (name) => {
    const result = await api('/supplier/suppliers', headers, { method: 'POST', body: { name } }); assert.equal(result.status, 201); createdSupplierIds.push(result.body.data.id); return result.body.data;
  };
  const materials = await api('/product/materials', headers); const material = materials.body.data[0]; assert.ok(material);
  const createPurchase = async (supplierId, amount) => {
    const result = await api('/supplier/purchases', headers, { method: 'POST', body: { supplierId, items: [{ materialId: material.id, quantity: '1.000', unit: 'kg', unitPrice: amount }] } }); assert.equal(result.status, 201); createdPurchaseIds.push(result.body.data.id); return result.body.data;
  };
  const pay = (payload, key = uuid()) => api('/supplier/payments', paymentHeaders(headers, key), { method: 'POST', body: payload });
  const paymentPayload = (supplierId, amount, allocations) => ({ supplierId, amount, method: 'TRANSFER', paymentDate: '2026-07-31', note: 'supplier integrity test', allocations });
  const purchaseStatus = async (id) => (await db.query('SELECT "paymentStatus" FROM "SupplierPurchase" WHERE id = $1', [id])).rows[0]?.paymentStatus;
  const allocated = async (id) => (await db.query('SELECT COALESCE(SUM(amount), 0)::text AS total FROM "SupplierPaymentAllocation" WHERE "purchaseId" = $1', [id])).rows[0].total;
  const purchasePaymentCount = async (id) => (await db.query('SELECT count(DISTINCT "paymentId")::int AS count FROM "SupplierPaymentAllocation" WHERE "purchaseId" = $1', [id])).rows[0].count;
  const purchaseAuditCount = async (id) => (await db.query(`SELECT count(*)::int AS count FROM "AuditLog" WHERE "entityId" = $1 AND action = 'SUPPLIER_PURCHASE_PAYMENT_STATUS_UPDATED'`, [id])).rows[0].count;

  try {
    const supplier = await createSupplier(`Integrity ${uuid().slice(0, 8)}`);
    const otherSupplier = await createSupplier(`Other ${uuid().slice(0, 8)}`);

    const normal = await createPurchase(supplier.id, '100.00');
    const normalKey = uuid();
    const partialPayload = paymentPayload(supplier.id, '40.00', [{ purchaseId: normal.id, amount: '40.00' }]);
    assert.equal((await api('/supplier/payments', headers, { method: 'POST', body: partialPayload })).status, 400);
    assert.equal((await api('/supplier/payments', { ...headers, 'idempotency-key': 'not-a-uuid' }, { method: 'POST', body: partialPayload })).status, 400);
    const partial = await pay(partialPayload, normalKey); assert.equal(partial.status, 201); assert.equal(await purchaseStatus(normal.id), 'PARTIALLY_PAID');
    const replay = await pay(partialPayload, normalKey); assert.equal(replay.status, 201); assert.equal(replay.body.data.id, partial.body.data.id);
    const normalizedReplay = await pay(paymentPayload(supplier.id, '40', [{ purchaseId: normal.id, amount: '40.0' }]), normalKey); assert.equal(normalizedReplay.status, 201); assert.equal(normalizedReplay.body.data.id, partial.body.data.id);
    const paymentAuditCount = await db.query(`SELECT count(*)::int AS count FROM "AuditLog" WHERE "entityId" = $1 AND action IN ('SUPPLIER_PAYMENT_CREATED','SUPPLIER_PAYMENT_ALLOCATED')`, [partial.body.data.id]);
    assert.equal(paymentAuditCount.rows[0].count, 2, 'idempotent replay duplicated audit events');
    const changedPayload = { ...partialPayload, note: 'different payload' };
    assert.equal((await pay(changedPayload, normalKey)).status, 409);
    const final = await pay(paymentPayload(supplier.id, '60.00', [{ purchaseId: normal.id, amount: '60.00' }])); assert.equal(final.status, 201); assert.equal(await purchaseStatus(normal.id), 'PAID'); assert.equal(await allocated(normal.id), '100.00');
    console.log('PASS normal, partial, exact-final, idempotent replay, fingerprint conflict, and audit uniqueness');

    const multiA = await createPurchase(supplier.id, '30.00'); const multiB = await createPurchase(supplier.id, '20.00');
    const multi = await pay(paymentPayload(supplier.id, '50.00', [{ purchaseId: multiB.id, amount: '20.00' }, { purchaseId: multiA.id, amount: '30.00' }])); assert.equal(multi.status, 201); assert.equal(await purchaseStatus(multiA.id), 'PAID'); assert.equal(await purchaseStatus(multiB.id), 'PAID');
    console.log('PASS deterministic multi-purchase allocation and statuses');

    const excessive = await createPurchase(supplier.id, '10.00'); const excessiveKey = uuid();
    assert.equal((await pay(paymentPayload(supplier.id, '11.00', [{ purchaseId: excessive.id, amount: '11.00' }]), excessiveKey)).status, 409);
    assert.equal((await pay(paymentPayload(supplier.id, '10.00', [{ purchaseId: excessive.id, amount: '10.00' }]), excessiveKey)).status, 201, 'failed validation reserved idempotency key');
    const otherPurchase = await createPurchase(otherSupplier.id, '10.00');
    assert.equal((await pay(paymentPayload(supplier.id, '10.00', [{ purchaseId: otherPurchase.id, amount: '10.00' }]))).status, 404);
    const duplicate = await createPurchase(supplier.id, '10.00');
    assert.equal((await pay(paymentPayload(supplier.id, '10.00', [{ purchaseId: duplicate.id, amount: '5.00' }, { purchaseId: duplicate.id, amount: '5.00' }]))).status, 400);
    assert.equal((await pay(paymentPayload(supplier.id, '9.00', [{ purchaseId: duplicate.id, amount: '8.00' }]))).status, 400);
    console.log('PASS excessive, cross-supplier, duplicate-allocation, sum mismatch, and failed-key release');

    const otherFactoryId = `integrity-factory-${uuid()}`;
    await db.query('INSERT INTO "Factory" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ($1,$2,$3,NOW(),NOW())', [otherFactoryId, session.tenantId, 'Integrity other factory']);
    const outsidePurchaseId = `integrity-purchase-${uuid()}`; createdPurchaseIds.push(outsidePurchaseId);
    await db.query(`INSERT INTO "SupplierPurchase" (id,"tenantId","factoryId","supplierId","purchaseNumber","totalAmount","paymentStatus","purchasedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,10.00,'UNPAID',NOW(),NOW(),NOW())`, [outsidePurchaseId, session.tenantId, otherFactoryId, supplier.id, `SP-OUTSIDE-${uuid().slice(0, 8)}`]);
    assert.equal((await pay(paymentPayload(supplier.id, '10.00', [{ purchaseId: outsidePurchaseId, amount: '10.00' }]))).status, 404);
    console.log('PASS active-factory allocation scope');

    const sameKeyPurchase = await createPurchase(supplier.id, '10.00'); const sameKey = uuid(); const sameKeyPayload = paymentPayload(supplier.id, '10.00', [{ purchaseId: sameKeyPurchase.id, amount: '10.00' }]);
    const sameKeyResults = await runInParallel([() => pay(sameKeyPayload, sameKey), () => pay(sameKeyPayload, sameKey)]);
    assert.deepEqual(sameKeyResults.map((result) => result.status), [201, 201]); assert.equal(sameKeyResults[0].body.data.id, sameKeyResults[1].body.data.id); assert.equal(await allocated(sameKeyPurchase.id), '10.00'); assert.equal(await purchasePaymentCount(sameKeyPurchase.id), 1); assert.equal(await purchaseAuditCount(sameKeyPurchase.id), 1);
    console.log('PASS concurrent same-key replay produces one mutation');

    for (let iteration = 0; iteration < 5; iteration += 1) {
      const racePurchase = await createPurchase(supplier.id, '10.00'); const racePayload = paymentPayload(supplier.id, '10.00', [{ purchaseId: racePurchase.id, amount: '10.00' }]);
      const race = await runInParallel([() => pay(racePayload, uuid()), () => pay(racePayload, uuid())]);
      assert.deepEqual(race.map((result) => result.status).sort(), [201, 409]); assert.equal(await allocated(racePurchase.id), '10.00'); assert.equal(await purchaseStatus(racePurchase.id), 'PAID'); assert.equal(await purchasePaymentCount(racePurchase.id), 1); assert.equal(await purchaseAuditCount(racePurchase.id), 1);
    }
    console.log('PASS different-key concurrent over-allocation blocked in 5 repeated barriers');

    const overlapA = await createPurchase(supplier.id, '10.00'); const overlapB = await createPurchase(supplier.id, '10.00'); const overlapC = await createPurchase(supplier.id, '10.00');
    const overlap = await runInParallel([
      () => pay(paymentPayload(supplier.id, '20.00', [{ purchaseId: overlapA.id, amount: '10.00' }, { purchaseId: overlapB.id, amount: '10.00' }]), uuid()),
      () => pay(paymentPayload(supplier.id, '20.00', [{ purchaseId: overlapC.id, amount: '10.00' }, { purchaseId: overlapB.id, amount: '10.00' }]), uuid()),
    ]);
    assert.deepEqual(overlap.map((result) => result.status).sort(), [201, 409]); assert.equal(await allocated(overlapB.id), '10.00'); assert.equal(await purchaseStatus(overlapB.id), 'PAID'); assert.equal(await purchasePaymentCount(overlapB.id), 1); assert.equal(await purchaseAuditCount(overlapB.id), 1);
    console.log('PASS overlapping multi-purchase concurrency and deterministic lock order');

    const rollbackPurchase = await createPurchase(supplier.id, '10.00'); const rollbackKey = uuid(); const rollbackPayload = paymentPayload(supplier.id, '10.00', [{ purchaseId: rollbackPurchase.id, amount: '10.00' }]);
    const beforeRollbackPayments = await db.query('SELECT count(*)::int AS count FROM "SupplierPayment" WHERE "supplierId" = $1', [supplier.id]);
    const beforeRollbackAudits = await db.query(`SELECT count(*)::int AS count FROM "AuditLog" WHERE "tenantId" = $1 AND "createdAt" >= $2 AND action LIKE 'SUPPLIER_%'`, [session.tenantId, startedAt]);
    await db.query(`CREATE OR REPLACE FUNCTION supplier_payment_test_failure() RETURNS trigger AS $$ BEGIN IF NEW.action = 'SUPPLIER_PAYMENT_ALLOCATED' THEN RAISE EXCEPTION 'controlled supplier payment rollback'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await db.query(`CREATE TRIGGER supplier_payment_test_failure_trigger BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION supplier_payment_test_failure()`);
    const failed = await pay(rollbackPayload, rollbackKey); assert.equal(failed.status, 500);
    await db.query('DROP TRIGGER supplier_payment_test_failure_trigger ON "AuditLog"'); await db.query('DROP FUNCTION supplier_payment_test_failure()');
    assert.equal(await allocated(rollbackPurchase.id), '0'); assert.equal(await purchaseStatus(rollbackPurchase.id), 'UNPAID');
    const afterRollbackPayments = await db.query('SELECT count(*)::int AS count FROM "SupplierPayment" WHERE "supplierId" = $1', [supplier.id]); assert.equal(afterRollbackPayments.rows[0].count, beforeRollbackPayments.rows[0].count);
    const afterRollbackAudits = await db.query(`SELECT count(*)::int AS count FROM "AuditLog" WHERE "tenantId" = $1 AND "createdAt" >= $2 AND action LIKE 'SUPPLIER_%'`, [session.tenantId, startedAt]); assert.equal(afterRollbackAudits.rows[0].count, beforeRollbackAudits.rows[0].count);
    const strandedKey = await db.query('SELECT count(*)::int AS count FROM "SupplierPaymentIdempotency" WHERE key = $1', [rollbackKey]); assert.equal(strandedKey.rows[0].count, 0);
    assert.equal((await pay(rollbackPayload, rollbackKey)).status, 201);
    console.log('PASS controlled rollback leaves no allocation/status/key fragment and key can retry');

    const decimalPurchase = await createPurchase(supplier.id, '0.03');
    assert.equal((await pay(paymentPayload(supplier.id, '0.01', [{ purchaseId: decimalPurchase.id, amount: '0.01' }]))).status, 201); assert.equal(await purchaseStatus(decimalPurchase.id), 'PARTIALLY_PAID');
    assert.equal((await pay(paymentPayload(supplier.id, '0.02', [{ purchaseId: decimalPurchase.id, amount: '0.02' }]))).status, 201); assert.equal(await allocated(decimalPurchase.id), '0.03'); assert.equal(await purchaseStatus(decimalPurchase.id), 'PAID');
    console.log('PASS exact Decimal boundary values');
    console.log('supplier payment integrity: 18 scenarios passed');
  } finally {
    await db.query('DROP TRIGGER IF EXISTS supplier_payment_test_failure_trigger ON "AuditLog"').catch(() => {}); await db.query('DROP FUNCTION IF EXISTS supplier_payment_test_failure()').catch(() => {});
    if (createdSupplierIds.length > 0) {
      const payments = await db.query('SELECT id FROM "SupplierPayment" WHERE "supplierId" = ANY($1::text[])', [createdSupplierIds]); const paymentIds = payments.rows.map((row) => row.id);
      const entityIds = [...createdSupplierIds, ...createdPurchaseIds, ...paymentIds];
      await db.query('BEGIN');
      if (paymentIds.length > 0) { await db.query('DELETE FROM "SupplierPaymentIdempotency" WHERE "paymentId" = ANY($1::text[])', [paymentIds]); await db.query('DELETE FROM "SupplierPaymentAllocation" WHERE "paymentId" = ANY($1::text[])', [paymentIds]); await db.query('DELETE FROM "SupplierPayment" WHERE id = ANY($1::text[])', [paymentIds]); }
      if (entityIds.length > 0) await db.query('DELETE FROM "AuditLog" WHERE "entityId" = ANY($1::text[])', [entityIds]);
      if (createdPurchaseIds.length > 0) { await db.query('DELETE FROM "SupplierPurchaseItem" WHERE "purchaseId" = ANY($1::text[])', [createdPurchaseIds]); await db.query('DELETE FROM "SupplierPurchase" WHERE id = ANY($1::text[])', [createdPurchaseIds]); }
      await db.query('DELETE FROM "SupplierPaymentIdempotency" WHERE "tenantId" = $1 AND "createdAt" >= $2', [session.tenantId, startedAt]);
      await db.query('DELETE FROM "Supplier" WHERE id = ANY($1::text[])', [createdSupplierIds]);
      await db.query(`DELETE FROM "Factory" WHERE id LIKE 'integrity-factory-%'`);
      await db.query('COMMIT');
    }
    await db.end();
  }
}

await runIntegritySuite();
