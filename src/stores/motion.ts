"use client";

import { create } from "zustand";

import { useExploreStore } from "@/store/explore-store";

export type MotionState = "idle" | "entering" | "playing" | "interactive" | "exiting";

type MotionStore = {
  state: MotionState;
  elapsed: number;
  /** Orbit rings in motion-mode interactive view. */
  showOrbitRings: boolean;
  accuracyOpen: boolean;
  enter: () => void;
  exit: () => void;
  skip: () => void;
  replay: () => void;
  setShowOrbitRings: (v: boolean) => void;
  setAccuracyOpen: (v: boolean) => void;
  tick: (dt: number) => void;
};

let prevExplorePlaying: boolean | null = null;
let prevExploreSpeed: number | null = null;

export const useMotionStore = create<MotionStore>((set, get) => ({
  state: "idle",
  elapsed: 0,
  showOrbitRings: false,
  accuracyOpen: false,

  enter: () => {
    const explore = useExploreStore.getState();
    prevExplorePlaying = explore.playing;
    prevExploreSpeed = explore.speed;

    // Phase 1–4: freeze motion during setup; cinematic beats control time later.
    explore.setPlaying(false);
    explore.setShowMotion(true);
    set({ state: "entering", elapsed: 0, showOrbitRings: false, accuracyOpen: false });
  },

  exit: () => {
    const explore = useExploreStore.getState();
    explore.setShowMotion(false);
    if (prevExplorePlaying != null) explore.setPlaying(prevExplorePlaying);
    if (prevExploreSpeed != null) explore.setSpeed(prevExploreSpeed);
    prevExplorePlaying = null;
    prevExploreSpeed = null;
    set({ state: "idle", elapsed: 0, showOrbitRings: false, accuracyOpen: false });
  },

  skip: () => {
    // Jump to interactive state (end of cinematic).
    const explore = useExploreStore.getState();
    explore.setSpeed(8);
    explore.setPlaying(true);
    set({ state: "interactive", elapsed: 14.0 });
  },

  replay: () => {
    const explore = useExploreStore.getState();
    explore.setPlaying(false);
    explore.setSpeed(8);
    explore.setShowMotion(true);
    set({ state: "entering", elapsed: 0, showOrbitRings: false, accuracyOpen: false });
  },

  setShowOrbitRings: (v) => set({ showOrbitRings: v }),
  setAccuracyOpen: (v) => set({ accuracyOpen: v }),

  tick: (dt: number) => {
    const { state, elapsed } = get();
    if (state === "idle") return;

    const next = elapsed + dt;

    // Beat 1 ends at 2s: start time and go to playing.
    if (state === "entering" && next >= 2.0) {
      const explore = useExploreStore.getState();
      explore.setSpeed(8);
      explore.setPlaying(true);
      set({ state: "playing", elapsed: next });
      return;
    }

    // Beat 5: handoff to interactive at ~14s.
    if (state === "playing" && next >= 14.0) {
      set({ state: "interactive", elapsed: next });
      return;
    }

    set({ elapsed: next });
  },
}));

