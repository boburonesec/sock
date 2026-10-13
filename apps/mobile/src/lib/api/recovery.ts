import type {
  ApiCollection,
  ApiItem,
  CorrectionRequest,
  CreateCorrectionRequestPayload,
} from "@paypoq/shared";
import { useContextQuery } from "@/shared/hooks/use-context-query";

import { apiClient, jsonBody, type ApiClientOptions } from "@/lib/api/client";
import { invalidationGroups, queryKeys } from "@/lib/api/query-keys";
import { useGuardedMutation } from "@/shared/hooks/use-guarded-mutation";

export const recoveryApi = {
  getCorrectionRequests: (options?: ApiClientOptions) =>
    apiClient<ApiCollection<CorrectionRequest>>("/recovery/correction-requests", options),
  createCorrectionRequest: (payload: CreateCorrectionRequestPayload, options?: ApiClientOptions) =>
    apiClient<ApiItem<CorrectionRequest>>("/recovery/correction-requests", jsonBody("POST", payload, options)),
  resolveCorrectionRequest: ({ id, resolutionNote }: { id: string; resolutionNote: string }, options?: ApiClientOptions) =>
    apiClient<ApiItem<CorrectionRequest>>(
      `/recovery/correction-requests/${encodeURIComponent(id)}/resolve`,
      jsonBody("POST", { resolutionNote }, options),
    ),
};

export function useCorrectionRequestsQuery(enabled = true) {
  return useContextQuery({
    enabled,
    queryKey: queryKeys.recovery.correctionRequests(),
    queryFn: async (options) => (await recoveryApi.getCorrectionRequests(options)).data,
  });
}

/** Open movement corrections block shift close, so production readiness refetches too. */
export function useCreateCorrectionRequest() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateCorrectionRequestPayload, options: ApiClientOptions) =>
      (await recoveryApi.createCorrectionRequest(payload, options)).data,
    invalidate: invalidationGroups.productionAndRecovery,
  });
}

export function useResolveCorrectionRequest() {
  return useGuardedMutation({
    mutationFn: async (variables: { id: string; resolutionNote: string }, options: ApiClientOptions) =>
      (await recoveryApi.resolveCorrectionRequest(variables, options)).data,
    invalidate: invalidationGroups.productionAndRecovery,
  });
}
