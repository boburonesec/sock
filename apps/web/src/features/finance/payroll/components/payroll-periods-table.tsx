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
  return new Intl.DateTimeFormat("uz-UZ", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function PayrollPeriodsTable({
  periods,
  selectedPeriodId,
  onSelect,
}: PayrollPeriodsTableProps) {
  return (
    <DataTable label="Ish haqi davrlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Oy</DataTableHeader>
          <DataTableHeader>Status</DataTableHeader>
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
                  {period.status}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell className="font-semibold">
                {period.totalFinalAmount} so‘m
              </DataTableCell>
              <DataTableCell>{period.totalPaidAmount} so‘m</DataTableCell>
              <DataTableCell>{period.totalRemainingAmount} so‘m</DataTableCell>
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
  );
}
