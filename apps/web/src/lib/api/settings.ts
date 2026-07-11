import { apiClient } from "./client";
import { ApiCollection, ApiDateTime, ProductVariantReference } from "./types";

export type SettingsOverviewStatus = "CONFIGURED" | "NEEDS_ATTENTION";

export interface SettingsOverview {
  categoryCards: Array<{
    id: string;
    name: string;
    description: string;
    count: string;
    updatedAt: ApiDateTime | null;
    status: SettingsOverviewStatus;
    href: string;
  }>;
  configurationHealth: Array<{
    id: string;
    label: string;
    description: string;
    status: SettingsOverviewStatus;
  }>;
  recentChanges: Array<{
    id: string;
    change: string;
    module: string;
    changedBy: string | null;
    date: ApiDateTime;
    status: string;
  }>;
}

export interface SalaryRate {
  id: string;
  amount: string;
  effectiveFrom: ApiDateTime;
  effectiveTo: ApiDateTime | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
  stage: {
    id: string;
    name: string;
    sortOrder: number;
  };
  productVariant: ProductVariantReference | null;
}

export interface SalaryRatePayload {
  stageId: string;
  productVariantId?: string | null;
  amount: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface SettingsRole {
  id: string;
  name: string;
  permissionCount: string;
  permissions: Array<{ id: string; key: string; name: string }>;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
}

export interface SettingsPermission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
}

export interface SettingsExpenseCategory {
  id: string;
  name: string;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
}

export const settingsApi = {
  getOverview: () => apiClient<{ data: SettingsOverview }>("/settings/overview"),
  getRoles: () => apiClient<ApiCollection<SettingsRole>>("/settings/roles"),
  getPermissions: () =>
    apiClient<ApiCollection<SettingsPermission>>("/settings/permissions"),
  getExpenseCategories: () =>
    apiClient<ApiCollection<SettingsExpenseCategory>>("/settings/expense-categories"),
  getSalaryRates: () =>
    apiClient<ApiCollection<SalaryRate>>("/settings/salary-rates"),
  createSalaryRate: (payload: SalaryRatePayload) =>
    apiClient<{ data: SalaryRate }>("/settings/salary-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveSalaryRate: (id: string) =>
    apiClient<{ data: SalaryRate }>(`/settings/salary-rates/${id}/archive`, {
      method: "PATCH",
    }),
};
