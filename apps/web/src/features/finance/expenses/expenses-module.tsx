"use client";

import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { ExpensesTable } from "./components/expenses-table";
import { useExpenses } from "./use-expenses";

export function ExpensesModule() {
  const { data, error, isError, isPending, refetch } = useExpenses();

  if (isPending) {
    return <LoadingState label="Xarajatlar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Xarajatlar yuklanmadi"
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

  const expenses = data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:max-w-sm">
          <KpiCard
            label="Xarajat yozuvlari"
            value={`${expenses.length} ta`}
            description="API qaytargan xarajat yozuvlari"
            accent="primary"
          />
        </div>
      </PageSection>

      <PageSection
        title="Xarajat so‘rovlari"
        description="Kategoriya sozlamalari keyingi master data modulida boshqariladi."
      >
        <div className="mb-4 flex justify-end">
          <Button disabled>Xarajat yaratish · Keyingi bosqich</Button>
        </div>
        <ExpensesTable expenses={expenses} />
      </PageSection>
    </div>
  );
}
