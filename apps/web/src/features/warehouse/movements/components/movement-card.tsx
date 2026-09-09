import { ChevronRight } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { StockMovement } from "@/lib/api/warehouse";
import {
  formatStockMovementReason,
  formatStockUnit,
  formatWarehouseZoneName,
  labelStatus,
  stockMovementTypeLabel,
} from "@/lib/status-labels";
import { formatDateShort } from "@/lib/format";

// Incoming movements read as positive/neutral, outgoing as attention-worthy —
// lets an operator tell intake from issue at a glance without reading the label.
const movementTone: Record<string, StatusTone> = {
  RECEIPT: "success",
  PRODUCTION_RECEIPT: "success",
  RETURN: "success",
  TRANSFER: "info",
  ISSUE: "warning",
  CORRECTION: "neutral",
};

function itemName(movement: StockMovement): string {
  if (movement.productVariant) {
    return `${movement.productVariant.product.name} · ${movement.productVariant.color.name}`;
  }

  return movement.material?.name ?? "—";
}

/**
 * Mobile card for one stock movement — a history/event record, not an
 * editable entity. Leads with what moved and how much (the thing an
 * operator scans for), then where, then who/why as the least-urgent line.
 */
export function MovementCard({
  movement,
  onSelect,
}: {
  movement: StockMovement;
  onSelect: (movement: StockMovement) => void;
}) {
  const reasonText = movement.reason
    ? formatStockMovementReason(movement.reason)
    : movement.note;

  return (
    <button
      type="button"
      onClick={() => onSelect(movement)}
      className="flex w-full min-h-[44px] items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-primary/40 active:bg-muted/40"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate font-semibold" title={itemName(movement)}>
            {itemName(movement)}
          </span>
          <StatusBadge tone={movementTone[movement.movementType] ?? "neutral"} className="shrink-0">
            {labelStatus(stockMovementTypeLabel, movement.movementType)}
          </StatusBadge>
        </div>
        <p className="text-base font-semibold">
          {movement.quantity} {formatStockUnit(movement.unit)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatWarehouseZoneName(movement.zone.name)} · {formatDateShort(new Date(movement.occurredAt))}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {movement.recordedBy.name}
          {reasonText ? ` · ${reasonText}` : ""}
        </p>
      </div>
      <ChevronRight className="mt-1 shrink-0 text-muted-foreground" size={18} aria-hidden="true" />
    </button>
  );
}
