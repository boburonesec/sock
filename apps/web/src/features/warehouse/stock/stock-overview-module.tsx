"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { productApi } from "@/lib/api/product";
import { queryKeys } from "@/lib/api/query-keys";
import { warehouseApi, type StockCorrectionPayload } from "@/lib/api/warehouse";
import { formatNumber } from "@/lib/utils";
import { LowStockMaterials } from "./components/low-stock-materials";
import { MaterialStockTable } from "./components/material-stock-table";
import { ProductStockTable } from "./components/product-stock-table";
import { StockCorrectionDrawer } from "./components/stock-correction-drawer";
import { ZoneOverview } from "./components/zone-overview";
import { useWarehouseStockData } from "./use-warehouse-stock-data";

export function StockOverviewModule() {
  const queryClient = useQueryClient();
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const { stock, materialStock, summary, error, isError, isPending, refetch } =
    useWarehouseStockData();
  const productsQuery = useQuery({
    queryKey: queryKeys.product.products(),
    queryFn: productApi.getProducts,
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.warehouse.zones(),
    queryFn: warehouseApi.getZones,
  });
  const correctionMutation = useMutation({
    mutationFn: warehouseApi.createStockCorrection,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stock() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.warehouse.materialStock(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.warehouse.movements(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.warehouse.stockSummary(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.executiveSummary(),
        }),
      ]);
      setFeedback({
        tone: "success",
        message: "Qoldiq tuzatildi va harakatlar tarixiga yozildi.",
      });
      setIsCorrectionOpen(false);
    },
    onError: (mutationError) => {
      setFeedback({
        tone: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : "Qoldiqni tuzatishda xatolik yuz berdi.",
      });
    },
  });

  if (isPending) {
    return <LoadingState label="Ombor qoldiqlari yuklanmoqda..." />;
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Ombor ma’lumotlari yuklanmadi"
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

  const summaryCards = [
    {
      label: "Tayyor mahsulotlar soni",
      value: `${formatNumber(Number(summary.kpis.finishedProductQuantity))} dona`,
      description: "Tayyor mahsulotlar zonasidagi qoldiq",
      accent: "success" as const,
    },
    {
      label: "Xomashyo yozuvlari",
      value: `${formatNumber(Number(summary.kpis.materialRecordCount))} ta`,
      description: "Xomashyo qoldig‘i yozuvlari",
      accent: "primary" as const,
    },
    {
      label: "Past qoldiq materiallar",
      value: `${formatNumber(Number(summary.kpis.lowStockMaterialCount))} ta`,
      description: "Belgilangan limit bo‘yicha",
      accent: "warning" as const,
    },
    {
      label: "Ombor zonalari",
      value: `${formatNumber(Number(summary.kpis.warehouseZoneCount))} ta`,
      description: "Asosiy ombor ichida",
      accent: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {feedback ? (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              : "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Asosiy ombor zonalari"
        description="Tizim hisoblagan zona qoldiqlari va holati."
      >
        {summary.zoneSummaries.length > 0 ? (
          <ZoneOverview zones={summary.zoneSummaries} />
        ) : (
          <EmptyState
            title="Ombor zonalari mavjud emas"
            description="Zonalar sozlangandan keyin ular shu yerda ko‘rinadi."
          />
        )}
      </PageSection>

      <PageSection
        title="Past qoldiq materiallar"
        description="Belgilangan limit bo‘yicha aniqlangan materiallar."
      >
        <LowStockMaterials materials={summary.lowStockMaterials} />
      </PageSection>

      <PageSection
        title="Tayyor mahsulotlar qoldig‘i"
        description="Mahsulot variantlari va zonalar bo‘yicha joriy qoldiq."
      >
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Button disabled variant="outline">Qoldiq ko‘rish · Tez orada</Button>
          <Button disabled variant="outline">Harakatlar tarixi · Tez orada</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFeedback(null);
              setIsCorrectionOpen(true);
            }}
          >
            Qoldiqni tuzatish
          </Button>
        </div>
        <ProductStockTable stock={stock} />
      </PageSection>

      <PageSection
        title="Xomashyo qoldig‘i"
        description="Material va zona bo‘yicha joriy qoldiq."
      >
        <div className="mb-4 flex justify-end">
          <Button disabled>Material qabul qilish · Tez orada</Button>
        </div>
        <MaterialStockTable stock={materialStock} />
      </PageSection>

      <StockCorrectionDrawer
        open={isCorrectionOpen}
        products={productsQuery.data?.data ?? []}
        materialStock={materialStock}
        zones={zonesQuery.data?.data ?? []}
        isSubmitting={correctionMutation.isPending}
        errorMessage={
          correctionMutation.error instanceof Error
            ? correctionMutation.error.message
            : null
        }
        onOpenChange={setIsCorrectionOpen}
        onSubmit={async (payload: StockCorrectionPayload) => {
          await correctionMutation.mutateAsync(payload);
        }}
      />
    </div>
  );
}
