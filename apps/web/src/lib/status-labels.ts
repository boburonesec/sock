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

/**
 * Stock movement `reason` codes → Uzbek label. A stock-correction reason is
 * free text the user typed in ("Sabab" field), so unknown values pass through
 * unchanged instead of being blanked out.
 */
export const stockMovementReasonLabel: Record<string, string> = {
  FINISHED_PRODUCT_RECEIPT: "Tayyor mahsulot qabul qilindi",
  MATERIAL_RECEIPT: "Xomashyo qabul qilindi",
  PRODUCTION_BATCH_CREATED: "Ishlab chiqarish partiyasi ochildi",
  ORDER_DELIVERY: "Buyurtma yetkazib berildi",
  ORDER_DELIVERY_RETURN: "Yetkazib berish qaytarildi",
};

export function formatStockMovementReason(reason: string | null | undefined): string {
  if (!reason) return "—";
  return stockMovementReasonLabel[reason] ?? reason;
}

/** Some historical records store the English "pcs" unit; normalize to "dona" for display. */
export function formatStockUnit(unit: string): string {
  return unit === "pcs" ? "dona" : unit;
}

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
  STAGE_INVENTORY_INCREASED: "Bosqich qoldig‘i oshirildi",
  STAGE_INVENTORY_DECREASED: "Bosqich qoldig‘i kamaytirildi",
  TELEGRAM_ACCOUNT_LINKED: "Telegram hisobi bog‘landi",
  TELEGRAM_ACCOUNT_UNLINKED: "Telegram hisobi uzildi",
  TELEGRAM_ACCOUNT_BLOCKED: "Telegram hisobi bloklandi",
  TELEGRAM_LINK_TOKEN_CREATED: "Telegram ulash kodi yaratildi",
};

export function formatAuditAction(action: string): string {
  return auditActionLabel[action] ?? action.replaceAll("_", " ");
}

const auditEntityTypeLabel: Record<string, string> = {
  StageInventory: "Ishlab chiqarish qoldig‘i",
  TelegramAccount: "Telegram hisobi",
  TelegramLinkToken: "Telegram ulash kodi",
  Order: "Buyurtma",
  Payment: "Mijoz to‘lovi",
  Expense: "Xarajat",
  Advance: "Avans",
  Employee: "Xodim",
  PayrollPeriod: "Ish haqi davri",
  StockMovement: "Ombor harakati",
};

export function formatAuditEntityType(value: string): string {
  return auditEntityTypeLabel[value] ?? value.replace(/([a-z])([A-Z])/g, "$1 $2");
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
  Mechanic: "Mexanik",
  "Mechanic Master": "Mexanik-master",
};

const visibleStatusLabels: Record<string, string> = {
  ...entityStatusLabel,
  ...orderStatusLabel,
  ...paymentStatusLabel,
  ...advanceStatusLabel,
  ...expenseStatusLabel,
  ...payrollPeriodStatusLabel,
  OPEN: "Ochiq",
  IN_PROGRESS: "Bajarilmoqda",
  COMPLETED: "Bajarilgan",
  PLANNED: "Rejalashtirilgan",
  RUNNING: "Ishlamoqda",
  STOPPED: "To‘xtagan",
  HOLD: "To‘xtatib turilgan",
  LOW: "Past",
  MEDIUM: "O‘rta",
  HIGH: "Yuqori",
  CRITICAL: "Jiddiy",
  MAINTENANCE: "Texnik xizmat",
  BREAKDOWN: "Nosozlik",
  REPAIR: "Ta’mirlash",
  SETUP: "Sozlash",
  INSPECTION: "Tekshiruv",
  URGENT: "Shoshilinch",
  QUALITY: "Sifat nazorati",
  PASSED: "Me’yorda",
  ATTENTION: "E’tibor kerak",
  RECHECK_DUE: "Qayta tekshiruv vaqti",
  ESCALATED: "Rahbar e’tiborida",
  RESOLVED: "Hal qilingan",
  OTHER: "Boshqa",
};

/** Replaces raw backend status tokens inside user-facing summary sentences. */
export function formatVisibleStatusText(value: string): string {
  return value.replace(/\b[A-Z][A-Z_]+\b/g, (token) => visibleStatusLabels[token] ?? token.replaceAll("_", " "));
}

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
