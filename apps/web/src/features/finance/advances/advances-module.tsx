"use client";

import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { AdvancesTable } from "./components/advances-table";
import { useAdvances } from "./use-advances";

export function AdvancesModule() {
  const { data, error, isError, isPending, refetch } = useAdvances();

  if (isPending) {
    return <LoadingState label="Avanslar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Avanslar yuklanmadi"
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

  const advances = data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:max-w-sm">
          <KpiCard
            label="Avans yozuvlari"
            value={`${advances.length} ta`}
            description="API qaytargan avans yozuvlari"
            accent="primary"
          />
        </div>
      </PageSection>

      <PageSection
        title="Avans so‘rovlari"
        description="Manager tasdiqlaydi, Accountant to‘laydi. Amallar keyingi bosqichda faollashadi."
      >
        <AdvancesTable advances={advances} />
      </PageSection>
    </div>
  );
}
