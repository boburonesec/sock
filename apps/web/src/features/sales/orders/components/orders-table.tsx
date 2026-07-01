import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { SalesOrder } from "@/lib/api/sales";

const orderStatus: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: { label: "Qoralama", tone: "neutral" },
  CONFIRMED: { label: "Tasdiqlangan", tone: "info" },
  WAITING_PRODUCTION: { label: "Ishlab chiqarish kutilmoqda", tone: "warning" },
  READY: { label: "Tayyor", tone: "info" },
  DELIVERED: { label: "Yetkazilgan", tone: "success" },
  CLOSED: { label: "Yopilgan", tone: "success" },
  CANCELLED: { label: "Bekor qilingan", tone: "danger" },
};

const paymentStatus: Record<string, { label: string; tone: StatusTone }> = {
  UNPAID: { label: "To‘lanmagan", tone: "danger" },
  PARTIALLY_PAID: { label: "Qisman to‘langan", tone: "warning" },
  PAID: { label: "To‘langan", tone: "success" },
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function OrdersTable({
  orders,
  onSelect,
}: {
  orders: SalesOrder[];
  onSelect: (order: SalesOrder) => void;
}) {
  return (
    <DataTable label="Buyurtmalar ro‘yxati">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Buyurtma raqami</DataTableHeader>
          <DataTableHeader>Client</DataTableHeader>
          <DataTableHeader>Sotuvchi</DataTableHeader>
          <DataTableHeader>Jami summa</DataTableHeader>
          <DataTableHeader>Status</DataTableHeader>
          <DataTableHeader>Muddat</DataTableHeader>
          <DataTableHeader>To‘lov holati</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {orders.length > 0 ? (
          orders.map((order) => {
            const lifecycle = orderStatus[order.status];
            const payment = paymentStatus[order.paymentStatus];

            return (
              <DataTableRow key={order.id} className="hover:bg-muted/40">
                <DataTableCell>
                  <button
                    onClick={() => onSelect(order)}
                    className="font-semibold hover:text-primary"
                  >
                    {order.orderNumber}
                  </button>
                </DataTableCell>
                <DataTableCell>{order.client.name}</DataTableCell>
                <DataTableCell>{order.createdBy?.name ?? "—"}</DataTableCell>
                <DataTableCell className="font-semibold">
                  {order.totalAmount} so‘m
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={lifecycle?.tone ?? "neutral"}>
                    {lifecycle?.label ?? order.status}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell>{formatDate(order.deadline)}</DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={payment?.tone ?? "neutral"}>
                    {payment?.label ?? order.paymentStatus}
                  </StatusBadge>
                </DataTableCell>
              </DataTableRow>
            );
          })
        ) : (
          <EmptyTableState
            colSpan={7}
            title="Buyurtmalar mavjud emas"
            description="Sotuvchi buyurtma yaratgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
