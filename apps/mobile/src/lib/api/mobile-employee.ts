import { useContextQuery } from "@/shared/hooks/use-context-query";

import { queryKeys } from "@/lib/api/query-keys";
import { apiClient, type ApiClientOptions } from "@/lib/api/client";

export interface MobileEmployeeMe {
  employee: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  factory: {
    id: string;
    name: string;
  };
  tenant: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
}

export interface MobileEmployeeActivity {
  id: string;
  quantity: number;
  salaryRateAmount: string;
  activityDate: string;
  stage: {
    id: string;
    name: string;
    sortOrder: number;
  };
  productVariant: {
    id: string;
    label: string;
    product: { id: string; name: string; code: string | null };
    color: { id: string; name: string; code: string | null };
    material: { id: string; name: string; code: string | null };
    season: { id: string; name: string; code: string | null };
  };
}

export interface MobileEmployeePayrollItem {
  id: string;
  month: string;
  payrollPeriodStatus: string;
  status: string;
  workedAmount: string;
  bonusAmount: string;
  penaltyAmount: string;
  advanceAmount: string;
  finalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface MobileEmployeeAdvance {
  id: string;
  amount: string;
  reason: string;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  payrollPeriod: {
    id: string;
    month: string;
    status: string;
  } | null;
}

export const mobileEmployeeApi = {
  me: (options?: ApiClientOptions) => apiClient<{ data: MobileEmployeeMe }>("/mobile/employee/me", options),
  activities: (options?: ApiClientOptions) =>
    apiClient<{ data: MobileEmployeeActivity[] }>("/mobile/employee/activities", options),
  payroll: (options?: ApiClientOptions) =>
    apiClient<{ data: MobileEmployeePayrollItem[] }>("/mobile/employee/payroll", options),
  advances: (options?: ApiClientOptions) =>
    apiClient<{ data: MobileEmployeeAdvance[] }>("/mobile/employee/advances", options),
};

export function useEmployeeMeQuery(options: { enabled?: boolean } = {}) {
  return useContextQuery({
    queryKey: queryKeys.employee.me(),
    queryFn: async (options) => (await mobileEmployeeApi.me(options)).data,
    enabled: options.enabled ?? true,
  });
}

export function useEmployeeActivitiesQuery() {
  return useContextQuery({
    queryKey: queryKeys.employee.activities(),
    queryFn: async (options) => (await mobileEmployeeApi.activities(options)).data,
  });
}

export function useEmployeePayrollQuery() {
  return useContextQuery({
    queryKey: queryKeys.employee.payroll(),
    queryFn: async (options) => (await mobileEmployeeApi.payroll(options)).data,
  });
}

export function useEmployeeAdvancesQuery() {
  return useContextQuery({
    queryKey: queryKeys.employee.advances(),
    queryFn: async (options) => (await mobileEmployeeApi.advances(options)).data,
  });
}
