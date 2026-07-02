import { create } from "zustand";

import { clearMobileQueryCache } from "@/providers/app-providers";
import { authApi, type AuthContext, type AuthFactory, type AuthUser } from "@/lib/api/auth";
import {
  setApiAccessToken,
  setApiActiveFactoryId,
  setApiAuthRefreshHandler,
} from "@/lib/api/client";
import {
  clearStoredSession,
  getAccessTokenExpiresAt,
  isAccessTokenUsable,
  loadStoredSession,
  saveStoredSession,
} from "@/lib/auth/session-storage";

interface AuthState {
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  currentUser: AuthUser | null;
  tenantId: string | null;
  activeFactoryId: string | null;
  accessibleFactories: AuthFactory[];
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  hasLoadedSession: boolean;
  initializeSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loadMe: () => Promise<boolean>;
  clearSession: () => Promise<void>;
}

let refreshPromise: Promise<boolean> | null = null;

function applyApiContext(context: AuthContext): void {
  setApiActiveFactoryId(context.activeFactoryId);
}

async function persistAccessToken(accessToken: string, expiresInSeconds: number) {
  const accessTokenExpiresAt = getAccessTokenExpiresAt(expiresInSeconds);

  await saveStoredSession({ accessToken, accessTokenExpiresAt });

  return accessTokenExpiresAt;
}

function buildAuthenticatedState(
  context: AuthContext,
  accessToken: string | null,
  accessTokenExpiresAt: number | null,
): Partial<AuthState> {
  return {
    accessToken,
    accessTokenExpiresAt,
    currentUser: context.user,
    tenantId: context.tenantId,
    activeFactoryId: context.activeFactoryId,
    accessibleFactories: context.accessibleFactories,
    roles: context.roles,
    permissions: context.permissions,
    isAuthenticated: true,
    isLoadingSession: false,
    hasLoadedSession: true,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  accessTokenExpiresAt: null,
  currentUser: null,
  tenantId: null,
  activeFactoryId: null,
  accessibleFactories: [],
  roles: [],
  permissions: [],
  isAuthenticated: false,
  isLoadingSession: false,
  hasLoadedSession: false,
  initializeSession: async () => {
    set({ isLoadingSession: true });

    const storedSession = await loadStoredSession();

    if (storedSession && isAccessTokenUsable(storedSession.accessTokenExpiresAt)) {
      setApiAccessToken(storedSession.accessToken);

      try {
        const response = await authApi.me();
        applyApiContext(response.data);
        set(
          buildAuthenticatedState(
            response.data,
            storedSession.accessToken,
            storedSession.accessTokenExpiresAt,
          ),
        );
        return;
      } catch {
        setApiAccessToken(null);
      }
    }

    const didRefresh = await get().refreshSession();

    if (!didRefresh) {
      await get().clearSession();
    }
  },
  login: async (email, password) => {
    set({ isLoadingSession: true });

    try {
      const response = await authApi.login({ email, password });
      const accessTokenExpiresAt = await persistAccessToken(
        response.data.accessToken,
        response.data.accessTokenExpiresInSeconds,
      );

      setApiAccessToken(response.data.accessToken);
      applyApiContext(response.data);
      set(buildAuthenticatedState(response.data, response.data.accessToken, accessTokenExpiresAt));
    } catch (error) {
      await get().clearSession();
      throw error;
    }
  },
  logout: async () => {
    set({ isLoadingSession: true });

    try {
      await authApi.logout();
    } finally {
      await get().clearSession();
    }
  },
  refreshSession: async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    set({ isLoadingSession: true });

    refreshPromise = authApi
      .refresh()
      .then(async (response) => {
        const accessTokenExpiresAt = await persistAccessToken(
          response.data.accessToken,
          response.data.accessTokenExpiresInSeconds,
        );

        setApiAccessToken(response.data.accessToken);
        applyApiContext(response.data);
        set(
          buildAuthenticatedState(
            response.data,
            response.data.accessToken,
            accessTokenExpiresAt,
          ),
        );

        return true;
      })
      .catch(async () => {
        await clearStoredSession();
        setApiAccessToken(null);
        setApiActiveFactoryId(null);
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  },
  loadMe: async () => {
    const accessToken = get().accessToken;

    if (!accessToken) {
      return get().refreshSession();
    }

    set({ isLoadingSession: true });

    try {
      const response = await authApi.me();
      applyApiContext(response.data);
      set(buildAuthenticatedState(response.data, accessToken, get().accessTokenExpiresAt));
      return true;
    } catch {
      await get().clearSession();
      return false;
    }
  },
  clearSession: async () => {
    await clearStoredSession();
    setApiAccessToken(null);
    setApiActiveFactoryId(null);
    clearMobileQueryCache();
    set({
      accessToken: null,
      accessTokenExpiresAt: null,
      currentUser: null,
      tenantId: null,
      activeFactoryId: null,
      accessibleFactories: [],
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isLoadingSession: false,
      hasLoadedSession: true,
    });
  },
}));

setApiAuthRefreshHandler(() => useAuthStore.getState().refreshSession());
