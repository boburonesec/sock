import assert from "node:assert/strict";
import {
  getPilotHomePath,
  getPilotPathsForRole,
  isPilotPathVisible,
} from "../src/lib/pilot-scope.ts";

const expectedPaths = {
  Owner: [
    "/dashboard/executive",
    "/production",
    "/machines",
    "/warehouse",
    "/sales",
    "/finance",
    "/employees",
    "/settings",
  ],
  Manager: [
    "/dashboard/executive",
    "/production",
    "/warehouse",
    "/sales",
    "/finance",
    "/employees",
    "/settings",
  ],
  "Shift Receiver": ["/production", "/machines"],
  "Warehouse Operator": ["/warehouse"],
  Seller: ["/sales"],
  Accountant: ["/finance"],
};

for (const [role, paths] of Object.entries(expectedPaths)) {
  assert.deepEqual(getPilotPathsForRole(role), paths, `${role} navigation`);
  assert.equal(getPilotHomePath([role]), paths[0], `${role} home`);
  for (const path of paths) {
    assert.equal(isPilotPathVisible(path, [role]), true, `${role}: ${path}`);
    assert.equal(
      isPilotPathVisible(`${path}/details`, [role]),
      true,
      `${role}: nested ${path}`,
    );
  }
}

for (const role of Object.keys(expectedPaths)) {
  for (const hiddenPath of [
    "/dashboard/operations",
    "/reports",
    "/audit",
    "/mechanic",
    "/attendance",
  ]) {
    assert.equal(
      isPilotPathVisible(hiddenPath, [role]),
      false,
      `${role} must not see ${hiddenPath}`,
    );
  }
}

assert.equal(isPilotPathVisible("/profile", ["Seller"]), true);
assert.equal(isPilotPathVisible("/notifications", ["Accountant"]), true);
assert.equal(getPilotHomePath(["Mechanic"]), "/profile");

console.log("Pilot navigation matrix: 6/6 personas passed.");
console.log("Pilot-hidden modules: 5/5 paths passed for every persona.");
