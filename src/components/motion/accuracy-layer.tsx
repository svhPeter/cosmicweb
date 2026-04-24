"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";

import { useMotionStore } from "@/stores/motion";
import { cn } from "@/lib/utils";

export function AccuracyLayer({ className }: { className?: string }) {
  const state = useMotionStore((s) => s.state);
  const open = useMotionStore((s) => s.accuracyOpen);
  const setOpen = useMotionStore((s) => s.setAccuracyOpen);

  if (state !== "motion_interactive") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "pointer-events-auto cosmos-panel inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition",
          "bg-white/[0.06] border border-white/[0.12]",
          className
        )}
      >
        <Info className="h-3.5 w-3.5" />
        <span>Simplified teaching view</span>
        <span className="text-muted-foreground/70">How we teach →</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
            aria-label="About this motion view"
            onMouseDown={(e) => {
              // click outside closes
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[560px] cosmos-panel p-6 sm:p-7"
            >
              <h2 className="font-display text-xl tracking-tight">About this view</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                This is a <span className="text-foreground/90">teaching visualization</span>: not to scale, designed so you can
                see the combined motion clearly.
              </p>

              <div className="mt-5 space-y-3 text-sm leading-relaxed">
                <p>
                  For clarity, we draw the planets’ orbital plane{" "}
                  <span className="text-foreground/90">perpendicular</span> to the Sun’s direction of motion.
                </p>
                <p className="text-muted-foreground">
                  In reality, that plane is tilted by about{" "}
                  <span className="text-foreground/90">60°</span> — meaning planets are sometimes ahead of the Sun’s motion through
                  the galaxy, sometimes behind it.
                </p>
                <p className="text-muted-foreground">
                  The physics is real. The geometry is pedagogically tuned so the core idea — that planets never retrace their
                  path through space — is visible at a glance.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cosmos-chip hover:text-foreground transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

