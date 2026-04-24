"use client";

import { useState } from "react";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

import { SolarSystemScene } from "@/components/space/solar-system-scene";
import { ExploreHud } from "@/components/space/explore-hud";
import { ExploreSidebar } from "@/components/space/explore-sidebar";
import { SelectionPanel } from "@/components/space/selection-panel";
import { SceneErrorBoundary } from "@/components/space/scene-error-boundary";
import { useMotionStore } from "@/stores/motion";
import { AccuracyLayer } from "@/components/motion/accuracy-layer";

export default function Experience() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const motionState = useMotionStore((s) => s.state);
  const motionActive = motionState !== "idle";
  const motionInteractive = motionState === "motion_interactive";

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

              {/* Mobile/tablet sidebar: toggled drawer from the left */}
              <div
                className={[
                  "pointer-events-none absolute left-4 top-20 z-20 transition-all duration-300 lg:hidden",
                  introActive ? "opacity-0" : "",
                  sidebarOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-3 opacity-0 pointer-events-none",
                ].join(" ")}
                aria-hidden={!sidebarOpen}
              >
                <div className={sidebarOpen ? "pointer-events-auto" : ""}>
                  <ExploreSidebar />
                </div>
              </div>

              {/* Mobile sidebar toggle button */}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? "Hide body list" : "Show body list"}
                aria-expanded={sidebarOpen}
                className={[
                  "pointer-events-auto absolute left-4 top-20 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full cosmos-panel lg:hidden transition-opacity duration-700",
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

              <div
                className={[
                  "absolute bottom-6 left-6 z-30 transition-opacity duration-500",
                  motionInteractive ? "opacity-100" : "opacity-0 pointer-events-none",
                ].join(" ")}
              >
                <AccuracyLayer />
              </div>
            </>
          }
        />
      </SceneErrorBoundary>
    </div>
  );
}
