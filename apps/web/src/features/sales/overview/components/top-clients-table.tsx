import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { DebtCard } from "@/features/sales/debts/components/debt-card";
import type { SalesSummary } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";

type TopClient = SalesSummary["topClients"][number];

export function TopClientsTable({ clients }: { clients: TopClient[] }) {
  return (
    <ResponsiveDataList
      items={clients}
      getKey={(item) => item.client.id}
      // Read-only: no onSelect, so DebtCard renders inert (no click
      // affordance) — matches this table's own read-only desktop rows.
      renderCard={(item) => <DebtCard debt={item} />}
      ariaLabel="Eng faol mijozlar"
      emptyTitle="Eng faol mijozlar mavjud emas"
      emptyDescription="Buyurtmalar paydo bo‘lgach, tizim eng faol mijozlarni qaytaradi."
    >
    <DataTable label="Eng faol mijozlar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Mijoz</DataTableHeader>
          <DataTableHeader>Jami buyurtma</DataTableHeader>
          <DataTableHeader>To‘langan</DataTableHeader>
          <DataTableHeader>Qarz</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {clients.length > 0 ? (
          clients.map((item) => (
            <DataTableRow key={item.client.id}>
              <DataTableCell className="font-semibold">
                {item.client.name}
              </DataTableCell>
              <DataTableCell>{formatCurrency(item.totalOrders)}</DataTableCell>
              <DataTableCell>{formatCurrency(item.totalPaid)}</DataTableCell>
              <DataTableCell className="font-semibold">
                {formatCurrency(item.debt)}
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={4}
            title="Eng faol mijozlar mavjud emas"
            description="Buyurtmalar paydo bo‘lgach, tizim eng faol mijozlarni qaytaradi."
          />
        )}
      </tbody>
    </DataTable>
    </ResponsiveDataList>
  );
}
