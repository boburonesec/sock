import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

/**
 * Money/quantity values arrive from the API as Decimal strings (e.g. "1950000.00")
 * as often as plain numbers, so this accepts both and falls back to the raw
 * value instead of rendering "NaN" if something unparseable slips through.
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("uz-UZ").format(numeric);
}

export function formatCurrency(value: number | string | null | undefined): string {
  return `${formatNumber(value)} so'm`;
}
