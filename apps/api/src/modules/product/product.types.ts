export interface MasterDataItemResponse {
  id: string;
  name: string;
  code: string | null;
}

export interface ProductionStageResponse {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ProductReferenceResponse {
  id: string;
  name: string;
  code: string | null;
}

export interface ProductVariantResponse {
  id: string;
  product: ProductReferenceResponse;
  color: MasterDataItemResponse;
  material: MasterDataItemResponse;
  season: MasterDataItemResponse;
}

export interface ProductResponse extends ProductReferenceResponse {
  variants: ProductVariantResponse[];
}

export interface ProductPriceResponse {
  id: string;
  productId: string;
  productVariantId: string | null;
  amount: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
}

export interface CollectionResponse<T> {
  data: T[];
}

export interface SingleResponse<T> {
  data: T;
}
