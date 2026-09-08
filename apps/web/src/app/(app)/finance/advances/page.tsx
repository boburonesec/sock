import { PageHeader } from "@/components/page-header";
import { FinanceNav } from "@/features/finance/components/finance-nav";
import { AdvancesModule } from "@/features/finance/advances/advances-module";

export default function AdvancesPage() {
  return (
    <>
      <PageHeader title="Avanslar" description="Xodimlarga berilgan avans to‘lovlari va ularning holati" />
      <FinanceNav />
      <AdvancesModule />
    </>
  );
}
