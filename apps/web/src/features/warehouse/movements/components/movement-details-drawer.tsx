import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/overlays/drawer";
import { InfoCard } from "@/components/cards/info-card";
import type { StockMovement } from "@/lib/api/warehouse";

interface MovementDetailsDrawerProps {
  movement: StockMovement | null;
  onOpenChange: (open: boolean) => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function itemName(movement: StockMovement): string {
  if (movement.productVariant) {
    return `${movement.productVariant.product.name} · ${movement.productVariant.color.name}`;
  }

  return movement.material?.name ?? "—";
}

export function MovementDetailsDrawer({
  movement,
  onOpenChange,
}: MovementDetailsDrawerProps) {
  if (!movement) return null;

  return (
    <Drawer
      open={Boolean(movement)}
      onOpenChange={onOpenChange}
      title={movement.movementType}
      description={formatDate(movement.occurredAt)}
      className="max-w-3xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button disabled variant="outline">
            Correction qilish · Keyingi bosqich
          </Button>
          <Button disabled variant="outline">
            Transfer qilish · Keyingi bosqich
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard title="Item">
            <p className="font-semibold">{itemName(movement)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {movement.itemType} · {movement.quantity} {movement.unit}
            </p>
          </InfoCard>
          <InfoCard title="Zona va mas’ul">
            <p className="font-semibold">{movement.zone.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {movement.recordedBy.name}
            </p>
          </InfoCard>
          <InfoCard title="Oldingi qoldiq">
            <p className="text-xl font-bold">
              {movement.beforeQuantity ?? "Mavjud emas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              API qaytargan audit qiymati.
            </p>
          </InfoCard>
          <InfoCard title="Keyingi qoldiq">
            <p className="text-xl font-bold">
              {movement.afterQuantity ?? "Mavjud emas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              API qaytargan audit qiymati.
            </p>
          </InfoCard>
        </div>

        <InfoCard title="Sabab / Izoh">
          <p className="text-sm text-muted-foreground">
            {movement.reason ?? movement.note ?? "Izoh kiritilmagan"}
          </p>
        </InfoCard>
      </div>
    </Drawer>
  );
}
