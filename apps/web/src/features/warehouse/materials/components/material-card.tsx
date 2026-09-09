import { formatWarehouseZoneName } from "@/lib/status-labels";
import type { MaterialStock } from "@/lib/api/warehouse";
import { formatNumber } from "@/lib/utils";

/**
 * Mobile card for one material stock record — reused by both the Materials
 * list (interactive: opens the receipt/detail drawer) and the Warehouse
 * overview's read-only stock summary. Scanning speed matters more than
 * metadata here, so quantity+unit stay the biggest, most legible line and
 * the "Yangilangan" timestamp (audit metadata) stays out of the card.
 */
export function MaterialCard({
  material,
  onSelect,
}: {
  material: MaterialStock;
  onSelect?: (material: MaterialStock) => void;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="block min-w-0 truncate font-semibold" title={material.material.name}>
          {material.material.name}
        </span>
        <p className="text-lg font-semibold">
          {formatNumber(material.quantity)} {material.unit}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatWarehouseZoneName(material.warehouse.name)} · {formatWarehouseZoneName(material.zone.name)}
        </p>
      </div>
    </>
  );

  if (!onSelect) {
    return (
      <div className="flex min-h-[44px] items-start gap-3 rounded-xl border border-border/70 bg-card/40 p-4">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(material)}
      className="flex w-full min-h-[44px] items-start gap-3 rounded-xl border border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-primary/40 active:bg-muted/40"
    >
      {content}
    </button>
  );
}
