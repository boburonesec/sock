import type {
  CreateDefectPayload,
  CreateProductionBatchPayload,
  CreateStageMovementPayload,
  CreateWorkerActivityPayload,
  Defect,
  EmployeeReference,
  OperationsBottleneckPriority,
  OperationsStageStatus,
  ProductionBatchCreation,
  ProductionLookupEmployee,
  ProductionLookupVariant,
  ProductionOperationsSummary,
  ProductionRun,
  ProductionStageReference,
  ShiftReadiness,
  ShiftReadinessCheck,
  ShiftReconciliation,
  StageInventory,
  StageMovement,
  StageMovementCreation,
  WorkerActivity,
  WorkShiftReference,
} from "@paypoq/shared";
import { apiClient } from "./client";
import type { ApiCollection } from "./types";

// Contract types live in @paypoq/shared (shared with Native Mobile).
export type {
  CreateDefectPayload,
  CreateProductionBatchPayload,
  CreateStageMovementPayload,
  CreateWorkerActivityPayload,
  Defect,
  EmployeeReference,
  OperationsBottleneckPriority,
  OperationsStageStatus,
  ProductionBatchCreation,
  ProductionLookupEmployee,
  ProductionLookupVariant,
  ProductionOperationsSummary,
  ProductionRun,
  ProductionStageReference,
  ShiftReadiness,
  ShiftReadinessCheck,
  ShiftReconciliation,
  StageInventory,
  StageMovement,
  StageMovementCreation,
  WorkerActivity,
  WorkShiftReference,
};

export const productionApi = {
  getRuns: () => apiClient<ApiCollection<ProductionRun>>("/production/runs"),
  createRun: (payload: { machineId: string; productVariantId: string; operatorEmployeeId: string; workShiftId: string; note?: string }) =>
    apiClient<{ data: ProductionRun }>("/production/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  changeRunStatus: (id: string, status: ProductionRun["status"]) =>
    apiClient<{ data: ProductionRun }>(`/production/runs/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
  createRunIntake: (id: string, payload: { quantity: number; idempotencyKey: string; note?: string }) =>
    apiClient<{ data: unknown }>(`/production/runs/${id}/intakes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  getStageInventory: () =>
    apiClient<ApiCollection<StageInventory>>("/production/stage-inventory"),
  getRecentMovements: () =>
    apiClient<ApiCollection<StageMovement>>("/production/recent-movements"),
  getWorkerActivities: () =>
    apiClient<ApiCollection<WorkerActivity>>("/production/worker-activities"),
  getDefects: () => apiClient<ApiCollection<Defect>>("/production/defects"),
  getOperationsSummary: () =>
    apiClient<{ data: ProductionOperationsSummary }>(
      "/production/operations-summary",
    ),
  getLookupEmployees: () =>
    apiClient<ApiCollection<ProductionLookupEmployee>>(
      "/production/lookups/employees",
    ),
  getLookupProductVariants: () =>
    apiClient<ApiCollection<ProductionLookupVariant>>(
      "/production/lookups/product-variants",
    ),
  getShiftReconciliations: () => apiClient<ApiCollection<ShiftReconciliation>>("/production/shift-reconciliations"),
  getShiftReadiness: (workShiftId: string, workDate: string) => apiClient<{ data: ShiftReadiness }>(`/production/shift-reconciliations/readiness?workShiftId=${encodeURIComponent(workShiftId)}&workDate=${encodeURIComponent(workDate)}`),
  getShiftContext: () => apiClient<{ data: { currentWorkShift: WorkShiftReference | null; message: string | null } }>("/production/shift-context"),
  getLookupWorkShifts: () => apiClient<ApiCollection<WorkShiftReference>>("/production/lookups/work-shifts"),
  submitShiftReconciliation: (payload: { workShiftId: string; workDate: string }) =>
    apiClient<{ data: ShiftReconciliation }>("/production/shift-reconciliations/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  returnShiftReconciliation: (payload: { workShiftId: string; workDate: string; reason: string }) =>
    apiClient<{ data: ShiftReconciliation }>("/production/shift-reconciliations/return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  acceptShiftReconciliation: (payload: { workShiftId: string; workDate: string; reason: string }) =>
    apiClient<{ data: ShiftReconciliation }>("/production/shift-reconciliations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  getWarehouseHandoffStage: () => apiClient<{ data: ProductionStageReference | null }>("/production/warehouse-handoff-stage"),
  configureWarehouseHandoffStage: (productionStageId: string) =>
    apiClient<{ data: ProductionStageReference }>("/production/warehouse-handoff-stage", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productionStageId }) }),
  createBatch: (payload: CreateProductionBatchPayload) =>
    apiClient<{ data: ProductionBatchCreation }>("/production/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createStageMovement: (payload: CreateStageMovementPayload) =>
    apiClient<{ data: StageMovementCreation }>("/production/stage-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createWorkerActivity: (payload: CreateWorkerActivityPayload) =>
    apiClient<{ data: WorkerActivity }>("/production/worker-activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createDefect: (payload: CreateDefectPayload) =>
    apiClient<{ data: Defect }>("/production/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
