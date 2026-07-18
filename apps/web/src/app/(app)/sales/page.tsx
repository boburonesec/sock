import { PageHeader } from "@/components/page-header";
import { ModuleNavigation } from "@/components/navigation/module-navigation";
import { SalesOverviewModule } from "@/features/sales/overview/sales-overview-module";

export default function SalesPage() {
  return (
    <>
      <PageHeader
        title="Sotuvlar"
        description="Mijozlar, buyurtmalar, to‘lovlar va qarzdorlik bo‘yicha umumiy ko‘rinish"
      />
      <ModuleNavigation
        items={[
          { href: "/sales/clients", label: "Mijozlar" },
          { href: "/sales/orders", label: "Buyurtmalar" },
          { href: "/sales/payments", label: "To‘lovlar" },
          { href: "/sales/debts", label: "Qarzdorlik" },
        ]}
      />
      <SalesOverviewModule />
    </>
  );
}
