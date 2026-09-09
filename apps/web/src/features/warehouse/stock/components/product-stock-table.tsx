import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { formatNumber } from "@/lib/utils";
import { formatWarehouseZoneName } from "@/lib/status-labels";
import type { ProductStock } from "@/lib/api/warehouse";
import { ProductStockCard } from "./product-stock-card";

export function ProductStockTable({ stock }: { stock: ProductStock[] }) {
  return (
    <ResponsiveDataList
      items={stock}
      getKey={(item) => item.id}
      renderCard={(item) => <ProductStockCard item={item} />}
      ariaLabel="Tayyor mahsulot qoldig‘i"
      emptyTitle="Tayyor mahsulot qoldig‘i yo‘q"
      emptyDescription="Omborga mahsulot qabul qilingach, qoldiqlar shu yerda ko‘rinadi."
    >
      <DataTable label="Tayyor mahsulot qoldig‘i">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeader>Model</DataTableHeader>
            <DataTableHeader>Rang</DataTableHeader>
            <DataTableHeader>Material</DataTableHeader>
            <DataTableHeader>Mavsum</DataTableHeader>
            <DataTableHeader>Miqdor</DataTableHeader>
            <DataTableHeader>Zona</DataTableHeader>
          </DataTableRow>
        </DataTableHead>
        <tbody>
          {stock.length > 0 ? (
            stock.map((item) => (
              <DataTableRow key={item.id}>
                <DataTableCell className="font-semibold">{item.productVariant.product.name}</DataTableCell>
                <DataTableCell>{item.productVariant.color.name}</DataTableCell>
                <DataTableCell>{item.productVariant.material.name}</DataTableCell>
                <DataTableCell>{item.productVariant.season.name}</DataTableCell>
                <DataTableCell>{formatNumber(item.quantity)} dona</DataTableCell>
                <DataTableCell>{formatWarehouseZoneName(item.zone.name)}</DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <EmptyTableState
              colSpan={6}
              title="Tayyor mahsulot qoldig‘i yo‘q"
              description="Omborga mahsulot qabul qilingach, qoldiqlar shu yerda ko‘rinadi."
            />
          )}
        </tbody>
      </DataTable>
    </ResponsiveDataList>
  );
}
