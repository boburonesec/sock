import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { SettingsOverview } from "@/lib/api/settings";
import { formatDateTimeForUser } from "@/lib/format";

type SettingsChange = SettingsOverview["recentChanges"][number];

export function RecentSettingsChangesTable({
  changes,
}: {
  changes: SettingsChange[];
}) {
  return (
    <DataTable label="So‘nggi sozlama o‘zgarishlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>O‘zgarish</DataTableHeader>
          <DataTableHeader>Modul</DataTableHeader>
          <DataTableHeader>O‘zgartirgan</DataTableHeader>
          <DataTableHeader>Sana</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {changes.length === 0 ? (
          <EmptyTableState
            colSpan={5}
            title="So‘nggi o‘zgarishlar yo‘q"
            description="Sozlamalar tarixi hali ulanmagan."
          />
        ) : (
          changes.map((change) => (
            <DataTableRow key={change.id}>
              <DataTableCell className="font-semibold">{change.change}</DataTableCell>
              <DataTableCell>{change.module}</DataTableCell>
              <DataTableCell>{change.changedBy ?? "Tizim"}</DataTableCell>
              <DataTableCell>{formatDateTimeForUser(change.date)}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone="info">
                  {change.status === "READY"
                    ? "Tayyor"
                    : change.status === "CONFIGURED"
                      ? "Sozlangan"
                      : change.status === "NEEDS_ATTENTION"
                        ? "E’tibor kerak"
                        : change.status}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </tbody>
    </DataTable>
  );
}
