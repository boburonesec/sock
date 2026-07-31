import { MapPin } from "lucide-react";
import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { WarehouseStockSummary } from "@/lib/api/warehouse";
import { formatWarehouseZoneName, labelStatus, zoneStatusLabel } from "@/lib/status-labels";

type ZoneSummary = WarehouseStockSummary["zoneSummaries"][number];

const statusTone: Record<string, StatusTone> = {
  NORMAL: "success",
  ATTENTION: "warning",
  HIGH: "danger",
};

export function ZonesOverview({
  zones,
  onSelect,
}: {
  zones: ZoneSummary[];
  onSelect: (zone: ZoneSummary) => void;
}) {
  if (zones.length === 0) {
    return (
      <EmptyState
        title="Ombor zonalari mavjud emas"
        description="Zonalar yaratilgach, ularning qoldig‘i shu yerda ko‘rinadi."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {zones.map((zone) => (
        <button
          key={zone.zoneId}
          onClick={() => onSelect(zone)}
          className="text-left"
        >
          <InfoCard title={formatWarehouseZoneName(zone.zoneName)} className="h-full transition hover:bg-muted/40">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <MapPin size={18} />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">
                  {formatWarehouseZoneName(zone.warehouseName)}
                </p>
                <p className="mt-3 font-semibold">
                  {zone.productQuantity} dona
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mahsulot yozuvlari: {zone.productRecordCount} · Material:{" "}
                  {zone.materialRecordCount}
                </p>
                <div className="mt-3">
                  <StatusBadge tone={statusTone[zone.status] ?? "neutral"}>
                    {labelStatus(zoneStatusLabel, zone.status)}
                  </StatusBadge>
                </div>
              </div>
            </div>
          </InfoCard>
        </button>
      ))}
    </div>
  );
}
