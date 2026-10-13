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
  /** Switches the factory every request is scoped to (multi-factory users). */
  setActiveFactory: (factoryId: string) => void;
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * The API answers /auth/me and /auth/refresh with the user's default factory.
 * A factory the user picked on this device is kept while it is still
 * accessible, so a background token refresh does not silently move a
 * multi-factory operator back to another factory mid-task.
 */
function withPreferredFactory(context: AuthContext, preferredFactoryId: string | null): AuthContext {
  const isStillAccessible =
    preferredFactoryId !== null &&
    context.accessibleFactories.some((factory) => factory.id === preferredFactoryId);

  return isStillAccessible ? { ...context, activeFactoryId: preferredFactoryId } : context;
}

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

    // Keychain/Keystore can fail (device restore, OS upgrade). Treat it as
    // "no stored session" instead of hanging on the splash screen forever.
    const storedSession = await loadStoredSession().catch(() => null);

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
    } catch {
      // Offline logout still ends the local session; the refresh cookie
      // expires server-side on its own.
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
        const context = withPreferredFactory(response.data, get().activeFactoryId);

        setApiAccessToken(response.data.accessToken);
        applyApiContext(context);
        set(buildAuthenticatedState(context, response.data.accessToken, accessTokenExpiresAt));

        return true;
      })
      .catch(async () => {
        // Reset the whole session, not just storage: a refresh triggered by a
        // background 401 otherwise left isAuthenticated=true with a dead token
        // and isLoadingSession stuck at true (disabled buttons, endless spinner).
        await get().clearSession();
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
      const context = withPreferredFactory(response.data, get().activeFactoryId);
      applyApiContext(context);
      set(buildAuthenticatedState(context, accessToken, get().accessTokenExpiresAt));
      return true;
    } catch {
      await get().clearSession();
      return false;
    }
  },
  setActiveFactory: (factoryId) => {
    if (
      factoryId === get().activeFactoryId ||
      !get().accessibleFactories.some((factory) => factory.id === factoryId)
    ) {
      return;
    }

    setApiActiveFactoryId(factoryId);
    // Every cached list belongs to the previous factory.
    clearMobileQueryCache();
    set({ activeFactoryId: factoryId });
  },
  clearSession: async () => {
    await clearStoredSession().catch(() => undefined);
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
