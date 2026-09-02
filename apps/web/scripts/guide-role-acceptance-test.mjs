import assert from "node:assert/strict";
import {
  isPilotPathVisible,
  getPilotHomePath,
  getPilotPathsForRole,
} from "../src/lib/pilot-scope.ts";

const ALL_ROLES = [
  "Owner",
  "Manager",
  "Shift Receiver",
  "Warehouse Operator",
  "Seller",
  "Accountant",
  "Mechanic",
];

console.log("--- Starting Acceptance Tests for /guide across all roles ---");

for (const role of ALL_ROLES) {
  // 1. Check if /guide is visible in pilot scope for this role
  const isVisible = isPilotPathVisible("/guide", [role]);
  assert.equal(isVisible, true, `${role} must have /guide visible in pilot scope`);
  
  // 2. Check nested guide paths
  assert.equal(isPilotPathVisible("/guide#about", [role]), true);
  assert.equal(isPilotPathVisible("/guide#test-walkthrough", [role]), true);

  console.log(`✓ [PASS] Role: ${role} -> /guide is always visible and accessible.`);
}

console.log("\nALL ROLE ACCEPTANCE CHECKS PASSED (7/7 personas).");
