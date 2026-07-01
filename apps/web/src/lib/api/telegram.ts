import { apiClient } from "./client";
import { ApiCollection, ApiDateTime } from "./types";

export type TelegramLinkTargetType = "EMPLOYEE" | "CLIENT" | "USER";

export interface TelegramLinkTokenCreated {
  id: string;
  code: string;
  targetType: TelegramLinkTargetType;
  targetId: string;
  expiresAt: ApiDateTime;
  createdAt: ApiDateTime;
}

export interface TelegramLinkTokenListItem {
  id: string;
  targetType: TelegramLinkTargetType;
  targetId: string | null;
  targetName: string | null;
  expiresAt: ApiDateTime;
  usedAt: ApiDateTime | null;
  createdAt: ApiDateTime;
  createdByUserId: string | null;
}

export interface TelegramAccountListItem {
  id: string;
  type: TelegramLinkTargetType;
  linkedEntity: {
    id: string;
    name: string;
    type: TelegramLinkTargetType;
  } | null;
  telegramUserIdMasked: string;
  status: "ACTIVE" | "UNLINKED" | "BLOCKED";
  linkedAt: ApiDateTime;
  unlinkedAt: ApiDateTime | null;
  blockedAt: ApiDateTime | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
}

export interface TelegramHealth {
  status: "ok";
  service: "paypoq-os-telegram";
  checks: {
    botInternalApiKeyConfigured: boolean;
    linkTokenSecretConfigured: boolean;
    database: "ok";
  };
  counts: {
    accounts: string;
    activeAccounts: string;
    linkTokens: string;
  };
}

export const telegramApi = {
  createEmployeeLinkToken: (employeeId: string) =>
    apiClient<{ data: TelegramLinkTokenCreated }>(
      `/telegram/link-tokens/employees/${employeeId}`,
      { method: "POST" },
    ),
  createClientLinkToken: (clientId: string) =>
    apiClient<{ data: TelegramLinkTokenCreated }>(
      `/telegram/link-tokens/clients/${clientId}`,
      { method: "POST" },
    ),
  getLinkTokens: () =>
    apiClient<ApiCollection<TelegramLinkTokenListItem>>(
      "/telegram/link-tokens",
    ),
  getAccounts: () =>
    apiClient<ApiCollection<TelegramAccountListItem>>("/telegram/accounts"),
  getHealth: () => apiClient<{ data: TelegramHealth }>("/telegram/health"),
  blockAccount: (accountId: string) =>
    apiClient<{ data: { telegramAccountId: string; status: string; changedAt: ApiDateTime } }>(
      `/telegram/accounts/${accountId}/block`,
      { method: "POST" },
    ),
};
