import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import type { ClientDebt } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";

export function ClientDebtsTable({
  debts,
  onSelect,
}: {
  debts: ClientDebt[];
  onSelect: (debt: ClientDebt) => void;
}) {
  return (
    <DataTable label="Mijoz qarzdorligi">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Mijoz</DataTableHeader>
          <DataTableHeader>Telefon</DataTableHeader>
          <DataTableHeader>Jami buyurtma</DataTableHeader>
          <DataTableHeader>To‘langan</DataTableHeader>
          <DataTableHeader>Qarz</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {debts.length > 0 ? (
          debts.map((debt) => (
            <DataTableRow key={debt.client.id} className="hover:bg-muted/40">
              <DataTableCell>
                <button
                  onClick={() => onSelect(debt)}
                  className="text-left font-semibold hover:text-primary"
                >
                  {debt.client.name}
                </button>
              </DataTableCell>
              <DataTableCell>{debt.client.phone ?? "—"}</DataTableCell>
              <DataTableCell>{formatCurrency(debt.totalOrders)}</DataTableCell>
              <DataTableCell>{formatCurrency(debt.totalPaid)}</DataTableCell>
              <DataTableCell className="font-semibold">
                {formatCurrency(debt.debt)}
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={5}
            title="Mijoz qarzlari mavjud emas"
            description="Buyurtma va to‘lovlar paydo bo‘lgach, tizim hisob-kitob shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
