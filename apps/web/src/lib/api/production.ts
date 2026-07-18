import { apiClient } from "./client";
import {
  ApiCollection,
  ApiDateTime,
  NamedReference,
  ProductVariantReference,
  UserReference,
} from "./types";

export interface ProductionStageReference extends NamedReference {
  sortOrder: number;
}

export interface EmployeeReference extends NamedReference {
  status: "ACTIVE" | "INACTIVE";
  jobRole?: "STAGE_WORKER" | "MECHANIC" | "MACHINE_OPERATOR";
}

type BatchEmployeeReference = NamedReference;

export interface StageInventory {
  id: string;
  quantity: number;
  updatedAt: ApiDateTime;
  stage: ProductionStageReference;
  productVariant: ProductVariantReference;
}

export interface StageMovement {
  id: string;
  quantity: number;
  occurredAt: ApiDateTime;
  note: string | null;
  sourceStage: ProductionStageReference;
  destinationStage: ProductionStageReference;
  productVariant: ProductVariantReference;
  productionBatch: {
    id: string;
    quantity: number;
    mechanic: BatchEmployeeReference | null;
    machineOperator: BatchEmployeeReference | null;
  } | null;
  recordedBy: UserReference;
}

export interface WorkerActivity {
  id: string;
  quantity: number;
  baseSalaryRateAmount: string;
  shiftPremiumAmount: string;
  salaryRateAmount: string;
  workShiftCode: "DAY" | "NIGHT" | null;
  activityDate: ApiDateTime;
  employee: EmployeeReference;
  stage: ProductionStageReference;
  productVariant: ProductVariantReference;
  enteredBy: UserReference;
}

export interface Defect {
  id: string;
  quantity: number;
  reason: string;
  detectedAt: ApiDateTime;
  employee: EmployeeReference | null;
  stage: ProductionStageReference | null;
  productVariant: ProductVariantReference | null;
  reportedBy: UserReference;
}

export type OperationsStageStatus = "NORMAL" | "ATTENTION" | "HIGH";
export type OperationsBottleneckPriority = "LOW" | "MEDIUM" | "HIGH";

export interface ProductionOperationsSummary {
  kpis: {
    todayProduction: string;
    totalInProgress: string;
    busiestStageName: string | null;
    activeWorkers: string;
  };
  stageTotals: Array<{
    stageId: string;
    stageName: string;
    sortOrder: number;
    quantity: string;
    status: OperationsStageStatus;
    isHighQuantity: boolean;
  }>;
  bottlenecks: Array<{
    stageId: string;
    stageName: string;
    quantity: string;
    priority: OperationsBottleneckPriority;
  }>;
  topWorkers: Array<{
    employeeId: string;
    employeeName: string;
    stageName: string;
    quantity: string;
    amount: string;
  }>;
  trend: Array<{
    date: string;
    quantity: string;
  }>;
  attention: string[];
}

export interface CreateProductionBatchPayload {
  productVariantId: string;
  mechanicEmployeeId?: string;
  machineOperatorEmployeeId?: string;
  quantity: number;
  note?: string;
}

export interface ProductionRun {
  id: string;
  status: "PLANNED" | "RUNNING" | "STOPPED" | "COMPLETED" | "HOLD" | "CANCELLED";
  machine: { id: string; code: string; name: string };
  productVariant: ProductVariantReference;
  operator: NamedReference;
  mechanic: NamedReference;
  workShift: NamedReference;
  startedAt: ApiDateTime | null;
}

export interface CreateStageMovementPayload {
  sourceStageId: string;
  destinationStageId: string;
  productVariantId: string;
  quantity: number;
  /** Manba bosqichda ishlagan ishchilar — faollik avtomatik yoziladi. */
  employeeIds: string[];
  /**
   * Ixtiyoriy: har ishchiga alohida dona (yig‘indi = quantity).
   * Yo‘q bo‘lsa backend teng bo‘ladi.
   */
  workerShares?: Array<{ employeeId: string; quantity: number }>;
  note?: string;
}

export interface StageMovementCreation {
  sourceStageInventory: StageInventory;
  destinationStageInventory: StageInventory;
  stageMovement: StageMovement;
  workerActivityCount?: number;
}

export interface CreateWorkerActivityPayload {
  employeeId: string;
  stageId: string;
  productVariantId: string;
  quantity: number;
  note?: string;
}

export interface CreateDefectPayload {
  employeeId?: string | null;
  stageId?: string | null;
  productVariantId?: string | null;
  quantity: number;
  reason: string;
}

export interface ProductionBatchCreation {
  batch: {
    id: string;
    quantity: number;
    createdAt: ApiDateTime;
    productVariant: ProductVariantReference;
    createdBy: UserReference;
    mechanic: BatchEmployeeReference | null;
    machineOperator: BatchEmployeeReference | null;
  };
  stageInventory: StageInventory;
  stageMovement: StageMovement;
}

export interface ProductionLookupEmployee {
  id: string;
  name: string;
  status: string;
  jobRole: "STAGE_WORKER" | "MECHANIC" | "MACHINE_OPERATOR";
  workProfile: "STAGE_WORKER" | "MACHINE_OPERATOR" | "MECHANIC" | "MECHANIC_MASTER" | "STAFF";
  stages: Array<{ id: string; name: string; sortOrder: number }>;
}

export interface ProductionLookupVariant {
  id: string;
  label: string;
  product: { id: string; name: string; code: string | null };
  color: { id: string; name: string; code: string | null };
  material: { id: string; name: string; code: string | null };
  season: { id: string; name: string; code: string | null };
}

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
