"use client";

import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { PayrollPeriodsTable } from "./components/payroll-periods-table";
import { RecentAdvancesTable } from "./components/recent-advances-table";
import { RecentExpensesTable } from "./components/recent-expenses-table";
import { useFinanceSummary } from "./use-finance-summary";

export function FinanceOverviewModule() {
  const { data, error, isError, isPending, refetch } = useFinanceSummary();

  if (isPending) {
    return <LoadingState label="Moliya xulosasi yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Moliya xulosasi yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const summary = data?.data;

  if (!summary) {
    return (
      <ErrorState
        title="Moliya xulosasi mavjud emas"
        description="Backend kutilgan summary response qaytarmadi."
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Oylik xarajatlar"
            value={`${summary.kpis.monthlyExpenses} so‘m`}
            description="Backend hisoblagan joriy oy xarajatlari"
            accent="danger"
          />
          <KpiCard
            label="Kutilayotgan xarajatlar"
            value={`${summary.kpis.pendingExpenses} so‘m`}
            description="REQUESTED xarajatlar summasi"
            accent="warning"
          />
          <KpiCard
            label="Kutilayotgan avanslar"
            value={`${summary.kpis.pendingAdvances} so‘m`}
            description="REQUESTED yoki APPROVED avanslar"
            accent="warning"
          />
          <KpiCard
            label="Payroll qoldiq"
            value={`${summary.kpis.payrollRemaining} so‘m`}
            description="Backend payroll snapshot qiymati"
            accent="primary"
          />
        </div>
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <PageSection
          title="So‘nggi xarajatlar"
          description="Backend qaytargan xarajat yozuvlari"
        >
          <RecentExpensesTable expenses={summary.recentExpenses} />
        </PageSection>

        <PageSection
          title="So‘nggi avanslar"
          description="EmployeeAdjustment ADVANCE yozuvlari"
        >
          <RecentAdvancesTable advances={summary.recentAdvances} />
        </PageSection>
      </div>

      <PageSection
        title="Payroll davrlari"
        description="Backend saqlagan payroll period snapshotlari"
      >
        <PayrollPeriodsTable periods={summary.payrollPeriods} />
      </PageSection>
    </div>
  );
}
