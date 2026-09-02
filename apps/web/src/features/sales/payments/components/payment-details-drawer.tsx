import Link from "next/link";
import { InfoCard } from "@/components/cards/info-card";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
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

interface PaymentDetailsDrawerProps {
  payment: ClientPayment | null;
  isReversing: boolean;
  onReverseClick: () => void;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDetailsDrawer({
  payment,
  isReversing,
  onReverseClick,
  onOpenChange,
}: PaymentDetailsDrawerProps) {
  if (!payment) return null;

  return (
    <Drawer
      open={Boolean(payment)}
      onOpenChange={onOpenChange}
      title={payment.id}
      description={formatDate(payment.paymentDate)}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sales/clients"
            className="inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold hover:bg-muted"
          >
            Mijozlar
          </Link>
          <Link
            href="/sales/orders"
            className="inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold hover:bg-muted"
          >
            Buyurtmalar
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(payment.reversedAt) || isReversing}
            onClick={onReverseClick}
          >
            {payment.reversedAt
              ? "To‘lov bekor qilingan"
              : "To‘lovni bekor qilish"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard title="Mijoz ma’lumoti">
            <p className="font-semibold">{payment.client.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {payment.client.phone ?? "Telefon kiritilmagan"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {payment.client.address ?? "Manzil kiritilmagan"}
            </p>
          </InfoCard>
          <InfoCard title="To‘lov ma’lumoti">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xl font-bold">{formatCurrency(payment.amount)}</p>
              <StatusBadge tone={payment.reversedAt ? "danger" : "success"}>
                {payment.reversedAt ? "Bekor qilingan" : "Faol"}
              </StatusBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {methodLabel[payment.method] ?? payment.method} ·{" "}
              {payment.recordedBy?.name ?? "Qayd qiluvchi ko‘rsatilmagan"}
            </p>
            {payment.reversedAt ? (
              <p className="mt-2 text-xs text-rose-300">
                Bekor qilingan: {formatDate(payment.reversedAt)} ·{" "}
                {payment.reversedBy?.name ?? "Noma’lum operator"}
              </p>
            ) : null}
          </InfoCard>
        </div>

        <InfoCard title="Qarz xulosasi">
          <p className="text-sm text-muted-foreground">
            Bu bo‘lim faqat to‘lov yozuvlarini qaytaradi. Mijoz qarzi
            alohida tizim hisob-kitob orqali olinadi; ekran bu yerda qarz
            yoki qoldiqni hisoblamaydi.
          </p>
        </InfoCard>

        <section>
          <p className="mb-3 text-sm font-semibold">Bog‘langan buyurtmalar</p>
          <DataTable
            label="To‘lov taqsimotlari"
            className="border-0 shadow-none"
          >
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Buyurtma raqami</DataTableHeader>
                <DataTableHeader>Buyurtmaga ajratilgan summa</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {payment.allocations.length > 0 ? (
                payment.allocations.map((allocation) => (
                  <DataTableRow key={allocation.id}>
                    <DataTableCell>
                      {allocation.order.orderNumber}
                    </DataTableCell>
                    <DataTableCell className="font-semibold">
                      {formatCurrency(allocation.amount)}
                    </DataTableCell>
                  </DataTableRow>
                ))
              ) : (
                <EmptyTableState
                  colSpan={2}
                  title="Bog‘langan buyurtma yo‘q"
                  description="To‘lovlar to‘liq taqsimot bilan yaratiladi. Agar bu holat ko‘rinsa, ma’lumotni tekshirish kerak."
                />
              )}
            </tbody>
          </DataTable>
        </section>

        <InfoCard title="Izoh">
          <p className="text-sm text-muted-foreground">
            {payment.note ?? "Izoh kiritilmagan"}
          </p>
        </InfoCard>

        {payment.reversedAt ? (
          <InfoCard title="Bekor qilish sababi">
            <p className="text-sm text-muted-foreground">
              {payment.reversalReason ?? "Sabab kiritilmagan"}
            </p>
          </InfoCard>
        ) : null}
      </div>
    </Drawer>
  );
}
