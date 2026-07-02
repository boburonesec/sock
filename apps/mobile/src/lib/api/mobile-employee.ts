import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

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

const mobileEmployeeQueryKeys = {
  all: ["mobile-employee"] as const,
  me: () => [...mobileEmployeeQueryKeys.all, "me"] as const,
  activities: () => [...mobileEmployeeQueryKeys.all, "activities"] as const,
  payroll: () => [...mobileEmployeeQueryKeys.all, "payroll"] as const,
  advances: () => [...mobileEmployeeQueryKeys.all, "advances"] as const,
};

export const mobileEmployeeApi = {
  me: () => apiClient<{ data: MobileEmployeeMe }>("/mobile/employee/me"),
  activities: () =>
    apiClient<{ data: MobileEmployeeActivity[] }>("/mobile/employee/activities"),
  payroll: () =>
    apiClient<{ data: MobileEmployeePayrollItem[] }>("/mobile/employee/payroll"),
  advances: () =>
    apiClient<{ data: MobileEmployeeAdvance[] }>("/mobile/employee/advances"),
};

export function useEmployeeMeQuery() {
  return useQuery({
    queryKey: mobileEmployeeQueryKeys.me(),
    queryFn: async () => (await mobileEmployeeApi.me()).data,
  });
}

export function useEmployeeActivitiesQuery() {
  return useQuery({
    queryKey: mobileEmployeeQueryKeys.activities(),
    queryFn: async () => (await mobileEmployeeApi.activities()).data,
  });
}

export function useEmployeePayrollQuery() {
  return useQuery({
    queryKey: mobileEmployeeQueryKeys.payroll(),
    queryFn: async () => (await mobileEmployeeApi.payroll()).data,
  });
}

export function useEmployeeAdvancesQuery() {
  return useQuery({
    queryKey: mobileEmployeeQueryKeys.advances(),
    queryFn: async () => (await mobileEmployeeApi.advances()).data,
  });
}
