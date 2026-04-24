import Link from "next/link";
import { ArrowRight, Compass, Orbit, Scale, Sparkles, Telescope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { FeatureCard } from "@/components/content/feature-card";
import { PlanetCard } from "@/components/content/planet-card";
import { planets } from "@/data-static/bodies";
import { HomeHero } from "@/components/home/home-hero";
import { HomeTodayPreview } from "@/components/home/home-today-preview";
import { HomeComparePreview } from "@/components/home/home-compare-preview";

export default function HomePage() {
  const featured = planets.filter((p) =>
    ["earth", "mars", "jupiter", "saturn"].includes(p.id)
  );

  return (
    <div className="relative">
      <HomeHero />

      {/* Positioning strip */}
      <section className="relative border-y border-border bg-panel/40">
        <div className="container py-10 grid gap-6 md:grid-cols-4 items-center">
          <p className="md:col-span-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Designed for clarity
          </p>
          <ul className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-foreground/80">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden /> NASA-grounded data
            </li>
            <li className="flex items-center gap-2">
              <Telescope className="h-4 w-4 text-accent" aria-hidden /> Interactive 3D scene
            </li>
            <li className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-accent" aria-hidden /> Thoughtful comparisons
            </li>
            <li className="flex items-center gap-2">
              <Orbit className="h-4 w-4 text-accent" aria-hidden /> Editorial writing
            </li>
          </ul>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container section-y">
        <SectionHeading
          eyebrow="Platform"
          title="A calm, premium way to learn about space."
          description="Cosmos pairs interactive visuals with carefully written editorial content, so the Solar System becomes something you explore — not something you just read about."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Compass className="h-4 w-4" />}
            title="Explore the Solar System in 3D"
            description="Orbit the Sun, click any planet, and focus the camera for a cinematic closer look. Keyboard and mouse friendly."
            href="/explore"
          />
          <FeatureCard
            icon={<Orbit className="h-4 w-4" />}
            title="Planet pages that actually teach"
            description="Each world is written as an editorial brief: overview, atmosphere, orbit, moons, sources. No filler, no fluff."
            href="/planets"
          />
          <FeatureCard
            icon={<Scale className="h-4 w-4" />}
            title="Compare worlds, intuitively"
            description="Side-by-side size, gravity, and day/year comparisons — including a playful “What would you weigh?” calculator."
            href="/compare"
          />
          <FeatureCard
            icon={<Telescope className="h-4 w-4" />}
            title="Today in space"
            description="NASA's Astronomy Picture of the Day, upcoming launches, and fresh space news — all through a single, cached internal API."
            href="/today"
          />
          <FeatureCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Scientific credibility"
            description="Data is grounded in NASA fact sheets and public APIs, with clear attribution and freshness signals across the product."
            href="/about"
          />
          <FeatureCard
            icon={<Orbit className="h-4 w-4" />}
            title="Future-ready platform"
            description="An internal data layer built for JPL, CelesTrak, and mission integrations — real data without fragile third-party calls in the browser."
            href="/about#methodology"
          />
        </div>
      </section>

      {/* Featured planets */}
      <section className="container section-y-tight">
        <div className="flex items-end justify-between gap-4 mb-10">
          <SectionHeading
            eyebrow="Featured"
            title="Start with a familiar world."
            description="Four handpicked planets to get a feel for what Cosmos does best — rigorous facts, beautifully arranged."
          />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/planets">
              All planets <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <PlanetCard key={p.id} body={p} />
          ))}
        </div>
      </section>

      {/* Today + Compare previews */}
      <section className="container section-y-tight grid gap-10 lg:grid-cols-2">
        <HomeTodayPreview />
        <HomeComparePreview />
      </section>

      {/* Credibility */}
      <section className="container section-y">
        <div className="cosmos-panel p-10 lg:p-16 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="cosmos-chip mb-4">Methodology</p>
            <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-balance">
              Numbers you can trust. Attribution you can check.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Every planetary figure on Cosmos comes from a primary public source — NASA fact
              sheets, APOD, Launch Library, and the space news community. The API layer tags
              responses with freshness and provenance, so you always know what you're reading.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild size="lg">
              <Link href="/about">Read our methodology</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/api/v1/bodies">Inspect the API</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="container section-y-tight">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-panel/80 to-panel/40 p-10 lg:p-20">
          <div
            aria-hidden
            className="absolute inset-0 cosmos-grid-bg pointer-events-none"
          />
          <div className="relative flex flex-col items-center text-center gap-5">
            <p className="cosmos-chip">Ready when you are</p>
            <h2 className="font-display text-display-md tracking-tight text-balance">
              Step outside for a moment.
            </h2>
            <p className="max-w-xl text-muted-foreground leading-relaxed">
              Open the 3D Solar System and spend a few quiet minutes exploring.
            </p>
            <Button asChild size="lg" variant="accent" className="mt-2">
              <Link href="/explore">
                Launch the explorer <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
