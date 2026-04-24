"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useMotionStore } from "@/stores/motion";

export function MotionCaption() {
  const state = useMotionStore((s) => s.state);
  const transitionProgress = useMotionStore((s) => s.transitionProgress);

  const captions = [
    { at: 0.05, until: 0.42, text: "Shifting from orbit map to motion view." },
    { at: 0.4, until: 0.9, text: "The Sun carries the system through space." },
  ] as const;

  const active = state === "transitioning_to_motion"
    ? captions.find((c) => transitionProgress >= c.at && transitionProgress <= c.until) ?? null
    : null;

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key={active.text}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-none absolute inset-x-0 bottom-[15%] z-30 flex justify-center px-6"
        >
          <p className="max-w-[560px] text-center font-display text-[24px] font-light leading-[1.2] tracking-tight text-white/85">
            {active.text}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

