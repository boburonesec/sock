import type { ApiDateTime } from "./common.ts";

export const CORRECTION_DOMAINS = [
  "PRODUCTION_MOVEMENT",
  "WORKER_ACTIVITY",
  "SUPPLIER_PAYMENT",
] as const;
export type CorrectionDomain = (typeof CORRECTION_DOMAINS)[number];

export interface CorrectionRequest {
  id: string;
  domain: CorrectionDomain;
  sourceRecordId: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
  requestedAt: ApiDateTime;
  resolvedAt: ApiDateTime | null;
  resolutionNote: string | null;
  requester: { id: string; name: string } | null;
  resolver: { id: string; name: string } | null;
  source: { title: string; details: Array<{ label: string; value: string }> };
}

export interface CreateCorrectionRequestPayload {
  domain: CorrectionDomain;
  sourceRecordId: string;
  /** Min 3 chars. */
  reason: string;
}

export const correctionDomainLabel: Record<CorrectionDomain, string> = {
  PRODUCTION_MOVEMENT: "Bosqich o‘tkazishi",
  WORKER_ACTIVITY: "Ishchi faoliyati",
  SUPPLIER_PAYMENT: "Yetkazib beruvchi to‘lovi",
};
