import type { PermissionKey } from "./permissions.ts";

/**
 * Wave 1 (Production / Warehouse / Machines / Mechanic) endpoint contract.
 *
 * `all` / `any` are the permissions a caller must hold. `enforcedBy` says
 * where the API checks them: a controller decorator ("guard") or the service
 * body ("service"). `uiDeniedRoles` mirrors a Web UI rule that hides the
 * action from a role even when the permission is present.
 *
 * scripts/contract-test.mjs compares every entry with the API controllers, so
 * a permission change on the backend fails the gate until both clients follow.
 */
export interface EndpointContract {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  all?: readonly PermissionKey[];
  any?: readonly PermissionKey[];
  enforcedBy?: "guard" | "service";
  uiDeniedRoles?: readonly string[];
}

export const WAVE1_ENDPOINTS = {
  // Production board
  productionOperationsSummary: { method: "GET", path: "/production/operations-summary", all: ["production.view"] },
  productionStageInventory: { method: "GET", path: "/production/stage-inventory", all: ["production.view"] },
  productionRecentMovements: { method: "GET", path: "/production/recent-movements", all: ["production.view"] },
  productionWorkerActivities: { method: "GET", path: "/production/worker-activities", all: ["production.view"] },
  productionLookupEmployees: { method: "GET", path: "/production/lookups/employees", all: ["production.view"] },
  productionLookupVariants: { method: "GET", path: "/production/lookups/product-variants", all: ["production.view"] },
  productionLookupWorkShifts: { method: "GET", path: "/production/lookups/work-shifts", all: ["production.view"] },
  productionCreateStageMovement: { method: "POST", path: "/production/stage-movements", all: ["production.write"] },
  productionCreateWorkerActivity: { method: "POST", path: "/production/worker-activities", all: ["production.write"] },
  productionCreateDefect: { method: "POST", path: "/production/defects", all: ["production.write"] },

  // Production runs (machine output)
  productionRuns: { method: "GET", path: "/production/runs", all: ["production.view"] },
  productionCreateRun: { method: "POST", path: "/production/runs", all: ["production.write"] },
  productionChangeRunStatus: { method: "PATCH", path: "/production/runs/:id/status", all: ["production.write"] },
  productionCreateRunIntake: { method: "POST", path: "/production/runs/:id/intakes", all: ["production.write"] },

  // Shift reconciliation
  productionShiftReconciliations: { method: "GET", path: "/production/shift-reconciliations", all: ["production.view"] },
  productionShiftReadiness: { method: "GET", path: "/production/shift-reconciliations/readiness", all: ["production.view"] },
  productionShiftContext: { method: "GET", path: "/production/shift-context", all: ["production.view"] },
  productionSubmitShift: { method: "POST", path: "/production/shift-reconciliations/submit", all: ["production.write"] },
  productionReturnShift: { method: "POST", path: "/production/shift-reconciliations/return", all: ["production.write"] },
  productionAcceptShift: { method: "POST", path: "/production/shift-reconciliations/accept", all: ["production.approve"] },
  productionWarehouseHandoffStage: { method: "GET", path: "/production/warehouse-handoff-stage", all: ["production.view"] },
  productionConfigureWarehouseHandoffStage: { method: "PATCH", path: "/production/warehouse-handoff-stage", all: ["production.approve"] },

  // Correction requests (original records are never edited)
  recoveryCorrectionRequests: { method: "GET", path: "/recovery/correction-requests", any: ["production.view", "finance.view"], enforcedBy: "service" },
  recoveryCreateProductionCorrection: { method: "POST", path: "/recovery/correction-requests", all: ["production.write"], enforcedBy: "service" },
  recoveryResolveProductionCorrection: { method: "POST", path: "/recovery/correction-requests/:id/resolve", all: ["production.approve"], enforcedBy: "service" },

  // Warehouse
  warehouseStockSummary: { method: "GET", path: "/warehouse/stock-summary", all: ["warehouse.view"] },
  warehouseStock: { method: "GET", path: "/warehouse/stock", all: ["warehouse.view"] },
  warehouseMaterialStock: { method: "GET", path: "/warehouse/material-stock", all: ["warehouse.view"] },
  warehouseMovements: { method: "GET", path: "/warehouse/movements", all: ["warehouse.view"] },
  warehouseZones: { method: "GET", path: "/warehouse/zones", all: ["warehouse.view"] },
  warehouseCreateFinishedProductReceipt: { method: "POST", path: "/warehouse/finished-product-receipts", all: ["warehouse.write"] },
  warehouseCreateMaterialReceipt: { method: "POST", path: "/warehouse/material-receipts", all: ["warehouse.write"] },
  warehouseCreateStockCorrection: { method: "POST", path: "/warehouse/stock-corrections", all: ["warehouse.write"] },

  // Machines
  machinesLookups: { method: "GET", path: "/machines/lookups", all: ["machines.view"] },
  machinesList: { method: "GET", path: "/machines", all: ["machines.view"] },
  machinesCreate: { method: "POST", path: "/machines", all: ["machines.write"] },
  machinesAssign: { method: "POST", path: "/machines/assignments", all: ["machines.write"] },
  machinesCreatePieceRate: { method: "POST", path: "/machines/piece-rates", all: ["machines.write"] },
  machinesTasks: { method: "GET", path: "/machines/tasks", all: ["maintenance.view"] },
  machinesCreateTask: { method: "POST", path: "/machines/tasks", all: ["maintenance.write"], uiDeniedRoles: ["Mechanic"] },
  machinesUpdateTask: { method: "PATCH", path: "/machines/tasks/:id", all: ["maintenance.write"] },
  machinesCreateSpecification: { method: "POST", path: "/machines/products/:productId/specifications", all: ["quality.write"], uiDeniedRoles: ["Mechanic"] },
  machinesActivateSpecification: { method: "POST", path: "/machines/specifications/:id/activate", all: ["quality.write"], uiDeniedRoles: ["Mechanic"] },
  machinesConfigureInspectionSlots: { method: "POST", path: "/machines/inspection-slots", all: ["quality.write"], uiDeniedRoles: ["Mechanic"] },

  // Mechanic workspace
  machinesMyInspectionRounds: { method: "GET", path: "/machines/inspection-rounds/mine", all: ["quality.view"] },
  machinesSubmitMeasurements: { method: "POST", path: "/machines/inspection-rounds/:id/measurements", all: ["quality.write"] },
  machinesQualityIssues: { method: "GET", path: "/machines/quality-issues", all: ["quality.view"] },
  machinesRecheckIssue: { method: "POST", path: "/machines/quality-issues/:id/recheck", all: ["quality.write"] },
  machinesHoldIssueRun: { method: "POST", path: "/machines/quality-issues/:id/hold", all: ["production.write"] },

  // Read-only catalog lookups used by warehouse forms
  productMaterials: { method: "GET", path: "/product/materials", any: ["settings.view", "warehouse.view", "sales.view", "production.view"] },
  productProducts: { method: "GET", path: "/product/products", any: ["settings.view", "warehouse.view", "sales.view", "production.view"] },
} as const satisfies Record<string, EndpointContract>;

export type Wave1EndpointKey = keyof typeof WAVE1_ENDPOINTS;

/** True when the caller may use the endpoint (permission + Web UI role rule). */
export function canUseEndpoint(
  key: Wave1EndpointKey,
  permissions: readonly string[],
  roles: readonly string[] = [],
): boolean {
  const contract: EndpointContract = WAVE1_ENDPOINTS[key];

  if (contract.uiDeniedRoles?.some((role) => roles.includes(role))) {
    return false;
  }

  if (contract.all && !contract.all.every((permission) => permissions.includes(permission))) {
    return false;
  }

  if (contract.any && !contract.any.some((permission) => permissions.includes(permission))) {
    return false;
  }

  return true;
}
