"use client";

import { create } from "zustand";
import { authApi, type AuthContext, type AuthFactory, type AuthUser } from "@/lib/api/auth";
import {
  ApiError,
  setApiAccessToken,
  setApiActiveFactoryId,
  setApiAuthRefreshHandler,
} from "@/lib/api/client";

interface AuthState {
  accessToken: string | null;
  currentUser: AuthUser | null;
  tenantId: string | null;
  branchMode: "SINGLE" | "MULTI" | null;
  activeFactoryId: string | null;
  accessibleFactories: AuthFactory[];
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  hasLoadedSession: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loadMe: () => Promise<boolean>;
  setActiveFactory: (factoryId: string) => void;
  clearSession: () => void;
}

let refreshPromise: Promise<boolean> | null = null;

function applySession(
  set: (partial: Partial<AuthState>) => void,
  context: AuthContext,
  accessToken?: string,
): void {
  if (accessToken) {
    setApiAccessToken(accessToken);
  }

  setApiActiveFactoryId(context.activeFactoryId);
  set({
    ...(accessToken ? { accessToken } : {}),
    currentUser: context.user,
    tenantId: context.tenantId,
    branchMode: context.branchMode,
    activeFactoryId: context.activeFactoryId,
    accessibleFactories: context.accessibleFactories,
    roles: context.roles,
    permissions: context.permissions,
    isAuthenticated: true,
    isLoadingSession: false,
    hasLoadedSession: true,
    sessionError: null,
  });
}

function clearApiSession(): void {
  setApiAccessToken(null);
  setApiActiveFactoryId(null);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  currentUser: null,
  tenantId: null,
  branchMode: null,
  activeFactoryId: null,
  accessibleFactories: [],
  roles: [],
  permissions: [],
  isAuthenticated: false,
  isLoadingSession: false,
  hasLoadedSession: false,
  sessionError: null,
  login: async (email, password) => {
    set({ isLoadingSession: true, sessionError: null });
    try {
      const response = await authApi.login({ email, password });
      applySession(set, response.data, response.data.accessToken);
    } catch (error) {
      get().clearSession();
      throw error;
    }
  },
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      get().clearSession();
    }
  },
  refreshSession: async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    set({ isLoadingSession: true, sessionError: null });
    refreshPromise = authApi
      .refresh()
      .then((response) => {
        applySession(set, response.data, response.data.accessToken);
        return true;
      })
      .catch((error: unknown) => {
        const isAuthRejection =
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403);

        if (isAuthRejection) {
          get().clearSession();
        } else {
          // Network failure, cold start, 502/503/504, or timeout:
          // Do NOT wipe out valid session data; preserve status and record error.
          const errorMessage =
            error instanceof Error ? error.message : "Serverga ulanishda xatolik yuz berdi.";
          set({
            isLoadingSession: false,
            hasLoadedSession: true,
            sessionError: errorMessage,
          });
        }
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  },
  setActiveFactory: (factoryId) => {
    const accessible = get().accessibleFactories;
    if (!accessible.some((factory) => factory.id === factoryId)) {
      return;
    }
    setApiActiveFactoryId(factoryId);
    set({ activeFactoryId: factoryId });
  },
  loadMe: async () => {
    if (!get().accessToken) {
      return get().refreshSession();
    }

    set({ isLoadingSession: true, sessionError: null });
    try {
      const response = await authApi.me();
      applySession(set, response.data);
      return true;
    } catch (error: unknown) {
      const isAuthRejection =
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403);

      if (isAuthRejection) {
        get().clearSession();
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Serverga ulanishda xatolik yuz berdi.";
        set({
          isLoadingSession: false,
          hasLoadedSession: true,
          sessionError: errorMessage,
        });
      }
      return false;
    }
  },
  clearSession: () => {
    clearApiSession();
    set({
      accessToken: null,
      currentUser: null,
      tenantId: null,
      branchMode: null,
      activeFactoryId: null,
      accessibleFactories: [],
      roles: [],
      permissions: [],
      isAuthenticated: false,
      isLoadingSession: false,
      hasLoadedSession: true,
      sessionError: null,
    });
  },
}));

setApiAuthRefreshHandler(() => useAuthStore.getState().refreshSession());
