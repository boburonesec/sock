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
import { useContextQuery } from "@/shared/hooks/use-context-query";

import { apiClient, jsonBody, type ApiClientOptions } from "@/lib/api/client";
import { invalidationGroups, queryKeys } from "@/lib/api/query-keys";
import { useGuardedMutation } from "@/shared/hooks/use-guarded-mutation";

export const productionApi = {
  getOperationsSummary: (options?: ApiClientOptions) =>
    apiClient<ApiItem<ProductionOperationsSummary>>("/production/operations-summary", options),
  getStageInventory: (options?: ApiClientOptions) => apiClient<ApiCollection<StageInventory>>("/production/stage-inventory", options),
  getRecentMovements: (options?: ApiClientOptions) => apiClient<ApiCollection<StageMovement>>("/production/recent-movements", options),
  getWorkerActivities: (options?: ApiClientOptions) => apiClient<ApiCollection<WorkerActivity>>("/production/worker-activities", options),
  getLookupEmployees: (options?: ApiClientOptions) =>
    apiClient<ApiCollection<ProductionLookupEmployee>>("/production/lookups/employees", options),
  getLookupVariants: (options?: ApiClientOptions) =>
    apiClient<ApiCollection<ProductionLookupVariant>>("/production/lookups/product-variants", options),
  getLookupWorkShifts: (options?: ApiClientOptions) =>
    apiClient<ApiCollection<WorkShiftReference>>("/production/lookups/work-shifts", options),
  createStageMovement: (payload: CreateStageMovementPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<StageMovementCreation>>("/production/stage-movements", jsonBody("POST", payload, options)),
  createWorkerActivity: (payload: CreateWorkerActivityPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<WorkerActivity>>("/production/worker-activities", jsonBody("POST", payload, options)),
  createDefect: (payload: CreateDefectPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<Defect>>("/production/defects", jsonBody("POST", payload, options)),

  getRuns: (options?: ApiClientOptions) => apiClient<ApiCollection<ProductionRun>>("/production/runs", options),
  createRun: (payload: CreateProductionRunPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<ProductionRun>>("/production/runs", jsonBody("POST", payload, options)),
  changeRunStatus: ({ id, status }: { id: string; status: ProductionRunStatus }, options?: ApiClientOptions) =>
    apiClient<ApiItem<ProductionRun>>(
      `/production/runs/${encodeURIComponent(id)}/status`,
      jsonBody("PATCH", { status }, options),
    ),
  createRunIntake: ({ id, ...payload }: CreateProductionRunIntakePayload & { id: string }, options?: ApiClientOptions) =>
    apiClient<ApiItem<ProductionRunIntake>>(
      `/production/runs/${encodeURIComponent(id)}/intakes`,
      jsonBody("POST", payload, options),
    ),

  getShiftReconciliations: (options?: ApiClientOptions) =>
    apiClient<ApiCollection<ShiftReconciliation>>("/production/shift-reconciliations", options),
  getShiftReadiness: (workShiftId: string, workDate: string, options?: ApiClientOptions) =>
    apiClient<ApiItem<ShiftReadiness>>(
      `/production/shift-reconciliations/readiness?workShiftId=${encodeURIComponent(workShiftId)}&workDate=${encodeURIComponent(workDate)}`,
      options,
    ),
  getShiftContext: (options?: ApiClientOptions) => apiClient<ApiItem<ShiftContext>>("/production/shift-context", options),
  submitShift: (payload: ShiftReconciliationPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<ShiftReconciliation>>(
      "/production/shift-reconciliations/submit",
      jsonBody("POST", payload, options),
    ),
  returnShift: (payload: ShiftReconciliationReasonPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<ShiftReconciliation>>(
      "/production/shift-reconciliations/return",
      jsonBody("POST", payload, options),
    ),
  acceptShift: (payload: ShiftReconciliationReasonPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<ShiftReconciliation>>(
      "/production/shift-reconciliations/accept",
      jsonBody("POST", payload, options),
    ),
  getWarehouseHandoffStage: (options?: ApiClientOptions) =>
    apiClient<ApiItem<ProductionStageReference | null>>("/production/warehouse-handoff-stage", options),
  configureWarehouseHandoffStage: (productionStageId: string, options?: ApiClientOptions) =>
    apiClient<ApiItem<ProductionStageReference>>(
      "/production/warehouse-handoff-stage",
      jsonBody("PATCH", { productionStageId }, options),
    ),
};

// --- Queries ---------------------------------------------------------------

export function useOperationsSummaryQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.operationsSummary(),
    queryFn: async (options) => (await productionApi.getOperationsSummary(options)).data,
  });
}

export function useStageInventoryQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.stageInventory(),
    queryFn: async (options) => (await productionApi.getStageInventory(options)).data,
  });
}

export function useRecentMovementsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.recentMovements(),
    queryFn: async (options) => (await productionApi.getRecentMovements(options)).data,
  });
}

