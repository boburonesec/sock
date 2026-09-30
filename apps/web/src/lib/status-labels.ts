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
  AUTH_LOGIN_BLOCKED: "Kirish bloklandi",
  CLIENT_CREATED: "Mijoz yaratildi",
  CLIENT_UPDATED: "Mijoz tahrirlandi",
  CLIENT_ARCHIVED: "Mijoz arxivlandi",
  CLIENT_PAYMENT_CREATED: "Mijoz to‘lovi kiritildi",
  CLIENT_PAYMENT_ALLOCATED: "Mijoz to‘lovi taqsimlandi",
  CORRECTION_REQUEST_CREATED: "Tuzatish so‘rovi yuborildi",
  CORRECTION_REQUEST_RESOLVED: "Tuzatish so‘rovi hal qilindi",
  DEFECT_CREATED: "Brak qayd etildi",
  EMPLOYEE_CREATED: "Xodim yaratildi",
  EMPLOYEE_UPDATED: "Xodim tahrirlandi",
  FACTORY_CREATED: "Fabrika yaratildi",
  FINISHED_PRODUCT_RECEIVED: "Tayyor mahsulot qabul qilindi",
  MACHINE_CREATED: "Stanok qo‘shildi",
  MACHINE_UPDATED: "Stanok tahrirlandi",
  MACHINE_MECHANIC_ASSIGNED: "Stanokka mexanik biriktirildi",
  MAINTENANCE_TASK_UPDATED: "Texnik vazifa yangilandi",
  MATERIAL_RECEIVED: "Xomashyo qabul qilindi",
  MATERIAL_STOCK_INCREASED: "Xomashyo qoldig‘i oshirildi",
  ORGANIZATION_FACTORY_CREATED: "Fabrika yaratildi",
  ORGANIZATION_USER_CREATED: "Foydalanuvchi yaratildi",
  ORGANIZATION_USER_FACTORY_ACCESS_UPDATED: "Foydalanuvchi fabrika ruxsati yangilandi",
  ORGANIZATION_USER_PASSWORD_RESET: "Foydalanuvchi paroli tiklandi",
  PAYROLL_APPROVAL_INVALIDATED: "Ish haqi tasdig‘i bekor bo‘ldi",
  PAYROLL_PAYMENT_CREATED: "Ish haqi to‘landi",
  PAYROLL_PERIOD_CALCULATED: "Ish haqi hisoblandi",
  PAYROLL_PERIOD_PAYMENT_STATUS_UPDATED: "Ish haqi to‘lov holati yangilandi",
  PAYROLL_REVISION_APPROVED: "Ish haqi tasdiqlandi",
  PLATFORM_ADMIN_LOGIN: "Platforma admini kirdi",
  PLATFORM_ADMIN_LOGOUT: "Platforma admini chiqdi",
  PLATFORM_ADMIN_PASSWORD_CHANGED: "Platforma admini paroli o‘zgartirildi",
  PLATFORM_ADMIN_REFRESH: "Platforma admini sessiyasi yangilandi",
  PLATFORM_AUTH_LOGIN_BLOCKED: "Platforma kirishi bloklandi",
  PRODUCTION_BATCH_CREATED: "Ishlab chiqarish partiyasi ochildi",
  PRODUCTION_RUN_INTAKE_CREATED: "Ishlab chiqarishga xomashyo qabul qilindi",
  PRODUCTION_RUN_STARTED: "Ishlab chiqarish boshlandi",
  PRODUCTION_STAGE_CREATED: "Bosqich yaratildi",
  PRODUCTION_STAGE_UPDATED: "Bosqich tahrirlandi",
  PRODUCTION_STAGE_ARCHIVED: "Bosqich arxivlandi",
  PRODUCT_CREATED: "Mahsulot yaratildi",
  PRODUCT_UPDATED: "Mahsulot tahrirlandi",
  PRODUCT_ARCHIVED: "Mahsulot arxivlandi",
  PRODUCT_PRICE_CREATED: "Narx belgilandi",
  PRODUCT_VARIANT_CREATED: "Variant yaratildi",
  PRODUCT_VARIANT_UPDATED: "Variant tahrirlandi",
  PRODUCT_VARIANT_ARCHIVED: "Variant arxivlandi",
  SALARY_RATE_CREATED: "Ishbay stavka belgilandi",
  SALARY_RATE_ARCHIVED: "Ishbay stavka arxivlandi",
  SALES_ORDER_UPDATED: "Buyurtma tahrirlandi",
  SALES_ORDER_CANCELLED: "Buyurtma bekor qilindi",
  SALES_ORDER_DELIVERED: "Buyurtma yetkazildi",
  SALES_ORDER_DELIVERY_RETURNED: "Yetkazib berish qaytarildi",
  SALES_ORDER_PAYMENT_STATUS_UPDATED: "Buyurtma to‘lov holati yangilandi",
  SHIFT_RECONCILIATION_SUBMITTED: "Smena yakuni yuborildi",
  SHIFT_RECONCILIATION_ACCEPTED: "Smena yakuni qabul qilindi",
  SHIFT_RECONCILIATION_RETURNED: "Smena yakuni qaytarildi",
  STAGE_MOVEMENT_CREATED: "Bosqichlararo o‘tkazma",
  STOCK_INCREASED: "Qoldiq oshirildi",
  STOCK_DECREASED: "Qoldiq kamaytirildi",
  STOCK_MOVEMENT_CREATED: "Ombor harakati",
  SUPPLIER_CREATED: "Yetkazib beruvchi yaratildi",
  SUPPLIER_UPDATED: "Yetkazib beruvchi tahrirlandi",
  SUPPLIER_ARCHIVED: "Yetkazib beruvchi arxivlandi",
  SUPPLIER_PAYMENT_CREATED: "Yetkazib beruvchiga to‘lov",
  SUPPLIER_PAYMENT_ALLOCATED: "Yetkazib beruvchi to‘lovi taqsimlandi",
  SUPPLIER_PURCHASE_CREATED: "Xarid kiritildi",
  SUPPLIER_PURCHASE_PAYMENT_STATUS_UPDATED: "Xarid to‘lov holati yangilandi",
  TENANT_CREATED: "Korxona yaratildi",
  TENANT_ACTIVATED: "Korxona faollashtirildi",
  TENANT_SUSPENDED: "Korxona to‘xtatildi",
  TENANT_BRANCH_MODE_UPDATED: "Filial rejimi yangilandi",
  TENANT_OWNER_CREATED: "Korxona egasi yaratildi",
  TENANT_USER_PASSWORD_UPDATED: "Foydalanuvchi paroli yangilandi",
  USER_EMPLOYEE_LINKED: "Foydalanuvchi xodimga bog‘landi",
  USER_FACTORY_ACCESS_ASSIGNED: "Fabrika ruxsati berildi",
  USER_ROLE_ASSIGNED: "Rol biriktirildi",
  USER_PASSWORD_CHANGED: "Parol o‘zgartirildi",
  USER_PASSWORD_RESET: "Parol tiklandi",
  WAREHOUSE_HANDOFF_STAGE_CONFIGURED: "Omborga topshirish bosqichi belgilandi",
  WORKER_ACTIVITY_CREATED: "Ishchi faolligi kiritildi",
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
