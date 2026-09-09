import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
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
import { MovementCard } from "./movement-card";

function formatDate(value: string): string {
  return formatDateTimeForUser(new Date(value));
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
    <ResponsiveDataList
      items={movements}
      getKey={(movement) => movement.id}
      renderCard={(movement) => <MovementCard movement={movement} onSelect={onSelect} />}
      ariaLabel="Ombor harakatlari"
      emptyTitle="Ombor harakatlari mavjud emas"
      emptyDescription="Ombor harakatlari paydo bo‘lgach, ular shu yerda ko‘rinadi."
    >
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
            <DataTableRow
              key={movement.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer hover:bg-muted/40 active:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={() => onSelect(movement)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(movement);
                }
              }}
            >
              <DataTableCell>{formatDate(movement.occurredAt)}</DataTableCell>
              <DataTableCell>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(movement);
                  }}
                  className="text-left font-semibold hover:text-primary"
                >
                  {labelStatus(stockMovementTypeLabel, movement.movementType)}
                </button>
              </DataTableCell>
              <DataTableCell>{itemName(movement)}</DataTableCell>
              <DataTableCell>{labelStatus(stockItemTypeLabel, movement.itemType)}</DataTableCell>
              <DataTableCell>{movement.quantity}</DataTableCell>
              <DataTableCell>{formatStockUnit(movement.unit)}</DataTableCell>
              <DataTableCell>{formatWarehouseZoneName(movement.zone.name)}</DataTableCell>
              <DataTableCell>{movement.recordedBy.name}</DataTableCell>
              <DataTableCell>
                {movement.reason ? formatStockMovementReason(movement.reason) : (movement.note ?? "—")}
              </DataTableCell>
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
    </ResponsiveDataList>
  );
}
