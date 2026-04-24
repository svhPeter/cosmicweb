"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useMotionStore } from "@/stores/motion";

export function MotionCaption() {
  const state = useMotionStore((s) => s.state);
  const elapsed = useMotionStore((s) => s.elapsed);

  const captions = [
    { at: 0.8, until: 2.0, text: "The view you know." },
    { at: 3.5, until: 5.5, text: "But the Sun is moving too." },
    { at: 7.5, until: 10.5, text: "Planets trace helices through space." },
    { at: 11.5, until: 14.0, text: "Every point in space, visited only once." },
  ] as const;

  const active =
    state === "entering" || state === "playing"
      ? captions.find((c) => elapsed >= c.at && elapsed <= c.until) ?? null
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

