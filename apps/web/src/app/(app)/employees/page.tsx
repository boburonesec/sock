import { PageHeader } from "@/components/page-header";
import { ModuleNavigation } from "@/components/navigation/module-navigation";
import { EmployeesModule } from "@/features/employees/employees-module";

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        title="Xodimlar"
        description="Barcha xodimlar reyestri: ish profili, haq turi, bosqich va kerak bo‘lsa dastur accounti"
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
