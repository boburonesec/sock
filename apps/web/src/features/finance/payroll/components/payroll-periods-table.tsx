import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { PayrollPeriod } from "@/lib/api/finance";
import { labelStatus, payrollPeriodStatusLabel } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

const statusTone: Record<string, StatusTone> = {
  DRAFT: "neutral",
  CALCULATED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CLOSED: "success",
};

interface PayrollPeriodsTableProps {
  periods: PayrollPeriod[];
  selectedPeriodId: string | null;
  onSelect: (periodId: string) => void;
}

function formatMonth(value: string): string {
  return formatDateShort(new Date(value));
}

export function PayrollPeriodsTable({
  periods,
  selectedPeriodId,
  onSelect,
}: PayrollPeriodsTableProps) {
  return (
    <>
    <div className="space-y-2 md:hidden" aria-label="Ish haqi davrlari">
      {periods.length > 0 ? periods.map((period) => (
        <button key={period.id} type="button" aria-pressed={period.id === selectedPeriodId} onClick={() => onSelect(period.id)} className={`min-h-12 w-full rounded-xl border p-4 text-left ${period.id === selectedPeriodId ? "border-primary bg-primary/5" : "border-border/70 bg-card/40"}`}>
          <span className="flex items-center justify-between gap-3">
            <span className="font-semibold">{formatMonth(period.month)}</span>
            <StatusBadge tone={statusTone[period.status] ?? "neutral"}>{labelStatus(payrollPeriodStatusLabel, period.status)}</StatusBadge>
          </span>
          <span className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <span><span className="block text-muted-foreground">Jami</span>{formatCurrency(period.totalFinalAmount)}</span>
            <span><span className="block text-muted-foreground">Qoldiq</span>{formatCurrency(period.totalRemainingAmount)}</span>
          </span>
        </button>
      )) : <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Ish haqi davrlari mavjud emas.</div>}
    </div>
    <div className="hidden md:block">
    <DataTable label="Ish haqi davrlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Oy</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>Jami oylik</DataTableHeader>
          <DataTableHeader>To‘langan</DataTableHeader>
          <DataTableHeader>Qoldiq</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {periods.length > 0 ? (
          periods.map((period) => (
            <DataTableRow
              key={period.id}
              className={
                period.id === selectedPeriodId ? "bg-primary/5" : "hover:bg-muted/40"
              }
            >
              <DataTableCell>
                <button
                  onClick={() => onSelect(period.id)}
                  className="text-left font-semibold hover:text-primary"
                >
                  {formatMonth(period.month)}
                </button>
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTone[period.status] ?? "neutral"}>
                  {labelStatus(payrollPeriodStatusLabel, period.status)}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell className="font-semibold">
                {formatCurrency(period.totalFinalAmount)}
              </DataTableCell>
              <DataTableCell>{formatCurrency(period.totalPaidAmount)}</DataTableCell>
              <DataTableCell>{formatCurrency(period.totalRemainingAmount)}</DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={5}
            title="Ish haqi davrlari mavjud emas"
            description="Ish haqi hisoblangach, davrlar shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
    </div>
    </>
  );
}
