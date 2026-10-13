import { create } from "zustand";
import type { AuthContext, AuthFactory, AuthUser, NativeAuthSession } from "@paypoq/shared";

import { clearMobileQueryCache } from "@/providers/query-cache";
import { authApi } from "@/lib/api/auth";
import { ApiError, SessionStorageError, getUserFacingErrorMessage } from "@/lib/api/errors";
import {
  advanceApiSessionGeneration, getApiSessionGeneration,
  setApiAccessToken, setApiActiveFactoryId, setApiAuthRefreshHandler, setApiAuthFailureHandler,
} from "@/lib/api/client";
import {
  clearStoredSession, getAccessTokenExpiresAt, isAccessTokenUsable,
  loadStoredSession, saveStoredSession,
} from "@/lib/auth/session-storage";

interface AuthState {
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  currentUser: AuthUser | null;
  tenantId: string | null;
  branchMode: AuthContext["branchMode"] | null;
  activeFactoryId: string | null;
  accessibleFactories: AuthFactory[];
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  hasLoadedSession: boolean;
  sessionError: string | null;
  initializeSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loadMe: () => Promise<boolean>;
  clearSession: () => Promise<void>;
  setActiveFactory: (factoryId: string) => void;
}

const signedOut = {
  accessToken: null, accessTokenExpiresAt: null, currentUser: null, tenantId: null,
  branchMode: null, activeFactoryId: null, accessibleFactories: [], roles: [], permissions: [],
  isAuthenticated: false, isLoadingSession: false, hasLoadedSession: true, sessionError: null,
};

function withPreferredFactory(context: AuthContext, preferred: string | null): AuthContext {
  return preferred && context.accessibleFactories.some((factory) => factory.id === preferred)
    ? { ...context, activeFactoryId: preferred } : context;
}

