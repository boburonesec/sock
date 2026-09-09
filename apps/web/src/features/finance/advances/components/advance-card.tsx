import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { Advance } from "@/lib/api/finance";
import { advanceStatusLabel, labelStatus } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";
import { advanceStatusTone, getVisibleAdvanceActions } from "../lib/advance-actions";

/**
 * Mobile card for one advance request. Employee + amount + status lead
 * (who, how much, what state), request date/reason are secondary. Action
 * buttons mirror the desktop table's action cell exactly via
 * `getVisibleAdvanceActions` — Accountant/Manager/Owner visibility does not
 * change because the surface is a card instead of a table row.
 */
export function AdvanceCard({
  advance,
  busy,
  isRequester,
  canApprove = false,
  canPay = false,
  onApprove,
  onReject,
  onPay,
}: {
  advance: Advance;
  busy?: boolean;
  isRequester: boolean;
  canApprove?: boolean;
  canPay?: boolean;
  onApprove?: (advance: Advance) => void;
  onReject?: (advance: Advance) => void;
  onPay?: (advance: Advance) => void;
}) {
  const actions = getVisibleAdvanceActions(advance, { canApprove, canPay, isRequester });
  // Matches AdvancesTable exactly: a dash only means the request reached a
  // terminal status, not merely "this viewer has no action right now".
  const isTerminal = advance.status !== "REQUESTED" && advance.status !== "APPROVED";

  return (
    <div className="min-h-[44px] space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={advance.employee.name}>
          {advance.employee.name}
        </span>
        <StatusBadge tone={advanceStatusTone[advance.status] ?? "neutral"} className="shrink-0">
          {labelStatus(advanceStatusLabel, advance.status)}
        </StatusBadge>
      </div>
      <p className="text-base font-semibold">{formatCurrency(advance.amount)}</p>
      <p className="line-clamp-2 text-sm text-muted-foreground">{advance.reason}</p>
      <p className="text-xs text-muted-foreground">
        {formatDateShort(new Date(advance.requestedAt))}
      </p>
      {actions.approve || actions.reject || actions.pay || isTerminal ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {actions.approve ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={busy}
              onClick={() => onApprove?.(advance)}
            >
              Tasdiqlash
            </Button>
          ) : null}
          {actions.reject ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={busy}
              onClick={() => onReject?.(advance)}
            >
              Rad etish
            </Button>
          ) : null}
          {actions.pay ? (
            <Button
              type="button"
              className="h-8 px-2 text-xs"
              disabled={busy}
              onClick={() => onPay?.(advance)}
            >
              To‘lash
            </Button>
          ) : null}
          {isTerminal ? <span className="text-xs text-muted-foreground">—</span> : null}
        </div>
      ) : null}
    </div>
  );
}
