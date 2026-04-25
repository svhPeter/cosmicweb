import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Orbit, ChevronLeft } from "lucide-react";

import { bodies, getBodyBySlug } from "@/data-static/bodies";
import { PlanetVisual } from "@/components/content/planet-visual";
import { PlanetStatsGrid } from "@/components/content/planet-stats-grid";
import { TimeAndLight } from "@/components/content/time-and-light";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatNumber } from "@/lib/utils";

export function generateStaticParams() {
  return bodies.map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const body = getBodyBySlug(params.slug);
  if (!body) return { title: "Planet not found" };
  return {
    title: body.name,
    description: `${body.name}: ${body.tagline} Explore orbital data, atmosphere, moons and more on Cosmos.`,
    openGraph: {
      title: `${body.name} · Cosmos`,
      description: body.tagline,
    },
  };
}

export default function PlanetDetailPage({ params }: { params: { slug: string } }) {
  const body = getBodyBySlug(params.slug);
  if (!body) notFound();

  const idx = bodies.findIndex((b) => b.slug === body.slug);
  const prev = idx > 0 ? bodies[idx - 1] : undefined;
  const next = idx >= 0 && idx < bodies.length - 1 ? bodies[idx + 1] : undefined;

  const parent = body.parentId ? bodies.find((b) => b.id === body.parentId) : undefined;
  const childMoon = bodies.find((b) => b.parentId === body.id && b.type === "moon");

  const typeLabel =
    body.type === "star"
      ? "Star"
      : body.type === "dwarf_planet"
      ? "Dwarf Planet"
      : body.type === "moon"
      ? "Moon"
      : "Planet";

  return (
    <article className="container py-14 lg:py-20">
      <Link
        href="/planets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All planets
      </Link>

      {/* Hero */}
      <header className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center">
        <div>
          <Badge tone="accent" className="mb-4">
            {typeLabel}
            {parent ? <span className="ml-1.5 text-muted-foreground">· companion to {parent.name}</span> : null}
          </Badge>
          <h1 className="font-display text-display-lg tracking-tight text-balance">{body.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground leading-relaxed text-pretty">
            {body.tagline}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="accent">
              <Link href={`/explore?focus=${body.slug}`}>
                <Orbit className="h-4 w-4" /> Focus in 3D
              </Link>
            </Button>
            {body.type === "moon" && parent ? (
              <Button asChild variant="outline">
                <Link href={`/planets/${parent.slug}`}>← {parent.name}</Link>
              </Button>
            ) : body.id === "earth" ? null : (
              <Button asChild variant="outline">
                <Link href="/compare">Compare with Earth</Link>
              </Button>
            )}
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-0 cosmos-grid-bg pointer-events-none rounded-3xl"
          />
          <PlanetVisual
            colorHex={body.render.colorHex}
            ringed={body.render.ringed}
            size="xl"
            glow
            className="drop-shadow-2xl"
          />
        </div>
      </header>

      {/* Stats grid */}
      <section className="mt-16">
        <SectionHeading
          eyebrow="Vital statistics"
          title="Key planetary data"
          description="Figures sourced from NASA planetary fact sheets."
        />
        <div className="mt-8">
          <PlanetStatsGrid body={body} />
        </div>
      </section>

      {/* Overview & atmosphere */}
      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <Card className="p-8">
          <h2 className="font-display text-2xl tracking-tight">Overview</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
            {body.description}
          </p>
        </Card>
        <Card className="p-8">
          <h2 className="font-display text-2xl tracking-tight">Atmosphere</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
            {body.atmosphere.summary}
          </p>
          {body.atmosphere.composition.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {body.atmosphere.composition.map((c) => (
                <li key={c} className="cosmos-chip normal-case tracking-wide">
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>

      {/* Time & light */}
      <section className="mt-16">
        <TimeAndLight body={body} />
      </section>

      {/* Compare to Earth. For moons the time-based ratios ("day length",
          "year length") quietly stop meaning the same thing they do for a
          planet — a moon's day-equivalent is a sidereal rotation around
          its own axis, and its "year" is its orbital period around its
          parent. We relabel both for moons so the figures stay correct. */}
      {body.id !== "earth" ? (
        <section className="mt-16">
          <SectionHeading
            eyebrow="Compared to Earth"
            title={`${body.name} vs. Earth`}
            description={
              body.type === "moon"
                ? "Compactly: how the Moon stacks up against the planet it orbits."
                : "A quick-read comparison across gravity, size, mass, and time."
            }
          />
          <div className="mt-8 grid gap-px rounded-2xl border border-border bg-border/70 sm:grid-cols-2 md:grid-cols-5 overflow-hidden">
            {[
              { label: "Gravity", ratio: body.comparisonToEarth.gravity },
              { label: "Radius", ratio: body.comparisonToEarth.radius },
              { label: "Mass", ratio: body.comparisonToEarth.mass },
              {
                label: body.type === "moon" ? "Rotation" : "Day length",
                ratio: body.comparisonToEarth.dayLength,
              },
              {
                label: body.type === "moon" ? "Orbit period" : "Year length",
                ratio: body.comparisonToEarth.yearLength,
              },
            ].map((row) => (
              <div key={row.label} className="bg-panel/80 p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {row.label}
                </p>
                <p className="mt-2 text-2xl font-display tracking-tight">
                  {row.ratio === 0 ? "—" : `${formatNumber(row.ratio, row.ratio < 10 ? 2 : 0)}×`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">vs. Earth</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Moons / companion. Moons are not natural satellites of themselves;
          for moon-type bodies we surface the parent body instead so the
          relationship is one click away in both directions. */}
      {body.type === "moon" ? null : (
        <section className="mt-16">
          <SectionHeading
            eyebrow="Natural satellites"
            title={body.moons.count === 0 ? "No known moons" : `${body.moons.count} moon${body.moons.count === 1 ? "" : "s"}`}
            description={
              body.moons.notable.length
                ? `Notable: ${body.moons.notable.slice(0, 6).join(", ")}${body.moons.notable.length > 6 ? ", and more." : "."}`
                : undefined
            }
          />
          {childMoon ? (
            <div className="mt-8">
              <Link
                href={`/planets/${childMoon.slug}`}
                className="group flex items-center gap-5 rounded-2xl border border-border bg-panel/70 p-5 transition-colors hover:border-accent/40 hover:bg-panel"
              >
                <PlanetVisual
                  colorHex={childMoon.render.colorHex}
                  ringed={childMoon.render.ringed}
                  size="md"
                />
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Companion · tidally locked
                  </p>
                  <p className="mt-1 font-display text-xl tracking-tight">{childMoon.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2 max-w-prose">
                    {childMoon.tagline}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </div>
          ) : null}
        </section>
      )}

      {parent ? (
        <section className="mt-16">
          <SectionHeading
            eyebrow="Parent body"
            title={`Bound to ${parent.name}`}
            description={
              body.parentDistanceKm
                ? `Mean separation ~${formatNumber(body.parentDistanceKm, 0)} km — about ${
                    Math.round((body.parentDistanceKm / (parent.physical.radiusKm * 2)) * 10) / 10
                  } ${parent.name} diameters apart.`
                : undefined
            }
          />
          <div className="mt-8">
            <Link
              href={`/planets/${parent.slug}`}
              className="group flex items-center gap-5 rounded-2xl border border-border bg-panel/70 p-5 transition-colors hover:border-accent/40 hover:bg-panel"
            >
              <PlanetVisual
                colorHex={parent.render.colorHex}
                ringed={parent.render.ringed}
                size="md"
              />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Primary
                </p>
                <p className="mt-1 font-display text-xl tracking-tight">{parent.name}</p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2 max-w-prose">
                  {parent.tagline}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          </div>
        </section>
      ) : null}

      {/* Facts */}
      {body.facts.length ? (
        <section className="mt-16">
          <SectionHeading eyebrow="Did you know" title="A few standout facts" />
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {body.facts.map((fact, i) => (
              <li key={i} className="cosmos-panel p-6">
                <p className="text-sm text-foreground/90 leading-relaxed">{fact}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Sources */}
      <section className="mt-16">
        <SectionHeading eyebrow="Sources" title="Where the data comes from" />
        <ul className="mt-6 flex flex-col gap-2">
          {body.sources.map((s) => (
            <li key={s.label}>
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-foreground/85 hover:text-foreground underline-offset-4 hover:underline"
                >
                  {s.label} <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">{s.label}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Pager */}
      <nav
        aria-label="Planet pagination"
        className="mt-16 flex items-center justify-between gap-4 border-t border-border pt-6 text-sm"
      >
        {prev ? (
          <Link
            href={`/planets/${prev.slug}`}
            className="flex flex-col items-start gap-0.5 text-foreground/85 hover:text-foreground"
          >
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Previous
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ChevronLeft className="h-3.5 w-3.5" /> {prev.name}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/planets/${next.slug}`}
            className="flex flex-col items-end gap-0.5 text-foreground/85 hover:text-foreground"
          >
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Next
            </span>
            <span className="inline-flex items-center gap-1.5">
              {next.name} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
