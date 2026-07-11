import Link from "next/link";
import { InfoCard } from "@/components/cards/info-card";
import { Drawer } from "@/components/overlays/drawer";
import type { ClientDebt } from "@/lib/api/sales";

interface ClientDebtDetailsDrawerProps {
  debt: ClientDebt | null;
  onOpenChange: (open: boolean) => void;
}

export function ClientDebtDetailsDrawer({
  debt,
  onOpenChange,
}: ClientDebtDetailsDrawerProps) {
  if (!debt) return null;

  return (
    <Drawer
      open={Boolean(debt)}
      onOpenChange={onOpenChange}
      title={debt.client.name}
      description={`${debt.client.phone ?? "Telefon yo‘q"} · ${
        debt.client.address ?? "Manzil yo‘q"
      }`}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/sales/payments"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            To‘lov qayd qilish
          </Link>
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
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard title="Jami buyurtma">
            <p className="text-xl font-bold">{debt.totalOrders} so‘m</p>
          </InfoCard>
          <InfoCard title="To‘langan">
            <p className="text-xl font-bold">{debt.totalPaid} so‘m</p>
          </InfoCard>
          <InfoCard title="Qarz">
            <p className="text-xl font-bold text-amber-500">
              {debt.debt} so‘m
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tizim hisob-kitob qiymati.
            </p>
          </InfoCard>
        </div>

        <InfoCard title="Mijoz ma’lumoti">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Holat:{" "}
              {debt.client.status === "ACTIVE"
                ? "Faol"
                : debt.client.status === "INACTIVE" || debt.client.status === "ARCHIVED"
                  ? "Nofaol"
                  : debt.client.status}
            </p>
            <p>Telefon: {debt.client.phone ?? "Kiritilmagan"}</p>
            <p>Manzil: {debt.client.address ?? "Kiritilmagan"}</p>
            <p>Izoh: {debt.client.notes ?? "Izoh yo‘q"}</p>
          </div>
        </InfoCard>

        <InfoCard title="Buyurtma va to‘lov tafsilotlari">
          <p className="text-sm text-muted-foreground">
            Bu ekran hozircha qarz hisob-kitobi bo‘limidan kelgan umumiy
            tizim hisoblagan qiymatlarni ko‘rsatadi. Buyurtmalar tafsiloti,
            oxirgi to‘lov va holat alohida tizim javobi berilganda
            ulanadi; ekran qarzni hisoblamaydi.
          </p>
        </InfoCard>
      </div>
    </Drawer>
  );
}
