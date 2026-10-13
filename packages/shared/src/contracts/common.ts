/**
 * HTTP responses serialize backend Date values as ISO strings. Decimal values
 * are intentionally represented as strings to preserve database precision.
 */
export type ApiDateTime = string;

export interface ApiCollection<T> {
  data: T[];
}

export interface ApiItem<T> {
  data: T;
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

export interface WorkShiftReference {
  id: string;
  code: string;
  name: string;
}

/** Error body produced by the API HttpExceptionFilter. */
export interface ApiErrorBody {
  statusCode: number;
  /** Single operator-friendly Uzbek message. Clients display it as-is. */
  message: string;
  error: string;
  messages?: string[];
}

export function readApiErrorMessage(body: unknown): string | null {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }

    if (Array.isArray(message)) {
      const first = message.find((item) => typeof item === "string" && item.trim());
      return typeof first === "string" ? first.trim() : null;
    }
  }

  return null;
}
