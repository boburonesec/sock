import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { SalesSummary } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

type RecentOrder = SalesSummary["recentOrders"][number];

const orderStatus: Record<string, { label: string; tone: StatusTone }> = {
  CONFIRMED: { label: "Tasdiqlangan", tone: "info" },
  WAITING_PRODUCTION: { label: "Ishlab chiqarish kutilmoqda", tone: "warning" },
  READY: { label: "Tayyor", tone: "info" },
  DELIVERED: { label: "Yetkazilgan", tone: "success" },
  CLOSED: { label: "Yopilgan", tone: "success" },
};

/**
 * Mobile card for the Sales overview's "recent orders" summary. This is a
 * narrower, read-only order shape than the full `SalesOrder` Phase 2's
 * `OrderCard` renders on /sales/orders (no deadline/items/createdBy) — a
 * distinct small card rather than widening or reusing that Phase 2
 * component. No click here, matching the desktop table (this list is
 * informational only, same as before the migration).
 */
export function RecentOrderCard({ order }: { order: RecentOrder }) {
  const status = orderStatus[order.status];

  return (
    <div className="min-h-[44px] space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={order.orderNumber}>
          {order.orderNumber}
        </span>
        <StatusBadge tone={status?.tone ?? "neutral"} className="shrink-0">
          {status?.label ?? order.status}
        </StatusBadge>
      </div>
      <p className="truncate text-sm text-muted-foreground" title={order.client.name}>
        {order.client.name}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-base font-semibold">{formatCurrency(order.totalAmount)}</span>
        <span className="text-xs text-muted-foreground">{formatDateShort(new Date(order.createdAt))}</span>
      </div>
    </div>
  );
}
