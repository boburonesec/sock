import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { ExecutiveHealthStatus, ExecutiveSummary } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/utils";

type TopClient = ExecutiveSummary["topClients"][number];

const statusLabels: Record<ExecutiveHealthStatus, string> = {
  GOOD: "Yaxshi",
  WARNING: "Qarzdor",
  CRITICAL: "E’tibor kerak",
};

const statusTones: Record<ExecutiveHealthStatus, StatusTone> = {
  GOOD: "success",
  WARNING: "warning",
  CRITICAL: "danger",
};

/**
 * Mobile card for one top-client row on the executive dashboard. Read-only
 * (no click interaction on desktop either). Client + debt-health status
 * lead — an owner scanning this needs to spot who's at risk first — with
 * the debt amount prominent and totalOrders/totalPaid as supporting
 * context, matching the debt-card visual language established for Sales
 * Debts (Phase 4) without sharing its type (this summary row carries an
 * extra `debtStatus` field Sales Debts doesn't have).
 */
export function TopClientCard({ client }: { client: TopClient }) {
  const hasDebt = Number(client.debt) > 0;

  return (
    <div className="min-h-[44px] space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold" title={client.clientName}>
          {client.clientName}
        </span>
        <StatusBadge tone={statusTones[client.debtStatus]} className="shrink-0">
          {statusLabels[client.debtStatus]}
        </StatusBadge>
      </div>
      <p className={`text-lg font-semibold ${hasDebt ? "text-amber-500" : "text-emerald-500"}`}>
        {formatCurrency(client.debt)}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        Jami: {formatCurrency(client.totalOrders)} · To‘langan: {formatCurrency(client.totalPaid)}
      </p>
    </div>
  );
}
