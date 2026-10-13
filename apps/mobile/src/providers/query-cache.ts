import { QueryClient } from "@tanstack/react-query";
import { queryIdentity } from "@/lib/api/query-keys";
import type { RequestContextSnapshot } from "@/lib/auth/request-context";
import { ApiError } from "@/lib/api/errors";

export const mobileQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      staleTime: 30_000,
    },
    mutations: { retry: false },
  },
});

export function clearMobileQueryCache() {
  mobileQueryClient.clear();
}

function sameQuerySession(key: readonly unknown[], origin: RequestContextSnapshot) {
  const identity = queryIdentity(key);
  return identity && identity.tenantId === origin.tenantId && identity.userId === origin.userId && identity.sessionGeneration === origin.sessionGeneration;
}

export function cancelFactoryQueries(origin: RequestContextSnapshot) {
  return mobileQueryClient.cancelQueries({ predicate: (query) => {
    const identity = queryIdentity(query.queryKey);
    return Boolean(sameQuerySession(query.queryKey, origin) && identity?.scope === "factory" && identity.factoryId === origin.factoryId);
  } });
}

/** Refetch only data affected under the mutation's originating identity/factory. */
export function invalidateOriginQueries(client: QueryClient, prefixes: readonly (readonly unknown[])[], origin: RequestContextSnapshot) {
  return client.invalidateQueries({ predicate: (query) => {
    const identity = queryIdentity(query.queryKey);
    return Boolean(sameQuerySession(query.queryKey, origin) &&
      prefixes.some((prefix) => prefix.every((part, index) => query.queryKey[index] === part)) &&
      (identity?.scope !== "factory" || identity.factoryId === origin.factoryId));
  } });
}
