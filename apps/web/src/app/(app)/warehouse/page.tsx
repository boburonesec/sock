import { PageHeader } from "@/components/page-header";
import { StockOverviewModule } from "@/features/warehouse/stock/stock-overview-module";

export default function WarehousePage() {
  return (
    <>
      <PageHeader
        title="Ombor"
        description="Asosiy ombor qoldiqlari, zonalar va materiallar holati"
      />
      <StockOverviewModule />
    </>
  );
}
