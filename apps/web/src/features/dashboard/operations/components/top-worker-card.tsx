import type { ProductionOperationsSummary } from "@/lib/api/production";
import { formatCurrency, formatNumber } from "@/lib/utils";

type TopWorker = ProductionOperationsSummary["topWorkers"][number];

/**
 * Mobile card for one worker's today activity ranking. Read-only (no
 * click interaction on desktop either). Worker + calculated pay lead
 * (who, how much they earned today), stage and quantity follow as the
 * context that explains the amount.
 */
export function TopWorkerCard({ worker }: { worker: TopWorker }) {
  return (
    <div className="min-h-[44px] space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={worker.employeeName}>
          {worker.employeeName}
        </span>
        <span className="shrink-0 text-base font-semibold">{formatCurrency(worker.amount)}</span>
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {worker.stageName} · {formatNumber(Number(worker.quantity))} dona
      </p>
    </div>
  );
}
