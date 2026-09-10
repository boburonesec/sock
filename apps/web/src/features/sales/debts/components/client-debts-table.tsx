import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import type { ClientDebt } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";
import { DebtCard } from "./debt-card";

export function ClientDebtsTable({
  debts,
  onSelect,
}: {
  debts: ClientDebt[];
  onSelect: (debt: ClientDebt) => void;
}) {
  return (
    <ResponsiveDataList
      items={debts}
      getKey={(debt) => debt.client.id}
      renderCard={(debt) => <DebtCard debt={debt} onSelect={onSelect} />}
      ariaLabel="Mijoz qarzdorligi"
      emptyTitle="Mijoz qarzlari mavjud emas"
      emptyDescription="Buyurtma va to‘lovlar paydo bo‘lgach, tizim hisob-kitob shu yerda ko‘rinadi."
    >
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
    </ResponsiveDataList>
  );
}
