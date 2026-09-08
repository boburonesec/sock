import { PageHeader } from "@/components/page-header";
import { WarehouseNav } from "@/features/warehouse/components/warehouse-nav";
import { StockOverviewModule } from "@/features/warehouse/stock/stock-overview-module";

export default function WarehousePage() {
  return (
    <>
      <PageHeader
        title="Ombor"
        description="Barcha mahsulot va material qoldiqlari bo‘yicha yig‘ma hisobot"
      />
      <WarehouseNav />
      <StockOverviewModule />
    </>
  );
}
