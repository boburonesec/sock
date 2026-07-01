export type ReportOverviewStatus = 'AVAILABLE' | 'COMING_SOON';

export interface ReportsOverviewResponse {
  data: {
    categoryCards: ReportCategoryCardResponse[];
    quickReports: QuickReportResponse[];
    recentReports: RecentReportResponse[];
  };
}

export interface ReportCategoryCardResponse {
  id: string;
  name: string;
  description: string;
  reportCount: string;
  lastUpdatedAt: string | null;
  status: ReportOverviewStatus;
  href: string;
}

export interface QuickReportResponse {
  id: string;
  label: string;
  description: string;
  href: string;
}

export interface RecentReportResponse {
  id: string;
  name: string;
  category: string;
  updatedAt: Date;
  owner: string | null;
  status: string;
}
