"use client";

import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { InfoCard } from "@/components/cards/info-card";
import { KpiCard } from "@/components/cards/kpi-card";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ResponsiveDataList } from "@/components/data-display/responsive-data-list";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  productionApi,
  type CreateDefectPayload,
  type CreateProductionBatchPayload,
  type CreateStageMovementPayload,
  type CreateWorkerActivityPayload,
} from "@/lib/api/production";
import { queryKeys } from "@/lib/api/query-keys";
import {
  warehouseApi,
  type FinishedProductReceiptPayload,
} from "@/lib/api/warehouse";
import { formatNumber } from "@/lib/utils";
import { formatWarehouseZoneName } from "@/lib/status-labels";
import { useAuthStore } from "@/stores/auth-store";
import { ProductBreakdown } from "./components/product-breakdown";
import { ProductionActionDrawer } from "./components/production-action-drawer";
import type {
  EmployeeOption,
  ProductVariantOption,
} from "./components/production-action-forms";
import type { ProductionAction } from "./components/production-action-types";
import { ProductionMovementCard } from "./components/production-movement-card";
import { ProductionStageCard } from "./components/production-stage-card";
import { ShiftReconciliationPanel } from "./components/shift-reconciliation-panel";
import { CorrectionManagerQueue, CorrectionRequestButton } from "./components/correction-request-panel";
import { QuickActionsPanel } from "./components/quick-actions-panel";
import { useProductionBoardData } from "./use-production-board-data";
import { formatDateTimeForUser } from "@/lib/format";

