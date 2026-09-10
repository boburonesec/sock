import { StatusBadge } from "@/components/data-display/status-badge";
import type { AttendanceOverview } from "@/lib/api/attendance";

type EmployeeSummary = AttendanceOverview["employees"][number];

/**
 * Mobile card for one employee's monthly attendance summary. Read-only,
 * same as the desktop rows (no click interaction exists today). Missing
 * checkout days is the one abnormal state worth flagging — kept as the
 * same danger badge the desktop table already uses, not a new color.
 */
export function EmployeeSummaryCard({ employee }: { employee: EmployeeSummary }) {
  return (
    <div className="min-h-[44px] space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={employee.employeeName}>
          {employee.employeeName}
        </span>
        {employee.shiftName ? (
          <span className="shrink-0 text-sm text-muted-foreground">{employee.shiftName}</span>
        ) : (
          <StatusBadge tone="warning" className="shrink-0">
            Tanlanmagan
          </StatusBadge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>
          Kelgan kun: <span className="font-semibold">{employee.attendedDays}</span>
        </span>
        <span>
          To‘liq: <span className="font-semibold">{employee.completedDays}</span>
        </span>
        {Number(employee.missingCheckoutDays) > 0 ? (
          <StatusBadge tone="danger">{employee.missingCheckoutDays} kun yopilmagan</StatusBadge>
        ) : (
          <span className="text-muted-foreground">Yopilmagan: 0</span>
        )}
      </div>
    </div>
  );
}
