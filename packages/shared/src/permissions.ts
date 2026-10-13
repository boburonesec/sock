/**
 * Tenant permission keys. The API owns enforcement
 * (apps/api/src/common/role-permissions.ts); scripts/contract-test.mjs fails
 * when this list and the API definition drift apart.
 */
export const PERMISSION_KEYS = [
  "dashboard.view",
  "production.view",
  "production.write",
  "production.approve",
  "warehouse.view",
  "warehouse.write",
  "sales.view",
  "sales.write",
  "finance.view",
  "finance.write",
  "payroll.approve",
  "expense.approve",
  "expense.pay",
  "employees.view",
  "employees.write",
  "attendance.view",
  "machines.view",
  "machines.write",
  "maintenance.view",
  "maintenance.write",
  "quality.view",
  "quality.write",
  "reports.view",
  "settings.view",
  "settings.write",
  "audit.view",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const TENANT_ROLE_NAMES = [
  "Owner",
  "Manager",
  "Accountant",
  "Seller",
  "Warehouse Operator",
  "Shift Receiver",
  "Mechanic",
  "Mechanic Master",
] as const;

export type TenantRoleName = (typeof TENANT_ROLE_NAMES)[number];

export function hasPermission(permissions: readonly string[], required: string): boolean {
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
