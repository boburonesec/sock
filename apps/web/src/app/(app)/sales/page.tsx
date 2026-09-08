import { PageHeader } from "@/components/page-header";
import { SalesNav } from "@/features/sales/components/sales-nav";
import { SalesOverviewModule } from "@/features/sales/overview/sales-overview-module";

export default function SalesPage() {
  return (
    <>
      <PageHeader
        title="Sotuvlar"
        description="Mijozlar, buyurtmalar, to‘lovlar va qarzdorlik bo‘yicha umumiy ko‘rinish"
      />
      <SalesNav />
      <SalesOverviewModule />
    </>
  );
}
