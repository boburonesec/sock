import type {
  ApiCollection,
  ApiItem,
  CreateDefectPayload,
  CreateProductionRunIntakePayload,
  CreateProductionRunPayload,
  CreateStageMovementPayload,
  CreateWorkerActivityPayload,
  Defect,
  ProductionLookupEmployee,
  ProductionLookupVariant,
  ProductionOperationsSummary,
  ProductionRun,
  ProductionRunIntake,
  ProductionRunStatus,
  ProductionStageReference,
  ShiftContext,
  ShiftReadiness,
  ShiftReconciliation,
  ShiftReconciliationPayload,
  ShiftReconciliationReasonPayload,
  StageInventory,
  StageMovement,
  StageMovementCreation,
  WorkerActivity,
  WorkShiftReference,
} from "@paypoq/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient, jsonBody } from "@/lib/api/client";
import { invalidationGroups, queryKeys } from "@/lib/api/query-keys";
import { useGuardedMutation } from "@/shared/hooks/use-guarded-mutation";

export const productionApi = {
  getOperationsSummary: () =>
    apiClient<ApiItem<ProductionOperationsSummary>>("/production/operations-summary"),
  getStageInventory: () => apiClient<ApiCollection<StageInventory>>("/production/stage-inventory"),
  getRecentMovements: () => apiClient<ApiCollection<StageMovement>>("/production/recent-movements"),
  getWorkerActivities: () => apiClient<ApiCollection<WorkerActivity>>("/production/worker-activities"),
  getLookupEmployees: () =>
    apiClient<ApiCollection<ProductionLookupEmployee>>("/production/lookups/employees"),
  getLookupVariants: () =>
    apiClient<ApiCollection<ProductionLookupVariant>>("/production/lookups/product-variants"),
  getLookupWorkShifts: () =>
    apiClient<ApiCollection<WorkShiftReference>>("/production/lookups/work-shifts"),
  createStageMovement: (payload: CreateStageMovementPayload) =>
    apiClient<ApiItem<StageMovementCreation>>("/production/stage-movements", jsonBody("POST", payload)),
  createWorkerActivity: (payload: CreateWorkerActivityPayload) =>
    apiClient<ApiItem<WorkerActivity>>("/production/worker-activities", jsonBody("POST", payload)),
  createDefect: (payload: CreateDefectPayload) =>
    apiClient<ApiItem<Defect>>("/production/defects", jsonBody("POST", payload)),

  getRuns: () => apiClient<ApiCollection<ProductionRun>>("/production/runs"),
  createRun: (payload: CreateProductionRunPayload) =>
    apiClient<ApiItem<ProductionRun>>("/production/runs", jsonBody("POST", payload)),
  changeRunStatus: ({ id, status }: { id: string; status: ProductionRunStatus }) =>
    apiClient<ApiItem<ProductionRun>>(
      `/production/runs/${encodeURIComponent(id)}/status`,
      jsonBody("PATCH", { status }),
    ),
  createRunIntake: ({ id, ...payload }: CreateProductionRunIntakePayload & { id: string }) =>
    apiClient<ApiItem<ProductionRunIntake>>(
      `/production/runs/${encodeURIComponent(id)}/intakes`,
      jsonBody("POST", payload),
    ),

  getShiftReconciliations: () =>
    apiClient<ApiCollection<ShiftReconciliation>>("/production/shift-reconciliations"),
  getShiftReadiness: (workShiftId: string, workDate: string) =>
    apiClient<ApiItem<ShiftReadiness>>(
      `/production/shift-reconciliations/readiness?workShiftId=${encodeURIComponent(workShiftId)}&workDate=${encodeURIComponent(workDate)}`,
    ),
  getShiftContext: () => apiClient<ApiItem<ShiftContext>>("/production/shift-context"),
  submitShift: (payload: ShiftReconciliationPayload) =>
    apiClient<ApiItem<ShiftReconciliation>>(
      "/production/shift-reconciliations/submit",
      jsonBody("POST", payload),
    ),
  returnShift: (payload: ShiftReconciliationReasonPayload) =>
    apiClient<ApiItem<ShiftReconciliation>>(
      "/production/shift-reconciliations/return",
      jsonBody("POST", payload),
    ),
  acceptShift: (payload: ShiftReconciliationReasonPayload) =>
    apiClient<ApiItem<ShiftReconciliation>>(
      "/production/shift-reconciliations/accept",
      jsonBody("POST", payload),
    ),
  getWarehouseHandoffStage: () =>
    apiClient<ApiItem<ProductionStageReference | null>>("/production/warehouse-handoff-stage"),
  configureWarehouseHandoffStage: (productionStageId: string) =>
    apiClient<ApiItem<ProductionStageReference>>(
      "/production/warehouse-handoff-stage",
      jsonBody("PATCH", { productionStageId }),
    ),
};

