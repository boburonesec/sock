import { create } from "zustand";
import { getRequestContext, isContextCurrent, sameSession, type RequestContextSnapshot } from "@/lib/auth/request-context";
import { ContextChangedError } from "@/lib/api/errors";

interface UiState {
  isDeveloperInfoVisible: boolean;
  setDeveloperInfoVisible: (isVisible: boolean) => void;
  flash: { id: number; message: string; origin: RequestContextSnapshot } | null;
  showFlash: (message: string) => void;
  clearFlash: (id?: number) => void;
  contextNotices: { id: number; message: string; origin: RequestContextSnapshot; kind: "context" | "storage" | "outcome" }[];
  showContextNotice: (message: string, kind?: "context" | "storage" | "outcome") => void;
  clearFactoryPersistenceNotice: () => void;
  reportContextOutcome: (error: ContextChangedError) => void;
  clearContextNotice: () => void;
  clearContextFeedback: () => void;
}
let sequence = 0;
export const useUiStore = create<UiState>((set, get) => ({
  isDeveloperInfoVisible: false,
  setDeveloperInfoVisible: (isDeveloperInfoVisible) => set({ isDeveloperInfoVisible }),
  flash: null,
  showFlash: (message) => {
    const origin = getRequestContext();
    if (isContextCurrent(origin)) set({ flash: { id: ++sequence, message, origin } });
  },
  clearFlash: (id) => { if (id === undefined || get().flash?.id === id) set({ flash: null }); },
  contextNotices: [],
  showContextNotice: (message, kind = "context") => set((state) => ({
    contextNotices: [
      ...state.contextNotices.filter((notice) => kind !== "context" || notice.kind !== "context"),
      ...(!state.contextNotices.some((notice) => notice.kind === kind && notice.message === message) || kind === "context"
        ? [{ id: ++sequence, message, origin: getRequestContext(), kind }] : []),
    ], flash: null,
  })),
  clearFactoryPersistenceNotice: () => set((state) => ({ contextNotices: state.contextNotices.filter((notice) => notice.kind !== "storage") })),
  reportContextOutcome: (error) => {
    // A result from another login/account never becomes current-user feedback.
    if (sameSession(error.origin)) get().showContextNotice(String((error.body as { message: string }).message), "outcome");
  },
  clearContextNotice: () => set({ contextNotices: [] }),
  clearContextFeedback: () => set({ flash: null, contextNotices: [] }),
}));
