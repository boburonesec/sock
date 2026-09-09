import { StatusBadge } from "@/components/data-display/status-badge";
import { formatDateShort } from "@/lib/format";
import { advanceStatusLabel, labelStatus } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";

export interface AdjustmentRow {
  id: string;
  amount: string;
  reason: string;
  status: string;
  requestedAt: string;
  employee: { name: string };
  requestedBy: { name: string } | null;
}

/**
 * Mobile card for one bonus/penalty adjustment. Read-only, same as the
 * desktop rows (no click interaction exists today), so this is a plain
 * bordered block rather than a button.
 */
export function AdjustmentCard({ row }: { row: AdjustmentRow }) {
  return (
    <div className="min-h-[44px] space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={row.employee.name}>
          {row.employee.name}
        </span>
        <StatusBadge tone="info" className="shrink-0">
          {labelStatus(advanceStatusLabel, row.status)}
        </StatusBadge>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-base font-semibold">{formatCurrency(row.amount)}</span>
        <span className="text-xs text-muted-foreground">{formatDateShort(new Date(row.requestedAt))}</span>
      </div>
      <p className="text-sm text-muted-foreground">{row.reason}</p>
      {row.requestedBy ? (
        <p className="text-xs text-muted-foreground">Kim kiritgan: {row.requestedBy.name}</p>
      ) : null}
    </div>
  );
}
