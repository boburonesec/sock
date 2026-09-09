import { apiClient } from "./client";
import { ApiCollection, ApiDateTime } from "./types";

export interface EmployeeStage {
  id: string;
  name: string;
  sortOrder: number;
}

export type EmployeeJobRole =
  | "STAGE_WORKER"
  | "MECHANIC"
  | "MACHINE_OPERATOR";

export const employeeJobRoleLabels: Record<EmployeeJobRole, string> = {
  STAGE_WORKER: "Bosqich ishchisi",
  MECHANIC: "Mexanik",
  MACHINE_OPERATOR: "Stanok operatori",
};

export type EmployeeWorkProfile =
  | "STAGE_WORKER"
  | "MACHINE_OPERATOR"
  | "MECHANIC"
  | "MECHANIC_MASTER"
  | "STAFF";
export type EmployeeCompensationType = "PIECE_RATE" | "SALARIED";

export const employeeWorkProfileLabels: Record<EmployeeWorkProfile, string> = {
  STAGE_WORKER: "Bosqich ishchisi",
  MACHINE_OPERATOR: "Stanok operatori",
  MECHANIC: "Mexanik",
  MECHANIC_MASTER: "Mexanik-master",
  STAFF: "Boshqaruv / ofis xodimi",
};

export interface Employee {
  id: string;
  name: string;
  status: string;
  jobRole: EmployeeJobRole;
  workProfile: EmployeeWorkProfile;
  compensationType: EmployeeCompensationType;
  account: { id: string; email: string; roleNames: string[] } | null;
  salaryAgreement: { id: string; monthlyAmount: string; effectiveFrom: ApiDateTime; effectiveTo: ApiDateTime | null } | null;
  stages: EmployeeStage[];
  workShift: {
    id: string;
    code: "DAY" | "NIGHT";
    name: string;
    startMinute: number;
    endMinute: number;
    premiumPerPiece: string;
  } | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
}

export interface EmployeePayload {
  name: string;
  workProfile: EmployeeWorkProfile;
  compensationType: EmployeeCompensationType;
  workShiftId?: string;
  stageIds?: string[];
  account?: { email: string; password: string; roleName: string };
  monthlySalaryAmount?: number;
  salaryEffectiveFrom?: string;
}

export const employeesApi = {
  getEmployees: () => apiClient<ApiCollection<Employee>>("/employees"),
  /**
   * Same list, but a 403 (e.g. a `finance.write` role like Accountant that
   * lacks `employees.view`) only disables the caller's picker instead of
   * tripping the app-wide forbidden-action banner. Kept separate from
   * `getEmployees` above — that one is passed by reference as a bare
   * `queryFn` elsewhere, so changing its own signature (even by adding an
   * optional param) shifts how TanStack Query infers its result type there.
   */
  getEmployeesSilentlyForbidden: () =>
    apiClient<ApiCollection<Employee>>("/employees", { silentForbidden: true }),
  createEmployee: (payload: EmployeePayload) =>
    apiClient<{ data: Employee }>("/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  updateEmployee: (employeeId: string, payload: EmployeePayload) =>
    apiClient<{ data: Employee }>(`/employees/${employeeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  inactivateEmployee: (employeeId: string) =>
    apiClient<{ data: Employee }>(`/employees/${employeeId}/inactivate`, {
      method: "POST",
    }),
};
