import { create } from "zustand";

interface UiState {
  isDeveloperInfoVisible: boolean;
  setDeveloperInfoVisible: (isVisible: boolean) => void;
  /**
   * One-shot success message. A form screen sets it and navigates back; the
   * screen the operator lands on shows it, so the result of a write is always
   * confirmed next to the refreshed data.
   */
  flash: { id: number; message: string } | null;
  showFlash: (message: string) => void;
  clearFlash: (id?: number) => void;
}

let flashSequence = 0;

export const useUiStore = create<UiState>((set, get) => ({
  isDeveloperInfoVisible: false,
  setDeveloperInfoVisible: (isDeveloperInfoVisible) =>
    set({ isDeveloperInfoVisible }),
  flash: null,
  showFlash: (message) => {
    flashSequence += 1;
    set({ flash: { id: flashSequence, message } });
  },
  clearFlash: (id) => {
    if (id === undefined || get().flash?.id === id) {
      set({ flash: null });
    }
  },
}));
