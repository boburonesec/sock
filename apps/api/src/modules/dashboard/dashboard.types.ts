export type HealthStatus = 'GOOD' | 'WARNING' | 'CRITICAL';
export type AttentionPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type RecentActivityType = 'ORDER' | 'EXPENSE';
export type FactoryTvStageStatus = 'NORMAL' | 'ATTENTION' | 'HIGH';
export type FactoryTvAlertTone = 'INFO' | 'WARNING' | 'CRITICAL';

export interface ExecutiveSummaryResponse {
  data: {
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
      production: HealthStatus;
      warehouse: HealthStatus;
      sales: HealthStatus;
      finance: HealthStatus;
    };
    topProducts: ExecutiveTopProductResponse[];
    topClients: ExecutiveTopClientResponse[];
    attentionItems: ExecutiveAttentionItemResponse[];
    recentActivity: ExecutiveRecentActivityResponse[];
  };
}

export interface ExecutiveTopProductResponse {
  productVariantId: string;
  productName: string;
  colorName: string;
  materialName: string;
  seasonName: string;
  quantity: string;
  value: string;
}

export interface ExecutiveTopClientResponse {
  clientId: string;
  clientName: string;
  totalOrders: string;
  totalPaid: string;
  debt: string;
  debtStatus: HealthStatus;
}

export interface ExecutiveAttentionItemResponse {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: AttentionPriority;
}

export interface ExecutiveRecentActivityResponse {
  id: string;
  type: RecentActivityType;
  title: string;
  description: string;
  occurredAt: Date;
}

export interface FactoryTvSummaryResponse {
  data: {
    factoryName: string;
    currentDateLabel: string;
    shiftLabel: string;
    kpis: {
      todayProduction: string;
      totalInProgress: string;
      finishedProductQuantity: string;
      activeWorkers: string;
    };
    stageTotals: FactoryTvStageTotalResponse[];
    topWorkers: FactoryTvWorkerResponse[];
    alerts: FactoryTvAlertResponse[];
  };
}

export interface FactoryTvStageTotalResponse {
  stageId: string;
  stageName: string;
  sortOrder: number;
  quantity: string;
  status: FactoryTvStageStatus;
}

export interface FactoryTvWorkerResponse {
  rank: string;
  employeeId: string;
  employeeName: string;
  stageName: string;
  quantity: string;
}

export interface FactoryTvAlertResponse {
  id: string;
  title: string;
  description: string;
  tone: FactoryTvAlertTone;
}
