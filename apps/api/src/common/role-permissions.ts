/**
 * Default tenant role → permission matrix.
 * Keep platform-admin bootstrap and seed in sync via this module.
 */
export const PERMISSION_DEFINITIONS = [
  'dashboard.view',
  'production.view',
  'production.write',
  'warehouse.view',
  'warehouse.write',
  'sales.view',
  'sales.write',
  'finance.view',
  'finance.write',
  'employees.view',
  'employees.write',
  'attendance.view',
  'machines.view',
  'machines.write',
  'maintenance.view',
  'maintenance.write',
  'quality.view',
  'quality.write',
  'reports.view',
  'settings.view',
  'settings.write',
  'audit.view',
] as const;

export type PermissionKey = (typeof PERMISSION_DEFINITIONS)[number];

/**
 * Seller has warehouse.view so they can check finished-product stock
 * before taking orders. warehouse.write stays with warehouse roles only.
 */
export const ROLE_PERMISSIONS: Record<string, readonly PermissionKey[]> = {
  Owner: PERMISSION_DEFINITIONS,
  Manager: [
    'dashboard.view',
    'production.view',
    'production.write',
    'warehouse.view',
    'warehouse.write',
    'sales.view',
    'sales.write',
    'finance.view',
    'finance.write',
    'employees.view',
    'employees.write',
    'attendance.view',
    'reports.view',
    'settings.view',
    'settings.write',
  ],
  Accountant: [
    'finance.view',
    'finance.write',
    'sales.view',
    'reports.view',
    'warehouse.view',
  ],
  Seller: ['sales.view', 'sales.write', 'warehouse.view'],
  'Warehouse Operator': ['warehouse.view', 'warehouse.write'],
  'Shift Receiver': ['production.view', 'production.write', 'machines.view'],
  Mechanic: [
    'production.view',
    'machines.view',
    'maintenance.view',
    'maintenance.write',
    'quality.view',
    'quality.write',
  ],
  'Mechanic Master': [
    'production.view',
    'production.write',
    'machines.view',
    'machines.write',
    'maintenance.view',
    'maintenance.write',
    'quality.view',
    'quality.write',
    'employees.view',
  ],
};
