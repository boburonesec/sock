import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { MaterialCard } from "@/features/warehouse/materials/components/material-card";
import { formatWarehouseZoneName } from "@/lib/status-labels";
import type { MaterialStock } from "@/lib/api/warehouse";

export function MaterialStockTable({ stock }: { stock: MaterialStock[] }) {
  return (
    <ResponsiveDataList
      items={stock}
      getKey={(item) => item.id}
      renderCard={(item) => <MaterialCard material={item} />}
      ariaLabel="Xomashyo qoldig‘i"
      emptyTitle="Xomashyo qoldig‘i yo‘q"
      emptyDescription="Materiallar qabul qilingach, qoldiqlar shu yerda ko‘rinadi."
    >
      <DataTable label="Xomashyo qoldig‘i">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeader>Material</DataTableHeader>
            <DataTableHeader>Miqdor</DataTableHeader>
            <DataTableHeader>Birlik</DataTableHeader>
            <DataTableHeader>Zona</DataTableHeader>
          </DataTableRow>
        </DataTableHead>
        <tbody>
          {stock.length > 0 ? (
            stock.map((item) => (
              <DataTableRow key={item.id}>
                <DataTableCell className="font-semibold">{item.material.name}</DataTableCell>
                <DataTableCell>{item.quantity}</DataTableCell>
                <DataTableCell>{item.unit}</DataTableCell>
                <DataTableCell>{formatWarehouseZoneName(item.zone.name)}</DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <EmptyTableState
              colSpan={4}
              title="Xomashyo qoldig‘i yo‘q"
              description="Materiallar qabul qilingach, qoldiqlar shu yerda ko‘rinadi."
            />
          )}
        </tbody>
      </DataTable>
    </ResponsiveDataList>
  );
}
