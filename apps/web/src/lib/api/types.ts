/**
 * HTTP responses serialize backend Date values as ISO strings. Decimal values
 * are intentionally represented as strings to preserve database precision.
 * Defined once in @paypoq/shared so Web and Native Mobile share the contract.
 */
export type {
  ApiCollection,
  ApiDateTime,
  NamedReference,
  ProductVariantReference,
  UserReference,
} from "@paypoq/shared";
