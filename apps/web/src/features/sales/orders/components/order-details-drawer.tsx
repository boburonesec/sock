import { InfoCard } from "@/components/cards/info-card";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import type { SalesOrder } from "@/lib/api/sales";

function formatDate(value: string | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const orderStatusLabel: Record<string, string> = {
  DRAFT: "Qoralama",
  CONFIRMED: "Tasdiqlangan",
  WAITING_PRODUCTION: "Ishlab chiqarish kutilmoqda",
  READY: "Tayyor",
  DELIVERED: "Yetkazilgan",
  CLOSED: "Yopilgan",
  CANCELLED: "Bekor qilingan",
};

const paymentStatusLabel: Record<string, string> = {
  UNPAID: "To‘lanmagan",
  PARTIALLY_PAID: "Qisman to‘langan",
  PAID: "To‘langan",
};

interface OrderDetailsDrawerProps {
  order: SalesOrder | null;
  isDelivering?: boolean;
  isReturning?: boolean;
  onDeliver?: (order: SalesOrder) => void;
  onReturnDelivery?: (order: SalesOrder) => void;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailsDrawer({
  order,
  isDelivering = false,
  isReturning = false,
  onDeliver,
  onReturnDelivery,
  onOpenChange,
}: OrderDetailsDrawerProps) {
  if (!order) return null;
  const isDeliverable = isOrderDeliverable(order);
  const isReturnable = order.status === "DELIVERED";

  return (
    <Drawer
      open={Boolean(order)}
      onOpenChange={onOpenChange}
      title={order.orderNumber}
      description={`${order.client.name} · ${formatDate(order.createdAt)}`}
      className="max-w-5xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!isDeliverable || isDelivering}
            onClick={() => onDeliver?.(order)}
          >
            {isDelivering ? "Yetkazilmoqda..." : "Yetkazildi qilish"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isReturnable || isReturning}
            onClick={() => onReturnDelivery?.(order)}
          >
            {isReturning ? "Qaytarilmoqda..." : "Yetkazuvni qaytarish"}
          </Button>
        </div>
        {!isDeliverable ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Faqat to‘liq to‘langan va yopilmagan buyurtmalar
            yetkaziladi.
          </p>
        ) : null}
        {isReturnable ? (
          <p className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
            Yetkazuv qaytarilganda mahsulot tayyor mahsulot zonasiga qaytadi.
            To‘lov avtomatik bekor qilinmaydi.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard title="Jami summa">
            <p className="text-xl font-bold">{order.totalAmount} so‘m</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Buyurtma yaratilgan paytdagi tizim qiymati.
            </p>
          </InfoCard>
          <InfoCard title="Buyurtma holati">
            <p className="text-xl font-bold">{orderStatusLabel[order.status] ?? order.status}</p>
          </InfoCard>
          <InfoCard title="To‘lov holati">
            <p className="text-xl font-bold">{paymentStatusLabel[order.paymentStatus] ?? order.paymentStatus}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              To‘lovlar buyurtmadan alohida yuritiladi.
            </p>
          </InfoCard>
        </div>

        <section>
          <p className="mb-3 text-sm font-semibold">Mahsulotlar</p>
          <DataTable label="Buyurtma mahsulotlari" className="border-0 shadow-none">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Mahsulot modeli</DataTableHeader>
                <DataTableHeader>Rang</DataTableHeader>
                <DataTableHeader>Material</DataTableHeader>
                <DataTableHeader>Mavsum</DataTableHeader>
                <DataTableHeader>Miqdor</DataTableHeader>
                <DataTableHeader>Birlik narx</DataTableHeader>
                <DataTableHeader>Jami narx</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {order.items.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell>{item.productVariant.product.name}</DataTableCell>
                  <DataTableCell>{item.productVariant.color.name}</DataTableCell>
                  <DataTableCell>{item.productVariant.material.name}</DataTableCell>
                  <DataTableCell>{item.productVariant.season.name}</DataTableCell>
                  <DataTableCell>{item.quantity} dona</DataTableCell>
                  <DataTableCell>{item.unitPrice} so‘m</DataTableCell>
                  <DataTableCell className="font-semibold">
                    {item.totalPrice} so‘m
                  </DataTableCell>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </section>

        <InfoCard title="Davr ma’lumoti">
          <p className="text-sm text-muted-foreground">
            Yaratilgan: {formatDate(order.createdAt)} · Muddat: {formatDate(order.deadline)}
          </p>
        </InfoCard>
      </div>
    </Drawer>
  );
}

function isOrderDeliverable(order: SalesOrder): boolean {
  return (
    order.paymentStatus === "PAID" &&
    !["DRAFT", "CANCELLED", "DELIVERED", "CLOSED"].includes(order.status)
  );
}
