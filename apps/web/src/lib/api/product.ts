import { apiClient } from "./client";
import { ApiCollection, ApiDateTime, ProductVariantReference } from "./types";

export interface MasterDataItem {
  id: string;
  name: string;
  code: string | null;
}

export interface ProductionStage {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  code: string | null;
  variants: ProductVariantReference[];
}

export interface ProductPayload {
  name: string;
  code?: string | null;
}

export interface ProductVariantPayload {
  colorId: string;
  materialId: string;
  seasonId: string;
}

export interface ProductPrice {
  id: string;
  productId: string;
  productVariantId: string | null;
  amount: string;
  effectiveFrom: ApiDateTime;
  effectiveTo: ApiDateTime | null;
  createdAt: ApiDateTime;
}

export interface ProductPricePayload {
  amount: string;
  effectiveFrom: string;
}

export interface MasterDataItemPayload {
  name: string;
  code?: string | null;
}

export interface ProductionStagePayload {
  name: string;
  sortOrder?: number;
}

export const productApi = {
  getColors: () => apiClient<ApiCollection<MasterDataItem>>("/product/colors"),
  createColor: (payload: MasterDataItemPayload) =>
    apiClient<{ data: MasterDataItem }>("/product/colors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateColor: (id: string, payload: MasterDataItemPayload) =>
    apiClient<{ data: MasterDataItem }>(`/product/colors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveColor: (id: string) =>
    apiClient<{ data: MasterDataItem }>(`/product/colors/${id}/archive`, {
      method: "POST",
    }),
  getMaterials: () =>
    apiClient<ApiCollection<MasterDataItem>>("/product/materials"),
  createMaterial: (payload: MasterDataItemPayload) =>
    apiClient<{ data: MasterDataItem }>("/product/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateMaterial: (id: string, payload: MasterDataItemPayload) =>
    apiClient<{ data: MasterDataItem }>(`/product/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveMaterial: (id: string) =>
    apiClient<{ data: MasterDataItem }>(`/product/materials/${id}/archive`, {
      method: "POST",
    }),
  getSeasons: () =>
    apiClient<ApiCollection<MasterDataItem>>("/product/seasons"),
  createSeason: (payload: MasterDataItemPayload) =>
    apiClient<{ data: MasterDataItem }>("/product/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateSeason: (id: string, payload: MasterDataItemPayload) =>
    apiClient<{ data: MasterDataItem }>(`/product/seasons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveSeason: (id: string) =>
    apiClient<{ data: MasterDataItem }>(`/product/seasons/${id}/archive`, {
      method: "POST",
    }),
  getStages: () =>
    apiClient<ApiCollection<ProductionStage>>("/product/stages"),
  createStage: (payload: ProductionStagePayload) =>
    apiClient<{ data: ProductionStage }>("/product/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateStage: (id: string, payload: ProductionStagePayload) =>
    apiClient<{ data: ProductionStage }>(`/product/stages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveStage: (id: string) =>
    apiClient<{ data: ProductionStage }>(`/product/stages/${id}/archive`, {
      method: "POST",
    }),
  getProducts: () => apiClient<ApiCollection<Product>>("/product/products"),
  createProduct: (payload: ProductPayload) =>
    apiClient<{ data: Product }>("/product/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateProduct: (id: string, payload: ProductPayload) =>
    apiClient<{ data: Product }>(`/product/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveProduct: (id: string) =>
    apiClient<{ data: Product }>(`/product/products/${id}/archive`, {
      method: "POST",
    }),
  createVariant: (productId: string, payload: ProductVariantPayload) =>
    apiClient<{ data: ProductVariantReference }>(
      `/product/products/${productId}/variants`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  updateVariant: (id: string, payload: ProductVariantPayload) =>
    apiClient<{ data: ProductVariantReference }>(`/product/variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveVariant: (id: string) =>
    apiClient<{ data: ProductVariantReference }>(
      `/product/variants/${id}/archive`,
      { method: "POST" },
    ),
  getVariantPrices: (variantId: string) =>
    apiClient<ApiCollection<ProductPrice>>(
      `/product/variants/${variantId}/prices`,
    ),
  getActiveVariantPrice: (variantId: string) =>
    apiClient<{ data: ProductPrice | null }>(
      `/product/variants/${variantId}/active-price`,
    ),
  createVariantPrice: (variantId: string, payload: ProductPricePayload) =>
    apiClient<{ data: ProductPrice }>(`/product/variants/${variantId}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
