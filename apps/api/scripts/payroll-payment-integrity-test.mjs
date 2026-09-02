import assert from 'node:assert/strict';
import pg from 'pg';

const API = process.env.API_BASE_URL || 'http://localhost:3001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:55432/paypoq_os?schema=public';

async function request(path, headers, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const loginResponse = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'accountant@paypoq.local', password: 'ChangeMe123!' }),
});
assert.equal(loginResponse.status, 200);
const session = (await loginResponse.json()).data;
const headers = {
  accept: 'application/json',
  authorization: `Bearer ${session.accessToken}`,
  'content-type': 'application/json',
  'x-factory-id': session.activeFactoryId,
};

assert.equal((await request('/employees', headers)).status, 403, 'Accountant must not gain employees.view');
assert.equal((await request('/finance/payroll-employees', headers)).status, 200, 'Payroll employee lookup must use finance permission');

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
try {
  const periods = (await request('/finance/payroll-periods', headers)).body.data;
  const period = periods.find((row) => row.status === 'PARTIALLY_PAID');
  assert.ok(period, 'demo partially-paid payroll period missing');
  assert.equal(period.approvedRevision, period.calculationRevision, 'demo payroll approval must match current revision');
  const itemsBefore = (await request(`/finance/payroll-periods/${period.id}/items`, headers)).body.data;
  const aliBefore = itemsBefore.find((row) => row.employee.name === 'Ali Averlogchi');
  assert.ok(aliBefore, 'demo Ali payroll item missing');

  const sum = (field, rows) => rows.reduce((value, row) => value + BigInt(row[field]), 0n);
  assert.equal(period.totalFinalAmount, sum('finalAmount', itemsBefore).toString());
  assert.equal(period.totalPaidAmount, sum('paidAmount', itemsBefore).toString());
  assert.equal(period.totalRemainingAmount, sum('remainingAmount', itemsBefore).toString());
  assert.equal(BigInt(period.totalRemainingAmount), BigInt(period.totalFinalAmount) - BigInt(period.totalPaidAmount));

  const paymentCountBefore = await db.query('SELECT count(*)::int AS count FROM "PayrollPayment" WHERE "payrollItemId" = $1', [aliBefore.id]);
  const pay = () => request(`/finance/payroll-periods/${period.id}/pay`, headers, {
    method: 'POST', body: { payrollItemId: aliBefore.id, amount: '1', method: 'CASH', note: 'payroll integrity regression' },
  });
  assert.equal((await pay()).status, 201);

  const periodAfterOne = (await request('/finance/payroll-periods', headers)).body.data.find((row) => row.id === period.id);
  const itemsAfterOne = (await request(`/finance/payroll-periods/${period.id}/items`, headers)).body.data;
  const aliAfterOne = itemsAfterOne.find((row) => row.id === aliBefore.id);
  assert.equal(BigInt(aliAfterOne.remainingAmount), BigInt(aliBefore.remainingAmount) - 1n);
  assert.equal(BigInt(periodAfterOne.totalPaidAmount), BigInt(period.totalPaidAmount) + 1n);
  assert.equal(BigInt(periodAfterOne.totalRemainingAmount), BigInt(period.totalRemainingAmount) - 1n);
  assert.equal(periodAfterOne.totalFinalAmount, period.totalFinalAmount);
  for (const item of itemsBefore.filter((row) => row.id !== aliBefore.id)) {
    assert.deepEqual(itemsAfterOne.find((row) => row.id === item.id), item, `unrelated employee changed: ${item.employee.name}`);
  }

  const concurrent = await Promise.all([pay(), pay()]);
  assert.deepEqual(concurrent.map((result) => result.status), [201, 201]);
  const periodAfterRace = (await request('/finance/payroll-periods', headers)).body.data.find((row) => row.id === period.id);
  const itemsAfterRace = (await request(`/finance/payroll-periods/${period.id}/items`, headers)).body.data;
  const aliAfterRace = itemsAfterRace.find((row) => row.id === aliBefore.id);
  assert.equal(BigInt(aliAfterRace.paidAmount), BigInt(aliAfterOne.paidAmount) + 2n);
  assert.equal(BigInt(aliAfterRace.remainingAmount), BigInt(aliAfterOne.remainingAmount) - 2n);
  assert.equal(BigInt(periodAfterRace.totalPaidAmount), BigInt(periodAfterOne.totalPaidAmount) + 2n);
  assert.equal(BigInt(periodAfterRace.totalRemainingAmount), BigInt(periodAfterOne.totalRemainingAmount) - 2n);
  assert.equal(periodAfterRace.totalFinalAmount, sum('finalAmount', itemsAfterRace).toString());
  assert.equal(periodAfterRace.totalPaidAmount, sum('paidAmount', itemsAfterRace).toString());
  assert.equal(periodAfterRace.totalRemainingAmount, sum('remainingAmount', itemsAfterRace).toString());
  assert.equal(periodAfterRace.approvedRevision, periodAfterRace.calculationRevision, 'payments must not invalidate approval');
  const repeated = (await request('/finance/payroll-periods', headers)).body.data.find((row) => row.id === period.id);
  assert.deepEqual(repeated, periodAfterRace, 'repeated payroll GET changed authoritative totals');
  const paymentCountAfter = await db.query('SELECT count(*)::int AS count FROM "PayrollPayment" WHERE "payrollItemId" = $1', [aliBefore.id]);
  assert.equal(paymentCountAfter.rows[0].count, paymentCountBefore.rows[0].count + 3);
  console.log('payroll payment integrity: all assertions passed');
} finally {
  await db.end();
}
