"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";

const AUDIO_SRC = "/audio/explore-ambient.mp3";
const LS_KEY = "cosmos.explore.audioMuted.v1";
const DEFAULT_VOLUME = 0.2;

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
 * Explore-only ambient audio.
 *
 * Autoplay is gated behind a real user gesture to avoid browser blocking.
 * Failure is silent: if play() is rejected, we keep UI usable.
 */
export function ExploreAudioChip({ className }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gestureArmedRef = useRef(false);
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);

  const label = useMemo(() => (muted ? "Music muted" : "Music on"), [muted]);

  useEffect(() => {
    const stored = readStoredMuted();
    const initialMuted = stored ?? prefersReducedMotion();
    setMuted(initialMuted);

    const a = new Audio(AUDIO_SRC);
    a.loop = true;
    a.preload = "metadata";
    a.volume = DEFAULT_VOLUME;
    a.muted = initialMuted;
    audioRef.current = a;
    setReady(true);

    return () => {
      try {
        a.pause();
        a.src = "";
      } catch {
        // ignore
      }
      audioRef.current = null;
    };
  }, []);

  // Arm a one-time gesture listener to start playback if not muted.
  useEffect(() => {
    if (!ready) return;
    if (gestureArmedRef.current) return;
    gestureArmedRef.current = true;

    const tryStart = async () => {
      const a = audioRef.current;
      if (!a) return;
      if (muted) return;
      try {
        a.muted = false;
        await a.play();
      } catch {
        // Browser blocked play() or another transient error; ignore.
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

  // Apply mute/pause immediately on toggle. If unmuting, attempt play (may still be blocked).
  useEffect(() => {
    if (!ready) return;
    const a = audioRef.current;
    if (!a) return;
    a.volume = DEFAULT_VOLUME;
    a.muted = muted;
    if (muted) {
      try {
        a.pause();
      } catch {
        // ignore
      }
    } else {
      void a.play().catch(() => {
        // ignore
      });
    }
  }, [ready, muted]);

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
      aria-pressed={!muted}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground touch-manipulation",
        className
      )}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}

