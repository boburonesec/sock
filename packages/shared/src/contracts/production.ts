import type {
  ApiDateTime,
  NamedReference,
  ProductVariantReference,
  UserReference,
  WorkShiftReference,
} from "./common.ts";

export interface ProductionStageReference extends NamedReference {
  sortOrder: number;
}

export const EMPLOYEE_JOB_ROLES = ["STAGE_WORKER", "MECHANIC", "MACHINE_OPERATOR"] as const;
export type EmployeeJobRole = (typeof EMPLOYEE_JOB_ROLES)[number];

export const EMPLOYEE_WORK_PROFILES = [
  "STAGE_WORKER",
  "MACHINE_OPERATOR",
  "MECHANIC",
  "MECHANIC_MASTER",
  "STAFF",
] as const;
export type EmployeeWorkProfile = (typeof EMPLOYEE_WORK_PROFILES)[number];

export interface EmployeeReference extends NamedReference {
  status: "ACTIVE" | "INACTIVE";
  jobRole?: EmployeeJobRole;
}

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
    mechanic: NamedReference | null;
    machineOperator: NamedReference | null;
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

export interface ProductionBatchCreation {
  batch: {
    id: string;
    quantity: number;
    createdAt: ApiDateTime;
    productVariant: ProductVariantReference;
    createdBy: UserReference;
    mechanic: NamedReference | null;
    machineOperator: NamedReference | null;
  };
  stageInventory: StageInventory;
  stageMovement: StageMovement;
}

export const PRODUCTION_RUN_STATUSES = [
  "PLANNED",
  "RUNNING",
  "STOPPED",
  "COMPLETED",
  "HOLD",
  "CANCELLED",
] as const;
export type ProductionRunStatus = (typeof PRODUCTION_RUN_STATUSES)[number];

/** Runs that still occupy a machine and can receive output or be closed. */
export const ACTIVE_PRODUCTION_RUN_STATUSES: readonly ProductionRunStatus[] = ["RUNNING", "HOLD"];

export interface ProductionRun {
  id: string;
  status: ProductionRunStatus;
  machine: { id: string; code: string; name: string };
  /** `/production/runs` includes product and color only. */
  productVariant: { id: string; product: NamedReference; color: NamedReference };
  operator: NamedReference;
  mechanic: NamedReference;
  workShift: NamedReference;
  startedAt: ApiDateTime | null;
}

export interface CreateProductionRunPayload {
  machineId: string;
  productVariantId: string;
  operatorEmployeeId: string;
  workShiftId: string;
  note?: string;
}

export interface CreateProductionRunIntakePayload {
  quantity: number;
  /** Min 8 chars. Replaying the same key for the same run returns the first intake. */
  idempotencyKey: string;
  note?: string;
}

export interface ProductionRunIntake {
  id: string;
  productionRunId: string;
  quantity: number;
  idempotencyKey: string;
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
  sourceStageInventoryBefore: StageInventory;
  destinationStageInventoryBefore: StageInventory | null;
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

export interface ProductionLookupEmployee {
  id: string;
  name: string;
  status: string;
  jobRole: EmployeeJobRole;
  workProfile: EmployeeWorkProfile;
  workShift: WorkShiftReference | null;
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

export const SHIFT_RECONCILIATION_STATUSES = ["OPEN", "READY_FOR_HANDOVER", "ACCEPTED"] as const;
export type ShiftReconciliationStatus = (typeof SHIFT_RECONCILIATION_STATUSES)[number];

export interface ShiftReadinessCheck {
  code: string;
  label: string;
  status: "READY" | "BLOCKER" | "WARNING";
  detail: string;
  action: string;
}

export interface ShiftReadiness {
  checks: ShiftReadinessCheck[];
  blockers: ShiftReadinessCheck[];
  warnings: ShiftReadinessCheck[];
  ready: ShiftReadinessCheck[];
}

export interface ShiftReconciliation {
  id: string;
  workShiftId: string;
  workDate: ApiDateTime;
  status: ShiftReconciliationStatus;
  warningAcknowledgment: string | null;
  workShift: WorkShiftReference;
  readiness?: ShiftReadiness;
}

export interface ShiftReconciliationPayload {
  workShiftId: string;
  /** YYYY-MM-DD */
  workDate: string;
}

export interface ShiftReconciliationReasonPayload extends ShiftReconciliationPayload {
  /** Min 3 chars. */
  reason: string;
}

export interface ShiftContext {
  currentWorkShift: WorkShiftReference | null;
  message: string | null;
}

/** Minimum length the API enforces for free-text reasons on these workflows. */
export const MIN_REASON_LENGTH = 3;

/** Stage name the default factory setup uses for the warehouse handoff stage. */
export const DEFAULT_WAREHOUSE_HANDOFF_STAGE_NAME = "Ombor";

/**
 * Stage inventory that a finished-product receipt can take from. The API
 * receives from the factory's configured warehouse handoff stage, so clients
 * must offer exactly that stage's products. Until a handoff stage is
 * configured the API rejects every receipt; the default stage name is kept as
 * the fallback so the operator still reaches that explanatory error.
 */
export function selectWarehouseHandoffInventory(
  inventory: readonly StageInventory[],
  handoffStage: ProductionStageReference | null | undefined,
): StageInventory[] {
  return inventory.filter(
    (item) =>
      item.quantity > 0 &&
      (handoffStage
        ? item.stage.id === handoffStage.id
        : item.stage.name === DEFAULT_WAREHOUSE_HANDOFF_STAGE_NAME),
  );
}

/**
 * Default work date (YYYY-MM-DD) for shift reconciliation. The API buckets a
 * work date as a UTC day, so both clients default to the current UTC date and
 * address the same reconciliation record.
 */
export function currentWorkDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
