import { apiClient } from "./client";
import {
  ApiCollection,
  ApiDateTime,
  NamedReference,
  ProductVariantReference,
} from "./types";

export interface ProductStock {
  id: string;
  quantity: number;
  warehouse: NamedReference;
  zone: NamedReference;
  productVariant: ProductVariantReference;
  updatedAt: ApiDateTime;
}

export interface MaterialStock {
  id: string;
  quantity: string;
  unit: string;
  warehouse: NamedReference;
  zone: NamedReference;
  material: NamedReference;
  updatedAt: ApiDateTime;
}

export interface StockMovement {
  id: string;
  itemType: string;
  movementType: string;
  quantity: string;
  unit: string;
  beforeQuantity: string | null;
  afterQuantity: string | null;
  reason: string | null;
  note: string | null;
  occurredAt: ApiDateTime;
  warehouse: NamedReference;
  zone: NamedReference;
  productVariant: ProductVariantReference | null;
  material: NamedReference | null;
  recordedBy: NamedReference;
}

export interface WarehouseZone {
  id: string;
  name: string;
  warehouse: NamedReference;
  productStockRecordCount: number;
  materialStockRecordCount: number;
}

export type WarehouseZoneSummaryStatus = "NORMAL" | "ATTENTION";

export interface WarehouseStockSummary {
  kpis: {
    finishedProductQuantity: string;
    materialRecordCount: string;
    lowStockMaterialCount: string;
    warehouseZoneCount: string;
  };
  zoneSummaries: Array<{
    zoneId: string;
    zoneName: string;
    warehouseName: string;
    productRecordCount: string;
    materialRecordCount: string;
    productQuantity: string;
    status: WarehouseZoneSummaryStatus;
  }>;
  lowStockMaterials: Array<{
    warehouseId: string;
    warehouseName: string;
    materialId: string;
    materialName: string;
    quantity: string;
    unit: string;
    threshold: string;
  }>;
}

export interface FinishedProductReceiptPayload {
  productVariantId: string;
  quantity: number;
  warehouseZoneId?: string | null;
  note?: string;
}

export interface FinishedProductReceipt {
  productionStageInventory: {
    id: string;
    quantity: number;
    updatedAt: ApiDateTime;
    stage: NamedReference & { sortOrder: number };
    productVariant: ProductVariantReference;
  };
  stock: ProductStock;
  stockMovement: StockMovement;
}

export interface MaterialReceiptPayload {
  materialId: string;
  quantity: string;
  unit: string;
  warehouseZoneId?: string | null;
  note?: string;
}

export interface MaterialReceipt {
  materialStock: MaterialStock;
  stockMovement: StockMovement;
}

export interface StockCorrectionPayload {
  itemType: "PRODUCT" | "MATERIAL";
  productVariantId?: string | null;
  materialId?: string | null;
  warehouseZoneId: string;
  newQuantity: string;
  reason: string;
}

export interface StockCorrection {
  stock: ProductStock | MaterialStock;
  stockMovement: StockMovement;
}

export interface LowStockThreshold {
  id: string;
  quantity: string;
  warehouse: NamedReference;
  material: NamedReference;
  updatedAt: ApiDateTime;
}

export interface UpsertLowStockThresholdPayload {
  warehouseId: string;
  materialId: string;
  quantity: string;
}

export const warehouseApi = {
  getStock: () => apiClient<ApiCollection<ProductStock>>("/warehouse/stock"),
  getMaterialStock: () =>
    apiClient<ApiCollection<MaterialStock>>("/warehouse/material-stock"),
  getMovements: () =>
    apiClient<ApiCollection<StockMovement>>("/warehouse/movements"),
  getZones: () => apiClient<ApiCollection<WarehouseZone>>("/warehouse/zones"),
  getStockSummary: () =>
    apiClient<{ data: WarehouseStockSummary }>("/warehouse/stock-summary"),
  getLowStockThresholds: () =>
    apiClient<ApiCollection<LowStockThreshold>>("/warehouse/low-stock-thresholds"),
  upsertLowStockThreshold: (payload: UpsertLowStockThresholdPayload) =>
    apiClient<{ data: LowStockThreshold }>("/warehouse/low-stock-thresholds", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createFinishedProductReceipt: (payload: FinishedProductReceiptPayload) =>
    apiClient<{ data: FinishedProductReceipt }>(
      "/warehouse/finished-product-receipts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  createMaterialReceipt: (payload: MaterialReceiptPayload) =>
    apiClient<{ data: MaterialReceipt }>("/warehouse/material-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createStockCorrection: (payload: StockCorrectionPayload) =>
    apiClient<{ data: StockCorrection }>("/warehouse/stock-corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
