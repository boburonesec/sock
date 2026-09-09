import { formatWarehouseZoneName } from "@/lib/status-labels";
import type { ProductStock } from "@/lib/api/warehouse";
import { formatNumber } from "@/lib/utils";

/**
 * Mobile card for one finished-product stock record. Model name + quantity
 * lead (what/how much), variant attributes (color/material/season) that
 * distinguish it from other stock of the same model come next as one
 * compact line, zone last.
 */
export function ProductStockCard({ item }: { item: ProductStock }) {
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
      <p className="text-xs text-muted-foreground">{formatWarehouseZoneName(item.zone.name)}</p>
    </div>
  );
}
