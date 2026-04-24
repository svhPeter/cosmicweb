"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

import { ExploreHud } from "@/components/space/explore-hud";
import { ExploreSidebar } from "@/components/space/explore-sidebar";
import { SelectionPanel } from "@/components/space/selection-panel";
import { SceneErrorBoundary } from "@/components/space/scene-error-boundary";
import { ExploreLoader } from "@/components/space/explore-loader";

/**
 * The 3D scene is the heaviest module in the app (three.js + r3f + drei
 * + every scene component). Deferring it via next/dynamic keeps it out
 * of the route bundle — users see the loader skeleton first, and the
 * WebGL runtime streams in afterwards.
 *
 *   ssr: false   — WebGL cannot initialise on the server, and deferring
 *                  also lets the HUD chrome paint before three.js
 *                  finishes parsing.
 *   loading:     — the same cinematic loader the page shell uses, so the
 *                  handoff is seamless.
 */
const SolarSystemScene = dynamic(
  () => import("@/components/space/solar-system-scene").then((m) => m.SolarSystemScene),
  { ssr: false, loading: () => <ExploreLoader /> }
);

export default function Experience() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [introActive, setIntroActive] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  // ESC closes the mobile drawer — echoes the focus-reset binding, so a
  // single key returns the viewer to the canonical overview.
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSidebar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <SceneErrorBoundary>
        <SolarSystemScene
          onIntroActiveChange={setIntroActive}
          hud={
            <>
              <div
                className={[
                  "relative z-20 transition-all duration-700",
                  introActive
                    ? "translate-y-2 opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100",
                ].join(" ")}
              >
                <ExploreHud onToggleSidebar={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />
              </div>

              {/* Desktop sidebar: always visible */}
              <div
                className={[
                  "pointer-events-none absolute left-6 top-24 z-20 hidden lg:block transition-opacity duration-700",
                  introActive ? "opacity-0" : "opacity-100",
                ].join(" ")}
              >
                <ExploreSidebar />
              </div>

              {/* Mobile/tablet backdrop scrim — tap-outside closes the drawer.
                  Soft blur so the scene remains emotionally present behind
                  the list, rather than feeling like a modal that "opens" on
                  top of content. */}
              <button
                type="button"
                aria-hidden={!sidebarOpen}
                tabIndex={-1}
                onClick={closeSidebar}
                className={[
                  "absolute inset-0 z-20 bg-background/30 backdrop-blur-[2px] lg:hidden transition-opacity duration-300",
                  sidebarOpen
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0",
                ].join(" ")}
              />

              {/* Mobile/tablet sidebar: toggled drawer from the left */}
              <div
                className={[
                  "absolute z-30 transition-all duration-300 lg:hidden",
                  "left-[max(1rem,env(safe-area-inset-left))]",
                  "top-[max(5rem,calc(env(safe-area-inset-top)+4.5rem))]",
                  introActive ? "opacity-0 pointer-events-none" : "",
                  sidebarOpen
                    ? "translate-x-0 opacity-100 pointer-events-auto"
                    : "-translate-x-3 opacity-0 pointer-events-none",
                ].join(" ")}
                aria-hidden={!sidebarOpen}
              >
                <ExploreSidebar />
              </div>

              {/* Mobile sidebar toggle button — safe-area-aware so it
                  doesn't collide with notches / status bars. */}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? "Hide body list" : "Show body list"}
                aria-expanded={sidebarOpen}
                className={[
                  "pointer-events-auto absolute z-40 inline-flex h-10 w-10 items-center justify-center rounded-full cosmos-panel lg:hidden transition-opacity duration-700",
                  "left-[max(1rem,env(safe-area-inset-left))]",
                  "top-[max(5rem,calc(env(safe-area-inset-top)+4.5rem))]",
                  introActive ? "opacity-0 pointer-events-none" : "opacity-100",
                ].join(" ")}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </button>

              <div
                className={[
                  "relative z-20 transition-opacity duration-700",
                  introActive ? "opacity-0 pointer-events-none" : "opacity-100",
                ].join(" ")}
              >
                <SelectionPanel />
              </div>
            </>
          }
        />
      </SceneErrorBoundary>
    </div>
  );
}
