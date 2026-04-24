"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMotionStore } from "@/stores/motion";

export function MotionControls({ className }: { className?: string }) {
  const state = useMotionStore((s) => s.state);
  const exit = useMotionStore((s) => s.exit);

  if (state !== "motion_interactive") return null;

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

