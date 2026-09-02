import assert from "node:assert/strict";
import { isPilotPathVisible } from "../src/lib/pilot-scope.ts";
import { navigationItems } from "../src/lib/navigation.ts";

const TENANT_ROLES = [
  "Owner",
  "Manager",
  "Shift Receiver",
  "Warehouse Operator",
  "Seller",
  "Accountant",
  "Mechanic",
];

console.log("--- Starting Verification for Guide Access Isolation ---");

// 1. Verify that /guide is completely absent from tenant navigationItems
const tenantGuideNav = navigationItems.find((item) => item.href === "/guide" || item.href === "/admin/guide");
assert.equal(tenantGuideNav, undefined, "Tenant navigation must NOT have /guide or /admin/guide item");
console.log("✓ [PASS] Tenant sidebar navigation does NOT contain any guide link.");

// 2. Verify that no tenant role has /guide visible in pilot scope
for (const role of TENANT_ROLES) {
  const isVisible = isPilotPathVisible("/guide", [role]);
  assert.equal(isVisible, false, `${role} must NOT have /guide visible in pilot scope`);

  const isAdminGuideVisible = isPilotPathVisible("/admin/guide", [role]);
  assert.equal(isAdminGuideVisible, false, `${role} must NOT have /admin/guide visible in pilot scope`);

  console.log(`✓ [PASS] Role: ${role} -> Guide is strictly HIDDEN and inaccessible.`);
}

console.log("\nALL TENANT ROLES STRICT ISOLATION CHECKS PASSED (7/7 personas).");
