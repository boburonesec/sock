import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { Advance } from "@/lib/api/finance";
import { advanceStatusLabel, labelStatus } from "@/lib/status-labels";

const statusTone: Record<string, StatusTone> = {
  REQUESTED: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
  APPLIED: "success",
  CANCELLED: "neutral",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function RecentAdvancesTable({ advances }: { advances: Advance[] }) {
  return (
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
              <DataTableCell>{advance.amount} so‘m</DataTableCell>
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
  );
}
