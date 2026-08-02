import { PageHeader } from "@/components/page-header";
import { ModuleNavigation } from "@/components/navigation/module-navigation";
import { FinanceOverviewModule } from "@/features/finance/overview/finance-overview-module";

export default function FinancePage() {
  return (
    <>
      <PageHeader
        title="Moliya"
        description="Xarajatlar, avanslar va ish haqi qoldiqlari bo‘yicha umumiy ko‘rinish"
      />
      <ModuleNavigation
        items={[
          { href: "/finance/expenses", label: "Xarajatlar" },
          { href: "/finance/advances", label: "Avanslar" },
          { href: "/finance/payroll", label: "Ish haqi" },
          { href: "/finance/suppliers", label: "Yetkazib beruvchilar" },
        ]}
      />
      <FinanceOverviewModule />
    </>
  );
}
