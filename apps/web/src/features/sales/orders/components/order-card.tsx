import { ChevronRight } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { SalesOrder } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

const orderStatusLabel: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: { label: "Qoralama", tone: "neutral" },
  CONFIRMED: { label: "Tasdiqlangan", tone: "info" },
  WAITING_PRODUCTION: { label: "Ishlab chiqarish kutilmoqda", tone: "warning" },
  READY: { label: "Tayyor", tone: "info" },
  DELIVERED: { label: "Yetkazilgan", tone: "success" },
  CLOSED: { label: "Yopilgan", tone: "success" },
  CANCELLED: { label: "Bekor qilingan", tone: "danger" },
};

const paymentStatusLabel: Record<string, { label: string; tone: StatusTone }> = {
  UNPAID: { label: "To‘lanmagan", tone: "danger" },
  PARTIALLY_PAID: { label: "Qisman to‘langan", tone: "warning" },
  PAID: { label: "To‘langan", tone: "success" },
};

/**
 * Mobile card for one order. Deliberately not a vertical dump of every
 * desktop column — the seller/creator name (self-evident: they're looking
 * at their own list) and other administrative metadata stay in the detail
 * drawer this card opens. Whole card is the single tap target (matches the
 * existing Suppliers card pattern) so there's exactly one interactive
 * element and no nested-button ambiguity.
 */
export function OrderCard({
  order,
  onSelect,
}: {
  order: SalesOrder;
  onSelect: (order: SalesOrder) => void;
}) {
  const lifecycle = orderStatusLabel[order.status];
  const payment = paymentStatusLabel[order.paymentStatus];

  return (
    <button
      type="button"
      onClick={() => onSelect(order)}
      className="flex w-full min-h-[44px] items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-primary/40 active:bg-muted/40"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-semibold" title={order.orderNumber}>
            {order.orderNumber}
          </span>
          <StatusBadge tone={lifecycle?.tone ?? "neutral"} className="shrink-0">
            {lifecycle?.label ?? order.status}
          </StatusBadge>
        </div>
        <p className="truncate text-sm text-muted-foreground" title={order.client.name}>
          {order.client.name}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-base font-semibold">{formatCurrency(order.totalAmount)}</span>
          <StatusBadge tone={payment?.tone ?? "neutral"}>
            {payment?.label ?? order.paymentStatus}
          </StatusBadge>
        </div>
        {order.deadline ? (
          <p className="text-xs text-muted-foreground">
            Muddat: {formatDateShort(new Date(order.deadline))}
          </p>
        ) : null}
      </div>
      <ChevronRight className="mt-1 shrink-0 text-muted-foreground" size={18} aria-hidden="true" />
    </button>
  );
}