// --- Queries ---------------------------------------------------------------

export function useOperationsSummaryQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.operationsSummary(),
    queryFn: async () => (await productionApi.getOperationsSummary()).data,
  });
}

export function useStageInventoryQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.stageInventory(),
    queryFn: async () => (await productionApi.getStageInventory()).data,
  });
}

export function useRecentMovementsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.recentMovements(),
    queryFn: async () => (await productionApi.getRecentMovements()).data,
  });
}

export function useWorkerActivitiesQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.workerActivities(),
    queryFn: async () => (await productionApi.getWorkerActivities()).data,
  });
}

export function useLookupEmployeesQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.lookupEmployees(),
    queryFn: async () => (await productionApi.getLookupEmployees()).data,
  });
}

export function useLookupVariantsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.lookupVariants(),
    queryFn: async () => (await productionApi.getLookupVariants()).data,
  });
}

export function useLookupWorkShiftsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.lookupWorkShifts(),
    queryFn: async () => (await productionApi.getLookupWorkShifts()).data,
  });
}

export function useProductionRunsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.runs(),
    queryFn: async () => (await productionApi.getRuns()).data,
  });
}

export function useShiftReconciliationsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.shiftReconciliations(),
    queryFn: async () => (await productionApi.getShiftReconciliations()).data,
  });
}

export function useShiftReadinessQuery(workShiftId: string, workDate: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(workShiftId),
    queryKey: queryKeys.production.shiftReadiness(workShiftId, workDate),
    queryFn: async () => (await productionApi.getShiftReadiness(workShiftId, workDate)).data,
  });
}

export function useShiftContextQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.shiftContext(),
    queryFn: async () => (await productionApi.getShiftContext()).data,
  });
}

export function useWarehouseHandoffStageQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.production.warehouseHandoffStage(),
    queryFn: async () => (await productionApi.getWarehouseHandoffStage()).data,
  });
}

// --- Mutations -------------------------------------------------------------

export function useCreateStageMovement() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateStageMovementPayload) =>
      (await productionApi.createStageMovement(payload)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useCreateWorkerActivity() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateWorkerActivityPayload) =>
      (await productionApi.createWorkerActivity(payload)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useCreateDefect() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateDefectPayload) =>
      (await productionApi.createDefect(payload)).data,
    invalidate: invalidationGroups.production,
  });
}

/** A run occupies a machine and schedules its inspection rounds, so machines refetch too. */
export function useCreateProductionRun() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateProductionRunPayload) =>
      (await productionApi.createRun(payload)).data,
    invalidate: invalidationGroups.productionAndMachines,
  });
}

export function useChangeRunStatus() {
  return useGuardedMutation({
    mutationFn: async (variables: { id: string; status: ProductionRunStatus }) =>
      (await productionApi.changeRunStatus(variables)).data,
    invalidate: invalidationGroups.productionAndMachines,
  });
}

export function useCreateRunIntake() {
  return useGuardedMutation({
    mutationFn: async (variables: CreateProductionRunIntakePayload & { id: string }) =>
      (await productionApi.createRunIntake(variables)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useSubmitShift() {
  return useGuardedMutation({
    mutationFn: async (payload: ShiftReconciliationPayload) =>
      (await productionApi.submitShift(payload)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useReturnShift() {
  return useGuardedMutation({
    mutationFn: async (payload: ShiftReconciliationReasonPayload) =>
      (await productionApi.returnShift(payload)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useAcceptShift() {
  return useGuardedMutation({
    mutationFn: async (payload: ShiftReconciliationReasonPayload) =>
      (await productionApi.acceptShift(payload)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useConfigureWarehouseHandoffStage() {
  return useGuardedMutation({
    mutationFn: async (productionStageId: string) =>
      (await productionApi.configureWarehouseHandoffStage(productionStageId)).data,
    invalidate: invalidationGroups.production,
  });
}
