import { apiClient } from "./client";
import { ApiCollection, ApiDateTime } from "./types";

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  factoryId: string | null;
  createdAt: ApiDateTime;
  before: unknown;
  after: unknown;
  metadata: unknown;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export const auditApi = {
  getLogs: (limit = 100) =>
    apiClient<ApiCollection<AuditLogEntry>>(
      `/audit/logs?limit=${encodeURIComponent(String(limit))}`,
    ),
};
