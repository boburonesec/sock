import { apiClient } from "./client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface AuthFactory {
  id: string;
  name: string;
}

export interface AuthContext {
  user: AuthUser;
  tenantId: string;
  branchMode: "SINGLE" | "MULTI";
  activeFactoryId: string | null;
  accessibleFactories: AuthFactory[];
  roles: string[];
  permissions: string[];
}

export interface AuthSession extends AuthContext {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
}

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    apiClient<{ data: AuthSession }>("/auth/login", {
      method: "POST",
      skipAuth: true,
      skipAuthRefresh: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  refresh: () =>
    apiClient<{ data: AuthSession }>("/auth/refresh", {
      method: "POST",
      skipAuth: true,
      skipAuthRefresh: true,
    }),
  logout: () =>
    apiClient<{ data: { status: "ok" } }>("/auth/logout", {
      method: "POST",
      skipAuthRefresh: true,
    }),
  me: () => apiClient<{ data: AuthContext }>("/auth/me"),
  changeUserPassword: (
    userId: string,
    payload: { currentPassword?: string; password: string },
  ) =>
    apiClient<{ data: { status: "ok" } }>(`/auth/users/${userId}/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
};
