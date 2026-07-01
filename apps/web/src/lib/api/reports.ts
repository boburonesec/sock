import { apiClient } from "./client";
import { ApiDateTime } from "./types";

export type ReportOverviewStatus = "AVAILABLE" | "COMING_SOON";

export interface ReportsOverview {
  categoryCards: Array<{
    id: string;
    name: string;
    description: string;
    reportCount: string;
    lastUpdatedAt: ApiDateTime | null;
    status: ReportOverviewStatus;
    href: string;
  }>;
  quickReports: Array<{
    id: string;
    label: string;
    description: string;
    href: string;
  }>;
  recentReports: Array<{
    id: string;
    name: string;
    category: string;
    updatedAt: ApiDateTime;
    owner: string | null;
    status: string;
  }>;
}

export const reportsApi = {
  getOverview: () => apiClient<{ data: ReportsOverview }>("/reports/overview"),
};
