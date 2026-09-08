import { PageHeader } from "@/components/page-header";
import { FinanceNav } from "@/features/finance/components/finance-nav";
import { PayrollModule } from "@/features/finance/payroll/payroll-module";

export default function PayrollPage() {
  return (
    <>
      <PageHeader title="Ish haqi" description="Xodimlar bo‘yicha ish haqi hisob-kitoblari va to‘lovlar" />
      <FinanceNav />
      <PayrollModule />
    </>
  );
}
