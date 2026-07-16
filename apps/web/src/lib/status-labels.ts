/**
 * Uzbek labels for backend enum statuses shown in UI.
 * Keep raw enum values only for logic/API — never render them bare in tables.
 */

const FALLBACK = (value: string) => value;

export function labelStatus(
  map: Record<string, string>,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return map[value] ?? FALLBACK(value);
}

/** Employee / user / client / supplier lifecycle */
export const entityStatusLabel: Record<string, string> = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  SUSPENDED: "To‘xtatilgan",
  ARCHIVED: "Arxivlangan",
  PENDING: "Kutilmoqda",
  CANCELLED: "Bekor qilingan",
  PILOT: "Sinov",
};

/** Sales order lifecycle */
export const orderStatusLabel: Record<string, string> = {
  DRAFT: "Qoralama",
  CONFIRMED: "Tasdiqlangan",
  WAITING_PRODUCTION: "Ishlab chiqarish kutilmoqda",
  READY: "Tayyor",
  DELIVERED: "Yetkazilgan",
  CLOSED: "Yopilgan",
  CANCELLED: "Bekor qilingan",
};

/** Payment status on orders */
export const paymentStatusLabel: Record<string, string> = {
  UNPAID: "To‘lanmagan",
  PARTIALLY_PAID: "Qisman to‘langan",
  PAID: "To‘langan",
};

/** Advances */
export const advanceStatusLabel: Record<string, string> = {
  REQUESTED: "So‘ralgan",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
  PAID: "To‘langan",
  APPLIED: "Hisobga olingan",
  CANCELLED: "Bekor qilingan",
};

/** Expenses */
export const expenseStatusLabel: Record<string, string> = {
  REQUESTED: "So‘ralgan",
  DRAFT: "Qoralama",
  PENDING: "Kutilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
  PAID: "To‘langan",
  CANCELLED: "Bekor qilingan",
};

/** Warehouse stock movement types */
export const stockMovementTypeLabel: Record<string, string> = {
  RECEIPT: "Kirim",
  ISSUE: "Chiqim",
  PRODUCTION_RECEIPT: "Ishlab chiqarish kirimi",
  TRANSFER: "Transfer",
  RETURN: "Qaytarish",
  CORRECTION: "Tuzatish",
};

export const stockItemTypeLabel: Record<string, string> = {
  PRODUCT: "Mahsulot",
  MATERIAL: "Material",
};

/** Warehouse zone canonical names → operator-facing Uzbek */
export const warehouseZoneNameLabel: Record<string, string> = {
  "Finished Products": "Tayyor mahsulot",
  "Raw Materials": "Xom ashyo",
  Packaging: "Qadoqlash",
  Labels: "Etiketka",
  Defects: "Brak",
  "Main Warehouse": "Asosiy ombor",
  "Asosiy ombor": "Asosiy ombor",
};

export function formatWarehouseZoneName(name: string): string {
  return warehouseZoneNameLabel[name] ?? name;
}

/** Common audit action labels */
export const auditActionLabel: Record<string, string> = {
  EXPENSE_CREATED: "Xarajat yaratildi",
  EXPENSE_APPROVED: "Xarajat tasdiqlandi",
  EXPENSE_REJECTED: "Xarajat rad etildi",
  EXPENSE_PAID: "Xarajat to‘landi",
  EXPENSE_CANCELLED: "Xarajat bekor qilindi",
  ADVANCE_CREATED: "Avans so‘rovi",
  ADVANCE_APPROVED: "Avans tasdiqlandi",
  ADVANCE_REJECTED: "Avans rad etildi",
  ADVANCE_PAID: "Avans to‘landi",
  BONUS_CREATED: "Bonus yaratildi",
  PENALTY_CREATED: "Jarima yaratildi",
  LOW_STOCK_THRESHOLD_UPSERTED: "Past qoldiq limiti",
  STOCK_CORRECTED: "Qoldiq tuzatildi",
  CLIENT_PAYMENT_REVERSED: "Mijoz to‘lovi bekor",
  EMPLOYEE_INACTIVATED: "Xodim nofaol",
  SALES_ORDER_CREATED: "Buyurtma yaratildi",
  ORDER_CREATED: "Buyurtma yaratildi",
  PAYROLL_PERIOD_CREATED: "Ish haqi davri",
  PAYROLL_PERIOD_CLOSED: "Ish haqi yopildi",
};

