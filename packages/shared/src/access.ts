import { hasAllPermissions, type PermissionKey } from "./permissions.ts";

/**
 * Tenant-facing product areas, shared by Web and Native Mobile so both clients
 * gate the same area with the same permissions and the same pilot role scope.
 * `webPath` is the Web route prefix; Mobile maps the key to its own route.
 */
export const TENANT_AREAS = {
  dashboardExecutive: {
    webPath: "/dashboard/executive",
    label: "Boshqaruv paneli",
    requiredPermissions: ["dashboard.view"],
  },
  dashboardOperations: {
    webPath: "/dashboard/operations",
    label: "Boshqaruv paneli",
    requiredPermissions: ["dashboard.view"],
  },
  production: {
    webPath: "/production",
    label: "Ishlab chiqarish",
    requiredPermissions: ["production.view"],
  },
  machines: {
    webPath: "/machines",
    label: "Stanoklar",
    requiredPermissions: ["machines.view"],
  },
  mechanic: {
    webPath: "/mechanic",
    label: "Mexanik ish maydoni",
    requiredPermissions: ["maintenance.view", "quality.view"],
  },
  warehouse: {
    webPath: "/warehouse",
    label: "Ombor",
    requiredPermissions: ["warehouse.view"],
  },
  sales: {
    webPath: "/sales",
    label: "Sotuvlar",
    requiredPermissions: ["sales.view"],
  },
  finance: {
    webPath: "/finance",
    label: "Moliya",
    requiredPermissions: ["finance.view"],
  },
  employees: {
    webPath: "/employees",
    label: "Xodimlar",
    requiredPermissions: ["employees.view"],
  },
  attendance: {
    webPath: "/attendance",
    label: "Davomat",
    requiredPermissions: ["attendance.view"],
  },
  reports: {
    webPath: "/reports",
    label: "Hisobotlar",
    requiredPermissions: ["reports.view"],
  },
  audit: {
    webPath: "/audit",
    label: "Audit jurnali",
    requiredPermissions: ["audit.view"],
  },
  settings: {
    webPath: "/settings",
    label: "Sozlamalar",
    requiredPermissions: ["settings.view"],
  },
} as const satisfies Record<
  string,
  { webPath: string; label: string; requiredPermissions: readonly PermissionKey[] }
>;

export type TenantAreaKey = keyof typeof TENANT_AREAS;

const MANAGEMENT_AREAS: readonly TenantAreaKey[] = [
  "dashboardExecutive",
  "dashboardOperations",
  "production",
  "machines",
  "warehouse",
  "sales",
  "finance",
  "employees",
  "attendance",
  "reports",
  "audit",
  "settings",
];

/**
 * Pilot scope: which areas each role works in, in landing-priority order.
 * A role absent from this map (e.g. the unresolved Mechanic Master) sees no
 * operational area. "audit" is listed for Manager although Manager lacks
 * `audit.view`: nothing links there, and an unauthorized visit then reports
 * the real permission error instead of "not in pilot".
 */
export const PILOT_ROLE_AREAS: Record<string, readonly TenantAreaKey[]> = {
  Owner: MANAGEMENT_AREAS,
  Manager: MANAGEMENT_AREAS,
  "Shift Receiver": ["production", "machines"],
  "Warehouse Operator": ["warehouse"],
  Seller: ["sales"],
  Accountant: ["finance"],
  Mechanic: ["mechanic"],
};

export function isAreaInPilotScope(area: TenantAreaKey, roles: readonly string[]): boolean {
  return roles.some((role) => (PILOT_ROLE_AREAS[role] ?? []).includes(area));
}

export type AreaAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: string; requiredPermissions: readonly string[] };

export function resolveAreaAccess(
  area: TenantAreaKey,
  permissions: readonly string[],
  roles: readonly string[],
  options: { pilotScopeEnabled?: boolean } = {},
): AreaAccessDecision {
  const definition = TENANT_AREAS[area];

  if ((options.pilotScopeEnabled ?? true) && !isAreaInPilotScope(area, roles)) {
    return {
      allowed: false,
      reason: "Bu bo‘lim pilot doirasiga kiritilmagan.",
      requiredPermissions: [],
    };
  }

  if (!hasAllPermissions(permissions, definition.requiredPermissions)) {
    return {
      allowed: false,
      reason: `«${definition.label}» bo‘limiga ruxsatingiz yo‘q.`,
      requiredPermissions: definition.requiredPermissions,
    };
  }

  return { allowed: true };
}
