import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

export const managerPermissions = {
  executive: "dashboard.view",
  production: "production.view",
  warehouse: "warehouse.view",
  sales: "sales.view",
  finance: "finance.view",
} as const;

export type ManagerDashboardKey = keyof typeof managerPermissions;

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

export interface ProductionSummary {
  kpis: {
    todayProduction: string;
    totalInProgress: string;
    busiestStageName: string | null;
    activeWorkers: string;
  };
  stageTotals: {
    stageId: string;
    stageName: string;
    sortOrder: number;
    quantity: string;
    status: string;
    isHighQuantity: boolean;
  }[];
  bottlenecks: {
    stageId: string;
    stageName: string;
    quantity: string;
    priority: string;
  }[];
  topWorkers: {
    employeeId: string;
    employeeName: string;
    stageName: string;
    quantity: string;
    amount: string;
  }[];
  trend: {
    date: string;
    quantity: string;
  }[];
  attention: string[];
}

export interface WarehouseSummary {
  kpis: {
    finishedProductQuantity: string;
    materialRecordCount: string;
    lowStockMaterialCount: string;
    warehouseZoneCount: string;
  };
  zoneSummaries: {
    zoneId: string;
    zoneName: string;
    warehouseName: string;
    productRecordCount: string;
    materialRecordCount: string;
    productQuantity: string;
    status: string;
  }[];
  lowStockMaterials: {
    warehouseId: string;
    warehouseName: string;
    materialId: string;
    materialName: string;
    quantity: string;
    unit: string;
    threshold: string;
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

const managerDashboardQueryKeys = {
  all: ["manager-dashboard"] as const,
  executive: () => [...managerDashboardQueryKeys.all, "executive"] as const,
  production: () => [...managerDashboardQueryKeys.all, "production"] as const,
  warehouse: () => [...managerDashboardQueryKeys.all, "warehouse"] as const,
  sales: () => [...managerDashboardQueryKeys.all, "sales"] as const,
  finance: () => [...managerDashboardQueryKeys.all, "finance"] as const,
};

export const managerDashboardApi = {
  executive: () =>
    apiClient<{ data: ExecutiveSummary }>("/dashboard/executive-summary"),
  production: () =>
    apiClient<{ data: ProductionSummary }>("/production/operations-summary"),
  warehouse: () => apiClient<{ data: WarehouseSummary }>("/warehouse/stock-summary"),
  sales: () => apiClient<{ data: SalesSummary }>("/sales/summary"),
  finance: () => apiClient<{ data: FinanceSummary }>("/finance/summary"),
};

export function useExecutiveSummaryQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: managerDashboardQueryKeys.executive(),
    queryFn: async () => (await managerDashboardApi.executive()).data,
  });
}

export function useProductionSummaryQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: managerDashboardQueryKeys.production(),
    queryFn: async () => (await managerDashboardApi.production()).data,
  });
}

export function useWarehouseSummaryQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: managerDashboardQueryKeys.warehouse(),
    queryFn: async () => (await managerDashboardApi.warehouse()).data,
  });
}

export function useSalesSummaryQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: managerDashboardQueryKeys.sales(),
    queryFn: async () => (await managerDashboardApi.sales()).data,
  });
}

export function useFinanceSummaryQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: managerDashboardQueryKeys.finance(),
    queryFn: async () => (await managerDashboardApi.finance()).data,
  });
}
