import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { ReportsOverview } from "@/lib/api/reports";

type RecentReport = ReportsOverview["recentReports"][number];

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function RecentReportsTable({ reports }: { reports: RecentReport[] }) {
  return (
    <DataTable label="So‘nggi hisobotlar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Hisobot nomi</DataTableHeader>
          <DataTableHeader>Kategoriya</DataTableHeader>
          <DataTableHeader>Oxirgi yangilanish</DataTableHeader>
          <DataTableHeader>Mas’ul</DataTableHeader>
          <DataTableHeader>Status</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {reports.length === 0 ? (
          <EmptyTableState
            colSpan={5}
            title="So‘nggi hisobotlar yo‘q"
            description="Real report metadata hali mavjud emas."
          />
        ) : (
          reports.map((report) => (
            <DataTableRow key={report.id}>
              <DataTableCell className="font-semibold">{report.name}</DataTableCell>
              <DataTableCell>{report.category}</DataTableCell>
              <DataTableCell>{dateFormatter.format(new Date(report.updatedAt))}</DataTableCell>
              <DataTableCell>{report.owner ?? "System"}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone="info">{report.status}</StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </tbody>
    </DataTable>
  );
}