export function useWorkerActivitiesQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.workerActivities(),
    queryFn: async (options) => (await productionApi.getWorkerActivities(options)).data,
  });
}

export function useLookupEmployeesQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.lookupEmployees(),
    queryFn: async (options) => (await productionApi.getLookupEmployees(options)).data,
  });
}

export function useLookupVariantsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.lookupVariants(),
    contextScope: "tenant",
    queryFn: async (options) => (await productionApi.getLookupVariants(options)).data,
  });
}

export function useLookupWorkShiftsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.lookupWorkShifts(),
    queryFn: async (options) => (await productionApi.getLookupWorkShifts(options)).data,
  });
}

export function useProductionRunsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.runs(),
    queryFn: async (options) => (await productionApi.getRuns(options)).data,
  });
}

export function useShiftReconciliationsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.shiftReconciliations(),
    queryFn: async (options) => (await productionApi.getShiftReconciliations(options)).data,
  });
}

export function useShiftReadinessQuery(workShiftId: string, workDate: string, enabled = true) {
  return useContextQuery({
    enabled: enabled && Boolean(workShiftId),
    queryKey: queryKeys.production.shiftReadiness(workShiftId, workDate),
    queryFn: async (options) => (await productionApi.getShiftReadiness(workShiftId, workDate, options)).data,
  });
}

export function useShiftContextQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.shiftContext(),
    queryFn: async (options) => (await productionApi.getShiftContext(options)).data,
  });
}

export function useWarehouseHandoffStageQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.production.warehouseHandoffStage(),
    queryFn: async (options) => (await productionApi.getWarehouseHandoffStage(options)).data,
  });
}

// --- Mutations -------------------------------------------------------------

export function useCreateStageMovement() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateStageMovementPayload, options: ApiClientOptions) =>
      (await productionApi.createStageMovement(payload, options)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useCreateWorkerActivity() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateWorkerActivityPayload, options: ApiClientOptions) =>
      (await productionApi.createWorkerActivity(payload, options)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useCreateDefect() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateDefectPayload, options: ApiClientOptions) =>
      (await productionApi.createDefect(payload, options)).data,
    invalidate: invalidationGroups.production,
  });
}

/** A run occupies a machine and schedules its inspection rounds, so machines refetch too. */
export function useCreateProductionRun() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateProductionRunPayload, options: ApiClientOptions) =>
      (await productionApi.createRun(payload, options)).data,
    invalidate: invalidationGroups.productionAndMachines,
  });
}

export function useChangeRunStatus() {
  return useGuardedMutation({
    mutationFn: async (variables: { id: string; status: ProductionRunStatus }, options: ApiClientOptions) =>
      (await productionApi.changeRunStatus(variables, options)).data,
    invalidate: invalidationGroups.productionAndMachines,
  });
}

export function useCreateRunIntake() {
  return useGuardedMutation({
    mutationFn: async (variables: CreateProductionRunIntakePayload & { id: string }, options: ApiClientOptions) =>
      (await productionApi.createRunIntake(variables, options)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useSubmitShift() {
  return useGuardedMutation({
    mutationFn: async (payload: ShiftReconciliationPayload, options: ApiClientOptions) =>
      (await productionApi.submitShift(payload, options)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useReturnShift() {
  return useGuardedMutation({
    mutationFn: async (payload: ShiftReconciliationReasonPayload, options: ApiClientOptions) =>
      (await productionApi.returnShift(payload, options)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useAcceptShift() {
  return useGuardedMutation({
    mutationFn: async (payload: ShiftReconciliationReasonPayload, options: ApiClientOptions) =>
      (await productionApi.acceptShift(payload, options)).data,
    invalidate: invalidationGroups.production,
  });
}

export function useConfigureWarehouseHandoffStage() {
  return useGuardedMutation({
    mutationFn: async (productionStageId: string, options: ApiClientOptions) =>
      (await productionApi.configureWarehouseHandoffStage(productionStageId, options)).data,
    invalidate: invalidationGroups.production,
  });
}
