import { PageHeader } from "@/components/page-header";
import { AdjustmentsListModule } from "@/features/employees/adjustments-list-module";

export default function EmployeeBonusesPage() {
  return (
    <>
      <PageHeader
        title="Bonuslar"
        description="Xodimlarga berilgan qo‘shimcha pullar va ularning holati"
      />
      <AdjustmentsListModule kind="bonus" />
    </>
  );
}
