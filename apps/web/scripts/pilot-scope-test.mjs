import assert from "node:assert/strict";
import {
  getPilotHomePath,
  getPilotPathsForRole,
  isPilotPathVisible,
} from "../src/lib/pilot-scope.ts";

// Reports, Audit, Attendance and the Operations dashboard are documented as
// production-ready (docs/MVP_KNOWN_LIMITATIONS_V2.md, page-map-v1.md) and are
// already linked from the dashboard quick-links and the Employees module's
// "Davomat" tab. Owner and Manager now include them so those existing links
// resolve instead of hitting a pilot-scope 403 (see pilot-scope.ts).
const expectedPaths = {
  Owner: [
    "/dashboard/executive",
    "/dashboard/operations",
    "/production",
    "/machines",
    "/warehouse",
    "/sales",
    "/finance",
    "/employees",
    "/attendance",
    "/reports",
    "/audit",
    "/settings",
  ],
  Manager: [
    "/dashboard/executive",
    "/dashboard/operations",
    "/production",
    "/machines",
    "/warehouse",
    "/sales",
    "/finance",
    "/employees",
    "/attendance",
    "/reports",
    "/audit",
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

// Narrow-scope roles (everyone except Owner/Manager) still see none of these.
const narrowRoles = ["Shift Receiver", "Warehouse Operator", "Seller", "Accountant"];
for (const role of narrowRoles) {
  for (const hiddenPath of [
    "/dashboard/operations",
    "/reports",
    "/audit",
    "/mechanic",
    "/attendance",
    "/guide",
  ]) {
    assert.equal(
      isPilotPathVisible(hiddenPath, [role]),
      false,
      `${role} must not see ${hiddenPath}`,
    );
  }
}

// Owner/Manager: still no /mechanic or /guide (never added to their scope).
for (const role of ["Owner", "Manager"]) {
  for (const hiddenPath of ["/mechanic", "/guide"]) {
    assert.equal(
      isPilotPathVisible(hiddenPath, [role]),
      false,
      `${role} must not see ${hiddenPath}`,
    );
  }
}

// Manager lacks `audit.view` (docs: "Manager'da yo'q") — pilot-scope allows
// the path so the real permission check produces the accurate denial
// instead of the generic "not in pilot" message, but isPilotPathVisible
// itself only encodes pilot-surface scope, not per-permission RBAC, so it
// stays true here; access-control.ts + backend RBAC are what actually gate
// Manager out of /audit content.
assert.equal(isPilotPathVisible("/audit", ["Manager"]), true, "Manager: /audit is in pilot scope (permission layer denies it)");

assert.equal(isPilotPathVisible("/profile", ["Seller"]), true);
assert.equal(isPilotPathVisible("/notifications", ["Accountant"]), true);
assert.equal(getPilotHomePath(["Mechanic"]), "/mechanic");

console.log("Pilot navigation matrix: 6/6 personas passed.");
console.log("Pilot-hidden modules: narrow-scope roles + Owner/Manager mechanic/guide checks passed.");
