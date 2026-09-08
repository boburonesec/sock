import { PageHeader } from "@/components/page-header";
import { FinanceNav } from "@/features/finance/components/finance-nav";
import { FinanceOverviewModule } from "@/features/finance/overview/finance-overview-module";

export default function FinancePage() {
  return (
    <>
      <PageHeader
        title="Moliya"
        description="Umumiy moliyaviy holat, xarajatlar va ish haqi bo‘yicha hisobot"
      />
      <FinanceNav />
      <FinanceOverviewModule />
    </>
  );
}
