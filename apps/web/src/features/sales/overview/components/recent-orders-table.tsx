import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import type { SalesSummary } from "@/lib/api/sales";
import { formatCurrency } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

type RecentOrder = SalesSummary["recentOrders"][number];

const orderStatus: Record<string, { label: string; tone: StatusTone }> = {
  CONFIRMED: { label: "Tasdiqlangan", tone: "info" },
  WAITING_PRODUCTION: { label: "Ishlab chiqarish kutilmoqda", tone: "warning" },
  READY: { label: "Tayyor", tone: "info" },
  DELIVERED: { label: "Yetkazilgan", tone: "success" },
  CLOSED: { label: "Yopilgan", tone: "success" },
};

function formatDate(value: string): string {
  return formatDateShort(new Date(value),);
}

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <DataTable label="So‘nggi buyurtmalar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Buyurtma</DataTableHeader>
          <DataTableHeader>Mijoz</DataTableHeader>
          <DataTableHeader>Summa</DataTableHeader>
          <DataTableHeader>Holat</DataTableHeader>
          <DataTableHeader>Sana</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {orders.length > 0 ? (
          orders.map((order) => {
            const status = orderStatus[order.status];

            return (
              <DataTableRow key={order.id}>
                <DataTableCell className="font-semibold">
                  {order.orderNumber}
                </DataTableCell>
                <DataTableCell>{order.client.name}</DataTableCell>
                <DataTableCell>{formatCurrency(order.totalAmount)}</DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={status?.tone ?? "neutral"}>
                    {status?.label ?? order.status}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell>{formatDate(order.createdAt)}</DataTableCell>
              </DataTableRow>
            );
          })
        ) : (
          <EmptyTableState
            colSpan={5}
            title="So‘nggi buyurtmalar mavjud emas"
            description="Sotuvchilar buyurtma yaratgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
