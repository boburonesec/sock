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
import { useQuery } from "@tanstack/react-query";

import { apiClient, jsonBody } from "@/lib/api/client";
import { invalidationGroups, queryKeys } from "@/lib/api/query-keys";
import { useGuardedMutation } from "@/shared/hooks/use-guarded-mutation";

export const warehouseApi = {
  getStockSummary: () => apiClient<ApiItem<WarehouseStockSummary>>("/warehouse/stock-summary"),
  getStock: () => apiClient<ApiCollection<ProductStock>>("/warehouse/stock"),
  getMaterialStock: () => apiClient<ApiCollection<MaterialStock>>("/warehouse/material-stock"),
  getMovements: () => apiClient<ApiCollection<StockMovement>>("/warehouse/movements"),
  getZones: () => apiClient<ApiCollection<WarehouseZone>>("/warehouse/zones"),
  createFinishedProductReceipt: (payload: FinishedProductReceiptPayload) =>
    apiClient<ApiItem<FinishedProductReceipt>>(
      "/warehouse/finished-product-receipts",
      jsonBody("POST", payload),
    ),
  createMaterialReceipt: (payload: MaterialReceiptPayload) =>
    apiClient<ApiItem<MaterialReceipt>>("/warehouse/material-receipts", jsonBody("POST", payload)),
  createStockCorrection: (payload: StockCorrectionPayload) =>
    apiClient<ApiItem<StockCorrection>>("/warehouse/stock-corrections", jsonBody("POST", payload)),
};

/** Read-only master data needed by warehouse forms (allowed with warehouse.view). */
export const catalogApi = {
  getMaterials: () => apiClient<ApiCollection<MasterDataItem>>("/product/materials"),
  getProducts: () => apiClient<ApiCollection<Product>>("/product/products"),
};

export function useWarehouseSummaryQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.warehouse.stockSummary(),
    queryFn: async () => (await warehouseApi.getStockSummary()).data,
  });
}

export function useProductStockQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.warehouse.stock(),
    queryFn: async () => (await warehouseApi.getStock()).data,
  });
}

export function useMaterialStockQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.warehouse.materialStock(),
    queryFn: async () => (await warehouseApi.getMaterialStock()).data,
  });
}

export function useStockMovementsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.warehouse.movements(),
    queryFn: async () => (await warehouseApi.getMovements()).data,
  });
}

export function useWarehouseZonesQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.warehouse.zones(),
    queryFn: async () => (await warehouseApi.getZones()).data,
  });
}

export function useCatalogMaterialsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.catalog.materials(),
    queryFn: async () => (await catalogApi.getMaterials()).data,
  });
}

export function useCatalogProductsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.catalog.products(),
    queryFn: async () => (await catalogApi.getProducts()).data,
  });
}

/** Moves finished goods out of a production stage into warehouse stock. */
export function useCreateFinishedProductReceipt() {
  return useGuardedMutation({
    mutationFn: async (payload: FinishedProductReceiptPayload) =>
      (await warehouseApi.createFinishedProductReceipt(payload)).data,
    invalidate: invalidationGroups.productionAndWarehouse,
  });
}

export function useCreateMaterialReceipt() {
  return useGuardedMutation({
    mutationFn: async (payload: MaterialReceiptPayload) =>
      (await warehouseApi.createMaterialReceipt(payload)).data,
    invalidate: invalidationGroups.warehouse,
  });
}

export function useCreateStockCorrection() {
  return useGuardedMutation({
    mutationFn: async (payload: StockCorrectionPayload) =>
      (await warehouseApi.createStockCorrection(payload)).data,
    invalidate: invalidationGroups.warehouse,
  });
}
