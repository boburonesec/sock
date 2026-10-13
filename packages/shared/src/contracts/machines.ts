import type { ApiDateTime, NamedReference } from "./common.ts";

export const MACHINE_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export const MACHINE_WORK_ROLES = ["MECHANIC", "MACHINE_OPERATOR"] as const;
export type MachineWorkRole = (typeof MACHINE_WORK_ROLES)[number];

export const MAINTENANCE_TASK_TYPES = ["REPAIR", "SETUP", "INSPECTION", "OTHER"] as const;
export type MaintenanceTaskType = (typeof MAINTENANCE_TASK_TYPES)[number];

export const MAINTENANCE_TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type MaintenanceTaskPriority = (typeof MAINTENANCE_TASK_PRIORITIES)[number];

export const MAINTENANCE_TASK_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type MaintenanceTaskStatus = (typeof MAINTENANCE_TASK_STATUSES)[number];

export const INSPECTION_ROUND_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "PASSED",
  "ATTENTION",
  "MISSED",
] as const;
export type InspectionRoundStatus = (typeof INSPECTION_ROUND_STATUSES)[number];

/** Rounds a mechanic can still enter measurements for. */
export const ACTIONABLE_INSPECTION_ROUND_STATUSES: readonly string[] = ["PENDING", "IN_PROGRESS"];

export const QUALITY_ISSUE_STATUSES = ["ATTENTION", "RECHECK_DUE", "ESCALATED", "RESOLVED"] as const;
export type QualityIssueStatus = (typeof QUALITY_ISSUE_STATUSES)[number];

export interface MachineAssignment {
  id: string;
  mechanic: NamedReference;
  workShift: NamedReference;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  status: MachineStatus;
  note: string | null;
  /** Open-ended (validTo = null) mechanic assignments; only on `GET /machines`. */
  assignments: MachineAssignment[];
}

/** Machine row embedded in tasks, rounds and issues (no assignments). */
export type MachineReference = Omit<Machine, "assignments">;

export interface MachineLookups {
  employees: Array<{
    id: string;
    name: string;
    workProfile: "MECHANIC" | "MACHINE_OPERATOR";
    workShiftId: string | null;
  }>;
  shifts: Array<{
    id: string;
    name: string;
    code: string;
    inspectionSlots: Array<{ slotNumber: number; minuteOffset: number }>;
  }>;
  products: Array<{ id: string; name: string }>;
}

export interface CreateMachinePayload {
  code: string;
  name: string;
  note?: string;
}

export interface CreateMachineAssignmentPayload {
  machineId: string;
  mechanicId: string;
  workShiftId: string;
  /** ISO date-time. */
  validFrom: string;
  validTo?: string;
}

export interface CreateMachinePieceRatePayload {
  productId: string;
  workRole: MachineWorkRole;
  amount: number;
  /** ISO date-time. */
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface MaintenanceTask {
  id: string;
  type: string;
  priority: string;
  status: string;
  description: string;
  resolution: string | null;
  dueAt: ApiDateTime | null;
  machine: MachineReference;
  assignee: NamedReference;
}

export interface CreateMaintenanceTaskPayload {
  machineId: string;
  assigneeMechanicId: string;
  type: string;
  priority: string;
  dueAt?: string;
  description: string;
}

export interface UpdateMaintenanceTaskPayload {
  status: string;
  /** Required by the API when status is COMPLETED. */
  resolution?: string;
}

export interface MeasurementMetric {
  id: string;
  name: string;
  code?: string;
  unit: string;
  target: string;
  min: string;
  max: string;
}

export interface MeasurementMetricPayload {
  code: string;
  name: string;
  unit: string;
  target: number;
  min: number;
  max: number;
  displayOrder: number;
}

export interface MeasurementValuePayload {
  metricId: string;
  value: number;
}

export interface InspectionRound {
  id: string;
  status: string;
  scheduledAt: ApiDateTime;
  machine: MachineReference;
  productionRun: {
    id: string;
    status: string;
    productVariant: { product: { name: string } };
  };
  specification: { metrics: MeasurementMetric[] };
  measurements: unknown[];
}

export interface QualityIssue {
  id: string;
  status: string;
  recheckDueAt: ApiDateTime;
  details: unknown;
  machine: MachineReference;
  mechanic: NamedReference;
  productionRun: { id: string; status: string };
  inspectionRound: { specification: { metrics: MeasurementMetric[] } };
}

export interface InspectionSlotPayload {
  slotNumber: number;
  minuteOffset: number;
}

export interface ConfigureInspectionSlotsPayload {
  workShiftId: string;
  /** Exactly three slots numbered 1, 2 and 3. */
  slots: InspectionSlotPayload[];
}

export interface InspectionScheduleSlot {
  id: string;
  workShiftId: string;
  slotNumber: number;
  minuteOffset: number;
}
