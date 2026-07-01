import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { PayrollItem } from "@/lib/api/finance";

const statusTone: Record<string, StatusTone> = {
  CALCULATED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CARRIED_FORWARD: "neutral",
};

export function PayrollDetailsTable({ details }: { details: PayrollItem[] }) {
  return (
    <DataTable label="Payroll xodim tafsilotlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Xodim</DataTableHeader>
          <DataTableHeader>Ishlangan</DataTableHeader>
          <DataTableHeader>Bonus</DataTableHeader>
          <DataTableHeader>Jarima</DataTableHeader>
          <DataTableHeader>Avans</DataTableHeader>
          <DataTableHeader>Yakuniy oylik</DataTableHeader>
          <DataTableHeader>To‘langan</DataTableHeader>
          <DataTableHeader>Qoldiq</DataTableHeader>
          <DataTableHeader>Status</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {details.length > 0 ? (
          details.map((detail) => (
            <DataTableRow key={detail.id}>
              <DataTableCell className="font-semibold">
                {detail.employee.name}
              </DataTableCell>
              <DataTableCell>{detail.workedAmount} so‘m</DataTableCell>
              <DataTableCell>{detail.bonusAmount} so‘m</DataTableCell>
              <DataTableCell>{detail.penaltyAmount} so‘m</DataTableCell>
              <DataTableCell>{detail.advanceAmount} so‘m</DataTableCell>
              <DataTableCell className="font-semibold">
                {detail.finalAmount} so‘m
              </DataTableCell>
              <DataTableCell>{detail.paidAmount} so‘m</DataTableCell>
              <DataTableCell>{detail.remainingAmount} so‘m</DataTableCell>
              <DataTableCell>
                <StatusBadge tone={statusTone[detail.status] ?? "neutral"}>
                  {detail.status}
                </StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={9}
            title="Payroll tafsilotlari mavjud emas"
            description="Tanlangan davr uchun payroll item snapshotlari topilmadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
