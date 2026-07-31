import { OperationsDashboard } from "@/features/dashboard/operations/operations-dashboard";
import { PageHeader } from "@/components/page-header";

export default function OperationsDashboardPage() {
  return <><PageHeader title="Operatsiyalar paneli" description="Ishlab chiqarish bosqichlari, ishchilar faolligi va sekinlashgan jarayonlar" /><OperationsDashboard /></>;
}
