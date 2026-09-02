import { getPilotHomePath, isPilotPathVisible } from "@/lib/pilot-scope";

/**
 * Frontend access control — mirror of backend permission gates.
 * Sidebar hiding alone is not enough: URL paste must also be blocked.
 */

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: string; requiredPermissions: string[] };

/** Longest-prefix wins. More specific routes first within same prefix group. */
const ROUTE_PERMISSION_RULES: Array<{
  match: (pathname: string) => boolean;
  requiredPermissions: string[];
  ownerOnly?: boolean;
  label: string;
}> = [
  {
    match: (p) => p === "/profile" || p.startsWith("/profile/"),
    requiredPermissions: [],
    label: "Profil",
  },
  {
    match: (p) => p === "/notifications" || p.startsWith("/notifications/"),
    requiredPermissions: [],
    label: "Bildirishnomalar",
  },
  {
    match: (p) => p.startsWith("/dashboard"),
    requiredPermissions: ["dashboard.view"],
    label: "Boshqaruv paneli",
  },
  {
    match: (p) => p.startsWith("/reports"),
    requiredPermissions: ["reports.view"],
    label: "Hisobotlar",
  },
  {
    match: (p) => p.startsWith("/audit"),
    requiredPermissions: ["audit.view"],
    label: "Audit jurnali",
  },
  {
    match: (p) => p.startsWith("/mechanic"),
    requiredPermissions: ["maintenance.view", "quality.view"],
    label: "Mexanik ish maydoni",
  },
  {
    match: (p) => p.startsWith("/machines"),
    requiredPermissions: ["machines.view"],
    label: "Stanoklar",
  },
  {
    match: (p) => p.startsWith("/production"),
    requiredPermissions: ["production.view"],
    label: "Ishlab chiqarish",
  },
  {
    match: (p) => p.startsWith("/warehouse"),
    requiredPermissions: ["warehouse.view"],
    label: "Ombor",
  },
  {
    match: (p) => p.startsWith("/sales"),
    requiredPermissions: ["sales.view"],
    label: "Sotuvlar",
  },
  {
    match: (p) => p.startsWith("/finance"),
    requiredPermissions: ["finance.view"],
    label: "Moliya",
  },
  {
    match: (p) => p.startsWith("/attendance"),
    requiredPermissions: ["attendance.view"],
    label: "Davomat",
  },
  {
    match: (p) => p.startsWith("/employees"),
    requiredPermissions: ["employees.view"],
    label: "Xodimlar",
  },
  {
    match: (p) => p === "/settings/company" || p.startsWith("/settings/company/"),
    requiredPermissions: ["settings.view"],
    ownerOnly: true,
    label: "Korxona sozlamalari",
  },
  {
    match: (p) => p.startsWith("/settings"),
    requiredPermissions: ["settings.view"],
    label: "Sozlamalar",
  },
  {
    match: (p) => p.startsWith("/design-system"),
    requiredPermissions: ["settings.view"],
    label: "Design system",
  },
];

/** Preferred landing path order after login. */
const HOME_CANDIDATES: Array<{ href: string; permission?: string }> = [
  { href: "/dashboard/executive", permission: "dashboard.view" },
  { href: "/mechanic", permission: "maintenance.view" },
  { href: "/production", permission: "production.view" },
  { href: "/sales", permission: "sales.view" },
  { href: "/warehouse", permission: "warehouse.view" },
  { href: "/finance", permission: "finance.view" },
  { href: "/employees", permission: "employees.view" },
  { href: "/attendance", permission: "attendance.view" },
  { href: "/reports", permission: "reports.view" },
  { href: "/settings", permission: "settings.view" },
  { href: "/profile" },
];

export function hasPermission(
  permissions: readonly string[],
  required: string,
): boolean {
  return permissions.includes(required);
}

export function hasAllPermissions(
  permissions: readonly string[],
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  return required.every((key) => permissions.includes(key));
}

export function hasAnyPermission(
  permissions: readonly string[],
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  return required.some((key) => permissions.includes(key));
}

export function resolveRouteAccess(
  pathname: string,
  permissions: readonly string[],
  roles: readonly string[] = [],
): AccessDecision {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname || "/";

  // Root app path — send through home resolution (allowed if any home exists).
  if (normalized === "/" || normalized === "") {
    return { allowed: true };
  }

  if (!isPilotPathVisible(normalized, roles)) {
    return {
      allowed: false,
      reason: "Bu bo‘lim pilot doirasiga kiritilmagan.",
      requiredPermissions: [],
    };
  }

  const rule = ROUTE_PERMISSION_RULES.find((entry) => entry.match(normalized));

  if (!rule) {
    // Default-deny: unknown routes (placeholders) must not open for any role.
    return {
      allowed: false,
      reason: "Bu sahifa mavjud emas yoki sizga ochilmagan.",
      requiredPermissions: [],
    };
  }

  if (rule.ownerOnly && !roles.includes("Owner")) {
    return {
      allowed: false,
      reason: "Bu sahifa faqat korxona egasi uchun.",
      requiredPermissions: rule.requiredPermissions,
    };
  }

  if (!hasAllPermissions(permissions, rule.requiredPermissions)) {
    return {
      allowed: false,
      reason: `«${rule.label}» bo‘limiga ruxsatingiz yo‘q.`,
      requiredPermissions: [...rule.requiredPermissions],
    };
  }

  return { allowed: true };
}

export function getDefaultHomePath(
  permissions: readonly string[],
  roles: readonly string[] = [],
): string {
  const pilotHomePath = getPilotHomePath(roles);
  if (pilotHomePath) return pilotHomePath;

  for (const candidate of HOME_CANDIDATES) {
    if (!candidate.permission || permissions.includes(candidate.permission)) {
      return candidate.href;
    }
  }
  return "/profile";
}

export function getRequiredPermissionsForPath(pathname: string): string[] {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname || "/";
  const rule = ROUTE_PERMISSION_RULES.find((entry) => entry.match(normalized));
  return rule ? [...rule.requiredPermissions] : [];
}
