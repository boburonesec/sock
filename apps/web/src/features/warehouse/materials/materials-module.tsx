"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { productApi } from "@/lib/api/product";
import { queryKeys } from "@/lib/api/query-keys";
import type { MaterialStock } from "@/lib/api/warehouse";
import { warehouseApi, type MaterialReceiptPayload } from "@/lib/api/warehouse";
import { formatWarehouseZoneName } from "@/lib/status-labels";
import { useAuthStore } from "@/stores/auth-store";
import { MaterialDetailsDrawer } from "./components/material-details-drawer";
import { MaterialReceiptDrawer } from "./components/material-receipt-drawer";
import { MaterialsTable } from "./components/materials-table";
import { useMaterials } from "./use-materials";

export function MaterialsModule() {
  const queryClient = useQueryClient();
  const canWriteWarehouse = useAuthStore((state) =>
    state.permissions.includes("warehouse.write"),
  );
  const { data, error, isError, isPending, refetch } = useMaterials();
  const materialsQuery = useQuery({
    queryKey: queryKeys.product.materials(),
    queryFn: productApi.getMaterials,
  });
  const zonesQuery = useQuery({
    queryKey: queryKeys.warehouse.zones(),
    queryFn: warehouseApi.getZones,
  });
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialStock | null>(
    null,
  );
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const receiptMutation = useMutation({
    mutationFn: warehouseApi.createMaterialReceipt,
    onSuccess: () => invalidateMaterialReceiptQueries(queryClient),
  });

  const isLoading = isPending || materialsQuery.isPending || zonesQuery.isPending;
  const firstError = error ?? materialsQuery.error ?? zonesQuery.error;

  if (isLoading) {
    return <LoadingState label="Material qoldiqlari yuklanmoqda..." />;
  }

  if (isError || materialsQuery.isError || zonesQuery.isError) {
    return (
      <ErrorState
        title="Material qoldiqlari yuklanmadi"
        description={
          firstError instanceof Error
            ? firstError.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void refetch();
              void materialsQuery.refetch();
              void zonesQuery.refetch();
            }}
          >
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const materials = data?.data ?? [];
  const materialOptions = materialsQuery.data?.data ?? [];
  const zoneOptions = zonesQuery.data?.data ?? [];

  return (
    <div className="space-y-8">
      {feedback ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <PageSection>
        <div className="grid gap-4 sm:max-w-sm">
          <KpiCard
            label="Material qoldiq yozuvlari"
            value={`${materials.length} ta`}
            description="ma’lumot qaytargan material stock yozuvlari"
            accent="primary"
          />
        </div>
      </PageSection>

      <PageSection
        title="Materiallar"
        description="Barcha xomashyo materiallari va ularning ombordagi qoldig‘i."
      >
        {canWriteWarehouse ? (
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => {
                setFeedback(null);
                receiptMutation.reset();
                setIsReceiptOpen(true);
              }}
            >
              Material qabul qilish
            </Button>
          </div>
        ) : null}
        <MaterialsTable materials={materials} onSelect={setSelectedMaterial} />
      </PageSection>

      <MaterialDetailsDrawer
        material={selectedMaterial}
        onReceive={
          canWriteWarehouse
            ? () => {
                setFeedback(null);
                receiptMutation.reset();
                setIsReceiptOpen(true);
              }
            : undefined
        }
        onOpenChange={(open) => {
          if (!open) setSelectedMaterial(null);
        }}
      />

      <MaterialReceiptDrawer
        open={isReceiptOpen}
        materials={materialOptions}
        zones={zoneOptions}
        existingStock={materials}
        isSubmitting={receiptMutation.isPending}
        errorMessage={
          receiptMutation.error instanceof Error
            ? receiptMutation.error.message
            : null
        }
        onOpenChange={(open) => {
          setIsReceiptOpen(open);
          if (!open) receiptMutation.reset();
        }}
        onSubmit={async (payload: MaterialReceiptPayload) => {
          setFeedback(null);
          const response = await receiptMutation.mutateAsync(payload);
          setFeedback({
            tone: "success",
            message: `${response.data.materialStock.material.name}: ${response.data.stockMovement.quantity} ${response.data.materialStock.unit} «${formatWarehouseZoneName(response.data.materialStock.warehouse.name)} · ${formatWarehouseZoneName(response.data.materialStock.zone.name)}» joyiga qabul qilindi. Yangi qoldiq: ${response.data.materialStock.quantity} ${response.data.materialStock.unit}.`,
          });
          setIsReceiptOpen(false);
          return response.data;
        }}
      />
    </div>
  );
}

async function invalidateMaterialReceiptQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.materialStock() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stockSummary() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.movements() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stock() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.executiveSummary() }),
  ]);
}
