import { InfoCard } from "@/components/cards/info-card";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { ExecutiveHealthStatus, ExecutiveSummary } from "@/lib/api/dashboard";

const labels: Record<keyof ExecutiveSummary["businessHealth"], string> = {
  production: "Ishlab chiqarish",
  warehouse: "Ombor",
  sales: "Sotuvlar",
  finance: "Moliya",
};

const descriptions: Record<keyof ExecutiveSummary["businessHealth"], string> = {
  production: "Bosqichlar qoldig‘i bo‘yicha backend health holati.",
  warehouse: "Low stock materiallar bo‘yicha backend health holati.",
  sales: "Client debt projection bo‘yicha backend health holati.",
  finance: "Supplier debt, avans, xarajat va payroll holati.",
};

const statusLabels: Record<ExecutiveHealthStatus, string> = {
  GOOD: "Yaxshi",
  WARNING: "Kuzatuvda",
  CRITICAL: "E’tibor kerak",
};

const statusTones: Record<ExecutiveHealthStatus, StatusTone> = {
  GOOD: "success",
  WARNING: "warning",
  CRITICAL: "danger",
};

const priorityByStatus: Record<ExecutiveHealthStatus, "low" | "medium" | "high"> = {
  GOOD: "low",
  WARNING: "medium",
  CRITICAL: "high",
};

export function BusinessHealthSection({
  health,
}: {
  health: ExecutiveSummary["businessHealth"];
}) {
  const items = Object.entries(health) as Array<
    [keyof ExecutiveSummary["businessHealth"], ExecutiveHealthStatus]
  >;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([key, status]) => (
        <InfoCard
          key={key}
          title={labels[key]}
          action={<StatusBadge tone={statusTones[status]}>{statusLabels[status]}</StatusBadge>}
        >
          <p className="text-sm text-muted-foreground">{descriptions[key]}</p>
          {status !== "GOOD" && (
            <div className="mt-3">
              <PriorityBadge priority={priorityByStatus[status]} />
            </div>
          )}
        </InfoCard>
      ))}
    </div>
  );
}
