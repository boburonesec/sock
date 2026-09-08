import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const API = process.env.API_BASE_URL || "http://localhost:3001";

async function apiCall(endpoint, { method = "GET", token, activeFactoryId, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (activeFactoryId) headers["X-Factory-Id"] = activeFactoryId;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function getAuthToken(email) {
  const loginRes = await apiCall("/auth/login", {
    method: "POST",
    body: { email, password: "ChangeMe123!" },
  });
  if (!loginRes.ok) throw new Error(`Auth failed for ${email}: ${JSON.stringify(loginRes.data)}`);
  
  const meRes = await apiCall("/auth/me", { token: loginRes.data.data.accessToken });
  let activeFactoryId = null;
  if (meRes.data?.data?.employments && meRes.data.data.employments.length > 0) {
    activeFactoryId = meRes.data.data.employments[0].factoryId;
  } else if (meRes.data.data.tenantOwner) {
    activeFactoryId = meRes.data.data.tenantOwner.tenant.factories[0].id;
  }
  return { token: loginRes.data.data.accessToken, activeFactoryId };
}

async function main() {
  const roles = [
    { name: "Seller", email: "seller@paypoq.local", expectedActive: 200, expectedHistorical: 403 },
    { name: "Warehouse Operator", email: "warehouse@paypoq.local", expectedActive: 403, expectedHistorical: 403 },
    { name: "Shift Receiver", email: "shift@paypoq.local", expectedActive: 403, expectedHistorical: 403 },
    { name: "Accountant", email: "accountant@paypoq.local", expectedActive: 200, expectedHistorical: 403 },
    { name: "Owner", email: "owner@paypoq.local", expectedActive: 200, expectedHistorical: 200 }
  ];

  // Get a valid variant ID from Owner
  const ownerAuth = await getAuthToken("owner@paypoq.local");
  const productsRes = await apiCall("/product/products", { token: ownerAuth.token, activeFactoryId: ownerAuth.activeFactoryId });
  const variantId = productsRes.data.data[0].variants[0].id;

  console.log(`| Role | Active price status | Historical prices status | Result |`);
  console.log(`| --- | --- | --- | --- |`);

  for (const role of roles) {
    const auth = await getAuthToken(role.email);
    const activeRes = await apiCall(`/product/variants/${variantId}/active-price`, { token: auth.token, activeFactoryId: auth.activeFactoryId });
    const historicalRes = await apiCall(`/product/variants/${variantId}/prices`, { token: auth.token, activeFactoryId: auth.activeFactoryId });

    const activePass = activeRes.status === role.expectedActive;
    const historicalPass = historicalRes.status === role.expectedHistorical;
    const result = (activePass && historicalPass) ? "PASS" : "FAIL";

    console.log(`| ${role.name} | ${activeRes.status} (Exp: ${role.expectedActive}) | ${historicalRes.status} (Exp: ${role.expectedHistorical}) | ${result} |`);
    
    if (!activePass || !historicalPass) {
      console.error(`\nFAILED for ${role.name}. Active: ${activeRes.status}, Historical: ${historicalRes.status}`);
      process.exit(1);
    }
  }
}

main().catch(console.error);
