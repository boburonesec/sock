import type { StatusTone } from "@/components/data-display/status-badge";
import type { Expense } from "@/lib/api/finance";

export const expenseStatusTone: Record<string, StatusTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
  CANCELLED: "neutral",
};

/**
 * Single source of truth for which expense actions are visible to the
 * current viewer — used by both the desktop table's action cell and the
 * mobile card's action row so a migration can never grant/hide an action
 * the other surface doesn't. Mirrors the exact conditions previously
 * inlined in `ExpensesTable`; do not duplicate this logic elsewhere.
 */
export function getVisibleExpenseActions(
  expense: Expense,
  options: { canApprove: boolean; canPay: boolean; isRequester: boolean },
): { approve: boolean; reject: boolean; cancel: boolean; pay: boolean } {
  const { canApprove, canPay, isRequester } = options;
  const approve = expense.status === "REQUESTED" && canApprove && !isRequester;
  const reject = approve;
  const cancel = expense.status === "REQUESTED" || expense.status === "APPROVED";
  const pay = expense.status === "APPROVED" && canPay && !isRequester;

  return { approve, reject, cancel, pay };
}
