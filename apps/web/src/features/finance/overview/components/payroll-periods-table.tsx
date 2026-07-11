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

const statusTone: Record<string, StatusTone> = {
  DRAFT: "neutral",
  CALCULATED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CLOSED: "success",
};

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function PayrollPeriodsTable({
  periods,
}: {
  periods: PayrollPeriod[];
}) {
  return (
    <DataTable label="Ish haqi davrlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Oy</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>Yakuniy oylik</DataTableHeader>
          <DataTableHeader>To‘langan</DataTableHeader>
          <DataTableHeader>Qoldiq</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {periods.length > 0 ? (
          periods.map((period) => (
            <DataTableRow key={period.id}>
              <DataTableCell className="font-semibold">
                {formatMonth(period.month)}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTone[period.status] ?? "neutral"}>
                  {labelStatus(payrollPeriodStatusLabel, period.status)}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{period.totalFinalAmount} so‘m</DataTableCell>
              <DataTableCell>{period.totalPaidAmount} so‘m</DataTableCell>
              <DataTableCell className="font-semibold">
                {period.totalRemainingAmount} so‘m
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={5}
            title="Ish haqi davrlari mavjud emas"
            description="Ish haqi hisoblanganidan keyin davrlar shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
