import { formatVisibleStatusText, type MachineStatus } from "@paypoq/shared";

type Tone = "success" | "error" | "warning" | "info";

export const machineStatusTone: Record<MachineStatus, Tone> = {
  ACTIVE: "success",
  MAINTENANCE: "warning",
  INACTIVE: "info",
};

export const runStatusTone: Record<string, Tone> = {
  RUNNING: "success",
  HOLD: "warning",
  STOPPED: "warning",
  PLANNED: "info",
  COMPLETED: "info",
  CANCELLED: "info",
};

export const roundStatusTone: Record<string, Tone> = {
  PENDING: "info",
  IN_PROGRESS: "warning",
  PASSED: "success",
  ATTENTION: "error",
  MISSED: "error",
};

export const taskStatusTone: Record<string, Tone> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "info",
};

/** Uzbek label for a single backend status token (RUNNING → "Ishlamoqda"). */
export function statusLabel(value: string): string {
  return formatVisibleStatusText(value);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Device-local calendar date as YYYY-MM-DD. */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Device-local time as HH:MM. */
export function localTimeString(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Combines a local date and HH:MM into the ISO instant the API expects —
 * the same conversion Web applies to its datetime-local input.
 */
export function combineLocalDateTime(date: string, time: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const instant = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );

  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}
