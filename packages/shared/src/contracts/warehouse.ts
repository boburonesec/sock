import type { ApiDateTime, NamedReference, ProductVariantReference } from "./common.ts";

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

export const STOCK_ITEM_TYPES = ["PRODUCT", "MATERIAL"] as const;
export type StockItemType = (typeof STOCK_ITEM_TYPES)[number];

export const STOCK_MOVEMENT_TYPES = [
  "RECEIPT",
  "ISSUE",
  "PRODUCTION_RECEIPT",
  "TRANSFER",
  "RETURN",
  "CORRECTION",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

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
  /** Positive decimal string. */
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
  itemType: StockItemType;
  productVariantId?: string | null;
  materialId?: string | null;
  warehouseZoneId: string;
  /** Non-negative decimal string. */
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
