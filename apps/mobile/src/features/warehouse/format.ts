import {
  formatWarehouseZoneName,
  type NamedReference,
  type StockMovement,
  type WarehouseZoneSummaryStatus,
} from "@paypoq/shared";

type Tone = "success" | "error" | "warning" | "info";

// Incoming movements read as positive, outgoing as attention-worthy, so an
// operator can tell intake from issue at a glance (same mapping as Web).
export const movementTone: Record<string, Tone> = {
  RECEIPT: "success",
  PRODUCTION_RECEIPT: "success",
  RETURN: "success",
  TRANSFER: "info",
  ISSUE: "warning",
  CORRECTION: "info",
};

export function movementItemName(movement: StockMovement): string {
  if (movement.productVariant) {
    return `${movement.productVariant.product.name} · ${movement.productVariant.color.name}`;
  }

  return movement.material?.name ?? "—";
}

export function formatLocation(warehouse: NamedReference, zone: NamedReference): string {
  return `${formatWarehouseZoneName(warehouse.name)} · ${formatWarehouseZoneName(zone.name)}`;
}

export const zoneStatus: Record<
  WarehouseZoneSummaryStatus,
  { label: string; tone: "success" | "warning" }
> = {
  NORMAL: { label: "Me'yorda", tone: "success" },
  ATTENTION: { label: "E'tibor kerak", tone: "warning" },
};
