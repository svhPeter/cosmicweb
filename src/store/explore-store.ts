"use client";

import { create } from "zustand";
import * as THREE from "three";

export type ScaleMode = "visual" | "realistic";

/**
 * Store for the /explore scene.
 *
 * Intentionally small and typed. Purely ephemeral per-frame data (each
 * planet's current world position) is kept in a singleton Map that lives
 * *outside* Zustand — writing to the store every frame for every body
 * would thrash subscribers. Consumers who need a live position read the
 * registry directly via `bodyPositions.get(id)`.
 */
interface ExploreState {
  /** Body id currently focused by the camera (null = overview). */
  focusedBodyId: string | null;
  /** Body id currently selected (panel shown). */
  selectedBodyId: string | null;
  /** Body id being hovered (for tooltip / highlight). */
  hoveredBodyId: string | null;

  /**
   * Non-body inspectables (deep-sky anchors, concept entry objects, etc.).
   * These are *not* camera-focused by default — they may be extremely far.
   * Focus here is a UI notion used for hide/restore affordances.
   */
  focusedSceneObjectId: string | null;
  selectedSceneObjectId: string | null;
  hoveredSceneObjectId: string | null;

  /** Playback controls. */
  playing: boolean;
  speed: number;
  scaleMode: ScaleMode;

  /** Simulation time in Julian days (floating). */
  simulationJd: number;

  /**
   * Whether to use accurate Keplerian orbits for bodies that have elements.
   * When `false`, the scene uses the stylised circular layout — the default
   * for readability. When `true`, positions come from the Kepler solver.
   */
  useRealOrbits: boolean;

  /**
   * Whether the scene is rendered in the galactic frame of reference. When
   * on, the Sun (and the planets with it) drift along the Sun's galactic
   * motion axis, planets leave helical trails in world space, orbit rings
   * fade, and parallax dust streams past. This is a peer toggle to
   * `useRealOrbits` — both upgrade the scene toward physical truth.
   */
  galactic: boolean;

  /**
   * Scale Mode — one narrowly scoped educational pose. When on, the
   * Earth-Moon separation snaps to its true 60-Earth-radii ratio,
   * making the shock of real space distances tangible. Independent
   * of `useRealOrbits` (which affects heliocentric orbits) and
   * `galactic` (which is the frame of reference). Off by default.
   */
  earthMoonScaleMode: boolean;

  setFocused: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setFocusedSceneObject: (id: string | null) => void;
  setSelectedSceneObject: (id: string | null) => void;
  setHoveredSceneObject: (id: string | null) => void;
  togglePlaying: () => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  setScaleMode: (m: ScaleMode) => void;
  setSimulationJd: (jd: number) => void;
  setUseRealOrbits: (v: boolean) => void;
  setGalactic: (v: boolean) => void;
  setEarthMoonScaleMode: (v: boolean) => void;
  reset: () => void;
}

/**
 * Today's JD — refreshed at module load. For long-lived tabs this is fine
 * because the simulation clock advances itself inside useFrame.
 */
function jdNow(): number {
  return Date.now() / 86_400_000 + 2_440_587.5;
}

export const useExploreStore = create<ExploreState>((set) => ({
  focusedBodyId: null,
  selectedBodyId: null,
  hoveredBodyId: null,
  focusedSceneObjectId: null,
  selectedSceneObjectId: null,
  hoveredSceneObjectId: null,
  playing: true,
  speed: 1,
  scaleMode: "visual",
  simulationJd: jdNow(),
  useRealOrbits: false,
  galactic: false,
  earthMoonScaleMode: false,

  setFocused: (id) => set({ focusedBodyId: id }),
  /**
   * When selecting a body, camera focus follows. Clearing selection only
   * hides the detail panel; focus is unchanged so the user keeps their
   * current view. Use setFocused(null) (e.g. Esc, Reset) to return to
   * system overview.
   */
  setSelected: (id) =>
    set({
      selectedBodyId: id,
      ...(id != null ? { focusedBodyId: id } : {}),
    }),
  setHovered: (id) => set({ hoveredBodyId: id }),

  setFocusedSceneObject: (id) => set({ focusedSceneObjectId: id }),
  /**
   * Selecting a scene object opens the inspection panel, but does not
   * drive the camera — deep-sky anchors are intentionally "inspect in place".
   * Clearing selection hides the panel only; focus is unchanged so the
   * "Details" restore affordance can bring it back.
   */
  setSelectedSceneObject: (id) =>
    set({
      selectedSceneObjectId: id,
      ...(id != null ? { focusedSceneObjectId: id } : {}),
    }),
  setHoveredSceneObject: (id) => set({ hoveredSceneObjectId: id }),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (v) => set({ playing: v }),
  setSpeed: (v) => set({ speed: Math.max(0, Math.min(8, v)) }),
  setScaleMode: (m) => set({ scaleMode: m }),
  setSimulationJd: (jd) => set({ simulationJd: jd }),
  setUseRealOrbits: (v) => set({ useRealOrbits: v }),
  setGalactic: (v) => set({ galactic: v }),
  setEarthMoonScaleMode: (v) => set({ earthMoonScaleMode: v }),
  reset: () =>
    set({
      focusedBodyId: null,
      selectedBodyId: null,
      hoveredBodyId: null,
      focusedSceneObjectId: null,
      selectedSceneObjectId: null,
      hoveredSceneObjectId: null,
      playing: true,
      speed: 1,
      simulationJd: jdNow(),
    }),
}));

/**
 * Per-frame position registry. Planets write to this from useFrame; the
 * camera controller reads from it. Lives outside Zustand to avoid per-frame
 * subscriber churn.
 */
export const bodyPositions = new Map<string, THREE.Vector3>();

export function reportBodyPosition(id: string, v: THREE.Vector3): void {
  let existing = bodyPositions.get(id);
  if (!existing) {
    existing = new THREE.Vector3();
    bodyPositions.set(id, existing);
  }
  existing.copy(v);
}
