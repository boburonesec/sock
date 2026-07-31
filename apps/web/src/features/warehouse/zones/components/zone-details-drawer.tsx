import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/overlays/drawer";
import { InfoCard } from "@/components/cards/info-card";
import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import type {
  MaterialStock,
  ProductStock,
  StockMovement,
  WarehouseStockSummary,
  WarehouseZone,
} from "@/lib/api/warehouse";

type ZoneSummary = WarehouseStockSummary["zoneSummaries"][number];

interface ZoneDetailsDrawerProps {
  zone: ZoneSummary | null;
  zones: WarehouseZone[];
  productStock: ProductStock[];
  materialStock: MaterialStock[];
  movements: StockMovement[];
  onOpenChange: (open: boolean) => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function movementItemName(movement: StockMovement): string {
  if (movement.productVariant) {
    return `${movement.productVariant.product.name} · ${movement.productVariant.color.name}`;
  }

  return movement.material?.name ?? "—";
}

export function ZoneDetailsDrawer({
  zone,
  zones,
  productStock,
  materialStock,
  movements,
  onOpenChange,
}: ZoneDetailsDrawerProps) {
  if (!zone) return null;

  const zoneInfo = zones.find((item) => item.id === zone.zoneId);
  const zoneProductStock = productStock.filter((item) => item.zone.id === zone.zoneId);
  const zoneMaterialStock = materialStock.filter((item) => item.zone.id === zone.zoneId);
  const zoneMovements = movements.filter((item) => item.zone.id === zone.zoneId);

  return (
    <Drawer
      open={Boolean(zone)}
      onOpenChange={onOpenChange}
      title={zone.zoneName}
      description={`${zone.warehouseName} · ${
        zone.status === "NORMAL"
          ? "Me’yorda"
          : zone.status === "ATTENTION"
            ? "Kuzatuvda"
            : zone.status
      }`}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard title="Zona">
            <p className="text-xl font-bold">{zoneInfo?.name ?? zone.zoneName}</p>
          </InfoCard>
          <InfoCard title="Qoldiq yozuvlari">
            <p className="text-xl font-bold">
              Mahsulot {zone.productRecordCount} · Material {zone.materialRecordCount}
            </p>
          </InfoCard>
          <InfoCard title="Mahsulot miqdori">
            <p className="text-xl font-bold">{zone.productQuantity}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Zonadagi tayyor mahsulotlar jami.
            </p>
          </InfoCard>
        </div>

        <section>
          <p className="mb-3 text-sm font-semibold">Mahsulot qoldig‘i</p>
          <DataTable label="Zona mahsulot qoldig‘i" className="border-0 shadow-none">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Nomi</DataTableHeader>
                <DataTableHeader>Rang</DataTableHeader>
                <DataTableHeader>Miqdor</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {zoneProductStock.length ? (
                zoneProductStock.map((item) => (
                  <DataTableRow key={item.id}>
                    <DataTableCell>{item.productVariant.product.name}</DataTableCell>
                    <DataTableCell>{item.productVariant.color.name}</DataTableCell>
                    <DataTableCell>{item.quantity}</DataTableCell>
                  </DataTableRow>
                ))
              ) : (
                <EmptyTableState colSpan={3} />
              )}
            </tbody>
          </DataTable>
        </section>

        <section>
          <p className="mb-3 text-sm font-semibold">Material qoldig‘i</p>
          <DataTable label="Zona material qoldig‘i" className="border-0 shadow-none">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Nomi</DataTableHeader>
                <DataTableHeader>Miqdor</DataTableHeader>
                <DataTableHeader>Birlik</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {zoneMaterialStock.length ? (
                zoneMaterialStock.map((item) => (
                  <DataTableRow key={item.id}>
                    <DataTableCell>{item.material.name}</DataTableCell>
                    <DataTableCell>{item.quantity}</DataTableCell>
                    <DataTableCell>{item.unit}</DataTableCell>
                  </DataTableRow>
                ))
              ) : (
                <EmptyTableState colSpan={3} />
              )}
            </tbody>
          </DataTable>
        </section>

        <section>
          <p className="mb-3 text-sm font-semibold">So‘nggi harakatlar</p>
          <DataTable label="Zona harakatlari" className="border-0 shadow-none">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Sana</DataTableHeader>
                <DataTableHeader>Harakat</DataTableHeader>
                <DataTableHeader>Item</DataTableHeader>
                <DataTableHeader>Miqdor</DataTableHeader>
                <DataTableHeader>Mas’ul</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {zoneMovements.length ? (
                zoneMovements.map((item) => (
                  <DataTableRow key={item.id}>
                    <DataTableCell>{formatDate(item.occurredAt)}</DataTableCell>
                    <DataTableCell>{item.movementType}</DataTableCell>
                    <DataTableCell>{movementItemName(item)}</DataTableCell>
                    <DataTableCell>
                      {item.quantity} {item.unit}
                    </DataTableCell>
                    <DataTableCell>{item.recordedBy.name}</DataTableCell>
                  </DataTableRow>
                ))
              ) : (
                <EmptyTableState colSpan={5} />
              )}
            </tbody>
          </DataTable>
        </section>
      </div>
    </Drawer>
  );
}
