import type { CorrectionDomain, CorrectionRequest } from "@paypoq/shared";
import { apiClient } from "./client";

// Contract types live in @paypoq/shared (shared with Native Mobile).
export type { CorrectionDomain, CorrectionRequest };

export const recoveryApi = {
  getCorrectionRequests: () => apiClient<{ data: CorrectionRequest[] }>("/recovery/correction-requests"),
  createCorrectionRequest: (payload: { domain: CorrectionDomain; sourceRecordId: string; reason: string }) => apiClient<{ data: CorrectionRequest }>("/recovery/correction-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  resolveCorrectionRequest: (id: string, resolutionNote: string) => apiClient<{ data: CorrectionRequest }>(`/recovery/correction-requests/${id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolutionNote }) }),
};
