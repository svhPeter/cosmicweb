"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";

const AUDIO_SRC = "/audio/explore-ambient.mp3";
const LS_KEY = "cosmos.explore.audioMuted.v1";
const DEFAULT_VOLUME = 0.2;
/** Max crossfade duration (ms) — longer hides MP3 loop seam better. */
const CROSSFADE_MS_MAX = 3000;
const CROSSFADE_MS_MIN = 400;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function readStoredMuted(): boolean | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function writeStoredMuted(v: boolean) {
  try {
    localStorage.setItem(LS_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

/**
 * Explore-only ambient audio. Two `HTMLAudioElement` instances crossfade
 * near the end of each playthrough so the loop does not "restart" with
 * an audible gap (avoids `loop` alone, which is often gappy for MP3).
 * Autoplay is still gated on user gesture. Failures are silent.
 */
export function ExploreAudioChip({ className }: { className?: string }) {
  const aRef = useRef<HTMLAudioElement | null>(null);
  const bRef = useRef<HTMLAudioElement | null>(null);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const activeSlotRef = useRef<0 | 1>(0);
  const gestureArmedRef = useRef(false);
  const isCrossfading = useRef(false);
  const fadeRaf = useRef<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    activeSlotRef.current = activeSlot;
  }, [activeSlot]);

  const label = useMemo(() => (muted ? "Music muted" : "Music on"), [muted]);

  const getActive = useCallback(
    () => (activeSlot === 0 ? aRef.current : bRef.current),
    [activeSlot]
  );

  const getInactive = useCallback(
    () => (activeSlot === 0 ? bRef.current : aRef.current),
    [activeSlot]
  );

  useEffect(() => {
    const a = new Audio(AUDIO_SRC);
    const b = new Audio(AUDIO_SRC);
    a.loop = false;
    b.loop = false;
    a.preload = "auto";
    b.preload = "auto";
    a.volume = DEFAULT_VOLUME;
    b.volume = DEFAULT_VOLUME;
    const stored = readStoredMuted();
    const initialMuted = stored ?? prefersReducedMotion();
    a.muted = initialMuted;
    b.muted = initialMuted;
    aRef.current = a;
    bRef.current = b;
    setReady(true);
    return () => {
      if (fadeRaf.current != null) {
        cancelAnimationFrame(fadeRaf.current);
        fadeRaf.current = null;
      }
      [a, b].forEach((x) => {
        try {
          x.pause();
          x.src = "";
        } catch {
          // ignore
        }
      });
      aRef.current = null;
      bRef.current = null;
    };
  }, []);

  // Crossfade when active track nears end.
  useEffect(() => {
    if (!ready || muted) return;
    const out = getActive();
    if (!out) return;

    const onTime = () => {
      if (isCrossfading.current) return;
      const dur = out.duration;
      if (!dur || !isFinite(dur) || dur <= 0) return;
      const fadeS = Math.min(3, Math.max(0.3, dur * 0.08));
      if (out.currentTime < dur - fadeS) return;
      const inc = getInactive();
      if (!inc) return;
      isCrossfading.current = true;
      inc.currentTime = 0;
      inc.volume = 0;
      const crossMs = Math.min(
        CROSSFADE_MS_MAX,
        Math.max(CROSSFADE_MS_MIN, fadeS * 1000)
      );
      void inc
        .play()
        .then(() => {
          const t0 = performance.now();
          const step = () => {
            const t = Math.min(1, (performance.now() - t0) / crossMs);
            out.volume = DEFAULT_VOLUME * (1 - t);
            inc.volume = DEFAULT_VOLUME * t;
            if (t < 1) {
              fadeRaf.current = requestAnimationFrame(step);
            } else {
              try {
                out.pause();
                out.currentTime = 0;
              } catch {
                // ignore
              }
              out.volume = DEFAULT_VOLUME;
              inc.volume = DEFAULT_VOLUME;
              isCrossfading.current = false;
              setActiveSlot((s) => (s === 0 ? 1 : 0));
              fadeRaf.current = null;
            }
          };
          fadeRaf.current = requestAnimationFrame(step);
        })
        .catch(() => {
          isCrossfading.current = false;
        });
    };
    out.addEventListener("timeupdate", onTime);
    return () => {
      if (fadeRaf.current != null) {
        cancelAnimationFrame(fadeRaf.current);
        fadeRaf.current = null;
      }
      out.removeEventListener("timeupdate", onTime);
    };
  }, [ready, muted, activeSlot, getActive, getInactive]);

  // One-time gesture: start the active track if not muted.
  useEffect(() => {
    if (!ready) return;
    if (gestureArmedRef.current) return;
    gestureArmedRef.current = true;
    const tryStart = async () => {
      const a = aRef.current;
      const b = bRef.current;
      if (!a) return;
      if (muted) return;
      try {
        a.muted = false;
        if (b) b.muted = false;
        const el = (activeSlotRef.current === 0 ? a : b) ?? a;
        await el.play();
      } catch {
        // ignore
      }
    };
    const onFirstGesture = () => {
      window.removeEventListener("pointerdown", onFirstGesture, { capture: true } as any);
      window.removeEventListener("keydown", onFirstGesture, { capture: true } as any);
      void tryStart();
    };
    window.addEventListener("pointerdown", onFirstGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onFirstGesture, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture, { capture: true } as any);
      window.removeEventListener("keydown", onFirstGesture, { capture: true } as any);
    };
  }, [ready, muted]);

  // Mute / unmute and pause both when muted.
  useEffect(() => {
    if (!ready) return;
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    a.volume = DEFAULT_VOLUME;
    b.volume = DEFAULT_VOLUME;
    a.muted = muted;
    b.muted = muted;
    if (muted) {
      if (fadeRaf.current != null) {
        cancelAnimationFrame(fadeRaf.current);
        fadeRaf.current = null;
      }
      isCrossfading.current = false;
      try {
        a.pause();
        b.pause();
      } catch {
        // ignore
      }
    } else {
      const active = activeSlot === 0 ? a : b;
      void active.play().catch(() => {
        // ignore
      });
    }
  }, [ready, muted, activeSlot]);

  const toggle = () => {
    setMuted((m) => {
      const next = !m;
      writeStoredMuted(next);
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent?.stopImmediatePropagation?.();
      }}
      aria-pressed={!muted}
      aria-label={label}
      title={label}
      className={cn(
        "relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground touch-manipulation",
        className
      )}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}
