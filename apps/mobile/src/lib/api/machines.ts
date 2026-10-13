import type {
  ApiCollection,
  ApiItem,
  ConfigureInspectionSlotsPayload,
  CreateMachineAssignmentPayload,
  CreateMachinePayload,
  CreateMachinePieceRatePayload,
  CreateMaintenanceTaskPayload,
  InspectionRound,
  InspectionScheduleSlot,
  Machine,
  MachineLookups,
  MaintenanceTask,
  MeasurementMetricPayload,
  MeasurementValuePayload,
  QualityIssue,
  UpdateMaintenanceTaskPayload,
} from "@paypoq/shared";
import { useContextQuery } from "@/shared/hooks/use-context-query";

import { apiClient, jsonBody, type ApiClientOptions } from "@/lib/api/client";
import { invalidationGroups, queryKeys } from "@/lib/api/query-keys";
import { useGuardedMutation } from "@/shared/hooks/use-guarded-mutation";

const id = encodeURIComponent;

export const machinesApi = {
  lookups: (options?: ApiClientOptions) => apiClient<ApiItem<MachineLookups>>("/machines/lookups", options),
  list: (options?: ApiClientOptions) => apiClient<ApiCollection<Machine>>("/machines", options),
  create: (payload: CreateMachinePayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<Machine>>("/machines", jsonBody("POST", payload, options)),
  assign: (payload: CreateMachineAssignmentPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<unknown>>("/machines/assignments", jsonBody("POST", payload, options)),
  createPieceRate: (payload: CreateMachinePieceRatePayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<unknown>>("/machines/piece-rates", jsonBody("POST", payload, options)),
  tasks: (options?: ApiClientOptions) => apiClient<ApiCollection<MaintenanceTask>>("/machines/tasks", options),
  createTask: (payload: CreateMaintenanceTaskPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<MaintenanceTask>>("/machines/tasks", jsonBody("POST", payload, options)),
  updateTask: ({ taskId, ...payload }: UpdateMaintenanceTaskPayload & { taskId: string }, options?: ApiClientOptions) =>
    apiClient<ApiItem<MaintenanceTask>>(`/machines/tasks/${id(taskId)}`, jsonBody("PATCH", payload, options)),
  createSpecification: (productId: string, metrics: MeasurementMetricPayload[], options?: ApiClientOptions) =>
    apiClient<ApiItem<{ id: string }>>(
      `/machines/products/${id(productId)}/specifications`,
      jsonBody("POST", { metrics }, options),
    ),
  activateSpecification: (specificationId: string, options?: ApiClientOptions) =>
    apiClient<ApiItem<unknown>>(
      `/machines/specifications/${id(specificationId)}/activate`,
      jsonBody("POST", undefined, options),
    ),
  configureInspectionSlots: (payload: ConfigureInspectionSlotsPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<InspectionScheduleSlot[]>>("/machines/inspection-slots", jsonBody("POST", payload, options)),
  inspectionRounds: (options?: ApiClientOptions) => apiClient<ApiCollection<InspectionRound>>("/machines/inspection-rounds/mine", options),
  submitMeasurements: (roundId: string, measurements: MeasurementValuePayload[], options?: ApiClientOptions) =>
    apiClient<ApiItem<{ roundId: string; status: string }>>(
      `/machines/inspection-rounds/${id(roundId)}/measurements`,
      jsonBody("POST", { measurements }, options),
    ),
  qualityIssues: (options?: ApiClientOptions) => apiClient<ApiCollection<QualityIssue>>("/machines/quality-issues", options),
  recheckIssue: (issueId: string, measurements: MeasurementValuePayload[], options?: ApiClientOptions) =>
    apiClient<ApiItem<{ failed: string[] }>>(
      `/machines/quality-issues/${id(issueId)}/recheck`,
      jsonBody("POST", { measurements }, options),
    ),
  holdIssueRun: (issueId: string, options?: ApiClientOptions) =>
    apiClient<ApiItem<{ productionRunId: string; status: string }>>(
      `/machines/quality-issues/${id(issueId)}/hold`,
      jsonBody("POST", undefined, options),
    ),
};

export function useMachinesQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.machines.list(),
    queryFn: async (options) => (await machinesApi.list(options)).data,
  });
}

export function useMachineLookupsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.machines.lookups(),
    queryFn: async (options) => (await machinesApi.lookups(options)).data,
  });
}

export function useMaintenanceTasksQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.machines.tasks(),
    queryFn: async (options) => (await machinesApi.tasks(options)).data,
  });
}

export function useInspectionRoundsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.machines.inspectionRounds(),
    queryFn: async (options) => (await machinesApi.inspectionRounds(options)).data,
  });
}

export function useQualityIssuesQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.machines.qualityIssues(),
    queryFn: async (options) => (await machinesApi.qualityIssues(options)).data,
  });
}

export function useCreateMachine() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateMachinePayload, options: ApiClientOptions) => (await machinesApi.create(payload, options)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useAssignMechanic() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateMachineAssignmentPayload, options: ApiClientOptions) =>
      (await machinesApi.assign(payload, options)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useCreatePieceRate() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateMachinePieceRatePayload, options: ApiClientOptions) =>
      (await machinesApi.createPieceRate(payload, options)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useCreateMaintenanceTask() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateMaintenanceTaskPayload, options: ApiClientOptions) =>
      (await machinesApi.createTask(payload, options)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useUpdateMaintenanceTask() {
  return useGuardedMutation({
    mutationFn: async (variables: UpdateMaintenanceTaskPayload & { taskId: string }, options: ApiClientOptions) =>
      (await machinesApi.updateTask(variables, options)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useConfigureInspectionSlots() {
  return useGuardedMutation({
    mutationFn: async (payload: ConfigureInspectionSlotsPayload, options: ApiClientOptions) =>
      (await machinesApi.configureInspectionSlots(payload, options)).data,
    invalidate: invalidationGroups.machines,
  });
}

/**
 * Web creates the specification and activates it in one step. If activation
 * fails the draft stays inactive and the API error is surfaced, same as Web.
 */
export function useCreateAndActivateSpecification() {
  return useGuardedMutation({
    mutationFn: async (variables: { productId: string; metrics: MeasurementMetricPayload[] }, options: ApiClientOptions) => {
      const created = await machinesApi.createSpecification(variables.productId, variables.metrics, options);
      await machinesApi.activateSpecification(created.data.id, options);
      return created.data;
    },
    invalidate: invalidationGroups.machines,
  });
}

export function useSubmitMeasurements() {
  return useGuardedMutation({
    mutationFn: async (variables: { roundId: string; measurements: MeasurementValuePayload[] }, options: ApiClientOptions) =>
      (await machinesApi.submitMeasurements(variables.roundId, variables.measurements, options)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useRecheckIssue() {
  return useGuardedMutation({
    mutationFn: async (variables: { issueId: string; measurements: MeasurementValuePayload[] }, options: ApiClientOptions) =>
      (await machinesApi.recheckIssue(variables.issueId, variables.measurements, options)).data,
    invalidate: invalidationGroups.machines,
  });
}

/** Putting a run on HOLD changes the run list on the production side as well. */
export function useHoldIssueRun() {
  return useGuardedMutation({
    mutationFn: async (issueId: string, options: ApiClientOptions) => (await machinesApi.holdIssueRun(issueId, options)).data,
    invalidate: invalidationGroups.productionAndMachines,
  });
}
