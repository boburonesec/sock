import type { StageInventory } from "@/lib/api/production";
import { formatNumber } from "@/lib/utils";

/**
 * Mobile card for one product-variant line within a selected stage's
 * breakdown. Read-only, same as the desktop rows (no click interaction
 * exists here). Quantity is the number an operator scans for first, so it
 * stays large and always paired with its unit — color/material/season
 * (what distinguishes this variant from others in the same stage) follow
 * as one compact line rather than three separate columns.
 */
export function ProductBreakdownCard({ item }: { item: StageInventory }) {
  const variant = item.productVariant;

  return (
    <div className="min-h-[44px] space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4">
      <span className="block min-w-0 truncate font-semibold" title={variant.product.name}>
        {variant.product.name}
      </span>
      <p className="text-lg font-semibold">{formatNumber(item.quantity)} dona</p>
      <p className="truncate text-xs text-muted-foreground">
        {variant.color.name} · {variant.material.name} · {variant.season.name}
      </p>
    </div>
  );
}
