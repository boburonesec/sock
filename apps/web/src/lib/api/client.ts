export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API request failed with ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
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

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { skipAuth, skipAuthRefresh, headers, ...requestOptions } = options;
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

      return parseApiResponse<T>(retryResponse);
    }
  }

  return parseApiResponse<T>(response);
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

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, body);
  }

  return body as T;
}
