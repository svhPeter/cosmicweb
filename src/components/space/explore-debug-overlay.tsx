"use client";

import { useEffect, useState } from "react";

import { galacticState } from "@/store/galactic-state";
import { useExploreStore } from "@/store/explore-store";

/**
 * Optional field triage overlay: add `?exploreDebug=1` to `/explore`.
 * Reads Zustand + `galacticState` without subscribing the whole route to
 * high-frequency store updates — repaint on a fixed interval only.
 */
export function ExploreDebugOverlay() {
  const [, bump] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => bump((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, []);

  const s = useExploreStore.getState();

  return (
    <div
      className="pointer-events-none fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-[max(0.75rem,env(safe-area-inset-left))] z-[200] max-w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-white/10 bg-black/75 px-2.5 py-2 font-mono text-[10px] leading-snug text-white/90 shadow-lg backdrop-blur-sm"
      aria-hidden
    >
      <div className="mb-1 text-[9px] uppercase tracking-wider text-white/50">exploreDebug</div>
      <div>playing={String(s.playing)}</div>
      <div>galactic={String(s.galactic)}</div>
      <div>revealT={galacticState.revealT.toFixed(4)}</div>
      <div>speed={s.speed}</div>
      <div>simulationJd={s.simulationJd.toFixed(4)}</div>
      <div>useRealOrbits={String(s.useRealOrbits)}</div>
      <div>earthMoonScale={String(s.earthMoonScaleMode)}</div>
      <div>focus={s.focusedBodyId ?? "—"}</div>
      <div>select={s.selectedBodyId ?? "—"}</div>
    </div>
  );
}
