"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

import { getBodyBySlug } from "@/data-static/bodies";
import { useExploreStore } from "@/store/explore-store";
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
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");
  const focusBody = useMemo(
    () => (focusParam ? getBodyBySlug(focusParam) : undefined),
    [focusParam]
  );
  const skipIntro = !!focusBody;

  useEffect(() => {
    if (!focusBody) return;
    useExploreStore.getState().setSelected(focusBody.id);
  }, [focusBody]);

  const closeSidebar = () => setSidebarOpen(false);

  // While the body list drawer is open, Esc closes it only — the scene’s
  // own Esc handler (camera) must not also reset focus. Capture runs first.
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeSidebar();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [sidebarOpen]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <SceneErrorBoundary>
        <SolarSystemScene
          onIntroActiveChange={setIntroActive}
          skipIntro={skipIntro}
          hud={
            <>
              <div
                className={[
                  "absolute inset-0 z-20 transition-all duration-700",
                  introActive
                    ? "translate-y-2 opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100",
                ].join(" ")}
              >
                <ExploreHud onToggleSidebar={() => setSidebarOpen((v) => !v)} sidebarOpen={sidebarOpen} />
              </div>

              {/* Tablet/desktop sidebar — list stays visible for solar-system wayfinding. */}
              <div
                className={[
                  "pointer-events-none absolute left-4 top-[5.5rem] z-30 hidden md:top-24 md:block md:pl-1 transition-opacity duration-700",
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
                  "absolute inset-0 z-20 bg-background/30 backdrop-blur-[2px] md:hidden transition-opacity duration-300",
                  sidebarOpen
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0",
                ].join(" ")}
              />

              {/* Mobile/tablet sidebar: toggled drawer from the left */}
              <div
                className={[
                  "absolute z-30 transition-all duration-300 md:hidden",
                  "left-[max(1rem,env(safe-area-inset-left))]",
                  "top-[max(5.25rem,calc(env(safe-area-inset-top)+4.75rem))]",
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
                  "pointer-events-auto absolute z-40 inline-flex h-10 w-10 items-center justify-center rounded-full cosmos-panel md:hidden transition-opacity duration-700",
                  "left-[max(1rem,env(safe-area-inset-left))]",
                  "top-[max(5.25rem,calc(env(safe-area-inset-top)+4.75rem))]",
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
                  "relative z-[100] transition-opacity duration-700",
                  introActive ? "opacity-0 pointer-events-none" : "opacity-100",
                ].join(" ")}
              >
                <SelectionPanel />
              </div>

              {/* Named deep-sky inspection now reuses the main SelectionPanel. */}
            </>
          }
        />
      </SceneErrorBoundary>
    </div>
  );
}
