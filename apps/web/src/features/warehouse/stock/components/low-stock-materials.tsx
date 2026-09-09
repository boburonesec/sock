import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { formatWarehouseZoneName } from "@/lib/status-labels";
import type { WarehouseStockSummary } from "@/lib/api/warehouse";
import { LowStockMaterialCard } from "./low-stock-material-card";

type LowStockMaterial = WarehouseStockSummary["lowStockMaterials"][number];

export function LowStockMaterials({ materials }: { materials: LowStockMaterial[] }) {
  return (
    <ResponsiveDataList
      items={materials}
      getKey={(material) => `${material.warehouseId}-${material.materialId}`}
      renderCard={(material) => <LowStockMaterialCard material={material} />}
      ariaLabel="Past qoldiq materiallar"
      emptyTitle="Past qoldiq material yo‘q"
      emptyDescription="Limit o‘rnatilgan materiallar orasida past qoldiq aniqlanmadi."
    >
      <DataTable label="Past qoldiq materiallar">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeader>Material</DataTableHeader>
            <DataTableHeader>Joriy miqdor</DataTableHeader>
            <DataTableHeader>Minimal limit</DataTableHeader>
            <DataTableHeader>Ombor</DataTableHeader>
          </DataTableRow>
        </DataTableHead>
        <tbody>
          {materials.length > 0 ? (
            materials.map((material) => (
              <DataTableRow key={`${material.warehouseId}-${material.materialId}`}>
                <DataTableCell className="font-semibold">{material.materialName}</DataTableCell>
                <DataTableCell>{material.quantity} {material.unit}</DataTableCell>
                <DataTableCell>{material.threshold} {material.unit}</DataTableCell>
                <DataTableCell>{formatWarehouseZoneName(material.warehouseName)}</DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <EmptyTableState
              colSpan={4}
              title="Past qoldiq material yo‘q"
              description="Limit o‘rnatilgan materiallar orasida past qoldiq aniqlanmadi."
            />
          )}
        </tbody>
      </DataTable>
    </ResponsiveDataList>
  );
}
