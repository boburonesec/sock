import { apiClient } from "./client";

export type CorrectionDomain = "PRODUCTION_MOVEMENT" | "WORKER_ACTIVITY" | "SUPPLIER_PAYMENT";
export interface CorrectionRequest {
  id: string; domain: CorrectionDomain; sourceRecordId: string; reason: string;
  status: "OPEN" | "RESOLVED"; requestedAt: string; resolvedAt: string | null;
  resolutionNote: string | null; requester: { id: string; name: string } | null;
  resolver: { id: string; name: string } | null;
  source: { title: string; details: Array<{ label: string; value: string }> };
}
export const recoveryApi = {
  getCorrectionRequests: () => apiClient<{ data: CorrectionRequest[] }>("/recovery/correction-requests"),
  createCorrectionRequest: (payload: { domain: CorrectionDomain; sourceRecordId: string; reason: string }) => apiClient<{ data: CorrectionRequest }>("/recovery/correction-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  resolveCorrectionRequest: (id: string, resolutionNote: string) => apiClient<{ data: CorrectionRequest }>(`/recovery/correction-requests/${id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolutionNote }) }),
};
