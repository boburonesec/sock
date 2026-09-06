"use client";

import { create } from "zustand";
import {
  ApiError,
  setPlatformApiAccessToken,
  setPlatformApiAuthRefreshHandler,
} from "@/lib/api/platform-client";
import {
  platformAuthApi,
  type PlatformAdminUser,
} from "@/lib/api/platform-auth";

interface PlatformAuthState {
  accessToken: string | null;
  platformAdmin: PlatformAdminUser | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  hasLoadedSession: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loadMe: () => Promise<boolean>;
  clearSession: () => void;
}

let refreshPromise: Promise<boolean> | null = null;

function applySession(
  set: (partial: Partial<PlatformAuthState>) => void,
  platformAdmin: PlatformAdminUser,
  accessToken?: string,
): void {
  if (accessToken) {
    setPlatformApiAccessToken(accessToken);
  }

  set({
    ...(accessToken ? { accessToken } : {}),
    platformAdmin,
    isAuthenticated: true,
    isLoadingSession: false,
    hasLoadedSession: true,
    sessionError: null,
  });
}

export const usePlatformAuthStore = create<PlatformAuthState>((set, get) => ({
  accessToken: null,
  platformAdmin: null,
  isAuthenticated: false,
  isLoadingSession: false,
  hasLoadedSession: false,
  sessionError: null,
  login: async (email, password) => {
    set({ isLoadingSession: true, sessionError: null });
    try {
      const response = await platformAuthApi.login({ email, password });
      applySession(set, response.data.platformAdmin, response.data.accessToken);
    } catch (error) {
      get().clearSession();
      throw error;
    }
  },
  logout: async () => {
    try {
      await platformAuthApi.logout();
    } finally {
      get().clearSession();
    }
  },
  refreshSession: async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    set({ isLoadingSession: true, sessionError: null });
    refreshPromise = platformAuthApi
      .refresh()
      .then((response) => {
        applySession(set, response.data.platformAdmin, response.data.accessToken);
        return true;
      })
      .catch((error: unknown) => {
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
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  },
  loadMe: async () => {
    if (!get().accessToken) {
      return get().refreshSession();
    }

    set({ isLoadingSession: true, sessionError: null });
    try {
      const response = await platformAuthApi.me();
      applySession(set, response.data.platformAdmin);
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
    setPlatformApiAccessToken(null);
    set({
      accessToken: null,
      platformAdmin: null,
      isAuthenticated: false,
      isLoadingSession: false,
      hasLoadedSession: true,
      sessionError: null,
    });
  },
}));

setPlatformApiAuthRefreshHandler(() =>
  usePlatformAuthStore.getState().refreshSession(),
);
