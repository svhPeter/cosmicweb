"use client";

import { create } from "zustand";

/**
 * Store for the named deep-sky HUD system.
 *
 * Two orthogonal kinds of "attention" an object can carry:
 *
 *   hoveredId   Transient. Set while the pointer is over the hit target.
 *               On mouse-out it clears. On touch it's never set — tap
 *               goes straight to `pinnedId`.
 *
 *   pinnedId    Sticky. Set by click/tap. Survives pointer moves. Cleared
 *               by clicking the panel's close button or by clicking
 *               another named object. Touch users rely exclusively on
 *               pinnedId because hover doesn't exist on touch.
 *
 * The visible screen-space panel renders whichever is set, with pinnedId
 * taking priority. That way mousing over several objects in a row
 * previews each one, and a click locks the current one in place.
 */
interface DeepSkyState {
  hoveredId: string | null;
  pinnedId: string | null;
  setHovered: (id: string | null) => void;
  setPinned: (id: string | null) => void;
  togglePinned: (id: string) => void;
  clear: () => void;
}

export const useDeepSkyStore = create<DeepSkyState>((set) => ({
  hoveredId: null,
  pinnedId: null,
  setHovered: (id) => set({ hoveredId: id }),
  setPinned: (id) => set({ pinnedId: id }),
  togglePinned: (id) =>
    set((s) => ({ pinnedId: s.pinnedId === id ? null : id })),
  clear: () => set({ hoveredId: null, pinnedId: null }),
}));

/**
 * Resolve which id should be "active" for the HUD — pin wins over hover.
 * Callers who subscribe to this selector only re-render when the active
 * id actually changes, not on every hover micro-event.
 */
export const selectActiveDeepSkyId = (s: DeepSkyState): string | null =>
  s.pinnedId ?? s.hoveredId;
