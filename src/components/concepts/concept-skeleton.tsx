/**
 * Shared loading skeleton shown while a concept's shader compiles and
 * the Canvas mounts. Every concept experience swaps in this component
 * via `next/dynamic`'s `loading` option, so the three pages load with a
 * visually consistent handoff instead of three subtly-different colour
 * washes. The `tint` prop keeps each concept's identity — the palette
 * hints at black hole, wormhole, or pulsar without showing the scene.
 */

export type ConceptSkeletonTint = "blackhole" | "wormhole" | "neutronstar";

interface ConceptSkeletonProps {
  tint: ConceptSkeletonTint;
}

const TINT_GRADIENT: Record<ConceptSkeletonTint, string> = {
  blackhole:
    "radial-gradient(ellipse at center, hsl(30 70% 52% / 0.16), hsl(20 60% 20% / 0.10) 35%, transparent 62%)",
  wormhole:
    "radial-gradient(ellipse at center, hsl(260 70% 55% / 0.14), hsl(200 60% 40% / 0.10) 40%, transparent 62%)",
  neutronstar:
    "radial-gradient(ellipse at center, hsl(205 85% 65% / 0.14), hsl(248 70% 40% / 0.10) 40%, transparent 62%)",
};

export function ConceptSkeleton({ tint }: ConceptSkeletonProps) {
  return (
    <div
      className="absolute inset-0 bg-[#02030a]"
      aria-hidden
      role="presentation"
    >
      <div
        className="absolute inset-0 cosmos-skeleton-pulse"
        style={{ background: TINT_GRADIENT[tint] }}
      />
    </div>
  );
}
