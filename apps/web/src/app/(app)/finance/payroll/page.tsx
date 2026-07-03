import { PageHeader } from "@/components/page-header";
import { PayrollModule } from "@/features/finance/payroll/payroll-module";

export default function PayrollPage() {
  return <><PageHeader title="Ish haqi" description="Xodimlar ish haqi davrlari va to‘lov holati" /><PayrollModule /></>;
}
