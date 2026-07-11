export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(extractApiErrorMessage(status, statusText, body));
    this.name = "ApiError";
  }
}

export const API_FORBIDDEN_EVENT = "paypoq:api-forbidden";

export interface ApiForbiddenDetail {
  message: string;
  path?: string;
  method?: string;
}

interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
  /** When true, 403 does not broadcast global banner (caller handles it). */
  silentForbidden?: boolean;
}

let accessToken: string | null = null;
let activeFactoryId: string | null = null;
let refreshSessionHandler: (() => Promise<boolean>) | null = null;

export function setApiAccessToken(token: string | null): void {
  accessToken = token;
}

export function setApiActiveFactoryId(factoryId: string | null): void {
  activeFactoryId = factoryId;
}

export function setApiAuthRefreshHandler(handler: (() => Promise<boolean>) | null): void {
  refreshSessionHandler = handler;
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured. Add it to apps/web/.env.local.",
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

function buildApiUrl(path: string): string {
  return `${getApiBaseUrl()}/${path.replace(/^\/+/, "")}`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

export function extractApiErrorMessage(
  status: number,
  statusText: string,
  body: unknown,
): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = record.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
      return message.join(", ");
    }
  }

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (status === 403) {
    return "Bu amal uchun ruxsatingiz yo‘q.";
  }

  if (status === 401) {
    return "Sessiya tugagan. Qayta kiring.";
  }

  return `API request failed with ${status} ${statusText}`;
}

function broadcastForbidden(detail: ApiForbiddenDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(API_FORBIDDEN_EVENT, { detail }));
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { skipAuth, skipAuthRefresh, silentForbidden, headers, ...requestOptions } =
    options;
  const method = (requestOptions.method ?? "GET").toUpperCase();
  const response = await fetch(buildApiUrl(path), {
    ...requestOptions,
    credentials: "include",
    headers: buildHeaders(headers, skipAuth),
  });

  if (response.status === 401 && !skipAuthRefresh && refreshSessionHandler) {
    const didRefresh = await refreshSessionHandler();

    if (didRefresh) {
      const retryResponse = await fetch(buildApiUrl(path), {
        ...requestOptions,
        credentials: "include",
        headers: buildHeaders(headers, skipAuth),
      });

      return parseApiResponse<T>(retryResponse, {
        path,
        method,
        silentForbidden,
      });
    }
  }

  return parseApiResponse<T>(response, { path, method, silentForbidden });
}

function buildHeaders(headers: HeadersInit | undefined, skipAuth?: boolean): HeadersInit {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Accept", "application/json");

  if (!skipAuth && accessToken) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  if (!skipAuth && activeFactoryId) {
    nextHeaders.set("X-Factory-Id", activeFactoryId);
  }

  return nextHeaders;
}

async function parseApiResponse<T>(
  response: Response,
  meta: { path: string; method: string; silentForbidden?: boolean },
): Promise<T> {
  const body = await readResponseBody(response);

  if (!response.ok) {
    const error = new ApiError(response.status, response.statusText, body);

    if (response.status === 403 && !meta.silentForbidden) {
      broadcastForbidden({
        message: error.message,
        path: meta.path,
        method: meta.method,
      });
    }

    throw error;
  }

  return body as T;
}
