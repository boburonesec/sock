import assert from 'node:assert/strict';
import pg from 'pg';

const API = process.env.API_BASE_URL || 'http://localhost:3001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:55432/paypoq_os?schema=public';

async function login(email) {
  const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'ChangeMe123!' }) });
  assert.equal(response.status, 200, `${email} login failed`);
  const session = (await response.json()).data;
  return { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json', 'x-factory-id': session.activeFactoryId };
}

async function request(path, headers, method = 'GET', body) {
  const response = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const [manager, accountant, owner, shift] = await Promise.all([
  login('manager@paypoq.local'), login('accountant@paypoq.local'), login('owner@paypoq.local'), login('shift@paypoq.local'),
]);
const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
const cleanup = [];

try {
  const factoryId = manager['x-factory-id'];
  const factory = (await db.query('SELECT "tenantId", "warehouseHandoffStageId" FROM "Factory" WHERE id = $1', [factoryId])).rows[0];
  assert.ok(factory.warehouseHandoffStageId, 'demo handoff stage missing');

  const inactive = (await db.query('INSERT INTO "ProductionStage" (id,"tenantId","factoryId",name,"sortOrder","createdAt","updatedAt","deletedAt") VALUES ($1,$2,$3,$4,$5,now(),now(),now()) RETURNING id', [`week3-inactive-${Date.now()}`, factory.tenantId, factoryId, `Inactive ${Date.now()}`, 9999])).rows[0];
  cleanup.push(() => db.query('DELETE FROM "ProductionStage" WHERE id = $1', [inactive.id]));
  assert.equal((await request('/production/warehouse-handoff-stage', manager, 'PATCH', { productionStageId: inactive.id })).status, 400, 'inactive stage must be rejected');
  const foreignFactoryId = `week3-factory-${Date.now()}`;
  const foreignStageId = `week3-stage-${Date.now()}`;
  await db.query('INSERT INTO "Factory" (id,"tenantId",name,"createdAt","updatedAt") VALUES ($1,$2,$3,now(),now())', [foreignFactoryId, factory.tenantId, `Week3 ${Date.now()}`]);
  await db.query('INSERT INTO "ProductionStage" (id,"tenantId","factoryId",name,"sortOrder","createdAt","updatedAt") VALUES ($1,$2,$3,$4,1,now(),now())', [foreignStageId, factory.tenantId, foreignFactoryId, 'Foreign handoff']);
  const foreignShiftId = `week3-shift-${Date.now()}`;
  await db.query(`INSERT INTO "WorkShift" (id,"tenantId","factoryId",code,name,"startMinute","endMinute","premiumPerPiece","createdAt","updatedAt") VALUES ($1,$2,$3,'DAY','Foreign shift',0,1,0,now(),now())`, [foreignShiftId, factory.tenantId, foreignFactoryId]);
  cleanup.push(async () => { await db.query('DELETE FROM "WorkShift" WHERE id = $1', [foreignShiftId]); await db.query('DELETE FROM "ProductionStage" WHERE id = $1', [foreignStageId]); await db.query('DELETE FROM "Factory" WHERE id = $1', [foreignFactoryId]); });
  assert.equal((await request('/production/warehouse-handoff-stage', manager, 'PATCH', { productionStageId: foreignStageId })).status, 400, 'cross-factory stage must be rejected');
  assert.equal((await request('/production/shift-reconciliations/submit', shift, 'POST', { workShiftId: foreignShiftId, workDate: '2099-01-01' })).status, 400, 'cross-factory shift must be rejected');
  assert.equal((await request('/production/warehouse-handoff-stage', shift, 'PATCH', { productionStageId: factory.warehouseHandoffStageId })).status, 403, 'operator must not change handoff configuration');

  await db.query('UPDATE "Factory" SET "warehouseHandoffStageId" = NULL WHERE id = $1', [factoryId]);
  cleanup.push(() => db.query('UPDATE "Factory" SET "warehouseHandoffStageId" = $2 WHERE id = $1', [factoryId, factory.warehouseHandoffStageId]));
  const workShiftId = (await db.query('SELECT id FROM "WorkShift" WHERE "factoryId" = $1 AND "deletedAt" IS NULL LIMIT 1', [factoryId])).rows[0].id;
  assert.equal((await request('/production/shift-reconciliations/submit', shift, 'POST', { workShiftId, workDate: '2099-01-01' })).status, 409, 'missing handoff configuration must block shift');
  await db.query('UPDATE "Factory" SET "warehouseHandoffStageId" = $2 WHERE id = $1', [factoryId, factory.warehouseHandoffStageId]);

  const originalQuantities = await db.query('SELECT id, quantity FROM "StageInventory" WHERE "tenantId" = $1 AND "factoryId" = $2 AND "productionStageId" = $3', [factory.tenantId, factoryId, factory.warehouseHandoffStageId]);
  await db.query('UPDATE "StageInventory" SET quantity = 0 WHERE "tenantId" = $1 AND "factoryId" = $2 AND "productionStageId" = $3', [factory.tenantId, factoryId, factory.warehouseHandoffStageId]);
  cleanup.push(async () => { await Promise.all(originalQuantities.rows.map((row) => db.query('UPDATE "StageInventory" SET quantity = $2 WHERE id = $1', [row.id, row.quantity]))); });
  const openRuns = (await db.query(`UPDATE "ProductionRun" SET status = 'COMPLETED' WHERE "factoryId" = $1 AND "workShiftId" = $2 AND status IN ('PLANNED','RUNNING','STOPPED','HOLD') RETURNING id,status`, [factoryId, workShiftId])).rows;
  cleanup.push(async () => { await Promise.all(openRuns.map((row) => db.query(`UPDATE "ProductionRun" SET status = 'RUNNING' WHERE id = $1`, [row.id]))); });
  if (originalQuantities.rows[0]) {
    await db.query('UPDATE "StageInventory" SET quantity = 1 WHERE id = $1', [originalQuantities.rows[0].id]);
    assert.equal((await request('/production/shift-reconciliations/submit', shift, 'POST', { workShiftId, workDate: '2099-01-01' })).status, 409, 'configured handoff inventory must block shift');
    assert.equal((await request('/production/shift-reconciliations/accept', manager, 'POST', { workShiftId, workDate: '2099-01-01', reason: 'override' })).status, 409, 'Manager must not override hard blocker');
    await db.query('UPDATE "StageInventory" SET quantity = 0 WHERE id = $1', [originalQuantities.rows[0].id]);
  }
  const reporter = (await db.query('SELECT id FROM "User" WHERE "tenantId" = $1 LIMIT 1', [factory.tenantId])).rows[0];
  const defectId = `week3-defect-${Date.now()}`;
  await db.query('INSERT INTO "Defect" (id,"tenantId","factoryId",quantity,reason,"reportedByUserId","detectedAt","createdAt") VALUES ($1,$2,$3,1,$4,$5,$6,now())', [defectId, factory.tenantId, factoryId, 'warning regression', reporter.id, '2099-01-01T10:00:00Z']);
  cleanup.push(() => db.query('DELETE FROM "Defect" WHERE id = $1', [defectId]));
  assert.equal((await request('/production/shift-reconciliations/submit', shift, 'POST', { workShiftId, workDate: '2099-01-01' })).status, 201);
  cleanup.push(() => db.query('DELETE FROM "ShiftReconciliation" WHERE "tenantId" = $1 AND "factoryId" = $2 AND "workShiftId" = $3 AND "workDate" = $4', [factory.tenantId, factoryId, workShiftId, '2099-01-01']));
  assert.equal((await request('/production/shift-reconciliations/accept', shift, 'POST', { workShiftId, workDate: '2099-01-01', reason: 'ko‘rdim' })).status, 403, 'only Manager may accept');
  assert.equal((await request('/production/shift-reconciliations/accept', manager, 'POST', { workShiftId, workDate: '2099-01-01', reason: 'Nuqson yozuvi ko‘rib chiqildi' })).status, 201, 'Manager warning acknowledgement failed');
  assert.equal((await request('/production/shift-reconciliations/submit', shift, 'POST', { workShiftId, workDate: '2099-01-01' })).status, 409, 'accepted shift must remain immutable');

  const movement = (await db.query('SELECT id FROM "StageMovement" WHERE "tenantId" = $1 AND "factoryId" = $2 LIMIT 1', [factory.tenantId, factoryId])).rows[0];
  const beforeMovement = await db.query('SELECT * FROM "StageMovement" WHERE id = $1', [movement.id]);
  assert.equal((await request('/recovery/correction-requests', shift, 'POST', { domain: 'PRODUCTION_MOVEMENT', sourceRecordId: movement.id, reason: '' })).status, 400, 'correction reason required');
  const correction = await request('/recovery/correction-requests', shift, 'POST', { domain: 'PRODUCTION_MOVEMENT', sourceRecordId: movement.id, reason: 'Miqdor qayta tekshirilsin' });
  assert.equal(correction.status, 201);
  cleanup.push(() => db.query('DELETE FROM "CorrectionRequest" WHERE id = $1', [correction.body.data.id]));
  assert.deepEqual((await db.query('SELECT * FROM "StageMovement" WHERE id = $1', [movement.id])).rows, beforeMovement.rows, 'correction request mutated original');
  assert.equal((await request(`/recovery/correction-requests/${correction.body.data.id}/resolve`, accountant, 'POST', { resolutionNote: 'yopish' })).status, 403);
  assert.equal((await request(`/recovery/correction-requests/${correction.body.data.id}/resolve`, manager, 'POST', { resolutionNote: 'Nazorat bilan tekshirildi' })).status, 201);

  const month = '2099-02';
  const created = await request('/finance/payroll-periods', accountant, 'POST', { month });
  assert.equal(created.status, 201);
  const periodId = created.body.data.id;
  cleanup.push(async () => { await db.query('DELETE FROM "PayrollPayment" WHERE "payrollItemId" IN (SELECT id FROM "PayrollItem" WHERE "payrollPeriodId" = $1)', [periodId]); await db.query('DELETE FROM "PayrollItem" WHERE "payrollPeriodId" = $1', [periodId]); await db.query('DELETE FROM "PayrollPeriod" WHERE id = $1', [periodId]); });
  assert.equal((await request(`/finance/payroll-periods/${periodId}/calculate`, accountant, 'POST')).status, 201);
  const employeeId = (await db.query('SELECT id FROM "Employee" WHERE "tenantId" = $1 AND "factoryId" = $2 LIMIT 1', [factory.tenantId, factoryId])).rows[0].id;
  const itemId = `week3-payroll-item-${Date.now()}`;
  await db.query(`INSERT INTO "PayrollItem" (id,"tenantId","factoryId","payrollPeriodId","employeeId","workedAmount","bonusAmount","penaltyAmount","advanceAmount","finalAmount","paidAmount","remainingAmount",status,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,10,0,0,0,10,0,10,'CALCULATED',now(),now())`, [itemId, factory.tenantId, factoryId, periodId, employeeId]);
  await db.query('UPDATE "PayrollPeriod" SET "totalWorkedAmount"=10,"totalFinalAmount"=10,"totalRemainingAmount"=10 WHERE id=$1', [periodId]);
  assert.equal((await request(`/finance/payroll-periods/${periodId}/pay`, accountant, 'POST', { payrollItemId: itemId, amount: '1', method: 'CASH' })).status, 409, 'payment without Manager approval must fail');
  assert.equal((await request(`/finance/payroll-periods/${periodId}/pay`, owner, 'POST', { payrollItemId: itemId, amount: '1', method: 'CASH' })).status, 409, 'Owner must not bypass approval');
  assert.equal((await request(`/finance/payroll-periods/${periodId}/approve`, manager, 'POST')).status, 201);
  assert.equal((await request(`/finance/payroll-periods/${periodId}/calculate`, accountant, 'POST')).status, 201, 'pre-payment recalculation should work');
  assert.equal((await request(`/finance/payroll-periods/${periodId}/pay`, accountant, 'POST', { payrollItemId: itemId, amount: '1', method: 'CASH' })).status, 409, 'stale approval must block payment');
  assert.equal((await request(`/finance/payroll-periods/${periodId}/close`, accountant, 'POST', { confirm: true })).status, 409, 'CALCULATED payroll must not close');
  assert.equal((await request(`/finance/payroll-periods/${periodId}/approve`, manager, 'POST')).status, 201);
  await db.query(`INSERT INTO "PayrollItem" (id,"tenantId","factoryId","payrollPeriodId","employeeId","workedAmount","bonusAmount","penaltyAmount","advanceAmount","finalAmount","paidAmount","remainingAmount",status,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,10,0,0,0,10,0,10,'CALCULATED',now(),now())`, [itemId, factory.tenantId, factoryId, periodId, employeeId]);
  await db.query('UPDATE "PayrollPeriod" SET "totalWorkedAmount"=10,"totalFinalAmount"=10,"totalPaidAmount"=0,"totalRemainingAmount"=10 WHERE id=$1', [periodId]);
  const race = await Promise.all([
    request(`/finance/payroll-periods/${periodId}/pay`, accountant, 'POST', { payrollItemId: itemId, amount: '1', method: 'CASH' }),
    request(`/finance/payroll-periods/${periodId}/pay`, accountant, 'POST', { payrollItemId: itemId, amount: '1', method: 'CASH' }),
  ]);
  assert.deepEqual(race.map((entry) => entry.status), [201, 201], 'concurrent approved payments must serialize');
  assert.equal((await request(`/finance/payroll-periods/${periodId}/pay`, accountant, 'POST', { payrollItemId: itemId, amount: '8', method: 'CASH' })).status, 201);
  const paidPeriod = (await request('/finance/payroll-periods', accountant)).body.data.find((entry) => entry.id === periodId);
  assert.equal(paidPeriod.status, 'PAID');
  assert.equal(paidPeriod.totalRemainingAmount, '0');
  assert.equal(paidPeriod.approvedRevision, paidPeriod.calculationRevision, 'payments must preserve current approval');
  assert.equal((await request(`/finance/payroll-periods/${periodId}/close`, accountant, 'POST', { confirm: false })).status, 400, 'close requires explicit confirmation');
  assert.equal((await request(`/finance/payroll-periods/${periodId}/close`, accountant, 'POST', { confirm: true })).status, 201, 'paid approved payroll must close');

  const audit = await db.query(`SELECT action FROM "AuditLog" WHERE "tenantId" = $1 AND "factoryId" = $2 AND action IN ('SHIFT_RECONCILIATION_ACCEPTED','CORRECTION_REQUEST_RESOLVED','PAYROLL_APPROVAL_INVALIDATED')`, [factory.tenantId, factoryId]);
  assert.ok(audit.rows.some((row) => row.action === 'SHIFT_RECONCILIATION_ACCEPTED'));
  assert.ok(audit.rows.some((row) => row.action === 'CORRECTION_REQUEST_RESOLVED'));
  assert.ok(audit.rows.some((row) => row.action === 'PAYROLL_APPROVAL_INVALIDATED'));
  console.log('week3 policy gates: all assertions passed');
} finally {
  for (const action of cleanup.reverse()) await action();
  await db.end();
}
