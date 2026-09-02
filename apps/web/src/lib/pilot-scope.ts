export const PILOT_SCOPE_ENABLED =
  process.env.NEXT_PUBLIC_PILOT_SCOPE_MODE !== "false";

const PILOT_ROLE_PATHS: Record<string, readonly string[]> = {
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

const ALWAYS_VISIBLE_PATHS = ["/profile", "/notifications", "/guide"] as const;

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
