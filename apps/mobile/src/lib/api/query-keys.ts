/**
 * Central query keys. Every key starts with its domain so a mutation can
 * invalidate the whole domain (`queryKeys.production.all`) and every dependent
 * screen refetches, instead of each screen tracking its own keys.
 */
export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    executiveSummary: () => ["dashboard", "executive-summary"] as const,
  },
  production: {
    all: ["production"] as const,
    operationsSummary: () => ["production", "operations-summary"] as const,
    stageInventory: () => ["production", "stage-inventory"] as const,
    recentMovements: () => ["production", "recent-movements"] as const,
    workerActivities: () => ["production", "worker-activities"] as const,
    runs: () => ["production", "runs"] as const,
    lookupEmployees: () => ["production", "lookups", "employees"] as const,
    lookupVariants: () => ["production", "lookups", "product-variants"] as const,
    lookupWorkShifts: () => ["production", "lookups", "work-shifts"] as const,
    shiftReconciliations: () => ["production", "shift-reconciliations"] as const,
    shiftReadiness: (workShiftId: string, workDate: string) =>
      ["production", "shift-readiness", workShiftId, workDate] as const,
    shiftContext: () => ["production", "shift-context"] as const,
    warehouseHandoffStage: () => ["production", "warehouse-handoff-stage"] as const,
  },
  recovery: {
    all: ["recovery"] as const,
    correctionRequests: () => ["recovery", "correction-requests"] as const,
  },
  warehouse: {
    all: ["warehouse"] as const,
    stockSummary: () => ["warehouse", "stock-summary"] as const,
    stock: () => ["warehouse", "stock"] as const,
    materialStock: () => ["warehouse", "material-stock"] as const,
    movements: () => ["warehouse", "movements"] as const,
    zones: () => ["warehouse", "zones"] as const,
  },
  machines: {
    all: ["machines"] as const,
    list: () => ["machines", "list"] as const,
    lookups: () => ["machines", "lookups"] as const,
    tasks: () => ["machines", "tasks"] as const,
    inspectionRounds: () => ["machines", "inspection-rounds"] as const,
    qualityIssues: () => ["machines", "quality-issues"] as const,
  },
  catalog: {
    all: ["catalog"] as const,
    materials: () => ["catalog", "materials"] as const,
    products: () => ["catalog", "products"] as const,
  },
  sales: {
    all: ["sales"] as const,
    summary: () => ["sales", "summary"] as const,
  },
  finance: {
    all: ["finance"] as const,
    summary: () => ["finance", "summary"] as const,
  },
} as const;

type DomainKey = readonly [string, ...unknown[]];

/**
 * Which domains a write touches. A finished-product receipt, for example,
 * empties a production stage and fills warehouse stock, so both refetch.
 */
export const invalidationGroups = {
  production: [queryKeys.production.all, queryKeys.dashboard.all],
  productionAndMachines: [queryKeys.production.all, queryKeys.machines.all, queryKeys.dashboard.all],
  productionAndWarehouse: [queryKeys.production.all, queryKeys.warehouse.all, queryKeys.dashboard.all],
  productionAndRecovery: [queryKeys.production.all, queryKeys.recovery.all],
  warehouse: [queryKeys.warehouse.all, queryKeys.dashboard.all],
  machines: [queryKeys.machines.all],
} as const satisfies Record<string, readonly DomainKey[]>;
