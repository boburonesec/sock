import { PageHeader } from "@/components/page-header";
import { ModuleNavigation } from "@/components/navigation/module-navigation";
import { StockOverviewModule } from "@/features/warehouse/stock/stock-overview-module";

export default function WarehousePage() {
  return (
    <>
      <PageHeader
        title="Ombor"
        description="Asosiy ombor qoldiqlari, zonalar va materiallar holati"
      />
      <ModuleNavigation
        items={[
          { href: "/warehouse/materials", label: "Materiallar" },
          { href: "/warehouse/movements", label: "Kirim-chiqim tarixi" },
          { href: "/warehouse/zones", label: "Zonalar" },
        ]}
      />
      <StockOverviewModule />
    </>
  );
}
