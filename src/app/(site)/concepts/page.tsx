import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Concepts — phenomena at the edges of physics",
  description:
    "Black holes, wormholes, and the objects on the far side of ordinary astronomy. Each concept is a real-time simulation grounded in the mathematics that describes it.",
  openGraph: {
    title: "Concepts — phenomena at the edges of physics",
    description:
      "Black holes, wormholes, and the objects on the far side of ordinary astronomy. Each one is a real-time simulation.",
    type: "website",
  },
};

type ConceptStatus = "real-time" | "theoretical" | "in-development";

interface Concept {
  href: string | null;
  title: string;
  essence: string;
  status: ConceptStatus;
  statusLabel: string;
  /** Tailwind classes for the poster background. */
  posterClassName?: string;
  /** Decorative foreground layer — a simple CSS rendition of the concept. */
  Poster: () => React.ReactNode;
}

const CONCEPTS: readonly Concept[] = [
  {
    href: "/black-hole",
    title: "Black hole",
    essence:
      "A dark gravity well that traps light. The only astrophysical object humanity has photographed that warps spacetime at this scale.",
    status: "real-time",
    statusLabel: "Real-time simulation",
    Poster: BlackHolePoster,
  },
  {
    href: "/wormhole",
    title: "Wormhole",
    essence:
      "A theoretical tunnel through bent spacetime. Predicted by Einstein in 1935. Never observed, anywhere, by anyone.",
    status: "theoretical",
    statusLabel: "Theoretical · never observed",
    Poster: WormholePoster,
  },
  {
    href: "/neutron-star",
    title: "Neutron star",
    essence:
      "A stellar core compressed to the density of an atomic nucleus. Spinning hundreds of times per second, sweeping beams of radiation across the galaxy.",
    status: "real-time",
    statusLabel: "Real-time simulation",
    Poster: NeutronStarPoster,
  },
] as const;

export default function ConceptsPage() {
  return (
    <article className="flex flex-col">
      {/* Opening statement. Mirrors the editorial voice of /black-hole
          and /wormhole — measured, sourced-first, no hype words. */}
      <section className="container section-y-tight flex flex-col gap-8">
        <SectionHeading
          eyebrow="Concepts"
          title={<>The phenomena at the edges of physics.</>}
          description="Beyond the planets, there are objects whose behaviour bends the rules we usually take for granted. This is a small, growing collection of them. Each one is a real-time simulation in your browser, grounded in the same equations professionals use — with one rule we never break: where something has been observed, we show the evidence, fully attributed; where we only have a consistent model, we say so. The standard is serious relativity pedagogy: right qualitative physics, honest about approximations, no fake data."
          as="h1"
        />
      </section>

      {/* The gallery. Three cards, same shape, different emphasis.
          Posters are static CSS — we deliberately do not mount live
          shaders in the grid. Visitors reach the real simulation by
          clicking through. */}
      <section
        aria-label="Concept experiences"
        className="container section-y-tight"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CONCEPTS.map((concept) => (
            <ConceptCard key={concept.title} concept={concept} />
          ))}
        </div>
      </section>

      {/* A quiet footer note on what "real-time" means here.
          Aligns with the methodology voice on /about. */}
      <section className="container section-y-tight">
        <Card className="p-8 sm:p-10">
          <div className="flex flex-col gap-4">
            <span className="cosmos-chip self-start">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> How this collection works
            </span>
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              Simulations, not illustrations.
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Each concept on this page links to a page with a real-time
              shader running in your browser. Rays are traced, deflections
              are computed, and the image you see is produced from a clearly
              stated physical model, not hand-painted by an artist. That
              model is often didactic: it encodes the geometry and the main
              visual effects (Doppler, lensing, a thin photon ring) while
              staying within what a browser can do in a frame. Where a
              phenomenon has been photographed, the photograph is there, fully
              attributed. Where it has not, the space for evidence is left
              empty on purpose — or we point you to the primary literature
              at the bottom of the page.
            </p>
          </div>
        </Card>
      </section>

      <div className="section-y-tight" />
    </article>
  );
}

