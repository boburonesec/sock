import { PageHeader } from "@/components/page-header";
import { FinanceNav } from "@/features/finance/components/finance-nav";
import { ExpensesModule } from "@/features/finance/expenses/expenses-module";

export default function ExpensesPage() {
  return (
    <>
      <PageHeader title="Xarajatlar" description="Korxona bo‘yicha barcha xarajatlarni qayd etish va tasdiqlash" />
      <FinanceNav />
      <ExpensesModule />
    </>
  );
}
