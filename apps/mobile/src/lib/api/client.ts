import { getMobileEnv } from "@/config/env";
import { ApiError } from "@/lib/api/errors";

export interface ApiClientOptions extends RequestInit {
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

function buildApiUrl(path: string): string {
  return `${getMobileEnv().apiBaseUrl}/${path.replace(/^\/+/, "")}`;
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

async function performRequest<T>(
  path: string,
  options: ApiClientOptions,
): Promise<T> {
  const { skipAuth, headers, ...requestOptions } = options;

  try {
    const response = await fetch(buildApiUrl(path), {
      ...requestOptions,
      credentials: "include",
      headers: buildHeaders(headers, skipAuth),
    });

    return parseApiResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(0, "Network Error", error);
  }
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { skipAuthRefresh, ...requestOptions } = options;

  try {
    return await performRequest<T>(path, requestOptions);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !skipAuthRefresh &&
      refreshSessionHandler
    ) {
      const didRefresh = await refreshSessionHandler();

      if (didRefresh) {
        return performRequest<T>(path, requestOptions);
      }
    }

    throw error;
  }
}

