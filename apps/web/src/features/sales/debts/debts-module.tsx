"use client";

import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import type { ClientDebt } from "@/lib/api/sales";
import { ClientDebtDetailsDrawer } from "./components/client-debt-details-drawer";
import { ClientDebtsTable } from "./components/client-debts-table";
import { useClientDebts } from "./use-client-debts";

export function DebtsModule() {
  const { data, error, isError, isPending, refetch } = useClientDebts();
  const [selectedDebt, setSelectedDebt] = useState<ClientDebt | null>(null);

  if (isPending) {
    return <LoadingState label="Client qarzlari yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Client qarzlari yuklanmadi"
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

  const debts = data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:max-w-sm">
          <KpiCard
            label="Client debt projection yozuvlari"
            value={`${debts.length} ta`}
            description="API qaytargan client qarzi projection yozuvlari"
            accent="warning"
          />
        </div>
      </PageSection>

      <PageSection
        title="Client qarzdorligi"
        description="Qarz qiymatlari backend projection orqali qaytariladi."
      >
        <ClientDebtsTable debts={debts} onSelect={setSelectedDebt} />
      </PageSection>

      <ClientDebtDetailsDrawer
        debt={selectedDebt}
        onOpenChange={(open) => {
          if (!open) setSelectedDebt(null);
        }}
      />
    </div>
  );
}
