import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

interface GuardedMutationOptions<TVariables, TData> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Query-key prefixes to refetch after a successful write. */
  invalidate: readonly QueryKey[];
}

/**
 * A write mutation that cannot be fired twice. `isPending` only flips on the
 * next render, so a fast double tap would otherwise send two requests; the ref
 * closes that window. Dependent queries are refetched before `submit` resolves,
 * so the screen the operator returns to already shows the new state.
 */
export function useGuardedMutation<TVariables, TData>({
  mutationFn,
  invalidate,
}: GuardedMutationOptions<TVariables, TData>) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const mutation = useMutation({ mutationFn });
  const { mutateAsync } = mutation;

  const submit = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      if (inFlight.current) {
        return undefined;
      }

      inFlight.current = true;

      try {
        const data = await mutateAsync(variables);
        await Promise.all(
          invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
        return data;
      } finally {
        inFlight.current = false;
      }
    },
    [invalidate, mutateAsync, queryClient],
  );

  return {
    submit,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
