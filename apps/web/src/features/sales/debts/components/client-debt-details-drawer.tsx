import { InfoCard } from "@/components/cards/info-card";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
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
          <Button disabled>To‘lov qayd qilish · Tez orada</Button>
          <Button disabled variant="outline">
            Clientga o‘tish · Tez orada
          </Button>
          <Button disabled variant="outline">
            Buyurtmalarni ko‘rish · Tez orada
          </Button>
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

        <InfoCard title="Client ma’lumoti">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Status: {debt.client.status}</p>
            <p>Telefon: {debt.client.phone ?? "Kiritilmagan"}</p>
            <p>Manzil: {debt.client.address ?? "Kiritilmagan"}</p>
            <p>Izoh: {debt.client.notes ?? "Izoh yo‘q"}</p>
          </div>
        </InfoCard>

        <InfoCard title="Buyurtma va to‘lov tafsilotlari">
          <p className="text-sm text-muted-foreground">
            Bu ekran hozircha qarz hisob-kitobi bo‘limidan kelgan umumiy
            tizim hisoblagan qiymatlarni ko‘rsatadi. Buyurtmalar breakdowni,
            oxirgi to‘lov va status alohida tizim response berilganda
            ulanadi; ekran qarzni hisoblamaydi.
          </p>
        </InfoCard>
      </div>
    </Drawer>
  );
}
