import { PageHeader } from "@/components/page-header";
import { FinanceOverviewModule } from "@/features/finance/overview/finance-overview-module";

export default function FinancePage() {
  return (
    <>
      <PageHeader
        title="Moliya"
        description="Xarajatlar, avanslar va payroll qoldiqlari bo‘yicha umumiy ko‘rinish"
      />
      <FinanceOverviewModule />
    </>
  );
}
