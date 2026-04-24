"use client";

import { create } from "zustand";

import { useExploreStore } from "@/store/explore-store";

export type MotionState =
  | "idle"
  | "transitioning_to_motion"
  | "motion_interactive"
  | "transitioning_to_normal";

type MotionStore = {
  state: MotionState;
  /** 0..1 progress for the active transition. */
  transitionProgress: number;
  accuracyOpen: boolean;
  enter: () => void;
  exit: () => void;
  setTransitionProgress: (v: number) => void;
  completeTransition: () => void;
  setAccuracyOpen: (v: boolean) => void;
};

export const useMotionStore = create<MotionStore>((set, get) => ({
  state: "idle",
  transitionProgress: 0,
  accuracyOpen: false,

  enter: () => {
    const { state } = get();
    if (state !== "idle") return;
    useExploreStore.getState().setShowMotion(true);
    set({ state: "transitioning_to_motion", transitionProgress: 0, accuracyOpen: false });
  },

  exit: () => {
    const { state } = get();
    if (state !== "motion_interactive") return;
    set({ state: "transitioning_to_normal", transitionProgress: 0, accuracyOpen: false });
  },

  setTransitionProgress: (v) => {
    set({ transitionProgress: Math.max(0, Math.min(1, v)) });
  },

  completeTransition: () => {
    const { state } = get();
    if (state === "transitioning_to_motion") {
      set({ state: "motion_interactive", transitionProgress: 1 });
      return;
    }

    if (state === "transitioning_to_normal") {
      useExploreStore.getState().setShowMotion(false);
      set({ state: "idle", transitionProgress: 0, accuracyOpen: false });
    }
  },

  setAccuracyOpen: (v) => set({ accuracyOpen: v }),
}));

