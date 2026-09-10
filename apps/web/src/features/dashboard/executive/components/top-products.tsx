import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import type { ExecutiveSummary } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/utils";
import { TopProductCard } from "./top-product-card";

type TopProduct = ExecutiveSummary["topProducts"][number];

export function TopProducts({ products }: { products: TopProduct[] }) {
  return (
    <ResponsiveDataList
      items={products}
      getKey={(product) => product.productVariantId}
      renderCard={(product) => <TopProductCard product={product} />}
      ariaLabel="Top mahsulotlar"
      emptyTitle="Top mahsulotlar yo‘q"
      emptyDescription="Tizim bo‘sh ro‘yxat qaytardi."
    >
    <DataTable label="Top mahsulotlar">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Model</DataTableHeader>
          <DataTableHeader>Rang</DataTableHeader>
          <DataTableHeader>Material</DataTableHeader>
          <DataTableHeader>Mavsum</DataTableHeader>
          <DataTableHeader>Miqdor</DataTableHeader>
          <DataTableHeader>Qiymat</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {products.length === 0 ? (
          <EmptyTableState colSpan={6} title="Top mahsulotlar yo‘q" description="Tizim bo‘sh ro‘yxat qaytardi." />
        ) : (
          products.map((product) => (
            <DataTableRow key={product.productVariantId}>
              <DataTableCell className="font-semibold">{product.productName}</DataTableCell>
              <DataTableCell>{product.colorName}</DataTableCell>
              <DataTableCell>{product.materialName}</DataTableCell>
              <DataTableCell>{product.seasonName}</DataTableCell>
              <DataTableCell>{product.quantity}</DataTableCell>
              <DataTableCell className="font-semibold">{formatCurrency(product.value)}</DataTableCell>
            </DataTableRow>
          ))
        )}
      </tbody>
    </DataTable>
    </ResponsiveDataList>
  );
}
