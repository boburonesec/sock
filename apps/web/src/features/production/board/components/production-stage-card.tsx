import { AlertTriangle, Boxes } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { cn, formatNumber } from "@/lib/utils";
import type { ProductionOperationsSummary } from "@/lib/api/production";

type StageTotal = ProductionOperationsSummary["stageTotals"][number];

const statusConfig: Record<StageTotal["status"], { label: string; tone: StatusTone }> = {
  NORMAL: { label: "Me’yorda", tone: "success" },
  ATTENTION: { label: "Kuzatuvda", tone: "warning" },
  HIGH: { label: "Yuqori", tone: "danger" },
};

interface ProductionStageCardProps { stage: StageTotal; productBreakdownCount: number; selected: boolean; onSelect: (stageId: string) => void; }
export function ProductionStageCard({ stage, productBreakdownCount, selected, onSelect }: ProductionStageCardProps) {
  const status = statusConfig[stage.status];
  return <button onClick={() => onSelect(stage.stageId)} className={cn("panel relative w-full overflow-hidden p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary", stage.isHighQuantity && "border-amber-500/60 bg-amber-500/[0.04]", selected && "ring-2 ring-primary")}>
    {stage.isHighQuantity && <AlertTriangle aria-label="Yuqori qoldiq" className="absolute right-3 top-3 text-amber-500" size={18}/>}<p className="pr-8 text-sm font-semibold">{stage.stageName}</p><p className="mt-4 text-3xl font-bold tracking-tight">{formatNumber(Number(stage.quantity))}</p><p className="mt-1 text-xs text-muted-foreground">dona mavjud</p><div className="mt-4 flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Boxes size={14}/>{productBreakdownCount} mahsulot turi</span><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div>
  </button>;
}