export function formatAuditAction(action: string): string {
  return auditActionLabel[action] ?? action.replaceAll("_", " ");
}

/** Payroll period */
export const payrollPeriodStatusLabel: Record<string, string> = {
  DRAFT: "Qoralama",
  CALCULATED: "Hisoblangan",
  PARTIALLY_PAID: "Qisman to‘langan",
  PAID: "To‘langan",
  CLOSED: "Yopilgan",
};

/** Payroll item / detail row */
export const payrollItemStatusLabel: Record<string, string> = {
  DRAFT: "Qoralama",
  CALCULATED: "Hisoblangan",
  PARTIALLY_PAID: "Qisman to‘langan",
  PAID: "To‘langan",
  CLOSED: "Yopilgan",
  UNPAID: "To‘lanmagan",
  CARRIED_FORWARD: "Keyingi oyga o‘tkazilgan",
};

/** Warehouse zone / stock health */
export const zoneStatusLabel: Record<string, string> = {
  NORMAL: "Me’yorda",
  ATTENTION: "Kuzatuvda",
  HIGH: "Yuqori",
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
};

/** Human labels for system roles (API stores English keys). */
export const roleNameLabel: Record<string, string> = {
  Owner: "Korxona egasi",
  Manager: "Menejer",
  Accountant: "Buxgalter",
  Seller: "Sotuvchi",
  "Warehouse Operator": "Omborchi",
  "Shift Receiver": "Smena qabul qiluvchi",
};

/** Human labels for permission keys (never show raw keys to operators). */
export const permissionKeyLabel: Record<string, string> = {
  "dashboard.view": "Boshqaruv panelini ko‘rish",
  "production.view": "Ishlab chiqarishni ko‘rish",
  "production.write": "Ishlab chiqarishni kiritish/o‘zgartirish",
  "warehouse.view": "Omborni ko‘rish",
  "warehouse.write": "Ombor harakatlarini kiritish",
  "sales.view": "Sotuvlarni ko‘rish",
  "sales.write": "Sotuv/buyurtma/to‘lov kiritish",
  "finance.view": "Moliyani ko‘rish",
  "finance.write": "Moliya/avans/ish haqi yozish",
  "employees.view": "Ishbay xodimlarni ko‘rish",
  "attendance.view": "Xodimlar davomatini ko‘rish",
  "employees.write": "Ishbay xodimlarni boshqarish",
  "reports.view": "Hisobotlarni ko‘rish",
  "settings.view": "Sozlamalarni ko‘rish",
  "settings.write": "Sozlamalarni o‘zgartirish",
  "audit.view": "Audit jurnalini ko‘rish",
};

export function formatRoleName(name: string): string {
  return roleNameLabel[name] ?? name;
}

export function formatPermissionKey(key: string): string {
  return permissionKeyLabel[key] ?? key;
}

/** Generic report / settings meta status */
export const metaStatusLabel: Record<string, string> = {
  READY: "Tayyor",
  DRAFT: "Qoralama",
  PENDING: "Kutilmoqda",
  CONFIGURED: "Sozlangan",
  NEEDS_ATTENTION: "E’tibor kerak",
  AVAILABLE: "Mavjud",
  EMPTY: "Bo‘sh",
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  SUCCESS: "Muvaffaqiyatli",
  FAILED: "Xato",
  INFO: "Ma’lumot",
};
