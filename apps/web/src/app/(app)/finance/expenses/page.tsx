import { PageHeader } from "@/components/page-header";
import { ExpensesModule } from "@/features/finance/expenses/expenses-module";

export default function ExpensesPage() {
  return <><PageHeader title="Xarajatlar" description="Xarajat so‘rovlari, tasdiqlash va to‘lov holati" /><ExpensesModule /></>;
}
