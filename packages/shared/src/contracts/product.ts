import type { ProductVariantReference } from "./common.ts";

export interface MasterDataItem {
  id: string;
  name: string;
  code: string | null;
}

export interface Product {
  id: string;
  name: string;
  code: string | null;
  variants: ProductVariantReference[];
}

/** One-line variant label used in pickers: product · color · material · season. */
export function formatVariantLabel(variant: ProductVariantReference): string {
  return `${variant.product.name} · ${variant.color.name} · ${variant.material.name} · ${variant.season.name}`;
}
