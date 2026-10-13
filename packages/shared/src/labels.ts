/**
 * Uzbek labels for backend enum values, shared by Web and Native Mobile.
 * Keep raw enum values for logic/API only — never render them bare.
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

export const visibleStatusLabels: Record<string, string> = {
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

export function formatRoleName(name: string): string {
  return roleNameLabel[name] ?? name;
}
