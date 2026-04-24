"use client";

import { create } from "zustand";

/**
 * Tracks which bodies the user has added to their comparison tray.
 * Simple array, kept typed, ready to feed /compare tools.
 */
interface CompareState {
  selectedIds: string[];
  toggle: (id: string) => void;
  clear: () => void;
  set: (ids: string[]) => void;
}

export const useCompareStore = create<CompareState>((set) => ({
  selectedIds: ["earth", "mars", "jupiter"],
  toggle: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  clear: () => set({ selectedIds: [] }),
  set: (ids) => set({ selectedIds: ids }),
}));
