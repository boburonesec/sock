import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { SettingsOverview } from "@/lib/api/settings";

type SettingsChange = SettingsOverview["recentChanges"][number];

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

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
          <DataTableHeader>Status</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {changes.length === 0 ? (
          <EmptyTableState
            colSpan={5}
            title="So‘nggi o‘zgarishlar yo‘q"
            description="AuditLog-backed settings history hali ulanmagan."
          />
        ) : (
          changes.map((change) => (
            <DataTableRow key={change.id}>
              <DataTableCell className="font-semibold">{change.change}</DataTableCell>
              <DataTableCell>{change.module}</DataTableCell>
              <DataTableCell>{change.changedBy ?? "System"}</DataTableCell>
              <DataTableCell>{dateFormatter.format(new Date(change.date))}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone="info">{change.status}</StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </tbody>
    </DataTable>
  );
}
