"use client";

import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import type { WarehouseStockSummary } from "@/lib/api/warehouse";
import { ZoneDetailsDrawer } from "./components/zone-details-drawer";
import { ZonesOverview } from "./components/zones-overview";
import { useZonesData } from "./use-zones-data";

type ZoneSummary = WarehouseStockSummary["zoneSummaries"][number];

export function ZonesModule() {
  const [selectedZone, setSelectedZone] = useState<ZoneSummary | null>(null);
  const { summaryQuery, zonesQuery, stockQuery, materialStockQuery, movementsQuery } =
    useZonesData();

  const isPending =
    summaryQuery.isPending ||
    zonesQuery.isPending ||
    stockQuery.isPending ||
    materialStockQuery.isPending ||
    movementsQuery.isPending;
  const isError =
    summaryQuery.isError ||
    zonesQuery.isError ||
    stockQuery.isError ||
    materialStockQuery.isError ||
    movementsQuery.isError;
  const error =
    summaryQuery.error ??
    zonesQuery.error ??
    stockQuery.error ??
    materialStockQuery.error ??
    movementsQuery.error;

  if (isPending) {
    return <LoadingState label="Ombor zonalari yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Ombor zonalari yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              summaryQuery.refetch();
              zonesQuery.refetch();
              stockQuery.refetch();
              materialStockQuery.refetch();
              movementsQuery.refetch();
            }}
          >
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const summary = summaryQuery.data?.data;
  const zoneSummaries = summary?.zoneSummaries ?? [];
  const zones = zonesQuery.data?.data ?? [];
  const stock = stockQuery.data?.data ?? [];
  const materialStock = materialStockQuery.data?.data ?? [];
  const movements = movementsQuery.data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Jami zonalar"
            value={`${summary?.kpis.warehouseZoneCount ?? "0"} ta`}
            description="Ombordagi barcha zonalar"
            accent="primary"
          />
          <KpiCard
            label="Tayyor mahsulot"
            value={`${summary?.kpis.finishedProductQuantity ?? "0"} dona`}
            description="Tayyor mahsulot zonasidagi jami"
            accent="success"
          />
          <KpiCard
            label="Material yozuvlari"
            value={`${summary?.kpis.materialRecordCount ?? "0"} ta`}
            description="Material qoldig‘i yozuvlari"
            accent="neutral"
          />
          <KpiCard
            label="Past qoldiq"
            value={`${summary?.kpis.lowStockMaterialCount ?? "0"} ta`}
            description="Belgilangan limit bo‘yicha"
            accent="warning"
          />
        </div>
      </PageSection>

      <PageSection
        title="Asosiy ombor zonalari"
        description="Har bir filial bitta asosiy ombor bilan ishlaydi."
      >
        <ZonesOverview zones={zoneSummaries} onSelect={setSelectedZone} />
      </PageSection>

      <ZoneDetailsDrawer
        zone={selectedZone}
        zones={zones}
        productStock={stock}
        materialStock={materialStock}
        movements={movements}
        onOpenChange={(open) => {
          if (!open) setSelectedZone(null);
        }}
      />
    </div>
  );
}
