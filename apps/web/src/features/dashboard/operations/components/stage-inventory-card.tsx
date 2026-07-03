import { AlertTriangle } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { cn, formatNumber } from "@/lib/utils";
import type { ProductionOperationsSummary } from "@/lib/api/production";

type StageTotal = ProductionOperationsSummary["stageTotals"][number];

const statusConfig: Record<StageTotal["status"], { label: string; tone: StatusTone }> = {
  NORMAL: { label: "Me’yorda", tone: "success" },
  ATTENTION: { label: "Kuzatuvda", tone: "warning" },
  HIGH: { label: "Yuqori", tone: "danger" },
};

export function StageInventoryCard({ stage }: { stage: StageTotal }) {
  const status = statusConfig[stage.status];
  return <article className={cn("panel relative overflow-hidden p-4", stage.isHighQuantity && "border-amber-500/60 bg-amber-500/[0.04]")}>
    {stage.isHighQuantity && <span aria-hidden className="absolute right-3 top-3 text-amber-500"><AlertTriangle size={18}/></span>}
    <p className="pr-8 text-sm font-semibold">{stage.stageName}</p>
    <p className="mt-4 text-3xl font-bold tracking-tight">{formatNumber(Number(stage.quantity))}</p>
    <p className="mt-1 text-xs text-muted-foreground">dona mavjud</p>
    <div className="mt-4 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Hozirgi qoldiq</span><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div>
  </article>;
}
