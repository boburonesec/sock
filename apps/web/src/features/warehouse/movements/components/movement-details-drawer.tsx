import Link from "next/link";
import { Drawer } from "@/components/overlays/drawer";
import { InfoCard } from "@/components/cards/info-card";
import type { StockMovement } from "@/lib/api/warehouse";
import {
  formatStockMovementReason,
  formatStockUnit,
  formatWarehouseZoneName,
  labelStatus,
  stockItemTypeLabel,
  stockMovementTypeLabel,
} from "@/lib/status-labels";
import { formatDateTimeForUser } from "@/lib/format";

interface MovementDetailsDrawerProps {
  movement: StockMovement | null;
  onOpenChange: (open: boolean) => void;
}

function formatDate(value: string): string {
  return formatDateTimeForUser(new Date(value));
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
      title={labelStatus(stockMovementTypeLabel, movement.movementType)}
      description={formatDate(movement.occurredAt)}
      className="max-w-3xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/warehouse"
            className="inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold hover:bg-muted"
          >
            Qoldiqni tuzatish
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard title="Nomi">
            <p className="font-semibold">{itemName(movement)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {labelStatus(stockItemTypeLabel, movement.itemType)} · {movement.quantity}{" "}
              {formatStockUnit(movement.unit)}
            </p>
          </InfoCard>
          <InfoCard title="Zona va mas’ul">
            <p className="font-semibold">{formatWarehouseZoneName(movement.zone.name)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {movement.recordedBy.name}
            </p>
          </InfoCard>
          <InfoCard title="Oldingi qoldiq">
            <p className="text-xl font-bold">
              {movement.beforeQuantity ?? "Mavjud emas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ma’lumot qaytargan audit qiymati.
            </p>
          </InfoCard>
          <InfoCard title="Keyingi qoldiq">
            <p className="text-xl font-bold">
              {movement.afterQuantity ?? "Mavjud emas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ma’lumot qaytargan audit qiymati.
            </p>
          </InfoCard>
        </div>

        <InfoCard title="Sabab / Izoh">
          <p className="text-sm text-muted-foreground">
            {movement.reason ? formatStockMovementReason(movement.reason) : (movement.note ?? "Izoh kiritilmagan")}
          </p>
        </InfoCard>
      </div>
    </Drawer>
  );
}
