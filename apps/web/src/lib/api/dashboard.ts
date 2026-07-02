import { apiClient } from "./client";
import { ApiDateTime } from "./types";

export type ExecutiveHealthStatus = "GOOD" | "WARNING" | "CRITICAL";
export type ExecutiveAttentionPriority = "LOW" | "MEDIUM" | "HIGH";
export type FactoryTvStageStatus = "NORMAL" | "ATTENTION" | "HIGH";
export type FactoryTvAlertTone = "INFO" | "WARNING" | "CRITICAL";

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
    production: ExecutiveHealthStatus;
    warehouse: ExecutiveHealthStatus;
    sales: ExecutiveHealthStatus;
    finance: ExecutiveHealthStatus;
  };
  topProducts: Array<{
    productVariantId: string;
    productName: string;
    colorName: string;
    materialName: string;
    seasonName: string;
    quantity: string;
    value: string;
  }>;
  topClients: Array<{
    clientId: string;
    clientName: string;
    totalOrders: string;
    totalPaid: string;
    debt: string;
    debtStatus: ExecutiveHealthStatus;
  }>;
  attentionItems: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    priority: ExecutiveAttentionPriority;
  }>;
  recentActivity: Array<{
    id: string;
    type: "ORDER" | "EXPENSE";
    title: string;
    description: string;
    occurredAt: ApiDateTime;
  }>;
}

export interface FactoryTvSummary {
  factoryName: string;
  currentDateLabel: string;
  shiftLabel: string;
  kpis: {
    todayProduction: string;
    totalInProgress: string;
    finishedProductQuantity: string;
    activeWorkers: string;
  };
  stageTotals: Array<{
    stageId: string;
    stageName: string;
    sortOrder: number;
    quantity: string;
    status: FactoryTvStageStatus;
  }>;
  topWorkers: Array<{
    rank: string;
    employeeId: string;
    employeeName: string;
    stageName: string;
    quantity: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    tone: FactoryTvAlertTone;
  }>;
}

export const dashboardApi = {
  getExecutiveSummary: () =>
    apiClient<{ data: ExecutiveSummary }>("/dashboard/executive-summary"),
  getFactoryTvSummary: () => {
    const accessToken = process.env.NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error("NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN is not configured.");
    }

    return apiClient<{ data: FactoryTvSummary }>("/dashboard/factory-tv-summary", {
      skipAuth: true,
      headers: {
        "X-Factory-TV-Token": accessToken,
      },
    });
  },
};
