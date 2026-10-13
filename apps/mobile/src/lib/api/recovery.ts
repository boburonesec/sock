import type {
  ApiCollection,
  ApiItem,
  CorrectionRequest,
  CreateCorrectionRequestPayload,
} from "@paypoq/shared";
import { useQuery } from "@tanstack/react-query";

import { apiClient, jsonBody } from "@/lib/api/client";
import { invalidationGroups, queryKeys } from "@/lib/api/query-keys";
import { useGuardedMutation } from "@/shared/hooks/use-guarded-mutation";

export const recoveryApi = {
  getCorrectionRequests: () =>
    apiClient<ApiCollection<CorrectionRequest>>("/recovery/correction-requests"),
  createCorrectionRequest: (payload: CreateCorrectionRequestPayload) =>
    apiClient<ApiItem<CorrectionRequest>>("/recovery/correction-requests", jsonBody("POST", payload)),
  resolveCorrectionRequest: ({ id, resolutionNote }: { id: string; resolutionNote: string }) =>
    apiClient<ApiItem<CorrectionRequest>>(
      `/recovery/correction-requests/${encodeURIComponent(id)}/resolve`,
      jsonBody("POST", { resolutionNote }),
    ),
};

export function useCorrectionRequestsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.recovery.correctionRequests(),
    queryFn: async () => (await recoveryApi.getCorrectionRequests()).data,
  });
}

/** Open movement corrections block shift close, so production readiness refetches too. */
export function useCreateCorrectionRequest() {
  return useGuardedMutation({
    mutationFn: async (payload: CreateCorrectionRequestPayload) =>
      (await recoveryApi.createCorrectionRequest(payload)).data,
    invalidate: invalidationGroups.productionAndRecovery,
  });
}

export function useResolveCorrectionRequest() {
  return useGuardedMutation({
    mutationFn: async (variables: { id: string; resolutionNote: string }) =>
      (await recoveryApi.resolveCorrectionRequest(variables)).data,
    invalidate: invalidationGroups.productionAndRecovery,
  });
}
