import { StatusBadge } from "@/components/data-display/status-badge";

/**
 * Shared status badge for one attendance record's day-closure state — used
 * by both the desktop table and the mobile card so the tone/label mapping
 * can never drift between them.
 */
export function AttendanceStatus({ status }: { status: "COMPLETE" | "OPEN" | "MISSING_CHECK_OUT" }) {
  if (status === "COMPLETE") return <StatusBadge tone="success">Kun yopilgan</StatusBadge>;
  if (status === "OPEN") return <StatusBadge tone="info">Smena davom etmoqda</StatusBadge>;
  return <StatusBadge tone="danger">Xodim kunni yopmadi</StatusBadge>;
}
