"use client";

import { create } from "zustand";
import {
  platformAuthApi,
  type PlatformAdminUser,
} from "@/lib/api/platform-auth";
import {
  setPlatformApiAccessToken,
  setPlatformApiAuthRefreshHandler,
} from "@/lib/api/platform-client";

interface PlatformAuthState {
  accessToken: string | null;
  platformAdmin: PlatformAdminUser | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  hasLoadedSession: boolean;
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
  });
}

export const usePlatformAuthStore = create<PlatformAuthState>((set, get) => ({
  accessToken: null,
  platformAdmin: null,
  isAuthenticated: false,
  isLoadingSession: false,
  hasLoadedSession: false,
  login: async (email, password) => {
    set({ isLoadingSession: true });
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

    set({ isLoadingSession: true });
    refreshPromise = platformAuthApi
      .refresh()
      .then((response) => {
        applySession(set, response.data.platformAdmin, response.data.accessToken);
        return true;
      })
      .catch(() => {
        get().clearSession();
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

    set({ isLoadingSession: true });
    try {
      const response = await platformAuthApi.me();
      applySession(set, response.data.platformAdmin);
      return true;
    } catch {
      get().clearSession();
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
    });
  },
}));

setPlatformApiAuthRefreshHandler(() =>
  usePlatformAuthStore.getState().refreshSession(),
);
