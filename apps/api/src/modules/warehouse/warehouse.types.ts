export interface CollectionResponse<T> {
  data: T[];
}

export interface NamedReferenceResponse {
  id: string;
  name: string;
}

export interface ProductVariantReferenceResponse {
  id: string;
  product: NamedReferenceResponse;
  color: NamedReferenceResponse;
  material: NamedReferenceResponse;
  season: NamedReferenceResponse;
}

export interface ProductStockResponse {
  id: string;
  quantity: number;
  warehouse: NamedReferenceResponse;
  zone: NamedReferenceResponse;
  productVariant: ProductVariantReferenceResponse;
  updatedAt: Date;
}

export interface MaterialStockResponse {
  id: string;
  quantity: string;
  unit: string;
  warehouse: NamedReferenceResponse;
  zone: NamedReferenceResponse;
  material: NamedReferenceResponse;
  updatedAt: Date;
}

export interface StockMovementResponse {
  id: string;
  itemType: string;
  movementType: string;
  quantity: string;
  unit: string;
  beforeQuantity: string | null;
  afterQuantity: string | null;
  reason: string | null;
  note: string | null;
  occurredAt: Date;
  warehouse: NamedReferenceResponse;
  zone: NamedReferenceResponse;
  productVariant: ProductVariantReferenceResponse | null;
  material: NamedReferenceResponse | null;
  recordedBy: NamedReferenceResponse;
}

/**
 * Counts are stock-record counts, not calculated quantities. Quantity totals
 * remain a backend reporting concern and are deliberately not computed here.
 */
export interface WarehouseZoneResponse {
  id: string;
  name: string;
  warehouse: NamedReferenceResponse;
  productStockRecordCount: number;
  materialStockRecordCount: number;
}

export type WarehouseZoneSummaryStatus = 'NORMAL' | 'ATTENTION';

export interface LowStockThresholdResponse {
  id: string;
  quantity: string;
  warehouse: NamedReferenceResponse;
  material: NamedReferenceResponse;
  updatedAt: Date;
}

export interface WarehouseStockSummaryResponse {
  data: {
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
  };
}

export interface FinishedProductReceiptResponse {
  data: {
    productionStageInventory: {
      id: string;
      quantity: number;
      updatedAt: Date;
      stage: NamedReferenceResponse & { sortOrder: number };
      productVariant: ProductVariantReferenceResponse;
    };
    stock: ProductStockResponse;
    stockMovement: StockMovementResponse;
  };
}

export interface MaterialReceiptResponse {
  data: {
    materialStock: MaterialStockResponse;
    stockMovement: StockMovementResponse;
  };
}

export interface StockCorrectionResponse {
  data: {
    stock: ProductStockResponse | MaterialStockResponse;
    stockMovement: StockMovementResponse;
  };
}
