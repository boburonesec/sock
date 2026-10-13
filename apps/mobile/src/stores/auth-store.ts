import { create } from "zustand";
import { resolveSessionFactory, type FactoryPreference, type AuthContext, type AuthFactory, type AuthUser, type NativeAuthSession } from "@paypoq/shared";

import { cancelFactoryQueries, clearMobileQueryCache } from "@/providers/query-cache";
import { authApi } from "@/lib/api/auth";
import { ApiError, SessionStorageError, getUserFacingErrorMessage } from "@/lib/api/errors";
import {
  advanceApiSessionGeneration, getApiSessionGeneration,
  setApiAccessToken, setApiSessionContext, setApiAuthRefreshHandler, setApiAuthFailureHandler,
} from "@/lib/api/client";
import {
  clearStoredSession, getAccessTokenExpiresAt, isAccessTokenUsable,
  loadStoredSession, saveStoredSession, updateFactoryPreference,
} from "@/lib/auth/session-storage";

import { getRequestContext } from "@/lib/auth/request-context";
import { useUiStore } from "@/stores/ui-store";

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
  factoryPreferenceError: string | null;
  initializeSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loadMe: () => Promise<boolean>;
  clearSession: () => Promise<void>;
  setActiveFactory: (factoryId: string) => Promise<boolean>;
}

const signedOut = {
  accessToken: null, accessTokenExpiresAt: null, currentUser: null, tenantId: null,
  branchMode: null, activeFactoryId: null, accessibleFactories: [], roles: [], permissions: [],
  isAuthenticated: false, isLoadingSession: false, hasLoadedSession: true, sessionError: null, factoryPreferenceError: null,
};

function preferenceFor(context: AuthContext): FactoryPreference {
  return { tenantId: context.tenantId, userId: context.user.id, factoryId: context.activeFactoryId };
}

function withPreference(context: AuthContext, preference?: FactoryPreference | null): AuthContext {
  return { ...context, activeFactoryId: resolveSessionFactory(context, preference) };
}

function terminal(error: unknown): boolean {
  // This classification applies to auth/me and native refresh, not domain 403s.
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

const defaultStorage = { clearStoredSession, loadStoredSession, saveStoredSession, updateFactoryPreference };

/** Real Zustand session store, with only the OS storage adapter substitutable in tests. */
export function createAuthStore(storage = defaultStorage) {
  let generation = getApiSessionGeneration();
  let refreshToken: string | null = null;
  let restoredPreference: FactoryPreference | null = null;
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
      restoredPreference = null;
      setApiAccessToken(null);
      useUiStore.getState().clearContextFeedback();
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
      const previous = getRequestContext();
      if (previous.userId === context.user.id && previous.tenantId === context.tenantId && previous.factoryId !== context.activeFactoryId) {
        void cancelFactoryQueries(previous);
      }
      const next = setApiSessionContext(context);
      if (previous.userId !== null && previous.sessionGeneration === next.sessionGeneration && previous.userId === next.userId && previous.revision !== next.revision) {
        useUiStore.getState().showContextNotice(`${next.factoryName ?? "Korxona"}: korxona yoki kirish ruxsatlari o'zgardi. Ochilgan shakllar va tasdiqlashlar bekor qilindi. Ma'lumotlarni qayta kiriting.`);
      }
      set({
        accessToken: token, accessTokenExpiresAt: expiresAt, currentUser: context.user,
        tenantId: context.tenantId, branchMode: context.branchMode, activeFactoryId: context.activeFactoryId,
        accessibleFactories: context.accessibleFactories, roles: context.roles, permissions: context.permissions,
        isAuthenticated: true, isLoadingSession: false, hasLoadedSession: true, sessionError: null, factoryPreferenceError: null,
      });
    }

    function preferred(context: AuthContext): FactoryPreference | null {
      const state = get();
      return state.currentUser?.id === context.user.id && state.tenantId === context.tenantId
        ? { tenantId: context.tenantId, userId: context.user.id, factoryId: state.activeFactoryId }
        : restoredPreference;
    }

    async function persistPreference(context: AuthContext, captured: number) {
      try {
        await storage.updateFactoryPreference(preferenceFor(context), () => current(captured) &&
          get().currentUser?.id === context.user.id && get().tenantId === context.tenantId &&
          get().activeFactoryId === context.activeFactoryId);
      } catch {
        // Preference-only failure must not destroy a securely stored rotated token.
        if (current(captured)) {
          const message = `${context.accessibleFactories.find((f) => f.id === context.activeFactoryId)?.name ?? "Tanlangan korxona"}: tanlov qurilmada saqlanmadi. Profil orqali korxonani qayta tanlang.`;
          set({ factoryPreferenceError: message });
          useUiStore.getState().showContextNotice(message, "storage");
        }
        return false;
      }
      if (current(captured) && get().activeFactoryId === context.activeFactoryId) {
        set({ factoryPreferenceError: null });
        useUiStore.getState().clearFactoryPersistenceNotice();
      }
      return true;
    }

    async function accept(session: NativeAuthSession, captured: number, preserveFactory = false) {
      if (!current(captured)) { await revoke(session.refreshToken); return false; }
      const expiresAt = getAccessTokenExpiresAt(session.accessTokenExpiresInSeconds);
      const initialContext = withPreference(session, preserveFactory ? preferred(session) : null);
      try {
        await storage.saveStoredSession({
          accessToken: session.accessToken, accessTokenExpiresAt: expiresAt, refreshToken: session.refreshToken,
          factoryPreference: preferenceFor(initialContext),
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
      const context = withPreference(session, preserveFactory ? preferred(session) : null);
      restoredPreference = null;
      apply(context, session.accessToken, expiresAt);
      if (context.activeFactoryId !== initialContext.activeFactoryId) await persistPreference(context, captured);
      else useUiStore.getState().clearFactoryPersistenceNotice();
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
            restoredPreference = stored.factoryPreference ?? null;
            if (isAccessTokenUsable(stored.accessTokenExpiresAt)) {
              setApiAccessToken(stored.accessToken);
              try {
                const response = await authApi.me();
                if (current(captured)) {
                  const context = withPreference(response.data, restoredPreference);
                  restoredPreference = null;
                  apply(context, stored.accessToken, stored.accessTokenExpiresAt);
                  await persistPreference(context, captured);
                }
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
          const context = withPreference(response.data, preferred(response.data));
          apply(context, get().accessToken!, get().accessTokenExpiresAt!);
          await persistPreference(context, captured);
          return true;
        } catch (error) {
          if (!current(captured)) return false;
          if (terminal(error)) return get().refreshSession();
          set({ sessionError: getUserFacingErrorMessage(error) });
          throw error;
        }
      },
      setActiveFactory: async (factoryId) => {
        const state = get();
        if (!state.isAuthenticated || !state.currentUser || !state.tenantId || !state.branchMode ||
            !state.accessibleFactories.some((factory) => factory.id === factoryId)) {
          set({ sessionError: "Bu fabrikaga ruxsatingiz yo'q." });
          return false;
        }
        const context: AuthContext = {
          user: state.currentUser, tenantId: state.tenantId, branchMode: state.branchMode,
          activeFactoryId: factoryId, accessibleFactories: state.accessibleFactories,
          roles: state.roles, permissions: state.permissions,
        };
        if (factoryId !== state.activeFactoryId) apply(context, state.accessToken!, state.accessTokenExpiresAt!);
        return persistPreference(context, generation);
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
