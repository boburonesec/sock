import { PageHeader } from "@/components/page-header";
import { ModuleNavigation } from "@/components/navigation/module-navigation";
import { EmployeesModule } from "@/features/employees/employees-module";

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        title="Xodimlar"
        description="Barcha xodimlar: ish turi, haq turi, bosqich va kerak bo‘lsa dastur hisobi"
      />
      <ModuleNavigation
        items={[
          { href: "/attendance", label: "Davomat" },
          { href: "/employees/bonuses", label: "Bonuslar" },
          { href: "/employees/penalties", label: "Jarimalar" },
        ]}
      />
      <EmployeesModule />
    </>
  );
}
