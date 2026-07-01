/**
 * HTTP responses serialize backend Date values as ISO strings. Decimal values
 * are intentionally represented as strings to preserve database precision.
 */
export type ApiDateTime = string;

export interface ApiCollection<T> {
  data: T[];
}

export interface NamedReference {
  id: string;
  name: string;
  /** Present for product master-data references where the API exposes it. */
  code?: string | null;
}

export interface ProductVariantReference {
  id: string;
  product: NamedReference;
  color: NamedReference;
  material: NamedReference;
  season: NamedReference;
}

export interface UserReference extends NamedReference {}
