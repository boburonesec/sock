import { visibleStatusLabels } from "@paypoq/shared";

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

/**
 * Labels the dashboards need that Web renders through page-specific maps.
 * Everything else comes from @paypoq/shared, which Web uses too.
 */
const localStatusLabels: Record<string, string> = {
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

  return visibleStatusLabels[value] ?? localStatusLabels[value] ?? value.replaceAll("_", " ");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatInFactoryZone(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Groups the whole part of a backend number for reading ("12500" → "12 500").
 * Display only: decimal strings are never parsed into floats.
 */
export function formatQuantity(value: number | string | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  const suffix = unit ? ` ${unit}` : "";

  if (!match) {
    return `${text}${suffix}`;
  }

  const [, sign = "", whole = "", fraction] = match;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const decimals = fraction && /[1-9]/.test(fraction) ? `.${fraction.replace(/0+$/, "")}` : "";

  return `${sign}${grouped}${decimals}${suffix}`;
}

/** Shifts a YYYY-MM-DD calendar date by whole days without time-zone drift. */
export function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Renders a YYYY-MM-DD calendar day as DD.MM.YYYY with no time-zone conversion. */
export function formatIsoDay(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : isoDate;
}
