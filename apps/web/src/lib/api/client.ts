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

export function getApiAccessToken(): string | null {
  return accessToken;
}

export function setApiActiveFactoryId(factoryId: string | null): void {
  activeFactoryId = factoryId;
}

export function setApiAuthRefreshHandler(handler: (() => Promise<boolean>) | null): void {
  refreshSessionHandler = handler;
}

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    if (window.location.hostname.endsWith(".onrender.com")) {
      return "https://paypoq-api.onrender.com";
    }
  }

  let baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
      ? "https://paypoq-api.onrender.com"
      : "http://localhost:3001");

  baseUrl = baseUrl.replace(/\/+$/, "").trim();
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
      ? `http://${baseUrl}`
      : `https://${baseUrl}`;
  }

  return baseUrl;
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

const STATUS_FALLBACK_UZ: Record<number, string> = {
  400: "Kiritilgan ma’lumotlar noto‘g‘ri. Iltimos, maydonlarni tekshiring.",
  401: "Sessiya tugagan yoki kirish talab qilinadi. Qayta kiring.",
  403: "Bu amal uchun ruxsatingiz yo‘q.",
  404: "So‘ralgan ma’lumot topilmadi.",
  409: "Bu amal hozir bajarilmaydi (ziddiyat). Holatni tekshirib qayta urinib ko‘ring.",
  422: "Ma’lumotlar qayta ishlanmadi. Kiritishlarni tekshiring.",
  429: "Juda ko‘p urinish. Biroz kutib qayta urinib ko‘ring.",
  500: "Serverda xatolik yuz berdi. Keyinroq urinib ko‘ring.",
  502: "Server vaqtincha ishlamayapti. Keyinroq urinib ko‘ring.",
  503: "Xizmat vaqtincha mavjud emas. Keyinroq urinib ko‘ring.",
};

/**
 * Prefer API `message` (backend already normalizes to Uzbek).
 * Never show raw English status text to operators.
 */
export function extractApiErrorMessage(
  status: number,
  statusText: string,
  body: unknown,
): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;

    // Multi-field validation from filter: messages[]
    if (
      Array.isArray(record.messages) &&
      record.messages.every((item) => typeof item === "string")
    ) {
      const joined = (record.messages as string[])
        .map((item) => item.trim())
        .filter(Boolean)
        .join(" · ");
      if (joined) return joined;
    }

    const message = record.message;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }

    if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
      const joined = message.map((item) => item.trim()).filter(Boolean).join(" · ");
      if (joined) return joined;
    }
  }

  if (typeof body === "string" && body.trim()) {
    return body.trim();
  }

  return (
    STATUS_FALLBACK_UZ[status] ??
    `Amal bajarilmadi (${status}). Keyinroq urinib ko‘ring.`
  );
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
  const tokenAtRequestTime = accessToken;
  const response = await fetch(buildApiUrl(path), {
    ...requestOptions,
    credentials: "include",
    headers: buildHeaders(headers, skipAuth),
  });

  if (response.status === 401 && !skipAuthRefresh && refreshSessionHandler) {
    // If another concurrent request already refreshed the access token while this request
    // was in flight, do NOT trigger a second refresh call. Retry immediately with the new token.
    if (accessToken && accessToken !== tokenAtRequestTime) {
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
