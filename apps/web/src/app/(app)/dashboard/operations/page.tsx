import { OperationsDashboard } from "@/features/dashboard/operations/operations-dashboard";
import { PageHeader } from "@/components/page-header";

export default function OperationsDashboardPage() {
  return <><PageHeader title="Operatsion dashboard" description="Ishlab chiqarish bosqichlari, ishchilar faolligi va tiqilib qolgan jarayonlar" /><OperationsDashboard /></>;
}
