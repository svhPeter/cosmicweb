"use client";

/**
 * Cinematic loader shown while the WebGL runtime and scene geometry
 * initialise. Uses only CSS animations so it has zero JS cost and degrades
 * gracefully under reduced motion.
 */
export function ExploreLoader({ label = "Preparing the sky" }: { label?: string }) {
  return (
    <div
      className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-background"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 cosmos-grid-bg opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
        style={{
          background:
            "radial-gradient(closest-side, rgba(158, 241, 255, 0.10), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Orbit ring */}
        <div className="relative h-28 w-28">
          <div className="absolute inset-0 rounded-full border border-white/10" aria-hidden />
          <div
            className="absolute inset-[8px] rounded-full border border-white/5"
            aria-hidden
          />
          <div
            className="absolute inset-[18px] rounded-full border border-accent/20"
            aria-hidden
          />
          {/* Sun */}
          <div
            className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffcf7a]"
            style={{ boxShadow: "0 0 28px 6px rgba(255, 200, 120, 0.55)" }}
            aria-hidden
          />
          {/* Orbiting planet */}
          <div
            className="absolute left-1/2 top-1/2 h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow"
            style={{ animationDuration: "3.2s" }}
            aria-hidden
          >
            <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(158,241,255,0.6)]" />
          </div>
        </div>

        <div className="text-center">
          <p className="font-display text-xl tracking-tight">{label}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Calibrating ephemerides
          </p>
        </div>
      </div>
    </div>
  );
}
