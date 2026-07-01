import { MapPin } from "lucide-react";
import { InfoCard } from "@/components/cards/info-card";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { formatNumber } from "@/lib/utils";
import type { WarehouseStockSummary } from "@/lib/api/warehouse";

type ZoneSummary = WarehouseStockSummary["zoneSummaries"][number];

const statusTone: Record<ZoneSummary["status"], StatusTone> = {
  NORMAL: "success",
  ATTENTION: "warning",
};

const statusLabel: Record<ZoneSummary["status"], string> = {
  NORMAL: "Me’yorda",
  ATTENTION: "E’tibor kerak",
};

export function ZoneOverview({ zones }: { zones: ZoneSummary[] }) { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{zones.map((zone) => <InfoCard key={zone.zoneId} title={zone.zoneName} action={<StatusBadge tone={statusTone[zone.status]}>{statusLabel[zone.status]}</StatusBadge>}><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><MapPin size={18}/></span><div><p className="text-sm text-muted-foreground">{zone.warehouseName}</p><p className="mt-3 font-semibold">{formatNumber(Number(zone.productQuantity))} dona</p><p className="mt-1 text-xs text-muted-foreground">{zone.productRecordCount} mahsulot · {zone.materialRecordCount} material yozuvi</p></div></div></InfoCard>)}</div>; }
