import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatNumber(value: number) { return new Intl.NumberFormat("uz-UZ").format(value); }
export function formatCurrency(value: number) { return `${formatNumber(value)} so'm`; }
