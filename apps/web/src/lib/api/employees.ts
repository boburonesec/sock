import { apiClient } from "./client";
import { ApiCollection, ApiDateTime } from "./types";

export interface Employee {
  id: string;
  name: string;
  status: string;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
}

export interface EmployeePayload {
  name: string;
}

export const employeesApi = {
  getEmployees: () => apiClient<ApiCollection<Employee>>("/employees"),
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
