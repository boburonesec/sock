import { getMobileEnv } from "@/config/env";
import { ApiError, ContextChangedError, type MutationOutcome } from "@/lib/api/errors";
import {
  getRequestContext, isContextCurrent, subscribeRequestContext,
  type ContextScope, type RequestContextSnapshot,
} from "@/lib/auth/request-context";

export {
  advanceApiSessionGeneration, getApiSessionGeneration, setApiActiveFactoryId, setApiSessionContext,
} from "@/lib/auth/request-context";

export interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
  contextScope?: ContextScope;
  originContext?: RequestContextSnapshot;
  /** Session validation and tenant-wide queries do not send a factory choice. */
  omitFactory?: boolean;
}

const REQUEST_TIMEOUT_MS = 20_000;
let accessToken: string | null = null;
let refreshSessionHandler: (() => Promise<boolean>) | null = null;
let authFailureHandler: (() => Promise<void>) | null = null;

export function setApiAuthFailureHandler(handler: () => Promise<void>): void { authFailureHandler = handler; }
export function setApiAccessToken(token: string | null): void { accessToken = token; }
export function setApiAuthRefreshHandler(handler: (() => Promise<boolean>) | null): void { refreshSessionHandler = handler; }

function buildApiUrl(path: string): string {
  return `${getMobileEnv().apiBaseUrl}/${path.replace(/^\/+/, "")}`;
}
async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

function outcome(error: unknown): MutationOutcome {
  return error instanceof ApiError && error.status >= 400 && error.status < 500 ? "failed" : "unknown";
}
function assertOrigin(origin: RequestContextSnapshot, scope: ContextScope) {
  if (!isContextCurrent(origin, scope)) throw new ContextChangedError(origin, "failed");
}

async function performRequest<T>(path: string, options: ApiClientOptions, origin: RequestContextSnapshot, token: string | null): Promise<T> {
  const { skipAuth, skipAuthRefresh: _skipRefresh, contextScope = "factory", originContext: _origin,
    omitFactory, headers, ...requestOptions } = options;
  if (!skipAuth) assertOrigin(origin, contextScope);
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Accept", "application/json");
  if (omitFactory || contextScope !== "factory") nextHeaders.delete("X-Factory-Id");
  if (!skipAuth && token) nextHeaders.set("Authorization", `Bearer ${token}`);
  if (!skipAuth && !omitFactory && contextScope === "factory" && origin.factoryId) nextHeaders.set("X-Factory-Id", origin.factoryId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort);
  if (options.signal?.aborted) controller.abort();
  // Cancel superseded reads. A write already dispatched may commit: retain its
  // receipt so the mutation guard can report an outcome for the origin factory.
  const isRead = ["GET", "HEAD"].includes((options.method ?? "GET").toUpperCase());
  const unsubscribe = !skipAuth && isRead ? subscribeRequestContext(() => {
    if (!isContextCurrent(origin, contextScope)) controller.abort();
  }) : () => undefined;

  try {
    const response = await fetch(buildApiUrl(path), {
      ...requestOptions, signal: controller.signal, credentials: "omit", headers: nextHeaders,
    });
    const body = await readResponseBody(response);
    if (!skipAuth && !isContextCurrent(origin, contextScope)) {
      throw new ContextChangedError(origin, response.ok ? "succeeded" : outcome(new ApiError(response.status, response.statusText, null)));
    }
    if (!response.ok) throw new ApiError(response.status, response.statusText, body);
    return body as T;
  } catch (error) {
    if (error instanceof ContextChangedError) throw error;
    if (!skipAuth && !isContextCurrent(origin, contextScope)) throw new ContextChangedError(origin, outcome(error));
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "Network Error", error);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
    unsubscribe();
  }
}

export async function apiClient<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const origin = options.originContext ?? getRequestContext();
  const scope = options.contextScope ?? "factory";
  const token = accessToken;
  try {
    return await performRequest<T>(path, options, origin, token);
  } catch (error) {
    if (!options.skipAuth && !isContextCurrent(origin, scope)) throw error instanceof ContextChangedError ? error : new ContextChangedError(origin, outcome(error));
    if (error instanceof ApiError && error.status === 401 && !options.skipAuth && !options.skipAuthRefresh && refreshSessionHandler) {
      const renewed = (accessToken !== null && accessToken !== token) || await refreshSessionHandler();
      // A -> 401 -> refresh -> B must stop here, even if the caller returns to A.
      assertOrigin(origin, scope);
      if (options.signal?.aborted) throw new ApiError(0, "Request Cancelled", null);
      if (renewed) {
        try { return await performRequest<T>(path, options, origin, accessToken); }
        catch (replayError) {
          if (!isContextCurrent(origin, scope)) throw replayError instanceof ContextChangedError ? replayError : new ContextChangedError(origin, outcome(replayError));
          if (replayError instanceof ApiError && replayError.status === 401) await authFailureHandler?.();
          throw replayError;
        }
      }
    }
    throw error;
  }
}

export function jsonBody(method: "POST" | "PATCH" | "PUT", body?: unknown, options: ApiClientOptions = {}): ApiClientOptions {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  return { ...options, method, headers, body: body === undefined ? undefined : JSON.stringify(body) };
}
