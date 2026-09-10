import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/api/product";

/**
 * Mobile card for one product/model in the catalog. Not a single tap
 * target: three real actions exist (open, edit, archive), so — matching
 * the Finance Expenses/Advances card pattern — this is a plain block with
 * its own button row rather than a whole-card button containing other
 * buttons. Name + variant count lead (what an owner needs to recognize
 * first: which model, how many variants it has); the optional code stays
 * secondary.
 */
export function ProductCard({
  product,
  onSelect,
  onEdit,
  onArchive,
}: {
  product: Product;
  onSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
}) {
  return (
    <div className="min-h-[44px] space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={product.name}>
          {product.name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{product.variants.length} variant</span>
      </div>
      {product.code ? <p className="text-xs text-muted-foreground">Kod: {product.code}</p> : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => onSelect(product)}>
          Ochish
        </Button>
        <Button className="h-9 px-3 text-xs" variant="outline" onClick={() => onEdit(product)}>
          Tahrirlash
        </Button>
        <Button
          className="h-9 border-rose-500/40 px-3 text-xs text-rose-300 hover:bg-rose-500/10"
          variant="outline"
          onClick={() => onArchive(product)}
        >
          Arxivlash
        </Button>
      </div>
    </div>
  );
}
