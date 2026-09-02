import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { ClientPayment } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";
import { formatDateTimeForUser } from "@/lib/format";

const methodLabel: Record<string, string> = {
  CASH: "Naqd",
  TRANSFER: "O‘tkazma",
  OTHER: "Boshqa",
};

function formatDate(value: string): string {
  return formatDateTimeForUser(new Date(value));
}

function formatOrderNumbers(payment: ClientPayment): string {
  if (payment.allocations.length === 0) return "—";

  return payment.allocations
    .map((allocation) => allocation.order.orderNumber)
    .join(", ");
}

export function PaymentsTable({
  payments,
  onSelect,
}: {
  payments: ClientPayment[];
  onSelect: (payment: ClientPayment) => void;
}) {
  return (
    <DataTable label="To‘lovlar ro‘yxati">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>To‘lov raqami</DataTableHeader>
          <DataTableHeader>Mijoz</DataTableHeader>
          <DataTableHeader>Buyurtma raqami</DataTableHeader>
          <DataTableHeader>Summa</DataTableHeader>
          <DataTableHeader>To‘lov usuli</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>To‘lov sanasi</DataTableHeader>
          <DataTableHeader>Qayd qilgan</DataTableHeader>
          <DataTableHeader>Izoh</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {payments.length > 0 ? (
          payments.map((payment) => (
            <DataTableRow key={payment.id} className="hover:bg-muted/40">
              <DataTableCell>
                <button
                  onClick={() => onSelect(payment)}
                  className="font-semibold hover:text-primary"
                >
                  {payment.id}
                </button>
              </DataTableCell>
              <DataTableCell>{payment.client.name}</DataTableCell>
              <DataTableCell>{formatOrderNumbers(payment)}</DataTableCell>
              <DataTableCell className="font-semibold">
                {formatCurrency(payment.amount)}
              </DataTableCell>
              <DataTableCell>
                {methodLabel[payment.method] ?? payment.method}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={payment.reversedAt ? "danger" : "success"}>
                  {payment.reversedAt ? "Bekor qilingan" : "Faol"}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell>{formatDate(payment.paymentDate)}</DataTableCell>
              <DataTableCell>{payment.recordedBy?.name ?? "—"}</DataTableCell>
              <DataTableCell>{payment.note ?? "—"}</DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={9}
            title="To‘lovlar mavjud emas"
            description="Sotuvchi yoki hisobchi to‘lov qayd qilgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
