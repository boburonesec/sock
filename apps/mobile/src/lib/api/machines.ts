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
import { useQuery } from "@tanstack/react-query";

import { apiClient, jsonBody } from "@/lib/api/client";
import { invalidationGroups, queryKeys } from "@/lib/api/query-keys";
import { useGuardedMutation } from "@/shared/hooks/use-guarded-mutation";

const id = encodeURIComponent;

export const machinesApi = {
  lookups: () => apiClient<ApiItem<MachineLookups>>("/machines/lookups"),
  list: () => apiClient<ApiCollection<Machine>>("/machines"),
  create: (payload: CreateMachinePayload) =>
    apiClient<ApiItem<Machine>>("/machines", jsonBody("POST", payload)),
  assign: (payload: CreateMachineAssignmentPayload) =>
    apiClient<ApiItem<unknown>>("/machines/assignments", jsonBody("POST", payload)),
  createPieceRate: (payload: CreateMachinePieceRatePayload) =>
    apiClient<ApiItem<unknown>>("/machines/piece-rates", jsonBody("POST", payload)),
  tasks: () => apiClient<ApiCollection<MaintenanceTask>>("/machines/tasks"),
  createTask: (payload: CreateMaintenanceTaskPayload) =>
    apiClient<ApiItem<MaintenanceTask>>("/machines/tasks", jsonBody("POST", payload)),
  updateTask: ({ taskId, ...payload }: UpdateMaintenanceTaskPayload & { taskId: string }) =>
    apiClient<ApiItem<MaintenanceTask>>(`/machines/tasks/${id(taskId)}`, jsonBody("PATCH", payload)),
  createSpecification: (productId: string, metrics: MeasurementMetricPayload[]) =>
    apiClient<ApiItem<{ id: string }>>(
      `/machines/products/${id(productId)}/specifications`,
      jsonBody("POST", { metrics }),
    ),
  activateSpecification: (specificationId: string) =>
    apiClient<ApiItem<unknown>>(
      `/machines/specifications/${id(specificationId)}/activate`,
      jsonBody("POST"),
    ),
  configureInspectionSlots: (payload: ConfigureInspectionSlotsPayload) =>
    apiClient<ApiItem<InspectionScheduleSlot[]>>("/machines/inspection-slots", jsonBody("POST", payload)),
  inspectionRounds: () => apiClient<ApiCollection<InspectionRound>>("/machines/inspection-rounds/mine"),
  submitMeasurements: (roundId: string, measurements: MeasurementValuePayload[]) =>
    apiClient<ApiItem<{ roundId: string; status: string }>>(
      `/machines/inspection-rounds/${id(roundId)}/measurements`,
      jsonBody("POST", { measurements }),
    ),
  qualityIssues: () => apiClient<ApiCollection<QualityIssue>>("/machines/quality-issues"),
  recheckIssue: (issueId: string, measurements: MeasurementValuePayload[]) =>
    apiClient<ApiItem<{ failed: string[] }>>(
      `/machines/quality-issues/${id(issueId)}/recheck`,
      jsonBody("POST", { measurements }),
    ),
  holdIssueRun: (issueId: string) =>
    apiClient<ApiItem<{ productionRunId: string; status: string }>>(
      `/machines/quality-issues/${id(issueId)}/hold`,
      jsonBody("POST"),
    ),
};

export function useMachinesQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.machines.list(),
    queryFn: async () => (await machinesApi.list()).data,
  });
}

export function useMachineLookupsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.machines.lookups(),
    queryFn: async () => (await machinesApi.lookups()).data,
  });
}

export function useMaintenanceTasksQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.machines.tasks(),
    queryFn: async () => (await machinesApi.tasks()).data,
  });
}

export function useInspectionRoundsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.machines.inspectionRounds(),
    queryFn: async () => (await machinesApi.inspectionRounds()).data,
  });
}

export function useQualityIssuesQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.machines.qualityIssues(),
    queryFn: async () => (await machinesApi.qualityIssues()).data,
  });
}

export function useCreateMachine() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateMachinePayload) => (await machinesApi.create(payload)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useAssignMechanic() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateMachineAssignmentPayload) =>
      (await machinesApi.assign(payload)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useCreatePieceRate() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateMachinePieceRatePayload) =>
      (await machinesApi.createPieceRate(payload)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useCreateMaintenanceTask() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateMaintenanceTaskPayload) =>
      (await machinesApi.createTask(payload)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useUpdateMaintenanceTask() {
  return useGuardedMutation({
    mutationFn: async (variables: UpdateMaintenanceTaskPayload & { taskId: string }) =>
      (await machinesApi.updateTask(variables)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useConfigureInspectionSlots() {
  return useGuardedMutation({
    mutationFn: async (payload: ConfigureInspectionSlotsPayload) =>
      (await machinesApi.configureInspectionSlots(payload)).data,
    invalidate: invalidationGroups.machines,
  });
}

/**
 * Web creates the specification and activates it in one step. If activation
 * fails the draft stays inactive and the API error is surfaced, same as Web.
 */
export function useCreateAndActivateSpecification() {
  return useGuardedMutation({
    mutationFn: async (variables: { productId: string; metrics: MeasurementMetricPayload[] }) => {
      const created = await machinesApi.createSpecification(variables.productId, variables.metrics);
      await machinesApi.activateSpecification(created.data.id);
      return created.data;
    },
    invalidate: invalidationGroups.machines,
  });
}

export function useSubmitMeasurements() {
  return useGuardedMutation({
    mutationFn: async (variables: { roundId: string; measurements: MeasurementValuePayload[] }) =>
      (await machinesApi.submitMeasurements(variables.roundId, variables.measurements)).data,
    invalidate: invalidationGroups.machines,
  });
}

export function useRecheckIssue() {
  return useGuardedMutation({
    mutationFn: async (variables: { issueId: string; measurements: MeasurementValuePayload[] }) =>
      (await machinesApi.recheckIssue(variables.issueId, variables.measurements)).data,
    invalidate: invalidationGroups.machines,
  });
}

/** Putting a run on HOLD changes the run list on the production side as well. */
export function useHoldIssueRun() {
  return useGuardedMutation({
    mutationFn: async (issueId: string) => (await machinesApi.holdIssueRun(issueId)).data,
    invalidate: invalidationGroups.productionAndMachines,
  });
}
