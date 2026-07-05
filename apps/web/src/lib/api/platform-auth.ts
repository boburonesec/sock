import { platformApiClient } from "./platform-client";

export interface PlatformAdminUser {
  platformAdminId: string;
  email: string;
  name: string;
  status: string;
}

export interface PlatformAuthSession {
  platformAdmin: PlatformAdminUser;
  accessToken: string;
  accessTokenExpiresInSeconds: number;
}

export const platformAuthApi = {
  login: (payload: { email: string; password: string }) =>
    platformApiClient<{ data: PlatformAuthSession }>("/platform-auth/login", {
      method: "POST",
      skipAuth: true,
      skipAuthRefresh: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  refresh: () =>
    platformApiClient<{ data: PlatformAuthSession }>("/platform-auth/refresh", {
      method: "POST",
      skipAuth: true,
      skipAuthRefresh: true,
    }),
  logout: () =>
    platformApiClient<{ data: { status: "ok" } }>("/platform-auth/logout", {
      method: "POST",
      skipAuthRefresh: true,
    }),
  me: () =>
    platformApiClient<{ data: { platformAdmin: PlatformAdminUser } }>(
      "/platform-auth/me",
    ),
  changePassword: (payload: { currentPassword: string; password: string }) =>
    platformApiClient<{ data: { status: "ok" } }>("/platform-auth/me/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
};
