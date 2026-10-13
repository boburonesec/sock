import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { ApiClientOptions } from "@/lib/api/client";
import { ContextChangedError } from "@/lib/api/errors";
import { getRequestContext, isContextCurrent, type RequestContextSnapshot } from "@/lib/auth/request-context";
import { invalidateOriginQueries } from "@/providers/query-cache";
import { useUiStore } from "@/stores/ui-store";

interface GuardedMutationOptions<TVariables, TData> {
  mutationFn: (variables: TVariables, options: ApiClientOptions) => Promise<TData>;
  invalidate: readonly QueryKey[];
}

/** Bind even multi-request workflows to the form's originating context. */
export function guardedMutationFn<TVariables, TData>(options: GuardedMutationOptions<TVariables, TData>, origin: RequestContextSnapshot) {
  return async (variables: TVariables) => {
    try {
      if (!isContextCurrent(origin)) throw new ContextChangedError(origin, "failed");
      const data = await options.mutationFn(variables, { originContext: origin, contextScope: "factory" });
      if (!isContextCurrent(origin)) throw new ContextChangedError(origin, "succeeded");
      return data;
    } catch (error) {
      if (error instanceof ContextChangedError) useUiStore.getState().reportContextOutcome(error);
      throw error;
    }
  };
}

export function useGuardedMutation<TVariables, TData>(options: GuardedMutationOptions<TVariables, TData>) {
  const queryClient = useQueryClient();
  const origin = useRef(getRequestContext()).current;
  const inFlight = useRef(false);
  const mutation = useMutation({ mutationFn: guardedMutationFn(options, origin), retry: false });
  const { mutateAsync } = mutation;
  const submit = useCallback(async (variables: TVariables): Promise<TData | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    try {
      const data = await mutateAsync(variables);
      await invalidateOriginQueries(queryClient, options.invalidate, origin);
      if (!isContextCurrent(origin)) {
        const error = new ContextChangedError(origin, "succeeded");
        useUiStore.getState().reportContextOutcome(error);
        throw error;
      }
      return data;
    } catch (error) {
      // A late success still invalidates origin data, never the selected factory.
      if (error instanceof ContextChangedError && error.outcome !== "failed") {
        await invalidateOriginQueries(queryClient, options.invalidate, origin);
      }
      throw error;
    } finally { inFlight.current = false; }
  }, [mutateAsync, options.invalidate, origin, queryClient]);
  return { submit, isPending: mutation.isPending, error: mutation.error, reset: mutation.reset };
}
