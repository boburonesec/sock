import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { ReportsOverview } from "@/lib/api/reports";
import { formatDateTimeForUser } from "@/lib/format";

type RecentReport = ReportsOverview["recentReports"][number];

export function RecentReportsTable({ reports }: { reports: RecentReport[] }) {
  return (
    <DataTable label="So‘nggi hisobotlar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Hisobot nomi</DataTableHeader>
          <DataTableHeader>Kategoriya</DataTableHeader>
          <DataTableHeader>Oxirgi yangilanish</DataTableHeader>
          <DataTableHeader>Mas’ul</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {reports.length === 0 ? (
          <EmptyTableState
            colSpan={5}
            title="So‘nggi hisobotlar yo‘q"
            description="Hozircha oldin tayyorlangan hisobot yo‘q."
          />
        ) : (
          reports.map((report) => (
            <DataTableRow key={report.id}>
              <DataTableCell className="font-semibold">{report.name}</DataTableCell>
              <DataTableCell>{report.category}</DataTableCell>
              <DataTableCell>{formatDateTimeForUser(report.updatedAt)}</DataTableCell>
              <DataTableCell>{report.owner ?? "Tizim"}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone="info">
                  {report.status === "READY"
                    ? "Tayyor"
                    : report.status === "DRAFT"
                      ? "Qoralama"
                      : report.status === "PENDING"
                        ? "Kutilmoqda"
                        : report.status}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </tbody>
    </DataTable>
  );
}
