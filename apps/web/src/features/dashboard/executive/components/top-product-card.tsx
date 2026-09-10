import type { ExecutiveSummary } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/utils";

type TopProduct = ExecutiveSummary["topProducts"][number];

/**
 * Mobile card for one top-selling product row. Read-only, same as the
 * desktop rows (no click interaction exists here). This is a sales
 * ranking, so the sold value leads (what made the most money), with
 * quantity and the color/material/season combination that distinguishes
 * this variant from others of the same model as supporting context.
 */
export function TopProductCard({ product }: { product: TopProduct }) {
  return (
    <div className="min-h-[44px] space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4">
      <span className="block min-w-0 truncate font-semibold" title={product.productName}>
        {product.productName}
      </span>
      <p className="text-lg font-semibold">{formatCurrency(product.value)}</p>
      <p className="truncate text-xs text-muted-foreground">
        {product.colorName} · {product.materialName} · {product.seasonName} · {product.quantity} dona
      </p>
    </div>
  );
}
