import type {
  ApiCollection,
  ApiItem,
  FinishedProductReceipt,
  FinishedProductReceiptPayload,
  MasterDataItem,
  MaterialReceipt,
  MaterialReceiptPayload,
  MaterialStock,
  Product,
  ProductStock,
  StockCorrection,
  StockCorrectionPayload,
  StockMovement,
  WarehouseStockSummary,
  WarehouseZone,
} from "@paypoq/shared";
import { useContextQuery } from "@/shared/hooks/use-context-query";

import { apiClient, jsonBody, type ApiClientOptions } from "@/lib/api/client";
import { invalidationGroups, queryKeys } from "@/lib/api/query-keys";
import { useGuardedMutation } from "@/shared/hooks/use-guarded-mutation";

export const warehouseApi = {
  getStockSummary: (options?: ApiClientOptions) => apiClient<ApiItem<WarehouseStockSummary>>("/warehouse/stock-summary", options),
  getStock: (options?: ApiClientOptions) => apiClient<ApiCollection<ProductStock>>("/warehouse/stock", options),
  getMaterialStock: (options?: ApiClientOptions) => apiClient<ApiCollection<MaterialStock>>("/warehouse/material-stock", options),
  getMovements: (options?: ApiClientOptions) => apiClient<ApiCollection<StockMovement>>("/warehouse/movements", options),
  getZones: (options?: ApiClientOptions) => apiClient<ApiCollection<WarehouseZone>>("/warehouse/zones", options),
  createFinishedProductReceipt: (payload: FinishedProductReceiptPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<FinishedProductReceipt>>(
      "/warehouse/finished-product-receipts",
      jsonBody("POST", payload, options),
    ),
  createMaterialReceipt: (payload: MaterialReceiptPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<MaterialReceipt>>("/warehouse/material-receipts", jsonBody("POST", payload, options)),
  createStockCorrection: (payload: StockCorrectionPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<StockCorrection>>("/warehouse/stock-corrections", jsonBody("POST", payload, options)),
};

/** Read-only master data needed by warehouse forms (allowed with warehouse.view). */
export const catalogApi = {
  getMaterials: (options?: ApiClientOptions) => apiClient<ApiCollection<MasterDataItem>>("/product/materials", options),
  getProducts: (options?: ApiClientOptions) => apiClient<ApiCollection<Product>>("/product/products", options),
};

export function useWarehouseSummaryQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.warehouse.stockSummary(),
    queryFn: async (options) => (await warehouseApi.getStockSummary(options)).data,
  });
}

export function useProductStockQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.warehouse.stock(),
    queryFn: async (options) => (await warehouseApi.getStock(options)).data,
  });
}

export function useMaterialStockQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.warehouse.materialStock(),
    queryFn: async (options) => (await warehouseApi.getMaterialStock(options)).data,
  });
}

export function useStockMovementsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.warehouse.movements(),
    queryFn: async (options) => (await warehouseApi.getMovements(options)).data,
  });
}

export function useWarehouseZonesQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.warehouse.zones(),
    queryFn: async (options) => (await warehouseApi.getZones(options)).data,
  });
}

export function useCatalogMaterialsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.catalog.materials(),
    contextScope: "tenant",
    queryFn: async (options) => (await catalogApi.getMaterials(options)).data,
  });
}

export function useCatalogProductsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.catalog.products(),
    contextScope: "tenant",
    queryFn: async (options) => (await catalogApi.getProducts(options)).data,
  });
}

/** Moves finished goods out of a production stage into warehouse stock. */
export function useCreateFinishedProductReceipt() {
  return useGuardedMutation({
    mutationFn: async (payload: FinishedProductReceiptPayload, options: ApiClientOptions) =>
      (await warehouseApi.createFinishedProductReceipt(payload, options)).data,
    invalidate: invalidationGroups.productionAndWarehouse,
  });
}

export function useCreateMaterialReceipt() {
  return useGuardedMutation({
    mutationFn: async (payload: MaterialReceiptPayload, options: ApiClientOptions) =>
      (await warehouseApi.createMaterialReceipt(payload, options)).data,
    invalidate: invalidationGroups.warehouse,
  });
}

export function useCreateStockCorrection() {
  return useGuardedMutation({
    mutationFn: async (payload: StockCorrectionPayload, options: ApiClientOptions) =>
      (await warehouseApi.createStockCorrection(payload, options)).data,
    invalidate: invalidationGroups.warehouse,
  });
}
