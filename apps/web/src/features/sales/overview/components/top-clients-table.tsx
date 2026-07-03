import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import type { SalesSummary } from "@/lib/api/sales";

type TopClient = SalesSummary["topClients"][number];

export function TopClientsTable({ clients }: { clients: TopClient[] }) {
  return (
    <DataTable label="Top clientlar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Client</DataTableHeader>
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
              <DataTableCell>{item.totalOrders} so‘m</DataTableCell>
              <DataTableCell>{item.totalPaid} so‘m</DataTableCell>
              <DataTableCell className="font-semibold">
                {item.debt} so‘m
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={4}
            title="Top clientlar mavjud emas"
            description="Buyurtmalar paydo bo‘lgach, tizim top clientlarni qaytaradi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
