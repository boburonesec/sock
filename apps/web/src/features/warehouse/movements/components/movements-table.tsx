import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import type { StockMovement } from "@/lib/api/warehouse";
import {
  formatWarehouseZoneName,
  labelStatus,
  stockItemTypeLabel,
  stockMovementTypeLabel,
} from "@/lib/status-labels";

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

export function MovementsTable({
  movements,
  onSelect,
}: {
  movements: StockMovement[];
  onSelect: (movement: StockMovement) => void;
}) {
  return (
    <DataTable label="Ombor harakatlari">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Sana</DataTableHeader>
          <DataTableHeader>Harakat turi</DataTableHeader>
          <DataTableHeader>Nomi</DataTableHeader>
          <DataTableHeader>Turi</DataTableHeader>
          <DataTableHeader>Miqdor</DataTableHeader>
          <DataTableHeader>Birlik</DataTableHeader>
          <DataTableHeader>Zona</DataTableHeader>
          <DataTableHeader>Mas’ul</DataTableHeader>
          <DataTableHeader>Sabab / Izoh</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {movements.length > 0 ? (
          movements.map((movement) => (
            <DataTableRow key={movement.id} className="hover:bg-muted/40">
              <DataTableCell>{formatDate(movement.occurredAt)}</DataTableCell>
              <DataTableCell>
                <button
                  onClick={() => onSelect(movement)}
                  className="text-left font-semibold hover:text-primary"
                >
                  {labelStatus(stockMovementTypeLabel, movement.movementType)}
                </button>
              </DataTableCell>
              <DataTableCell>{itemName(movement)}</DataTableCell>
              <DataTableCell>{labelStatus(stockItemTypeLabel, movement.itemType)}</DataTableCell>
              <DataTableCell>{movement.quantity}</DataTableCell>
              <DataTableCell>{movement.unit}</DataTableCell>
              <DataTableCell>{formatWarehouseZoneName(movement.zone.name)}</DataTableCell>
              <DataTableCell>{movement.recordedBy.name}</DataTableCell>
              <DataTableCell>{movement.reason ?? movement.note ?? "—"}</DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={9}
            title="Ombor harakatlari mavjud emas"
            description="Ombor harakatlari paydo bo‘lgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
