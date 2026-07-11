import { PageHeader } from "@/components/page-header";
import { AdjustmentsListModule } from "@/features/employees/adjustments-list-module";

export default function EmployeeBonusesPage() {
  return (
    <>
      <PageHeader
        title="Bonuslar"
        description="Xodimlarga berilgan bonus yozuvlari (backend hisobi asosida)"
      />
      <AdjustmentsListModule kind="bonus" />
    </>
  );
}