export function ProductionBoard() {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const canReceiveFinished = permissions.includes("warehouse.write");
  const canViewWarehouseZones = permissions.includes("warehouse.view");
  const canRequestProductionCorrection = permissions.includes("production.write");
  const { summary, inventory, movements, error, isError, isPending, refetch } =
    useProductionBoardData();

  const openAction = (action: ProductionAction) => {
    if (action === "receive-finished" && !canReceiveFinished) {
      return;
    }
    setActiveAction(action);
  };
  // Production-scoped lookups (Shift Receiver has production.view, not settings/employees).
  const productsQuery = useQuery({
    queryKey: ["production", "lookups", "product-variants"],
    queryFn: productionApi.getLookupProductVariants,
  });
  const employeesQuery = useQuery({
    queryKey: ["production", "lookups", "employees"],
    queryFn: productionApi.getLookupEmployees,
  });
  const activitiesQuery = useQuery({ queryKey: queryKeys.production.workerActivities(), queryFn: productionApi.getWorkerActivities });
  // Warehouse zones need warehouse.view — Shift Receiver must not trigger 403.
  const warehouseZonesQuery = useQuery({
    queryKey: queryKeys.warehouse.zones(),
    queryFn: warehouseApi.getZones,
    enabled: canViewWarehouseZones && canReceiveFinished,
  });
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ProductionAction | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createBatchMutation = useMutation({
    mutationFn: productionApi.createBatch,
    onSuccess: async () => {
      await invalidateProductionBoardQueries(queryClient);
    },
  });

  const moveStageMutation = useMutation({
    mutationFn: productionApi.createStageMovement,
    onSuccess: async () => {
      await invalidateProductionBoardQueries(queryClient);
    },
  });

  const workerActivityMutation = useMutation({
    mutationFn: productionApi.createWorkerActivity,
    onSuccess: async () => {
      await invalidateWorkerActivityQueries(queryClient);
    },
  });

  const defectMutation = useMutation({
    mutationFn: productionApi.createDefect,
    onSuccess: async () => {
      await invalidateDefectQueries(queryClient);
    },
  });

  const finishedProductReceiptMutation = useMutation({
    mutationFn: warehouseApi.createFinishedProductReceipt,
    onSuccess: async () => {
      await invalidateFinishedProductReceiptQueries(queryClient);
    },
  });

  useEffect(() => {
    if (!successMessage) return;

    const timeout = window.setTimeout(() => setSuccessMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (!summary?.stageTotals.length) {
      setSelectedStageId(null);
      return;
    }

    const selectedStageExists = summary.stageTotals.some(
      (stage) => stage.stageId === selectedStageId,
    );
    if (!selectedStageExists) {
      setSelectedStageId(summary.stageTotals[0].stageId);
    }
  }, [selectedStageId, summary?.stageTotals]);

  if (isPending) {
    return <LoadingState label="Ishlab chiqarish ma’lumotlari yuklanmoqda..." />;
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Ishlab chiqarish ma’lumotlari yuklanmadi"
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

  const selectedStage = summary.stageTotals.find(
    (stage) => stage.stageId === selectedStageId,
  );
  const selectedStageInventory = selectedStage
    ? inventory.filter((item) => item.stage.id === selectedStage.stageId)
    : [];
  const kpis = [
    {
      label: "Bugungi ishlab chiqarish",
      value: `${formatNumber(Number(summary.kpis.todayProduction))} dona`,
      description: "Bugungi ishchi faolligi",
      accent: "primary" as const,
    },
    {
      label: "Jarayondagi mahsulotlar",
      value: `${formatNumber(Number(summary.kpis.totalInProgress))} dona`,
      description: "Bosqichlardagi umumiy qoldiq",
      accent: "warning" as const,
    },
    {
      label: "Eng band bosqich",
      value: summary.kpis.busiestStageName ?? "—",
      description: summary.kpis.busiestStageName
        ? "Eng katta bosqich qoldig‘i"
        : "Hozircha mahsulot yo‘q",
      accent: "success" as const,
    },
    {
      label: "Faol ishchilar",
      value: `${formatNumber(Number(summary.kpis.activeWorkers))} nafar`,
      description: "Bugun kiritilgan bajarilgan ish",
      accent: "neutral" as const,
    },
  ];

  const completeAction = (message: string) => {
    setSuccessMessage(message);
    setActiveAction(null);
  };

  const productVariantOptions: ProductVariantOption[] =
    productsQuery.data?.data.map((variant) => ({
      id: variant.id,
      label: variant.label,
    })) ?? [];
  const omborProductVariantOptions: ProductVariantOption[] = inventory
    .filter((item) => item.stage.name === "Ombor" && item.quantity > 0)
    .map((item) => ({
      id: item.productVariant.id,
      label: `${item.productVariant.product.name} · ${item.productVariant.color.name} · ${item.productVariant.material.name} · ${item.productVariant.season.name} — ${formatNumber(item.quantity)} dona`,
    }));

  const stageOptions = summary.stageTotals.map((stage) => ({
    id: stage.stageId,
    label: stage.stageName,
    sortOrder: stage.sortOrder,
  }));
  const employeeOptions: EmployeeOption[] =
    employeesQuery.data?.data.map((employee) => ({
      id: employee.id,
      label: employee.name,
      jobRole: employee.jobRole,
      stageIds: (employee.stages ?? []).map((stage) => stage.id),
      workShift: employee.workShift,
    })) ?? [];
  const warehouseZoneOptions =
    warehouseZonesQuery.data?.data.map((zone) => ({
      id: zone.id,
      label: `${formatWarehouseZoneName(zone.warehouse.name)} · ${formatWarehouseZoneName(zone.name)}`,
    })) ?? [];

  const createBatch = async (values: CreateProductionBatchPayload) => {
    await createBatchMutation.mutateAsync(values);
  };

  const moveStage = async (values: CreateStageMovementPayload) => {
    const response = await moveStageMutation.mutateAsync(values);
    return response.data;
  };

  const createWorkerActivity = async (values: CreateWorkerActivityPayload) => {
    await workerActivityMutation.mutateAsync(values);
  };

  const createDefect = async (values: CreateDefectPayload) => {
    await defectMutation.mutateAsync(values);
  };

  const createFinishedProductReceipt = async (
    values: FinishedProductReceiptPayload,
  ) => {
    await finishedProductReceiptMutation.mutateAsync(values);
  };

  const createBatchError =
    createBatchMutation.error instanceof Error
      ? createBatchMutation.error.message
      : productsQuery.error instanceof Error
        ? productsQuery.error.message
        : null;
  const moveStageError =
    moveStageMutation.error instanceof Error
      ? moveStageMutation.error.message
      : productsQuery.error instanceof Error
        ? productsQuery.error.message
        : null;
  const workerActivityError =
    workerActivityMutation.error instanceof Error
      ? workerActivityMutation.error.message
      : productsQuery.error instanceof Error
        ? productsQuery.error.message
        : employeesQuery.error instanceof Error
          ? employeesQuery.error.message
          : null;
  const defectError =
    defectMutation.error instanceof Error
      ? defectMutation.error.message
      : productsQuery.error instanceof Error
        ? productsQuery.error.message
        : employeesQuery.error instanceof Error
          ? employeesQuery.error.message
          : null;
  const finishedProductReceiptError =
    finishedProductReceiptMutation.error instanceof Error
      ? finishedProductReceiptMutation.error.message
      : warehouseZonesQuery.error instanceof Error
        ? warehouseZonesQuery.error.message
        : null;

  return (
    <div className="space-y-8">
      <PageSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Bosqichlar oqimi"
        description="Bosqichni tanlab, undagi ma’lumot mahsulot tarkibini ko‘ring"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          {/* Mobile: actions first (operator priority). Desktop: stages left, actions right. */}
          <div className="order-2 min-w-0 xl:order-1">
            {summary.stageTotals.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
                {summary.stageTotals.map((stage) => (
                  <ProductionStageCard
                    key={stage.stageId}
                    stage={stage}
                    productBreakdownCount={
                      inventory.filter((item) => item.stage.id === stage.stageId)
                        .length
                    }
                    selected={stage.stageId === selectedStageId}
                    onSelect={setSelectedStageId}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Bosqichlar mavjud emas"
                description="Faol ishlab chiqarish bosqichlari sozlangandan keyin ular shu yerda ko‘rinadi."
              />
            )}
          </div>
          <div className="order-1 xl:order-2 xl:sticky xl:top-20 xl:self-start">
            <QuickActionsPanel
              onActionSelect={openAction}
              canReceiveFinished={canReceiveFinished}
            />
          </div>
        </div>
      </PageSection>

      {selectedStage ? (
        <ProductBreakdown stage={selectedStage} inventory={selectedStageInventory} />
      ) : null}

      <PageSection
        title="Oxirgi bosqich o‘tkazishlari"
        description="Bosqichlar orasidagi oxirgi ma’lumot mahsulot o‘tishlari"
      >
        <ResponsiveDataList
          items={movements}
          getKey={(movement) => movement.id}
          renderCard={(movement) => (
            <ProductionMovementCard
              movement={movement}
              canRequestProductionCorrection={canRequestProductionCorrection}
            />
          )}
          ariaLabel="Oxirgi bosqich o‘tkazishlari"
          emptyTitle="Bosqich o‘tkazishlari mavjud emas"
          emptyDescription="Bosqichlar orasidagi mahsulot o‘tishlari qayd etilgach, ular shu yerda ko‘rinadi."
        >
        <DataTable label="Oxirgi bosqich o‘tkazishlari">
          <DataTableHead>
            <DataTableRow>
              <DataTableHeader>Qayerdan</DataTableHeader>
              <DataTableHeader>Qayerga</DataTableHeader>
              <DataTableHeader>Mahsulot</DataTableHeader>
              <DataTableHeader>Miqdor</DataTableHeader>
              <DataTableHeader>Qabul qilgan jamoa</DataTableHeader>
              <DataTableHeader>Kiritgan</DataTableHeader>
              <DataTableHeader>Vaqt</DataTableHeader>
              {canRequestProductionCorrection ? <DataTableHeader>Amal</DataTableHeader> : null}
            </DataTableRow>
          </DataTableHead>
          <tbody>
            {movements.length > 0 ? (
              movements.map((movement) => (
                <DataTableRow key={movement.id}>
                  <DataTableCell>{movement.sourceStage.name}</DataTableCell>
                  <DataTableCell>{movement.destinationStage.name}</DataTableCell>
                  <DataTableCell className="font-semibold">
                    {movement.productVariant.product.name} · {movement.productVariant.color.name}
                  </DataTableCell>
                  <DataTableCell>{formatNumber(movement.quantity)} dona</DataTableCell>
                  <DataTableCell>
                    {movement.productionBatch?.mechanic &&
                    movement.productionBatch.machineOperator
                      ? `Mexanik: ${movement.productionBatch.mechanic.name} · Operator: ${movement.productionBatch.machineOperator.name}`
                      : "—"}
                  </DataTableCell>
                  {canRequestProductionCorrection ? <DataTableCell><CorrectionRequestButton domain="PRODUCTION_MOVEMENT" sourceRecordId={movement.id} title={`${movement.sourceStage.name} → ${movement.destinationStage.name}`} details={[{ label: "Mahsulot", value: `${movement.productVariant.product.name} · ${movement.productVariant.color.name}` }, { label: "Miqdor", value: `${movement.quantity} dona` }]} /></DataTableCell> : null}
                  <DataTableCell>{movement.recordedBy.name}</DataTableCell>
                  <DataTableCell>
                    {formatDateTimeForUser(new Date(movement.occurredAt))}
                  </DataTableCell>
                </DataTableRow>
              ))
            ) : (
              <EmptyTableState
                colSpan={canRequestProductionCorrection ? 8 : 7}
                title="Bosqich o‘tkazishlari mavjud emas"
                description="Bosqichlar orasidagi mahsulot o‘tishlari qayd etilgach, ular shu yerda ko‘rinadi."
              />
            )}
          </tbody>
        </DataTable>
        </ResponsiveDataList>
      </PageSection>

      <PageSection title="Oxirgi ishchi faoliyati" description="Kiritilgan ish natijalari va xatoni bildirish amali">
        <div className="space-y-2">{(activitiesQuery.data?.data ?? []).slice(0, 20).map((activity) => <article key={activity.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"><div><p className="font-medium">{activity.employee.name} · {activity.stage.name}</p><p className="text-sm text-muted-foreground">{activity.productVariant.product.name} · {activity.productVariant.color.name} · {activity.quantity} dona</p></div>{canRequestProductionCorrection ? <CorrectionRequestButton domain="WORKER_ACTIVITY" sourceRecordId={activity.id} title={`${activity.employee.name} · ${activity.stage.name}`} details={[{ label: "Mahsulot", value: `${activity.productVariant.product.name} · ${activity.productVariant.color.name}` }, { label: "Miqdor", value: `${activity.quantity} dona` }]} /> : null}</article>)}{!activitiesQuery.isLoading && !(activitiesQuery.data?.data.length) ? <p className="text-sm text-muted-foreground">Ishchi faoliyati yozuvlari yo‘q.</p> : null}</div>
      </PageSection>

      <CorrectionManagerQueue />

      <InfoCard
        title="Ishlab chiqarish amallari holati"
        description="Asosiy kiritish amallari tizim ma’lumotlariga ulangan"
      >
        <p className="text-sm text-muted-foreground">
          Keyingi bosqichga o‘tkazishda tanlangan ishchilarga kiritilgan dona bo‘yicha
          bajarilgan ish avtomatik yoziladi. Brak avtomatik jarima yoki qoldiq
          tuzatishi yaratmaydi.
          {canReceiveFinished
            ? " Omborga qabul qilish — Ombor bosqichidagi tayyor mahsulotni jismoniy ombor qoldig‘iga o‘tkazadi."
            : " Jismoniy omborga qabul qilish ombor operatori yoki menejer rolida ochiladi."}
        </p>
      </InfoCard>

      <ProductionActionDrawer
        action={activeAction}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAction(null);
            createBatchMutation.reset();
            moveStageMutation.reset();
            workerActivityMutation.reset();
            defectMutation.reset();
            finishedProductReceiptMutation.reset();
          }
        }}
        productVariantOptions={productVariantOptions}
        omborProductVariantOptions={omborProductVariantOptions}
        stageOptions={stageOptions}
        employeeOptions={employeeOptions}
        stageInventory={inventory}
        warehouseZoneOptions={warehouseZoneOptions}
        isCreateBatchPending={
          createBatchMutation.isPending || productsQuery.isPending
        }
        isMoveStagePending={moveStageMutation.isPending || productsQuery.isPending}
        isWorkerActivityPending={
          workerActivityMutation.isPending ||
          productsQuery.isPending ||
          employeesQuery.isPending
        }
        isDefectPending={
          defectMutation.isPending || productsQuery.isPending || employeesQuery.isPending
        }
        isFinishedProductReceiptPending={
          finishedProductReceiptMutation.isPending || warehouseZonesQuery.isPending
        }
        createBatchError={createBatchError}
        moveStageError={moveStageError}
        workerActivityError={workerActivityError}
        defectError={defectError}
        finishedProductReceiptError={finishedProductReceiptError}
        onCreateBatch={createBatch}
        onMoveStage={moveStage}
        onCreateWorkerActivity={createWorkerActivity}
        onCreateDefect={createDefect}
        onCreateFinishedProductReceipt={createFinishedProductReceipt}
        onSuccess={completeAction}
      />

      <ShiftReconciliationPanel stages={summary.stageTotals.map((stage) => ({ id: stage.stageId, name: stage.stageName, sortOrder: stage.sortOrder }))} />

      {successMessage ? (
        <div
          role="status"
          className="fixed bottom-5 left-5 right-5 z-[60] sm:left-auto sm:max-w-sm rounded-xl border border-emerald-500/30 bg-card px-4 py-3 text-sm font-medium text-emerald-500 shadow-xl"
        >
          {successMessage}
        </div>
      ) : null}
    </div>
  );
}

async function invalidateProductionBoardQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.operationsSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.stageInventory(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.recentMovements(),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.production.all }),
  ]);
}

async function invalidateWorkerActivityQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.operationsSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.workerActivities(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.executiveSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.factoryTvSummary(),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.production.all }),
  ]);
}

async function invalidateDefectQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.defects(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.operationsSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.executiveSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.factoryTvSummary(),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.production.all }),
  ]);
}

async function invalidateFinishedProductReceiptQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.operationsSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.stageInventory(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.production.recentMovements(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.warehouse.stock(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.warehouse.stockSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.warehouse.movements(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.executiveSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.factoryTvSummary(),
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.production.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.all }),
  ]);
}
