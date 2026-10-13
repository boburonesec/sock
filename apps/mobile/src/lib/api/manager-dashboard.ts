import { useContextQuery } from "@/shared/hooks/use-context-query";

import { apiClient, type ApiClientOptions } from "@/lib/api/client";
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
  executive: (options?: ApiClientOptions) =>
    apiClient<{ data: ExecutiveSummary }>("/dashboard/executive-summary", options),
  sales: (options?: ApiClientOptions) => apiClient<{ data: SalesSummary }>("/sales/summary", options),
  finance: (options?: ApiClientOptions) => apiClient<{ data: FinanceSummary }>("/finance/summary", options),
};

export function useExecutiveSummaryQuery(enabled: boolean) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.dashboard.executiveSummary(),
    queryFn: async (options) => (await managerDashboardApi.executive(options)).data,
  });
}

export function useSalesSummaryQuery(enabled: boolean) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.sales.summary(),
    queryFn: async (options) => (await managerDashboardApi.sales(options)).data,
  });
}

export function useFinanceSummaryQuery(enabled: boolean) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.finance.summary(),
    queryFn: async (options) => (await managerDashboardApi.finance(options)).data,
  });
}
