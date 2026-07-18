import { apiClient } from "./client";
import type { ApiDateTime } from "./types";

export interface OrganizationFactory {
  id: string;
  name: string;
  userCount: number;
  createdAt: ApiDateTime;
  updatedAt?: ApiDateTime;
}

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
  factories: Array<{
    id: string;
    name: string;
  }>;
  employee: {
    id: string;
    name: string;
    workProfile: string;
    factoryId: string;
  } | null;
  employeeLinkStatus: "LINKED" | "UNLINKED";
  createdAt: ApiDateTime;
  updatedAt?: ApiDateTime;
}

export type OrganizationUserRole =
  | "Manager"
  | "Accountant"
  | "Seller"
  | "Warehouse Operator"
  | "Shift Receiver";

export const organizationApi = {
  getFactories: () =>
    apiClient<{ data: OrganizationFactory[] }>("/organization/factories"),
  createFactory: (payload: { name: string }) =>
    apiClient<{ data: OrganizationFactory }>("/organization/factories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getUsers: () => apiClient<{ data: OrganizationUser[] }>("/organization/users"),
  createManager: (payload: {
    name: string;
    email: string;
    password: string;
    factoryId?: string;
  }) =>
    apiClient<{ data: OrganizationUser }>("/organization/managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createUser: (payload: {
    name: string;
    email: string;
    password: string;
    roleName: OrganizationUserRole;
    factoryId?: string;
  }) =>
    apiClient<{ data: OrganizationUser }>("/organization/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateUserPassword: (userId: string, payload: { password: string }) =>
    apiClient<{ data: { status: "ok" } }>(
      `/organization/users/${userId}/password`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  updateUserFactoryAccess: (userId: string, payload: { factoryIds: string[] }) =>
    apiClient<{ data: OrganizationUser }>(
      `/organization/users/${userId}/factory-access`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  linkUserEmployee: (userId: string, employeeId: string) =>
    apiClient<{ data: { id: string; employee: NonNullable<OrganizationUser["employee"]> } }>(
      `/organization/users/${userId}/employee`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      },
    ),
};
