import { PageHeader } from "@/components/page-header";
import { EmployeesModule } from "@/features/employees/employees-module";

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        title="Xodimlar"
        description="Ishbay ishchilar — faollik, ish haqi. Dasturga kirmaydi (operatorlar — Sozlamalar → Korxona)"
      />
      <EmployeesModule />
    </>
  );
}
