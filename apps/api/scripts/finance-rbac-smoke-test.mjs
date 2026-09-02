import assert from "node:assert/strict";

const BASE = process.env.API_BASE_URL || "http://localhost:3001";
const PASSWORD = "ChangeMe123!";

async function request(path, session, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(session?.factoryId ? { "x-factory-id": session.factoryId } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function login(email) {
  const response = await request("/auth/login", null, {
    method: "POST",
    body: { email, password: PASSWORD },
  });
  assert.equal(response.status, 200, `${email} login`);
  return {
    token: response.body.data.accessToken,
    factoryId: response.body.data.activeFactoryId,
  };
}

async function createExpense(session, categoryId, label) {
  const response = await request("/finance/expenses", session, {
    method: "POST",
    body: {
      categoryId,
      amount: "1000",
      reason: `Week 2 RBAC ${label} ${Date.now()}`,
    },
  });
  assert.equal(response.status, 201, `${label} create expense`);
  return response.body.data;
}

async function transition(session, expenseId, action, expectedStatus, label) {
  const response = await request(
    `/finance/expenses/${expenseId}/${action}`,
    session,
    { method: "POST" },
  );
  assert.equal(response.status, expectedStatus, label);
  return response.body?.data;
}

const [owner, manager, accountant] = await Promise.all([
  login("owner@paypoq.local"),
  login("manager@paypoq.local"),
  login("accountant@paypoq.local"),
]);

const categories = await request("/settings/expense-categories", owner);
assert.equal(categories.status, 200, "expense categories");
const categoryId = categories.body.data[0]?.id;
assert.ok(categoryId, "expense category fixture");

const separated = await createExpense(owner, categoryId, "separated-flow");
await transition(accountant, separated.id, "approve", 403, "Accountant cannot approve");
await transition(accountant, separated.id, "reject", 403, "Accountant cannot reject");
await transition(manager, separated.id, "approve", 201, "Manager approves REQUESTED");
await transition(manager, separated.id, "pay", 403, "Manager cannot pay APPROVED");
await transition(accountant, separated.id, "pay", 201, "Accountant pays APPROVED");

const managerRequested = await createExpense(manager, categoryId, "manager-requester");
await transition(manager, managerRequested.id, "approve", 403, "Requester cannot approve own request");

const accountantRequested = await createExpense(accountant, categoryId, "accountant-requester");
await transition(owner, accountantRequested.id, "approve", 201, "Owner bypass approves");
await transition(accountant, accountantRequested.id, "pay", 403, "Requester cannot pay own request");

const ownerEmergency = await createExpense(owner, categoryId, "owner-bypass");
await transition(owner, ownerEmergency.id, "approve", 201, "Owner bypass approves own request");
await transition(owner, ownerEmergency.id, "pay", 201, "Owner bypass pays own request");

console.log("Finance RBAC endpoint matrix: 11/11 checks passed.");
console.log("Owner emergency/admin bypass remains enabled pending product decision.");
