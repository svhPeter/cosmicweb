"use client";

import { RotateCcw, X, Pause, Play, Aperture } from "lucide-react";

import { cn } from "@/lib/utils";
import { useExploreStore } from "@/store/explore-store";
import { useMotionStore } from "@/stores/motion";

export function MotionControls({ className }: { className?: string }) {
  const state = useMotionStore((s) => s.state);
  const replay = useMotionStore((s) => s.replay);
  const exit = useMotionStore((s) => s.exit);
  const showOrbitRings = useMotionStore((s) => s.showOrbitRings);
  const setShowOrbitRings = useMotionStore((s) => s.setShowOrbitRings);

  const playing = useExploreStore((s) => s.playing);
  const togglePlaying = useExploreStore((s) => s.togglePlaying);

  if (state !== "interactive") return null;

  return (
    <div
      className={cn(
        "pointer-events-auto cosmos-panel flex items-center gap-1 px-2 py-1.5 text-sm",
        className
      )}
      role="group"
      aria-label="Motion mode controls"
    >
      <button
        type="button"
        onClick={replay}
        className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
        aria-label="Replay motion sequence"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Replay</span>
      </button>

      <button
        type="button"
        onClick={togglePlaying}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition hover:bg-foreground/90"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        onClick={() => setShowOrbitRings(!showOrbitRings)}
        aria-pressed={showOrbitRings}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] uppercase tracking-[0.18em] transition",
          showOrbitRings
            ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/30"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
        aria-label="Toggle orbit rings"
      >
        <Aperture className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Rings</span>
      </button>

      <div className="mx-1 h-4 w-px bg-border" aria-hidden />

      <button
        type="button"
        onClick={exit}
        className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
        aria-label="Return to flat view"
      >
        <X className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Return</span>
      </button>
    </div>
  );
}

