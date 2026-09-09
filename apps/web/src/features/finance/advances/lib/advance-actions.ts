import type { StatusTone } from "@/components/data-display/status-badge";
import type { Advance } from "@/lib/api/finance";

export const advanceStatusTone: Record<string, StatusTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
  APPLIED: "success",
  CANCELLED: "neutral",
};

/**
 * Single source of truth for which advance actions are visible to the
 * current viewer — used by both the desktop table's action cell and the
 * mobile card's action row so a migration can never grant/hide an action
 * the other surface doesn't. Mirrors the exact conditions previously
 * inlined in `AdvancesTable`; do not duplicate this logic elsewhere.
 */
export function getVisibleAdvanceActions(
  advance: Advance,
  options: { canApprove: boolean; canPay: boolean; isRequester: boolean },
): { approve: boolean; reject: boolean; pay: boolean } {
  const { canApprove, canPay, isRequester } = options;
  const approve = advance.status === "REQUESTED" && canApprove && !isRequester;
  const reject = approve;
  const pay = advance.status === "APPROVED" && canPay && !isRequester;

  return { approve, reject, pay };
}
