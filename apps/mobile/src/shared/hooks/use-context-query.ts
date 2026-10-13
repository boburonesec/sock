import { useQuery, type QueryKey } from "@tanstack/react-query";
import type { ApiClientOptions } from "@/lib/api/client";
import { scopedQueryKey } from "@/lib/api/query-keys";
import { getRequestContext, isContextCurrent, type ContextScope, type RequestContextSnapshot } from "@/lib/auth/request-context";
import { useSessionContext } from "@/lib/auth/use-session-context";

interface ContextQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: (options: ApiClientOptions) => Promise<T>;
  contextScope?: Exclude<ContextScope, "session">;
  enabled?: boolean;
}

/** Also used by real QueryClient/QueryObserver integration tests. */
export function contextQueryOptions<T>(options: ContextQueryOptions<T>, origin: RequestContextSnapshot = getRequestContext()) {
  const scope = options.contextScope ?? "factory";
  return {
    enabled: (options.enabled ?? true) && isContextCurrent(origin, scope),
    queryKey: scopedQueryKey(options.queryKey, origin, scope),
    queryFn: ({ signal }: { signal: AbortSignal }) => options.queryFn({
      signal, originContext: origin, contextScope: scope, omitFactory: scope === "tenant",
    }),
  };
}

/** Captures the same origin for the key and transport, including delayed dispatch. */
export function useContextQuery<T>(options: ContextQueryOptions<T>) {
  const origin = useSessionContext();
  return useQuery(contextQueryOptions(options, origin));
}
