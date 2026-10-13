import type {
  FinishedProductReceipt,
  FinishedProductReceiptPayload,
  LowStockThreshold,
  MaterialReceipt,
  MaterialReceiptPayload,
  MaterialStock,
  ProductStock,
  StockCorrection,
  StockCorrectionPayload,
  StockMovement,
  UpsertLowStockThresholdPayload,
  WarehouseStockSummary,
  WarehouseZone,
  WarehouseZoneSummaryStatus,
} from "@paypoq/shared";
import { apiClient } from "./client";
import type { ApiCollection } from "./types";

// Contract types live in @paypoq/shared (shared with Native Mobile).
export type {
  FinishedProductReceipt,
  FinishedProductReceiptPayload,
  LowStockThreshold,
  MaterialReceipt,
  MaterialReceiptPayload,
  MaterialStock,
  ProductStock,
  StockCorrection,
  StockCorrectionPayload,
  StockMovement,
  UpsertLowStockThresholdPayload,
  WarehouseStockSummary,
  WarehouseZone,
  WarehouseZoneSummaryStatus,
};

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
