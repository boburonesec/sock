import { apiClient } from "./client";

import type { AuthContext, AuthSession } from "@paypoq/shared";
export type { AuthContext, AuthFactory, AuthSession, AuthUser } from "@paypoq/shared";

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
