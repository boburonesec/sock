import { ApiError } from "./client";

interface PlatformApiClientOptions extends RequestInit {
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
}

let platformAccessToken: string | null = null;
let platformRefreshSessionHandler: (() => Promise<boolean>) | null = null;

export function setPlatformApiAccessToken(token: string | null): void {
  platformAccessToken = token;
}

export function setPlatformApiAuthRefreshHandler(
  handler: (() => Promise<boolean>) | null,
): void {
  platformRefreshSessionHandler = handler;
}

function getApiBaseUrl(): string {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

export async function platformApiClient<T>(
  path: string,
  options: PlatformApiClientOptions = {},
): Promise<T> {
  const { skipAuth, skipAuthRefresh, headers, ...requestOptions } = options;
  const response = await fetch(buildApiUrl(path), {
    ...requestOptions,
    credentials: "include",
    headers: buildHeaders(headers, skipAuth),
  });

  if (response.status === 401 && !skipAuthRefresh && platformRefreshSessionHandler) {
    const didRefresh = await platformRefreshSessionHandler();

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

  if (!skipAuth && platformAccessToken) {
    nextHeaders.set("Authorization", `Bearer ${platformAccessToken}`);
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
