import type { AttendanceOverview } from "@/lib/api/attendance";
import { formatDateTimeForUser } from "@/lib/format";
import { AttendanceStatus } from "./attendance-status";

type AttendanceRecord = AttendanceOverview["records"][number];

function formatDate(value: string): string {
  return value.split("-").reverse().join(".");
}

/**
 * Mobile card for one check-in/check-out record. Status leads — an
 * incomplete day is the thing an operator needs to notice first, not
 * bury under the date — reusing the exact same `AttendanceStatus`
 * tone/label mapping the desktop table uses (no new status semantics).
 * Check-in/out times get their own line so neither is clipped.
 */
export function AttendanceRecordCard({ record }: { record: AttendanceRecord }) {
  return (
    <div className="min-h-[44px] space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={record.employee.name}>
          {record.employee.name}
        </span>
        <div className="shrink-0">
          <AttendanceStatus status={record.status} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(record.workDate)} · {record.shift.name}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>
          Kirish: <span className="font-medium">{formatDateTimeForUser(record.checkInAt)}</span>
        </span>
        <span>
          Chiqish:{" "}
          <span className="font-medium">
            {record.checkOutAt ? formatDateTimeForUser(record.checkOutAt) : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}
