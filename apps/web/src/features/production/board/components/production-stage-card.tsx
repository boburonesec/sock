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

interface ProductionStageCardProps {
  stage: StageTotal;
  productBreakdownCount: number;
  selected: boolean;
  onSelect: (stageId: string) => void;
}

export function ProductionStageCard({
  stage,
  productBreakdownCount,
  selected,
  onSelect,
}: ProductionStageCardProps) {
  const status = statusConfig[stage.status];

  return (
    <button
      type="button"
      onClick={() => onSelect(stage.stageId)}
      className={cn(
        "panel relative w-full min-w-0 overflow-hidden p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary sm:p-4",
        stage.isHighQuantity && "border-amber-500/60 bg-amber-500/[0.04]",
        selected && "ring-2 ring-primary",
      )}
    >
      {stage.isHighQuantity ? (
        <AlertTriangle
          aria-label="Yuqori qoldiq"
          className="absolute right-2 top-2 text-amber-500 sm:right-3 sm:top-3"
          size={16}
        />
      ) : null}
      <p className="truncate pr-6 text-xs font-semibold sm:text-sm">{stage.stageName}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl">
        {formatNumber(Number(stage.quantity))}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">dona mavjud</p>
      <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
          <Boxes size={14} className="shrink-0" />
          {productBreakdownCount} tur
        </span>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
    </button>
  );
}
