import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { Expense } from "@/lib/api/finance";
import { expenseStatusLabel, labelStatus } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";
import { expenseStatusTone, getVisibleExpenseActions } from "../lib/expense-actions";

/**
 * Mobile card for one expense request. Amount + status lead (a pending or
 * rejected expense must be obvious without opening anything), requester and
 * date are secondary, reason/approver/payment date stay in the muted footer
 * line. Action buttons mirror the desktop table's action cell exactly via
 * `getVisibleExpenseActions` — this card never decides RBAC on its own.
 *
 * Not a whole-card button: unlike Orders/Employees, this list has no
 * detail-drawer to open, and several rows carry multiple real actions
 * (approve/reject/cancel/pay), so nesting them inside one button isn't an
 * option — the card is a plain block with its own `<button>` actions.
 */
export function ExpenseCard({
  expense,
  busy,
  isRequester,
  canApprove = false,
  canPay = false,
  onApprove,
  onReject,
  onPay,
  onCancel,
}: {
  expense: Expense;
  busy?: boolean;
  isRequester: boolean;
  canApprove?: boolean;
  canPay?: boolean;
  onApprove?: (expense: Expense) => void;
  onReject?: (expense: Expense) => void;
  onPay?: (expense: Expense) => void;
  onCancel?: (expense: Expense) => void;
}) {
  const rawActions = getVisibleExpenseActions(expense, { canApprove, canPay, isRequester });
  // `cancel` is status-gated only (any viewer of the real Expenses page can
  // cancel their own pending request), so it isn't safe to trust on its own
  // when this card is reused read-only (Finance overview's recent list):
  // require the corresponding handler to actually be wired, or a
  // no-op-looking "Bekor" button would render with nothing behind it.
  const actions = {
    approve: rawActions.approve && Boolean(onApprove),
    reject: rawActions.reject && Boolean(onReject),
    pay: rawActions.pay && Boolean(onPay),
    cancel: rawActions.cancel && Boolean(onCancel),
  };
  const hasActions = actions.approve || actions.reject || actions.cancel || actions.pay;

  return (
    <div className="min-h-[44px] space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-semibold">{formatCurrency(expense.amount)}</span>
        <StatusBadge tone={expenseStatusTone[expense.status] ?? "neutral"} className="shrink-0">
          {labelStatus(expenseStatusLabel, expense.status)}
        </StatusBadge>
      </div>
      <p className="truncate text-sm font-medium" title={expense.category.name}>
        {expense.category.name}
      </p>
      <p className="line-clamp-2 text-sm text-muted-foreground">{expense.reason}</p>
      <p className="text-xs text-muted-foreground">
        {expense.requestedBy?.name ?? "—"} · {formatDateShort(new Date(expense.requestedAt))}
      </p>
      {hasActions ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.approve ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => onApprove?.(expense)}
            >
              Tasdiqlash
            </Button>
          ) : null}
          {actions.reject ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => onReject?.(expense)}
            >
              Rad etish
            </Button>
          ) : null}
          {actions.pay ? (
            <Button
              type="button"
              className="min-h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => onPay?.(expense)}
            >
              To‘lash
            </Button>
          ) : null}
          {actions.cancel ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-9 px-3 text-xs"
              disabled={busy}
              onClick={() => onCancel?.(expense)}
            >
              Bekor
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
