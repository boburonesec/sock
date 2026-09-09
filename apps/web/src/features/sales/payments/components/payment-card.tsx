import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { ClientPayment } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";
import { formatDateTimeForUser } from "@/lib/format";

const methodLabel: Record<string, string> = {
  CASH: "Naqd",
  TRANSFER: "O‘tkazma",
  OTHER: "Boshqa",
};

/**
 * No canonical payment reference exists in the domain model (ClientPayment
 * has no `paymentNumber`/reference field — see Phase 2 report). The database
 * id is never shown here; client + amount carry the card's identity instead,
 * matching what a seller actually recognizes a payment by.
 */
function allocationSummary(payment: ClientPayment): string | null {
  if (payment.allocations.length === 0) return null;
  if (payment.allocations.length === 1) {
    return `Buyurtma: ${payment.allocations[0].order.orderNumber}`;
  }
  return `${payment.allocations.length} ta buyurtmaga taqsimlangan`;
}

export function PaymentCard({
  payment,
  onSelect,
}: {
  payment: ClientPayment;
  onSelect: (payment: ClientPayment) => void;
}) {
  const allocation = allocationSummary(payment);

  return (
    <button
      type="button"
      onClick={() => onSelect(payment)}
      className="flex w-full min-h-[44px] items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-primary/40 active:bg-muted/40"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-semibold" title={payment.client.name}>
            {payment.client.name}
          </span>
          <StatusBadge tone={payment.reversedAt ? "danger" : "success"} className="shrink-0">
            {payment.reversedAt ? "Bekor qilingan" : "Faol"}
          </StatusBadge>
        </div>
        <p className="text-base font-semibold">{formatCurrency(payment.amount)}</p>
        <p className="truncate text-sm text-muted-foreground">
          {methodLabel[payment.method] ?? payment.method} · {formatDateTimeForUser(payment.paymentDate)}
        </p>
        {allocation ? (
          <p className="truncate text-xs text-muted-foreground" title={allocation}>
            {allocation}
          </p>
        ) : null}
      </div>
      <ChevronRight className="mt-1 shrink-0 text-muted-foreground" size={18} aria-hidden="true" />
    </button>
  );
}
