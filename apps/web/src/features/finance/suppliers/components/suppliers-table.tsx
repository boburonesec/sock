import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { SupplierDebt } from "@/lib/api/supplier";

const statusTone: Record<string, StatusTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
};

export function SuppliersTable({
  debts,
  onSelect,
}: {
  debts: SupplierDebt[];
  onSelect: (debt: SupplierDebt) => void;
}) {
  return (
    <DataTable label="Yetkazib beruvchi qarzdorligi">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Yetkazib beruvchi</DataTableHeader>
          <DataTableHeader>Telefon</DataTableHeader>
          <DataTableHeader>Jami xarid</DataTableHeader>
          <DataTableHeader>To‘langan</DataTableHeader>
          <DataTableHeader>Qarz</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {debts.length > 0 ? (
          debts.map((debt) => (
            <DataTableRow key={debt.supplier.id} className="hover:bg-muted/40">
              <DataTableCell>
                <button
                  onClick={() => onSelect(debt)}
                  className="text-left font-semibold hover:text-primary"
                >
                  {debt.supplier.name}
                </button>
              </DataTableCell>
              <DataTableCell>{debt.supplier.phone ?? "—"}</DataTableCell>
              <DataTableCell>{debt.totalPurchases} so‘m</DataTableCell>
              <DataTableCell>{debt.totalPaid} so‘m</DataTableCell>
              <DataTableCell className="font-semibold">
                {debt.debt} so‘m
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTone[debt.supplier.status] ?? "neutral"}>
                  {statusLabel[debt.supplier.status] ?? debt.supplier.status}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={6}
            title="Yetkazib beruvchi qarzlari mavjud emas"
            description="Xaridlar va to‘lovlar paydo bo‘lgach, tizim hisob-kitobi shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
