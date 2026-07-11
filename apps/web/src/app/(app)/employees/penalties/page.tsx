import { PageHeader } from "@/components/page-header";
import { AdjustmentsListModule } from "@/features/employees/adjustments-list-module";

export default function EmployeePenaltiesPage() {
  return (
    <>
      <PageHeader
        title="Jarimalar"
        description="Xodimlarga qo‘yilgan jarima yozuvlari (backend hisobi asosida)"
      />
      <AdjustmentsListModule kind="penalty" />
    </>
  );
}
