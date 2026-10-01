// Factories operate in Asia/Tashkent; pin display so a phone set to another
// zone (or UTC) does not shift late-evening records to the previous day.
const FACTORY_TIME_ZONE = "Asia/Tashkent";

function formatInFactoryZone(date: Date, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat("uz-UZ", { ...options, timeZone: FACTORY_TIME_ZONE }).format(date);
  } catch {
    // Older Hermes/Intl builds without IANA zone data: fall back to device zone.
    return new Intl.DateTimeFormat("uz-UZ", options).format(date);
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatInFactoryZone(date, { year: "numeric", month: "short", day: "numeric" });
}

export function formatMonth(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatInFactoryZone(date, { year: "numeric", month: "long" });
}

/**
 * Formats a backend decimal string ("1500000.00") for display only — the value
 * is never parsed into a float or recalculated on the device.
 */
export function formatAmount(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());

  if (!match) {
    return `${value} so'm`;
  }

  const [, sign = "", whole = "", fraction] = match;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const cents = fraction && /[1-9]/.test(fraction) ? `.${fraction.replace(/0+$/, "")}` : "";

  return `${sign}${grouped}${cents} so'm`;
}

/** Uzbek labels for backend enum values; mirrors apps/web/src/lib/status-labels.ts. */
const statusLabels: Record<string, string> = {
  // Lifecycle
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  SUSPENDED: "To'xtatilgan",
  ARCHIVED: "Arxivlangan",
  PILOT: "Sinov",
  // Advances / expenses
  REQUESTED: "So'ralgan",
  PENDING: "Kutilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
  PAID: "To'langan",
  APPLIED: "Hisobga olingan",
  CANCELLED: "Bekor qilingan",
  // Payroll
  DRAFT: "Qoralama",
  CALCULATED: "Hisoblangan",
  PARTIALLY_PAID: "Qisman to'langan",
  CARRIED_FORWARD: "Keyingi oyga o'tkazilgan",
  CLOSED: "Yopilgan",
  // Orders / payments
  CONFIRMED: "Tasdiqlangan",
  WAITING_PRODUCTION: "Ishlab chiqarish kutilmoqda",
  READY: "Tayyor",
  DELIVERED: "Yetkazilgan",
  UNPAID: "To'lanmagan",
  // Dashboard health / priority
  GOOD: "Yaxshi",
  WARNING: "Diqqat",
  CRITICAL: "Jiddiy",
  NORMAL: "Normal",
  ATTENTION: "E'tibor talab",
  LOW: "Past",
  MEDIUM: "O'rta",
  HIGH: "Yuqori",
  LOW_STOCK: "Kam qoldiq",
};

export function formatStatus(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return statusLabels[value] ?? value.replaceAll("_", " ");
}
