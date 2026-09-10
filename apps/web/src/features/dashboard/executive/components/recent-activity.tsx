import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { PageSection } from "@/components/layout/page-section";
import type { ExecutiveSummary } from "@/lib/api/dashboard";
import { formatDateTimeForUser } from "@/lib/format";
import { formatVisibleStatusText } from "@/lib/status-labels";
import { RecentActivityCard } from "./recent-activity-card";

type RecentActivityItem = ExecutiveSummary["recentActivity"][number];

const typeLabels: Record<RecentActivityItem["type"], string> = {
  ORDER: "Buyurtma",
  EXPENSE: "Xarajat",
};

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <PageSection
      title="So‘nggi faollik"
      description="Tizimdagi oxirgi muhim yozuvlar"
    >
      <ResponsiveDataList
        items={items}
        getKey={(item) => `${item.type}-${item.id}`}
        renderCard={(item) => <RecentActivityCard item={item} />}
        ariaLabel="So‘nggi faollik"
        emptyTitle="So‘nggi faollik yo‘q"
        emptyDescription="Hozircha so‘nggi faollik bo‘yicha ma’lumot yo‘q."
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
              description="Hozircha so‘nggi faollik bo‘yicha ma’lumot yo‘q."
            />
          ) : (
            items.map((item) => (
              <DataTableRow key={`${item.type}-${item.id}`}>
                <DataTableCell>{typeLabels[item.type]}</DataTableCell>
                <DataTableCell className="font-semibold">{item.title}</DataTableCell>
                <DataTableCell>{formatVisibleStatusText(item.description)}</DataTableCell>
                <DataTableCell className="whitespace-nowrap">{formatDateTimeForUser(item.occurredAt)}</DataTableCell>
              </DataTableRow>
            ))
          )}
        </tbody>
      </DataTable>
      </ResponsiveDataList>
    </PageSection>
  );
}
