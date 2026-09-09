import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { AdvanceCard } from "@/features/finance/advances/components/advance-card";
import type { Advance } from "@/lib/api/finance";
import { advanceStatusLabel, labelStatus } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

const statusTone: Record<string, StatusTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
  APPLIED: "success",
  CANCELLED: "neutral",
};

function formatDate(value: string): string {
  return formatDateShort(new Date(value),);
}

export function RecentAdvancesTable({ advances }: { advances: Advance[] }) {
  return (
    <ResponsiveDataList
      items={advances}
      getKey={(advance) => advance.id}
      // Read-only preview: no approve/pay handlers, so the shared card
      // renders with no action row — matches this table's own read-only
      // desktop columns (no "Amallar" column here).
      renderCard={(advance) => <AdvanceCard advance={advance} isRequester={false} />}
      ariaLabel="So‘nggi avanslar"
      emptyTitle="Avanslar mavjud emas"
      emptyDescription="Avans so‘rovlari paydo bo‘lgach, ular shu yerda ko‘rinadi."
    >
    <DataTable label="So‘nggi avanslar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Xodim</DataTableHeader>
          <DataTableHeader>Summa</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>Sana</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {advances.length > 0 ? (
          advances.map((advance) => (
            <DataTableRow key={advance.id}>
              <DataTableCell className="font-semibold">
                {advance.employee.name}
              </DataTableCell>
              <DataTableCell>{formatCurrency(advance.amount)}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTone[advance.status] ?? "neutral"}>
                  {labelStatus(advanceStatusLabel, advance.status)}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{formatDate(advance.requestedAt)}</DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={4}
            title="Avanslar mavjud emas"
            description="Avans so‘rovlari paydo bo‘lgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
    </ResponsiveDataList>
  );
}
