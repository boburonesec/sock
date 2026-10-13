import { getMobileEnv } from "@/config/env";
import { ApiError } from "@/lib/api/errors";

export interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
}

const REQUEST_TIMEOUT_MS = 20_000;

let sessionGeneration = 0;

export function advanceApiSessionGeneration(): number {
  return ++sessionGeneration;
}

export function getApiSessionGeneration(): number {
  return sessionGeneration;
}

let accessToken: string | null = null;
let activeFactoryId: string | null = null;
let refreshSessionHandler: (() => Promise<boolean>) | null = null;
let authFailureHandler: (() => Promise<void>) | null = null;

export function setApiAuthFailureHandler(handler: () => Promise<void>): void {
  authFailureHandler = handler;
}

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

interface RequestSession { generation: number; token: string | null; factoryId: string | null }

function changedSessionError(): ApiError {
  return new ApiError(409, "Session Changed", { message: "Akkaunt o'zgardi. Amal natijasini tekshiring, keyin qayta urining." });
}

function buildHeaders(headers: HeadersInit | undefined, session: RequestSession, skipAuth?: boolean): HeadersInit {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Accept", "application/json");

  if (!skipAuth && session.token) {
    nextHeaders.set("Authorization", `Bearer ${session.token}`);
  }

  if (!skipAuth && session.factoryId) {
    nextHeaders.set("X-Factory-Id", session.factoryId);
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
  session: RequestSession,
): Promise<T> {
  const { skipAuth, headers, ...requestOptions } = options;
  // Factory Wi-Fi drops mid-request; without a timeout the screen spins forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort);
  if (options.signal?.aborted) controller.abort();

  try {
    const response = await fetch(buildApiUrl(path), {
      ...requestOptions,
      signal: controller.signal,
      credentials: "omit",
      headers: buildHeaders(headers, session, skipAuth),
    });

    const body = await parseApiResponse<T>(response);
    if (!skipAuth && session.generation !== sessionGeneration) throw changedSessionError();
    return body;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(0, "Network Error", error);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { skipAuthRefresh, ...requestOptions } = options;
  const session = { generation: sessionGeneration, token: accessToken, factoryId: activeFactoryId };

  try {
    return await performRequest<T>(path, requestOptions, session);
  } catch (error) {
    if (!options.skipAuth && session.generation !== sessionGeneration) throw changedSessionError();
    if (error instanceof ApiError && error.status === 401 && !options.skipAuth &&
        !skipAuthRefresh && refreshSessionHandler) {
      // A delayed 401 for the old access token need not rotate a second time.
      const didRefresh = (accessToken !== null && accessToken !== session.token) || await refreshSessionHandler();
      if (session.generation !== sessionGeneration) throw changedSessionError();
      if (didRefresh) {
        // Keep the originating factory and generation. Only the bearer is renewed.
        try {
          return await performRequest<T>(path, requestOptions, { ...session, token: accessToken });
        } catch (replayError) {
          if (session.generation !== sessionGeneration) throw changedSessionError();
          if (replayError instanceof ApiError && replayError.status === 401) await authFailureHandler?.();
          throw replayError;
        }
      }
    }
    throw error;
  }
}


/** Request options for a JSON write. Keeps every domain client free of header boilerplate. */
export function jsonBody(method: "POST" | "PATCH" | "PUT", body?: unknown): ApiClientOptions {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
