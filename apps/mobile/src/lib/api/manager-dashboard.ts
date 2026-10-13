import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

export interface ExecutiveSummary {
  kpis: {
    monthlySales: string;
    monthlyExpenses: string;
    totalClientDebt: string;
    totalSupplierDebt: string;
    activeEmployees: string;
    activeOrders: string;
    totalProducts: string;
    lowStockMaterials: string;
  };
  businessHealth: {
    production: string;
    warehouse: string;
    sales: string;
    finance: string;
  };
  topProducts: {
    productVariantId: string;
    productName: string;
    colorName: string;
    materialName: string;
    seasonName: string;
    quantity: string;
    value: string;
  }[];
  topClients: {
    clientId: string;
    clientName: string;
    totalOrders: string;
    totalPaid: string;
    debt: string;
    debtStatus: string;
  }[];
  attentionItems: {
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
  }[];
  recentActivity: {
    id: string;
    type: string;
    title: string;
    description: string;
    occurredAt: string;
  }[];
}

export interface SalesSummary {
  kpis: {
    clientCount: string;
    activeOrderCount: string;
    monthlySales: string;
    totalClientDebt: string;
  };
  topClients: {
    client: {
      id: string;
      name: string;
      phone: string | null;
      address: string | null;
      notes: string | null;
      status: string;
    };
    totalOrders: string;
    totalPaid: string;
    debt: string;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    client: {
      id: string;
      name: string;
      phone: string | null;
      address: string | null;
      notes: string | null;
      status: string;
    };
    status: string;
    totalAmount: string;
    paymentStatus: string;
    createdAt: string;
  }[];
}

export interface FinanceSummary {
  kpis: {
    monthlyExpenses: string;
    pendingExpenses: string;
    pendingAdvances: string;
    payrollRemaining: string;
  };
  recentExpenses: {
    id: string;
    amount: string;
    reason: string;
    status: string;
    requestedAt: string;
    category: { id: string; name: string };
  }[];
  recentAdvances: {
    id: string;
    amount: string;
    reason: string;
    status: string;
    requestedAt: string;
    employee: { id: string; name: string; status: string };
  }[];
  payrollPeriods: {
    id: string;
    month: string;
    status: string;
    totalFinalAmount: string;
    totalPaidAmount: string;
    totalRemainingAmount: string;
  }[];
}

export const managerDashboardApi = {
  executive: () =>
    apiClient<{ data: ExecutiveSummary }>("/dashboard/executive-summary"),
  sales: () => apiClient<{ data: SalesSummary }>("/sales/summary"),
  finance: () => apiClient<{ data: FinanceSummary }>("/finance/summary"),
};

export function useExecutiveSummaryQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: queryKeys.dashboard.executiveSummary(),
    queryFn: async () => (await managerDashboardApi.executive()).data,
  });
}

export function useSalesSummaryQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: queryKeys.sales.summary(),
    queryFn: async () => (await managerDashboardApi.sales()).data,
  });
}

export function useFinanceSummaryQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: queryKeys.finance.summary(),
    queryFn: async () => (await managerDashboardApi.finance()).data,
  });
}
