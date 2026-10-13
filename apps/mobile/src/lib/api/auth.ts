import { NATIVE_SESSION_ENDPOINTS, type AuthContext, type NativeAuthSession, type NativeRefreshRequest } from "@paypoq/shared";
import { apiClient, jsonBody } from "@/lib/api/client";

export type { AuthContext, AuthFactory, AuthUser } from "@paypoq/shared";

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    apiClient<{ data: NativeAuthSession }>(NATIVE_SESSION_ENDPOINTS.login.path, {
      ...jsonBody("POST", payload), skipAuth: true, skipAuthRefresh: true,
    }),
  refresh: (refreshToken: string) =>
    apiClient<{ data: NativeAuthSession }>(NATIVE_SESSION_ENDPOINTS.refresh.path, {
      ...jsonBody("POST", { refreshToken } satisfies NativeRefreshRequest),
      skipAuth: true, skipAuthRefresh: true,
    }),
  logout: (refreshToken: string) =>
    apiClient<{ data: { status: "ok" } }>(NATIVE_SESSION_ENDPOINTS.logout.path, {
      ...jsonBody("POST", { refreshToken } satisfies NativeRefreshRequest),
      skipAuth: true, skipAuthRefresh: true,
    }),
  // The store decides whether a failed identity check should renew the session.
  me: () => apiClient<{ data: AuthContext }>("/auth/me", { skipAuthRefresh: true, contextScope: "session", omitFactory: true }),
};
