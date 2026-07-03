"use client";

import { ChartCard } from "@/components/charts/chart-card";
import { ChartContainer } from "@/components/charts/chart-container";
import type { ProductionOperationsSummary } from "@/lib/api/production";

interface ProductionTrendChartProps {
  trend: ProductionOperationsSummary["trend"];
}

export function ProductionTrendChart({ trend }: ProductionTrendChartProps) {
  const maximumQuantity = Math.max(
    0,
    ...trend.map((point) => Number(point.quantity)),
  );

  return (
    <ChartCard title="Ishlab chiqarish trendi" description="So‘nggi 7 kun">
      <ChartContainer label="So‘nggi yetti kunlik ishlab chiqarish trendi">
        <div className="flex h-full items-end justify-between gap-3 border-b border-l px-4 pb-7 pt-4">
          {trend.map((point) => {
            // This ratio only controls visual bar height. It does not alter,
            // aggregate, or derive the tizim-provided production quantity.
            const height = maximumQuantity > 0
              ? (Number(point.quantity) / maximumQuantity) * 100
              : 0;

            return (
              <div key={point.date} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div
                  aria-label={`${point.date}: ${point.quantity} dona`}
                  className="rounded-t-md bg-primary/80"
                  style={{ height: `${height}%` }}
                  title={`${point.quantity} dona`}
                />
                <span className="text-center text-xs text-muted-foreground">
                  {point.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </ChartContainer>
    </ChartCard>
  );
}
