"use client";

import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import type { StockMovement } from "@/lib/api/warehouse";
import { MovementDetailsDrawer } from "./components/movement-details-drawer";
import { MovementsTable } from "./components/movements-table";
import { useMovements } from "./use-movements";

export function MovementsModule() {
  const { data, error, isError, isPending, refetch } = useMovements();
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(
    null,
  );

  if (isPending) {
    return <LoadingState label="Ombor harakatlari yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Ombor harakatlari yuklanmadi"
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

  const movements = data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:max-w-sm">
          <KpiCard
            label="Ombor harakatlari"
            value={`${movements.length} ta`}
            description="ma’lumot qaytargan movement yozuvlari"
            accent="primary"
          />
        </div>
      </PageSection>

      <PageSection
        title="Ombor harakatlari"
        description="Har bir correction sabab bilan audit qilinadi."
      >
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Button disabled variant="outline">
            Qoldiqni tuzatish · Tez orada
          </Button>
          <Button disabled variant="outline">
            Material qabul qilish · Tez orada
          </Button>
          <Button disabled variant="outline">
            Transfer qilish · Tez orada
          </Button>
        </div>
        <MovementsTable movements={movements} onSelect={setSelectedMovement} />
      </PageSection>

      <MovementDetailsDrawer
        movement={selectedMovement}
        onOpenChange={(open) => {
          if (!open) setSelectedMovement(null);
        }}
      />
    </div>
  );
}
