import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { PageSection } from "@/components/layout/page-section";
import type { ExecutiveSummary } from "@/lib/api/dashboard";

type RecentActivityItem = ExecutiveSummary["recentActivity"][number];

const typeLabels: Record<RecentActivityItem["type"], string> = {
  ORDER: "Buyurtma",
  EXPENSE: "Xarajat",
};

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <PageSection
      title="So‘nggi faollik"
      description="Tizim qaytargan oxirgi cross-domain yozuvlar"
    >
      <DataTable label="So‘nggi faollik">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeader>Turi</DataTableHeader>
            <DataTableHeader>Nomi</DataTableHeader>
            <DataTableHeader>Izoh</DataTableHeader>
            <DataTableHeader>Sana</DataTableHeader>
          </DataTableRow>
        </DataTableHead>
        <tbody>
          {items.length === 0 ? (
            <EmptyTableState
              colSpan={4}
              title="So‘nggi faollik yo‘q"
              description="Tizim recentActivity bo‘sh ro‘yxat qaytardi."
            />
          ) : (
            items.map((item) => (
              <DataTableRow key={`${item.type}-${item.id}`}>
                <DataTableCell>{typeLabels[item.type]}</DataTableCell>
                <DataTableCell className="font-semibold">{item.title}</DataTableCell>
                <DataTableCell>{item.description}</DataTableCell>
                <DataTableCell>{dateFormatter.format(new Date(item.occurredAt))}</DataTableCell>
              </DataTableRow>
            ))
          )}
        </tbody>
      </DataTable>
    </PageSection>
  );
}
