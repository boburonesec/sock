import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/api/product";
import type { ProductVariantReference } from "@/lib/api/types";

/**
 * Mobile card for one product variant (a color · material · season
 * combination — the distinguishing identity the desktop table's three
 * columns spell out). Four real actions exist (price list, edit, add
 * price, archive), so — same reasoning as ProductCard — this stays a
 * plain block with its own button row, not a whole-card button.
 */
export function VariantCard({
  product,
  variant,
  onSelectVariant,
  onEditVariant,
  onAddPrice,
  onArchiveVariant,
}: {
  product: Product;
  variant: ProductVariantReference;
  onSelectVariant: (variant: ProductVariantReference) => void;
  onEditVariant: (product: Product, variant: ProductVariantReference) => void;
  onAddPrice: (variant: ProductVariantReference) => void;
  onArchiveVariant: (variant: ProductVariantReference) => void;
}) {
  return (
    <div className="min-h-[44px] space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
      <p className="truncate text-sm font-semibold">
        {variant.color.name} · {variant.material.name} · {variant.season.name}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => onSelectVariant(variant)}>
          Narxlar
        </Button>
        <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => onEditVariant(product, variant)}>
          Tahrirlash
        </Button>
        <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => onAddPrice(variant)}>
          Narx qo‘shish
        </Button>
        <Button
          className="h-9 border-rose-500/40 px-3 text-xs text-rose-300 hover:bg-rose-500/10"
          variant="outline"
          onClick={() => onArchiveVariant(variant)}
        >
          Arxivlash
        </Button>
      </div>
    </div>
  );
}
