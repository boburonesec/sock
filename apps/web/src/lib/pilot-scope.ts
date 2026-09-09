export const PILOT_SCOPE_ENABLED =
  process.env.NEXT_PUBLIC_PILOT_SCOPE_MODE !== "false";

// Reports, Audit, Attendance and the Operations dashboard are documented as
// production-ready (docs/MVP_KNOWN_LIMITATIONS_V2.md "What is production-ready",
// page-map-v1.md "Shipped") and were already linked from the dashboard quick-links
// and the Employees module's "Davomat" tab. They were missing from this allowlist
// by omission, which turned those existing links into pilot-scope 403 dead ends.
// "/audit" is listed for Manager too even though Manager lacks `audit.view` —
// no UI links Manager to it, and leaving it here means an unauthorized visit
// falls through to the real permission check (accurate "ruxsatingiz yo'q")
// instead of the generic "not in pilot" message.
const PILOT_ROLE_PATHS: Record<string, readonly string[]> = {
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
  Mechanic: ["/mechanic"],
};

const ALWAYS_VISIBLE_PATHS = ["/profile", "/notifications"] as const;

function matchesPath(pathname: string, allowedPath: string): boolean {
  const cleanPath = pathname.split("?")[0].split("#")[0];
  return cleanPath === allowedPath || cleanPath.startsWith(`${allowedPath}/`);
}

export function isPilotPathVisible(
  pathname: string,
  roles: readonly string[],
): boolean {
  if (!PILOT_SCOPE_ENABLED) return true;
  if (ALWAYS_VISIBLE_PATHS.some((path) => matchesPath(pathname, path))) {
    return true;
  }

  return roles.some((role) =>
    (PILOT_ROLE_PATHS[role] ?? []).some((path) => matchesPath(pathname, path)),
  );
}

export function getPilotHomePath(roles: readonly string[]): string | null {
  if (!PILOT_SCOPE_ENABLED) return null;

  for (const role of roles) {
    const firstPath = PILOT_ROLE_PATHS[role]?.[0];
    if (firstPath) return firstPath;
  }

  return "/profile";
}

export function getPilotPathsForRole(role: string): readonly string[] {
  return PILOT_ROLE_PATHS[role] ?? [];
}
