import { apiClient } from "./client";
import type { ApiCollection } from "./types";

export interface Machine {
  id: string; code: string; name: string; status: "ACTIVE" | "MAINTENANCE" | "INACTIVE"; note: string | null;
  assignments: Array<{ id: string; mechanic: { id: string; name: string }; workShift: { id: string; name: string } }>;
}
export interface MaintenanceTask { id: string; type: string; priority: string; status: string; description: string; resolution: string | null; dueAt: string | null; machine: Machine; assignee: { id: string; name: string } }
export interface InspectionRound { id: string; status: string; scheduledAt: string; machine: Machine; productionRun: { productVariant: { product: { name: string } } }; specification: { metrics: Array<{ id: string; name: string; code: string; unit: string; target: string; min: string; max: string }> }; measurements: unknown[] }
export interface QualityIssue { id: string; status: string; recheckDueAt: string; details: unknown; machine: Machine; mechanic: { id: string; name: string }; productionRun: { id: string; status: string }; inspectionRound: { specification: { metrics: Array<{ id: string; name: string; unit: string; target: string; min: string; max: string }> } } }

export const machinesApi = {
  lookups: () => apiClient<{ data: { employees: Array<{ id: string; name: string; workProfile: "MECHANIC" | "MACHINE_OPERATOR"; workShiftId: string | null }>; shifts: Array<{ id: string; name: string; code: string }>; products: Array<{ id: string; name: string }> } }>("/machines/lookups"),
  list: () => apiClient<ApiCollection<Machine>>("/machines"),
  create: (payload: { code: string; name: string; note?: string }) => apiClient<{ data: Machine }>("/machines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  assignments: () => apiClient<ApiCollection<unknown>>("/machines/assignments/active"),
  assign: (payload: { machineId: string; mechanicId: string; workShiftId: string; validFrom: string; validTo?: string }) => apiClient<{ data: unknown }>("/machines/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  rates: () => apiClient<ApiCollection<unknown>>("/machines/piece-rates"),
  createRate: (payload: { productId: string; workRole: "MECHANIC" | "MACHINE_OPERATOR"; amount: number; effectiveFrom: string; effectiveTo?: string }) => apiClient<{ data: unknown }>("/machines/piece-rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  tasks: () => apiClient<ApiCollection<MaintenanceTask>>("/machines/tasks"),
  createTask: (payload: { machineId: string; assigneeMechanicId: string; type: string; priority: string; dueAt?: string; description: string }) => apiClient<{ data: MaintenanceTask }>("/machines/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  updateTask: (id: string, payload: { status: string; resolution?: string }) => apiClient<{ data: MaintenanceTask }>(`/machines/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  rounds: () => apiClient<ApiCollection<InspectionRound>>("/machines/inspection-rounds/mine"),
  submitMeasurements: (id: string, measurements: Array<{ metricId: string; value: number }>) => apiClient<{ data: unknown }>(`/machines/inspection-rounds/${id}/measurements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ measurements }) }),
  issues: () => apiClient<ApiCollection<QualityIssue>>("/machines/quality-issues"),
  resolveIssue: (id: string) => apiClient<{ data: QualityIssue }>(`/machines/quality-issues/${id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
  recheckIssue: (id: string, measurements: Array<{ metricId: string; value: number }>) => apiClient<{ data: unknown }>(`/machines/quality-issues/${id}/recheck`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ measurements }) }),
  holdIssueRun: (id: string) => apiClient<{ data: unknown }>(`/machines/quality-issues/${id}/hold`, { method: "POST" }),
  createSpecification: (productId: string, metrics: Array<{ code: string; name: string; unit: string; target: number; min: number; max: number; displayOrder: number }>) => apiClient<{ data: { id: string } }>(`/machines/products/${productId}/specifications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metrics }) }),
  activateSpecification: (id: string) => apiClient<{ data: unknown }>(`/machines/specifications/${id}/activate`, { method: "POST" }),
  configureInspectionSlot: (payload: { workShiftId: string; slotNumber: number; minuteOffset: number }) => apiClient<{ data: unknown }>("/machines/inspection-slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
};