function ConceptCard({ concept }: { concept: Concept }) {
  const disabled = concept.href === null;

  const inner = (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden p-0",
        disabled ? "opacity-90" : "transition-transform duration-300 hover:-translate-y-0.5"
      )}
    >
      {/* Poster — aspect-ratio locked for CLS-free layout. */}
      <div
        aria-hidden
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden",
          // Keep backgrounds calm and consistent; the Poster supplies the identity.
          concept.posterClassName ?? "bg-[radial-gradient(circle_at_50%_40%,hsl(var(--glass)/0.9)_0%,hsl(var(--background))_70%)]"
        )}
      >
        <concept.Poster />
        {/* Top-edge glow, matches the subtle accent used elsewhere. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="cosmos-chip">
            <span
              className={cn(
                "h-1 w-1 rounded-full",
                concept.status === "in-development"
                  ? "bg-muted-foreground/60"
                  : "bg-accent"
              )}
              aria-hidden
            />
            {concept.statusLabel}
          </span>
          {!disabled ? (
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground"
              aria-hidden
            />
          ) : null}
        </div>

        <h2 className="font-display text-2xl tracking-tight text-foreground">
          {concept.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {concept.essence}
        </p>
      </div>
    </Card>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${concept.title} — ${concept.statusLabel}`}
        className="cursor-not-allowed"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={concept.href!}
      aria-label={`${concept.title} — open the ${concept.statusLabel.toLowerCase()}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[inherit]"
    >
      {inner}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Posters                                                              */
/*                                                                      */
/* These are purely decorative CSS renditions. They hint at the         */
/* concept's palette and silhouette without mounting a WebGL context.   */
/* Anything more expensive than a few divs + gradients belongs on the   */
/* concept page itself, not in the hub grid.                            */
/* ------------------------------------------------------------------ */

function BlackHolePoster() {
  return (
    <>
      {/* Photographic anchor: EHT (M87*) — CC BY 4.0, already shipped in /public/images/eht. */}
      <div aria-hidden className="absolute inset-0">
        <img
          src="/images/eht/m87.jpg"
          alt=""
          className="h-full w-full object-cover opacity-55 mix-blend-screen"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40" />
      </div>

      {/* Accretion disk — flattened ellipse with bright leading edge. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[36%] w-[86%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(255,200,120,0.95) 0%, rgba(240,130,40,0.7) 28%, rgba(120,50,15,0.35) 58%, rgba(0,0,0,0) 80%)",
          filter: "blur(0.5px)",
        }}
      />
      {/* Photon ring — thin, hot halo. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          boxShadow:
            "0 0 24px 2px rgba(255,180,100,0.55), inset 0 0 0 1px rgba(255,210,160,0.85)",
        }}
      />
      {/* Event horizon silhouette — pure black disc. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
      />
    </>
  );
}

function WormholePoster() {
  return (
    <>
      {/* SVG turbulence gives a premium “lensing” feel without WebGL. */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 75"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="wh-core" cx="45%" cy="45%" r="60%">
            <stop offset="0%" stopColor="rgba(210,230,255,0.95)" />
            <stop offset="35%" stopColor="rgba(120,160,255,0.55)" />
            <stop offset="70%" stopColor="rgba(35,20,85,0.85)" />
            <stop offset="100%" stopColor="rgba(5,6,10,1)" />
          </radialGradient>
          <filter id="wh-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="10" />
          </filter>
        </defs>

        {/* Rim glow */}
        <ellipse
          cx="50"
          cy="38"
          rx="28"
          ry="18"
          fill="none"
          stroke="rgba(160,120,255,0.55)"
          strokeWidth="6"
          filter="url(#wh-noise)"
          opacity="0.85"
        />
        <ellipse
          cx="50"
          cy="38"
          rx="28"
          ry="18"
          fill="none"
          stroke="rgba(110,208,255,0.45)"
          strokeWidth="2"
          opacity="0.9"
        />
        {/* Throat */}
        <ellipse cx="50" cy="38" rx="19" ry="12" fill="url(#wh-core)" opacity="0.95" />
      </svg>

      {/* Specular “window” highlight */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-[78%] -translate-y-[130%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(240,250,255,0.85) 0%, rgba(240,250,255,0) 72%)",
        }}
      />
    </>
  );
}

function NeutronStarPoster() {
  return (
    <>
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 75"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="ns-core" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,1)" />
            <stop offset="40%" stopColor="rgba(205,235,255,0.92)" />
            <stop offset="70%" stopColor="rgba(80,150,235,0.65)" />
            <stop offset="100%" stopColor="rgba(10,20,40,0)" />
          </radialGradient>
          <filter id="ns-glow">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Beams */}
        <g filter="url(#ns-glow)" opacity="0.95">
          <rect x="46" y="-10" width="8" height="120" fill="rgba(160,210,255,0.18)" transform="rotate(22 50 38)" />
          <rect x="47.5" y="-10" width="5" height="120" fill="rgba(220,245,255,0.32)" transform="rotate(22 50 38)" />
          <rect x="46" y="-10" width="8" height="120" fill="rgba(160,210,255,0.12)" transform="rotate(-158 50 38)" />
          <rect x="47.5" y="-10" width="5" height="120" fill="rgba(200,235,255,0.22)" transform="rotate(-158 50 38)" />
        </g>

        {/* Core */}
        <circle cx="50" cy="38" r="6" fill="url(#ns-core)" />
      </svg>

      {/* Magnetic-field hint: subtle arcs */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(160,210,255,0.16), 0 0 26px 2px rgba(120,190,255,0.10)",
          transform: "translate(-50%, -50%) rotate(18deg) scaleY(0.65)",
        }}
      />
    </>
  );
}
