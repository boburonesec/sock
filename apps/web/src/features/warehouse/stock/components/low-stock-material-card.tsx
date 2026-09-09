import { StatusBadge } from "@/components/data-display/status-badge";
import { formatWarehouseZoneName } from "@/lib/status-labels";
import type { WarehouseStockSummary } from "@/lib/api/warehouse";

type LowStockMaterial = WarehouseStockSummary["lowStockMaterials"][number];

/**
 * Every row on this list is already a low-stock alert (that's what the
 * query returns) — so the card leads with the "Kam qoldi" badge itself
 * rather than repeating a redundant status field, then quantity vs. the
 * limit so the operator sees exactly how far under they are.
 */
export function LowStockMaterialCard({ material }: { material: LowStockMaterial }) {
  return (
    <div className="min-h-[44px] space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={material.materialName}>
          {material.materialName}
        </span>
        <StatusBadge tone="warning" className="shrink-0">
          Kam qoldi
        </StatusBadge>
      </div>
      <p className="text-lg font-semibold">
        {material.quantity} {material.unit}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          / limit {material.threshold} {material.unit}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">{formatWarehouseZoneName(material.warehouseName)}</p>
    </div>
  );
}
