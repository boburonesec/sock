import { ChevronRight } from "lucide-react";
import type { Client } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";

/**
 * Structural shape shared by `ClientDebt` (the Debts screen) and
 * `SalesSummary["topClients"][number]` (the Sales overview's "Eng faol
 * mijozlar" list) — both are exactly `{ client, totalOrders, totalPaid,
 * debt }`, so one card serves both without either screen importing the
 * other's type.
 */
export interface DebtCardData {
  client: Client;
  totalOrders: string;
  totalPaid: string;
  debt: string;
}

/**
 * Mobile card for one client's debt balance. The outstanding debt is the
 * single most operationally important number here, so it leads and is
 * colored when non-zero — totalOrders/totalPaid stay as supporting
 * context rather than competing for attention. `onSelect` is optional:
 * the Debts screen opens the existing detail drawer (matches desktop),
 * the read-only overview "top clients" list renders the same card inert.
 */
export function DebtCard({
  debt,
  onSelect,
}: {
  debt: DebtCardData;
  onSelect?: (debt: DebtCardData) => void;
}) {
  const hasDebt = Number(debt.debt) > 0;

  const content = (
    <div className="min-w-0 flex-1 space-y-1.5">
      <span className="block min-w-0 truncate font-semibold" title={debt.client.name}>
        {debt.client.name}
      </span>
      <p className={`text-lg font-semibold ${hasDebt ? "text-amber-500" : "text-emerald-500"}`}>
        {formatCurrency(debt.debt)}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        Jami: {formatCurrency(debt.totalOrders)} · To‘langan: {formatCurrency(debt.totalPaid)}
      </p>
    </div>
  );

  if (!onSelect) {
    return (
      <div className="flex min-h-[44px] items-start gap-3 rounded-xl border border-border/70 bg-card/40 p-4">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(debt)}
      className="flex w-full min-h-[44px] items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-primary/40 active:bg-muted/40"
    >
      {content}
      <ChevronRight className="mt-1 shrink-0 text-muted-foreground" size={18} aria-hidden="true" />
    </button>
  );
}