function terminal(error: unknown): boolean {
  // This classification applies to auth/me and native refresh, not domain 403s.
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

const defaultStorage = { clearStoredSession, loadStoredSession, saveStoredSession };

/** Real Zustand session store, with only the OS storage adapter substitutable in tests. */
export function createAuthStore(storage = defaultStorage) {
  let generation = getApiSessionGeneration();
  let refreshToken: string | null = null;
  let refreshPromise: Promise<boolean> | null = null;
  let initialization: Promise<void> | null = null;
  const current = (captured: number) => generation === captured && getApiSessionGeneration() === captured;
  const revoke = async (token: string | null) => {
    if (token) await authApi.logout(token).catch(() => undefined);
  };

  const store = create<AuthState>((set, get) => {
    function endLocalSession() {
      generation = advanceApiSessionGeneration();
      refreshPromise = null;
      initialization = null;
      refreshToken = null;
      setApiAccessToken(null);
      setApiActiveFactoryId(null);
      clearMobileQueryCache();
      set(signedOut);
      return generation;
    }

    async function clearPersistence(captured: number) {
      try {
        await storage.clearStoredSession();
      } catch (error) {
        if (current(captured)) set({ sessionError: getUserFacingErrorMessage(error) });
        throw error;
      }
    }

    function apply(context: AuthContext, token: string, expiresAt: number) {
      setApiAccessToken(token);
      setApiActiveFactoryId(context.activeFactoryId);
      set({
        accessToken: token, accessTokenExpiresAt: expiresAt, currentUser: context.user,
        tenantId: context.tenantId, branchMode: context.branchMode, activeFactoryId: context.activeFactoryId,
        accessibleFactories: context.accessibleFactories, roles: context.roles, permissions: context.permissions,
        isAuthenticated: true, isLoadingSession: false, hasLoadedSession: true, sessionError: null,
      });
    }

    async function accept(session: NativeAuthSession, captured: number, preserveFactory = false) {
      if (!current(captured)) { await revoke(session.refreshToken); return false; }
      const expiresAt = getAccessTokenExpiresAt(session.accessTokenExpiresInSeconds);
      try {
        await storage.saveStoredSession({
          accessToken: session.accessToken, accessTokenExpiresAt: expiresAt, refreshToken: session.refreshToken,
        }, () => current(captured));
      } catch (error) {
        // Rotation has consumed the previous credential. Never keep a session
        // whose successor could not be persisted, or silently use the old token.
        if (current(captured)) {
          const next = endLocalSession();
          await clearPersistence(next).catch(() => undefined);
          if (current(next)) set({ sessionError: getUserFacingErrorMessage(error) });
        }
        await revoke(session.refreshToken);
        throw error;
      }
      if (!current(captured)) { await revoke(session.refreshToken); return false; }
      refreshToken = session.refreshToken;
      apply(withPreferredFactory(session, preserveFactory ? get().activeFactoryId : null), session.accessToken, expiresAt);
      return true;
    }

    return {
      ...signedOut, hasLoadedSession: false,
      initializeSession: () => {
        if (initialization) return initialization;
        const captured = generation;
        set({ isLoadingSession: true, sessionError: null });
        const pending = (async () => {
          try {
            const stored = await storage.loadStoredSession();
            if (!current(captured)) return;
            if (!stored) { set({ ...signedOut }); return; }
            refreshToken = stored.refreshToken;
            if (isAccessTokenUsable(stored.accessTokenExpiresAt)) {
              setApiAccessToken(stored.accessToken);
              try {
                const response = await authApi.me();
                if (current(captured)) apply(response.data, stored.accessToken, stored.accessTokenExpiresAt);
                return;
              } catch (error) {
                if (!current(captured)) return;
                if (!terminal(error)) throw error;
                setApiAccessToken(null);
              }
            }
            await get().refreshSession();
          } catch (error) {
            if (current(captured)) {
              setApiAccessToken(null);
              set({ sessionError: getUserFacingErrorMessage(error) });
            }
          } finally {
            if (current(captured)) set({ isLoadingSession: false, hasLoadedSession: true });
          }
        })().finally(() => {
          if (initialization === pending) initialization = null;
        });
        initialization = pending;
        return pending;
      },
      login: async (email, password) => {
        const previousToken = refreshToken;
        const captured = endLocalSession();
        set({ isLoadingSession: true });
        void revoke(previousToken);
        try {
          // An unsuccessful account switch must not restore the previous account on restart.
          await clearPersistence(captured);
          if (!current(captured)) return;
          const response = await authApi.login({ email, password });
          await accept(response.data, captured);
        } catch (error) {
          if (current(captured)) set({
            isLoadingSession: false,
            sessionError: error instanceof SessionStorageError ? getUserFacingErrorMessage(error) : null,
          });
          throw error;
        }
      },
      logout: async () => {
        const token = refreshToken;
        // Fence immediately, before either network or storage awaits.
        const captured = endLocalSession();
        // Best effort server revocation; local logout never waits on connectivity.
        void revoke(token);
        await clearPersistence(captured).catch(() => undefined);
      },
      refreshSession: () => {
        if (refreshPromise) return refreshPromise;
        const captured = generation;
        const token = refreshToken;
        if (!token) return Promise.resolve(false);
        const pending = authApi.refresh(token).then((response) => accept(response.data, captured, true))
          .catch(async (error) => {
            if (!current(captured)) return false;
            if (terminal(error)) {
              await get().clearSession();
              return false;
            }
            // Offline, 429 and 5xx retain credentials and allow an explicit retry.
            set({ sessionError: getUserFacingErrorMessage(error) });
            throw error;
          }).finally(() => {
            if (refreshPromise === pending) refreshPromise = null;
          });
        refreshPromise = pending;
        return pending;
      },
      loadMe: async () => {
        if (!get().accessToken) return get().refreshSession();
        const captured = generation;
        try {
          const response = await authApi.me();
          if (!current(captured)) return false;
          apply(withPreferredFactory(response.data, get().activeFactoryId), get().accessToken!, get().accessTokenExpiresAt!);
          return true;
        } catch (error) {
          if (!current(captured)) return false;
          if (terminal(error)) return get().refreshSession();
          set({ sessionError: getUserFacingErrorMessage(error) });
          throw error;
        }
      },
      setActiveFactory: (factoryId) => {
        if (factoryId === get().activeFactoryId || !get().accessibleFactories.some((f) => f.id === factoryId)) return;
        setApiActiveFactoryId(factoryId);
        clearMobileQueryCache();
        set({ activeFactoryId: factoryId });
      },
      clearSession: async () => {
        const captured = endLocalSession();
        await clearPersistence(captured).catch(() => undefined);
      },
    };
  });
  setApiAuthRefreshHandler(() => store.getState().refreshSession());
  setApiAuthFailureHandler(() => store.getState().clearSession());
  return store;
}

export const useAuthStore = createAuthStore();
