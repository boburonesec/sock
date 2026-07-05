import { platformApiClient } from "./platform-client";

export interface PlatformTenant {
  id: string;
  name: string;
  status: "PILOT" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  branchMode: "SINGLE" | "MULTI";
  subscriptionStatus: string;
  planCode: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  factoryCount?: string;
  userCount?: string;
}

export interface PlatformFactory {
  id: string;
  name: string;
  location?: string | null;
  createdAt: string;
}

export interface PlatformTenantUser {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  roles?: string[];
  factories?: string[];
}

export interface PlatformTenantDetails extends PlatformTenant {
  factories: PlatformFactory[];
  users: PlatformTenantUser[];
}

export interface PlatformTenantHealth {
  tenant: PlatformTenant;
  metrics: {
    factoryCount: string;
    activeUserCount: string;
    activeEmployeeCount: string;
    productCount: string;
    orderCount: string;
    stockMovementCount: string;
    payrollPeriodCount: string;
  };
  lastLoginAt: string | null;
  lastStockMovementAt: string | null;
  readiness: {
    hasFactory: boolean;
    hasActiveUser: boolean;
    hasProductCatalog: boolean;
  };
  notes: string[];
}

export const platformAdminApi = {
  getTenants: () =>
    platformApiClient<{ data: PlatformTenant[] }>("/platform-admin/tenants"),
  createTenant: (payload: {
    name: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    planCode?: string;
    branchMode?: "SINGLE" | "MULTI";
    notes?: string;
  }) =>
    platformApiClient<{ data: PlatformTenant }>("/platform-admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getTenant: (id: string) =>
    platformApiClient<{ data: PlatformTenantDetails }>(`/platform-admin/tenants/${id}`),
  updateTenantBranchMode: (
    tenantId: string,
    payload: { branchMode: "SINGLE" | "MULTI" },
  ) =>
    platformApiClient<{ data: PlatformTenant }>(
      `/platform-admin/tenants/${tenantId}/branch-mode`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  createFactory: (
    tenantId: string,
    payload: { name: string; location?: string },
  ) =>
    platformApiClient<{ data: PlatformFactory & { warehouse: { id: string; name: string } } }>(
      `/platform-admin/tenants/${tenantId}/factories`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  createOwnerUser: (
    tenantId: string,
    payload: { name: string; email: string; password?: string; factoryId?: string },
  ) =>
    platformApiClient<{
      data: PlatformTenantUser & { generatedPassword: string | null };
    }>(`/platform-admin/tenants/${tenantId}/owner-users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateTenantUserPassword: (
    tenantId: string,
    userId: string,
    payload: { password: string },
  ) =>
    platformApiClient<{ data: PlatformTenantUser }>(
      `/platform-admin/tenants/${tenantId}/users/${userId}/password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  activateTenant: (tenantId: string) =>
    platformApiClient<{ data: PlatformTenant }>(
      `/platform-admin/tenants/${tenantId}/activate`,
      { method: "POST" },
    ),
  suspendTenant: (tenantId: string) =>
    platformApiClient<{ data: PlatformTenant }>(
      `/platform-admin/tenants/${tenantId}/suspend`,
      { method: "POST" },
    ),
  getTenantHealth: (tenantId: string) =>
    platformApiClient<{ data: PlatformTenantHealth }>(
      `/platform-admin/tenants/${tenantId}/health`,
    ),
};
