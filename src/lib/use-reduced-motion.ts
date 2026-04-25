"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion` media query.
 *
 * Concept scenes (black hole, wormhole, neutron star) drive their
 * visuals through a shader time uniform advanced by `delta`. When the
 * user prefers reduced motion we scale that delta toward zero so
 * rotations, beams, and disk motion damp to near-stillness without
 * killing the frame loop — the scene still responds to the camera,
 * it just doesn't strobe on its own.
 *
 * SSR-safe: hydrates as `false` on the server and corrects on mount.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const update = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}
