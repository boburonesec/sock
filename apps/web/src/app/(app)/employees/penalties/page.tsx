import { PageHeader } from "@/components/page-header";
import { AdjustmentsListModule } from "@/features/employees/adjustments-list-module";

export default function EmployeePenaltiesPage() {
  return (
    <>
      <PageHeader
        title="Jarimalar"
        description="Xodimlarga qo‘yilgan jarimalar va ularning holati"
      />
      <AdjustmentsListModule kind="penalty" />
    </>
  );
}
