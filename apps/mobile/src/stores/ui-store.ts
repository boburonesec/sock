import { create } from "zustand";

interface UiState {
  isDeveloperInfoVisible: boolean;
  setDeveloperInfoVisible: (isVisible: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isDeveloperInfoVisible: false,
  setDeveloperInfoVisible: (isDeveloperInfoVisible) =>
    set({ isDeveloperInfoVisible }),
}));

